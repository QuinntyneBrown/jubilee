using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Application.Notifications;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Moderation;

/// <summary>The member of the Jubilee team who acts: the session subject and the name shown in the audit log.</summary>
public sealed record Reviewer(string Subject, string Name)
{
    public string FirstName => Name.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? Name;
}

/// <summary>Business days for "overdue": Saturdays and Sundays do not count (L2-105 AC4).</summary>
public static class BusinessDays
{
    public static DateTimeOffset Add(DateTimeOffset from, int days)
    {
        var date = from;
        while (days > 0)
        {
            date = date.AddDays(1);
            if (date.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday))
            {
                days--;
            }
        }

        return date;
    }
}

/// <summary>The writer of the audit log (L2-180 AC1). Records are only ever added.</summary>
public static class AuditLog
{
    public static void Record(
        IAppDbContext db, Reviewer actor, string action, string targetType, string targetId,
        string? before, string? after, string? reason, DateTimeOffset now) =>
        db.AuditRecords.Add(AuditRecord.Make(actor.Subject, actor.Name, action, targetType, targetId, before, after, reason, now));
}

public sealed record AdminListingRow(
    Guid Id, string Name, string CategoryName, string OwnerName, DateTimeOffset PublishedAt, string Status, string StatusLabel, bool Flagged);

public sealed record AdminListingsDto(int Total, int PublishedThisWeek, IReadOnlyList<AdminListingRow> Rows);

/// <summary>Another listing of the owner, or a draft not yet published, with its stage as the switcher words it (L2-079 AC3).</summary>
public sealed record AdminOtherListing(string Name, string StageLabel);

public sealed record AdminListingOwner(
    string Name, string Email, bool EmailConfirmed, DateTimeOffset MemberSince, IReadOnlyList<AdminOtherListing> OtherListings);

public sealed record AdminTakedownDto(DateTimeOffset At, string ByName, string Reason);

public sealed record AdminListingDto(
    Guid Id,
    string Slug,
    string Name,
    string Tagline,
    string? About,
    string Kind,
    string CategorySlug,
    string CategoryName,
    DateTimeOffset? PublishedAt,
    string Status,
    string StatusLabel,
    AdminListingOwner Owner,
    IReadOnlyList<string> Flags,
    bool IsOwnListing,
    AdminTakedownDto? TakenDown,
    AdminListingSpace? Space = null);

/// <summary>What the Jubilee team reads of a space: every field but its exact address (L2-200 AC3).</summary>
public sealed record AdminListingSpace(
    string Term,
    int Rent,
    string Per,
    string Available,
    string MinimumStayLabel,
    string Neighbourhood,
    string Place,
    IReadOnlyList<string> Facts,
    IReadOnlyList<string> Included,
    string? Household,
    IReadOnlyList<string> Rules)
{
    public static AdminListingSpace From(SpaceDetails space) => new(
        WireValues.Of(space.Term),
        space.Rent,
        SpaceTerms.Per(space.Term),
        space.Available,
        space.MinimumStayLabel,
        space.Neighbourhood,
        space.Place,
        space.Facts,
        space.Included,
        space.Household,
        space.Rules);
}

/// <summary>Where a published listing stands, in the team's words (L2-099 AC2).</summary>
internal static class AdminListings
{
    public static (string Status, string Label) StatusOf(Listing listing) => listing switch
    {
        { TakenDownAt: not null } => ("taken-down", "Taken down"),
        { IsUnderModerationHold: true } => ("on-hold", "On hold"),
        { IsPaused: true } => ("paused", "Paused"),
        _ => ("live", "Live"),
    };

    public static async Task<Dictionary<string, Member>> Owners(IAppDbContext db, IEnumerable<string?> subjects, CancellationToken cancellationToken)
    {
        var ids = subjects.Select(s => Guid.TryParse(s, out var id) ? id : (Guid?)null).OfType<Guid>().Distinct().ToList();
        var members = await db.Members.AsNoTracking().Where(m => ids.Contains(m.Id)).ToListAsync(cancellationToken);
        return members.ToDictionary(m => m.Id.ToString());
    }

    public static string OwnerName(Listing listing, IReadOnlyDictionary<string, Member> owners) =>
        listing.OwnerId is { } id && owners.TryGetValue(id, out var member) ? member.DisplayName : listing.OwnerName ?? "Unknown";

    /// <summary>A published listing that was not deleted, or one the team took down; drafts and owner deletions are not the team's.</summary>
    public static async Task<Listing> Load(IAppDbContext db, Guid id, CancellationToken cancellationToken) =>
        await db.Listings.SingleOrDefaultAsync(
            l => l.Id == id && l.PublishedAt != null && l.Stage == ListingStage.Live && (l.DeletedAt == null || l.TakenDownAt != null),
            cancellationToken)
        ?? throw new NotFoundException("listing_not_found", "We can't find that listing.");

    /// <summary>The owner's other listings, oldest first, then their drafts (L2-079 AC3).</summary>
    private static async Task<List<AdminOtherListing>> OtherListings(IAppDbContext db, Listing listing, CancellationToken cancellationToken)
    {
        if (listing.OwnerId is not { } owner)
        {
            return [];
        }

        var listings = (await OwnerWorkspace.Workspace.OwnedBy(db.Listings.AsNoTracking(), owner, cancellationToken))
            .Where(l => l.Id != listing.Id)
            .Select(l => new AdminOtherListing(l.Name, OwnerWorkspace.Workspace.StageLabel(l)));
        var drafts = (await db.ListingDrafts.AsNoTracking().Where(d => d.OwnerSubject == owner).ToListAsync(cancellationToken))
            .OrderBy(d => d.CreatedAt)
            .Select(d => new AdminOtherListing(string.IsNullOrWhiteSpace(d.Name) ? "Untitled business" : d.Name, "Draft"));
        return [.. listings, .. drafts];
    }

    public static async Task<AdminListingDto> Detail(IAppDbContext db, Listing listing, Reviewer reviewer, CancellationToken cancellationToken)
    {
        var owners = await Owners(db, [listing.OwnerId], cancellationToken);
        var member = listing.OwnerId is { } id && owners.TryGetValue(id, out var found) ? found : null;
        var otherListings = await OtherListings(db, listing, cancellationToken);
        var flags = await db.ListingSubmissions.AsNoTracking()
            .Where(s => s.ListingId == listing.Id).Select(s => s.Flags).SingleOrDefaultAsync(cancellationToken) ?? [];
        var (status, label) = StatusOf(listing);
        return new AdminListingDto(
            listing.Id,
            listing.Slug,
            listing.Name,
            listing.Tagline,
            listing.About,
            Onboarding.ListingDraftDto.Wire(listing.Kind),
            listing.CategorySlug,
            Category.Find(listing.CategorySlug)?.Name ?? listing.CategorySlug,
            listing.PublishedAt,
            status,
            label,
            new AdminListingOwner(
                OwnerName(listing, owners),
                member?.Email ?? string.Empty,
                member?.EmailStatus == EmailStatus.Confirmed,
                member?.CreatedAt ?? listing.CreatedAt,
                otherListings),
            flags,
            listing.OwnerId == reviewer.Subject,
            listing.TakenDownAt is { } at ? new AdminTakedownDto(at, listing.TakenDownByName ?? "The Jubilee team", listing.TakedownReason ?? string.Empty) : null,
            listing.Space is null ? null : AdminListingSpace.From(listing.Space));
    }
}

/// <summary>Every published listing, newest first, with its status and a search by name (L2-099).</summary>
public sealed record GetAdminListingsQuery(string? Search) : IRequest<AdminListingsDto>;

public sealed class GetAdminListingsQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<GetAdminListingsQuery, AdminListingsDto>
{
    public async Task<AdminListingsDto> Handle(GetAdminListingsQuery request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var listings = await db.Listings.AsNoTracking()
            .Where(l => l.Stage == ListingStage.Live && l.PublishedAt != null && l.DeletedAt == null)
            .ToListAsync(cancellationToken);
        var ids = listings.Select(l => l.Id).ToList();
        var flagged = (await db.ListingSubmissions.AsNoTracking().Where(s => ids.Contains(s.ListingId)).ToListAsync(cancellationToken))
            .Where(s => s.Flags.Count > 0).Select(s => s.ListingId).ToHashSet();
        var owners = await AdminListings.Owners(db, listings.Select(l => l.OwnerId), cancellationToken);

        IEnumerable<Listing> shown = listings.OrderByDescending(l => l.PublishedAt).ThenBy(l => l.SortName);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            shown = shown.Where(l => l.Name.Contains(term, StringComparison.OrdinalIgnoreCase));
        }

        var rows = shown.Select(l =>
        {
            var (status, label) = AdminListings.StatusOf(l);
            return new AdminListingRow(
                l.Id, l.Name, Category.Find(l.CategorySlug)?.Name ?? l.CategorySlug, AdminListings.OwnerName(l, owners),
                l.PublishedAt!.Value, status, label, flagged.Contains(l.Id));
        }).ToList();
        return new AdminListingsDto(listings.Count, listings.Count(l => l.PublishedAt > now.AddDays(-7)), rows);
    }
}

/// <summary>One published listing, its owner and its flags (L2-100).</summary>
public sealed record GetAdminListingQuery(Reviewer Reviewer, Guid ListingId) : IRequest<AdminListingDto>;

public sealed class GetAdminListingQueryHandler(IAppDbContext db) : IRequestHandler<GetAdminListingQuery, AdminListingDto>
{
    public async Task<AdminListingDto> Handle(GetAdminListingQuery request, CancellationToken cancellationToken) =>
        await AdminListings.Detail(db, await AdminListings.Load(db, request.ListingId, cancellationToken), request.Reviewer, cancellationToken);
}

/// <summary>
/// "Take down listing": the listing leaves Jubilee at once, the owner is told why and the takedown is audited (L2-101).
/// Used when a listing misrepresents a business; nobody verifies a listing before it goes live (ADR 0057).
/// </summary>
public sealed record TakeDownListingCommand(Reviewer Reviewer, Guid ListingId, string? Reason) : IRequest<AdminListingDto>;

public sealed class TakeDownListingCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<TakeDownListingCommand, AdminListingDto>
{
    public const int MaxReasonLength = 1000;

    public async Task<AdminListingDto> Handle(TakeDownListingCommand request, CancellationToken cancellationToken)
    {
        var reason = request.Reason?.Trim() ?? string.Empty;
        if (reason.Length == 0 || reason.Length > MaxReasonLength)
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["reason"] = reason.Length == 0 ? "REQUIRED" : "TOO_LONG" });
        }

        var listing = await AdminListings.Load(db, request.ListingId, cancellationToken);
        if (listing.OwnerId == request.Reviewer.Subject)
        {
            throw new ForbiddenException("OWN_LISTING", "You can't take down your own listing.");
        }

        if (listing.TakenDownAt is not null)
        {
            throw new ConflictException("ALREADY_TAKEN_DOWN", "This listing was already taken down.");
        }

        var now = clock.GetUtcNow();
        var before = AdminListings.StatusOf(listing).Status;
        listing.TakeDown(request.Reviewer.Name, reason, now);
        var title = $"We’ve taken down {listing.Name}";
        NotificationRules.Tell(
            db, listing.OwnerId, "listing-removed", title,
            "The Jubilee team took your listing off Jubilee. We’ve e-mailed you why.", "/my-business", now);
        var owners = await AdminListings.Owners(db, [listing.OwnerId], cancellationToken);
        if (listing.OwnerId is { } id && owners.TryGetValue(id, out var owner))
        {
            db.OutboxMessages.Add(OutboxMessage.Email(
                owner.Id,
                owner.Email,
                title,
                $"Hi {owner.FirstName},\n\nThe Jubilee team has taken {listing.Name} off Jubilee. Here is why:\n\n{reason}\n\nIf you have questions, reply to this e-mail. You may list your business again from {settings.PublicBaseUrl.TrimEnd('/')}/my-business.\n\nJubilee · Toronto's Christian marketplace\n",
                now));
        }

        AuditLog.Record(db, request.Reviewer, "listing.taken-down", "listing", listing.Id.ToString(), before, "taken-down", reason, now);
        await db.SaveChangesAsync(cancellationToken);
        return await AdminListings.Detail(db, listing, request.Reviewer, cancellationToken);
    }
}

public sealed record AuditRecordDto(
    Guid Id, string Actor, string ActorName, string Action, string TargetType, string TargetId, DateTimeOffset At,
    string? Before, string? After, string? Reason);

/// <summary>Searches the audit log by actor, target or date range (L2-180 AC3).</summary>
public sealed record SearchAuditLogQuery(string? Actor, string? Target, DateTimeOffset? From, DateTimeOffset? To) : IRequest<IReadOnlyList<AuditRecordDto>>;

public sealed class SearchAuditLogQueryHandler(IAppDbContext db) : IRequestHandler<SearchAuditLogQuery, IReadOnlyList<AuditRecordDto>>
{
    public async Task<IReadOnlyList<AuditRecordDto>> Handle(SearchAuditLogQuery request, CancellationToken cancellationToken)
    {
        IQueryable<AuditRecord> query = db.AuditRecords.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(request.Actor))
        {
            var actor = request.Actor.Trim();
            query = query.Where(a => a.Actor == actor || a.ActorName.Contains(actor));
        }

        if (!string.IsNullOrWhiteSpace(request.Target))
        {
            var target = request.Target.Trim();
            query = query.Where(a => a.TargetId == target);
        }

        if (request.From is { } from)
        {
            query = query.Where(a => a.At >= from);
        }

        if (request.To is { } to)
        {
            query = query.Where(a => a.At <= to);
        }

        var records = await query.ToListAsync(cancellationToken);
        return [.. records.OrderByDescending(a => a.At).Take(200)
            .Select(a => new AuditRecordDto(a.Id, a.Actor, a.ActorName, a.Action, a.TargetType, a.TargetId, a.At, a.Before, a.After, a.Reason))];
    }
}
