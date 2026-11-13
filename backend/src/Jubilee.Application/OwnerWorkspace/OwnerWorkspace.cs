using System.Globalization;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Application.Listings;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.OwnerWorkspace;

/// <summary>A figure on My business with how it moved against the week before (L2-085 AC2).</summary>
public sealed record StatDto(int Value, int Change);

/// <summary><c>Saved</c> is the members who saved the business, and how many of them first did so in the last 7 days (L2-085 AC6).</summary>
public sealed record MyBusinessStatsDto(StatDto Views, int OpenRequests, int NewSinceYesterday, int UnansweredMessages, StatDto Saved);

public sealed record NeedsReplyDto(Guid Id, string Kind, string KindLabel, string CustomerName, string Title, DateTimeOffset SentAt);

public sealed record MyBusinessSummaryDto(int Products, int SoldOut, int Services, string LiveSince);

/// <summary>
/// One entry of the switcher on My business (L2-079 AC4): a listing with its stage, or a draft not yet submitted.
/// <c>Kind</c> is <c>listing</c> or <c>draft</c>; <c>Current</c> marks the listing the workspace shows.
/// </summary>
public sealed record BusinessOptionDto(Guid Id, string Name, string Kind, string StageLabel, bool Current);

/// <summary>What the owner sees on My business (L2-085, L2-086).</summary>
public sealed record MyBusinessDto(
    string State,
    Guid? ListingId,
    string? Name,
    string? Slug,
    string? Tagline,
    string? CategorySlug,
    string? CategoryName,
    string Subtitle,
    bool Paused,
    DateTimeOffset? PausedAt,
    int NewRequests,
    MyBusinessStatsDto? Stats,
    IReadOnlyList<NeedsReplyDto> NeedsReply,
    MyBusinessSummaryDto? Summary,
    DateTimeOffset? AwayUntil = null) : Listings.IAddressed
{
    /// <summary>The listing's address, written by <see cref="Listings.AddressBehavior{TRequest, TResponse}"/> (L2-244).</summary>
    public string? Address { get; set; }

    /// <summary>The owner's listings, oldest first, then their drafts (L2-079 AC4); empty for a member who owns nothing.</summary>
    public IReadOnlyList<BusinessOptionDto> Businesses { get; init; } = [];
}

/// <summary>The owner's away period after a change: the instant they are back, or none (L2-062).</summary>
public sealed record AwayPeriodDto(DateTimeOffset? AwayUntil);

public sealed record CategoryOptionDto(string Slug, string Name);

public sealed record ListingPhotoDto(Guid Id, string Key, int Position, string Alt, string? CustomAlt, int Width, int Height);

public sealed record ListingEditorDto(
    Guid Id,
    int Version,
    string Slug,
    string Stage,
    bool Paused,
    string Name,
    string Tagline,
    string CategorySlug,
    string? About,
    string? Where,
    string? Hours,
    string? Website,
    string? Highlight,
    IReadOnlyList<CategoryOptionDto> Categories,
    IReadOnlyList<ListingPhotoDto> Photos,
    Onboarding.SpaceDraftDto? Space = null,
    string Subtitle = "") : Listings.IAddressed
{
    /// <summary>The listing's address, written by <see cref="Listings.AddressBehavior{TRequest, TResponse}"/> (L2-244).</summary>
    public string? Address { get; set; }
}

public sealed record PauseResultDto(bool Paused, DateTimeOffset? PausedAt, string State);

/// <summary>The rules the owner's workspace shares.</summary>
internal static class Workspace
{
    public const int MaxName = 80;
    public const int MaxTagline = 90;
    public const int MaxAbout = 1500;
    public const int MaxHighlight = 30;
    public const int MaxWebsite = 300;
    public const int MaxWhere = 200;
    public const int MaxHours = 200;

    /// <summary>
    /// The listing the owner works on: the one they chose last in the switcher (L2-079 AC5), else the live one, else
    /// the oldest. A caller who owns nothing is refused (L2-097 AC1, L2-133).
    /// </summary>
    public static async Task<Listing?> Find(IAppDbContext db, string subject, bool track, CancellationToken cancellationToken)
    {
        var query = track ? db.Listings : db.Listings.AsNoTracking();
        return Current(await OwnedBy(query, subject, cancellationToken));
    }

    /// <summary>The owner's listings, oldest first.</summary>
    public static async Task<List<Listing>> OwnedBy(IQueryable<Listing> listings, string subject, CancellationToken cancellationToken) =>
        (await listings.Where(l => l.OwnerId == subject && l.DeletedAt == null).ToListAsync(cancellationToken))
            .OrderBy(l => l.CreatedAt).ToList();

    public static Listing? Current(IReadOnlyList<Listing> owned) =>
        owned.Where(l => l.WorkspaceChosenAt is not null).OrderByDescending(l => l.WorkspaceChosenAt).FirstOrDefault()
            ?? owned.FirstOrDefault(l => l.Stage == ListingStage.Live)
            ?? owned.FirstOrDefault();

    /// <summary>The stage in the owner's words, as the switcher says it (L2-079 AC4).</summary>
    public static string StageLabel(Listing listing) => State(listing) switch
    {
        "live" => "Live",
        "paused" => "Paused",
        _ => "Draft",
    };

    public static async Task<Listing> Owned(IAppDbContext db, string subject, CancellationToken cancellationToken) =>
        await Find(db, subject, true, cancellationToken)
            ?? throw new ForbiddenException("FORBIDDEN", "This area is for the owner of the business.");

    public static string State(Listing listing) => listing.Stage switch
    {
        ListingStage.Live => listing.IsPaused ? "paused" : "live",
        _ => "draft",
    };

    public static string Month(DateTimeOffset at) => at.ToString("MMMM yyyy", CultureInfo.InvariantCulture);

    public static string ShortMonth(DateTimeOffset at) => at.ToString("MMM yyyy", CultureInfo.InvariantCulture);

    /// <summary>The line under the business name on every page of the workspace (L2-097 AC3).</summary>
    public static string Subtitle(Listing listing, DateTimeOffset now) => State(listing) switch
    {
        "live" => $"Live since {Month(listing.PublishedAt ?? now)}",
        "paused" => "Paused · not public",
        _ => "Draft · not published yet",
    };

    public static Task<string> SubtitleOf(IAppDbContext db, Listing listing, DateTimeOffset now, CancellationToken cancellationToken) =>
        Task.FromResult(Subtitle(listing, now));

    public static string DefaultAlt(string business, int position) => $"{business} photo {position}";

    public static async Task<ListingEditorDto> Editor(IAppDbContext db, Listing listing, CancellationToken cancellationToken)
    {
        var photos = (await db.ListingPhotos.AsNoTracking().Where(p => p.ListingId == listing.Id).ToListAsync(cancellationToken))
            .OrderBy(p => p.Position).ToList();
        return new ListingEditorDto(
            listing.Id,
            listing.Version,
            listing.Slug,
            WireValues.Of(listing.Stage),
            listing.IsPaused,
            listing.Name,
            listing.Tagline,
            listing.CategorySlug,
            listing.About,
            listing.Where,
            listing.Hours,
            listing.Website,
            listing.Highlight,
            [.. Category.All.Where(c => (c.Slug == Category.RoomsSlug) == (listing.Kind == ListingKind.Space))
                .Select(c => new CategoryOptionDto(c.Slug, c.Name))],
            [.. photos.Select((p, i) => new ListingPhotoDto(p.Id, p.Key, i + 1, p.Alt ?? DefaultAlt(listing.Name, i + 1), p.Alt, p.Width, p.Height))],
            listing.Space is null ? null : Onboarding.SpaceDraftDto.From(listing.Space),
            Subtitle(listing, listing.PublishedAt ?? listing.CreatedAt));
    }
}

public sealed record GetMyBusinessQuery(string Subject) : IRequest<MyBusinessDto>;

public sealed class GetMyBusinessQueryHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<GetMyBusinessQuery, MyBusinessDto>
{
    public async Task<MyBusinessDto> Handle(GetMyBusinessQuery request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var owned = await Workspace.OwnedBy(db.Listings.AsNoTracking(), request.Subject, cancellationToken);
        var listing = Workspace.Current(owned);
        if (listing is null)
        {
            return new MyBusinessDto("none", null, null, null, null, null, null, "You haven't listed a business yet", false, null, 0, null, [], null, null);
        }

        var drafts = (await db.ListingDrafts.AsNoTracking().Where(d => d.OwnerSubject == request.Subject).ToListAsync(cancellationToken))
            .OrderBy(d => d.CreatedAt);
        List<BusinessOptionDto> businesses =
        [
            .. owned.Select(l => new BusinessOptionDto(l.Id, l.Name, "listing", Workspace.StageLabel(l), l.Id == listing.Id)),
            .. drafts.Select(d => new BusinessOptionDto(d.Id, string.IsNullOrWhiteSpace(d.Name) ? "Untitled business" : d.Name, "draft", "Draft", false)),
        ];

        var state = Workspace.State(listing);
        var live = listing.Stage == ListingStage.Live;

        var requests = await db.Requests.AsNoTracking().Where(r => r.ListingId == listing.Id).ToListAsync(cancellationToken);
        var fresh = requests.Where(r => r.Status == RequestStatus.New).OrderByDescending(r => r.CreatedAt).ToList();

        MyBusinessStatsDto? stats = null;
        MyBusinessSummaryDto? summary = null;
        if (live)
        {
            var views = await db.ListingViews.AsNoTracking()
                .Where(v => v.ListingId == listing.Id && v.ViewedAt > now.AddDays(-14))
                .Select(v => v.ViewedAt).ToListAsync(cancellationToken);
            var thisWeek = views.Count(v => v > now.AddDays(-7));
            var lastWeek = views.Count - thisWeek;
            var conversations = await db.Conversations.AsNoTracking()
                .Where(c => c.ListingId == listing.Id && !c.OwnerMuted && (c.OwnerReadAt == null || c.OwnerReadAt < c.LastMessageAt))
                .CountAsync(cancellationToken);
            stats = new MyBusinessStatsDto(
                new StatDto(thisWeek, thisWeek - lastWeek),
                fresh.Count,
                fresh.Count(r => r.CreatedAt > now.AddDays(-1)),
                conversations,
                await SavedByMembers(listing.Id, now, cancellationToken));

            var products = await db.Products.AsNoTracking().Where(p => p.ListingId == listing.Id).ToListAsync(cancellationToken);
            var services = await db.Services.AsNoTracking().CountAsync(s => s.ListingId == listing.Id, cancellationToken);
            summary = new MyBusinessSummaryDto(
                products.Count,
                products.Count(p => p.IsSoldOut),
                services,
                $"Live since {Workspace.ShortMonth(listing.PublishedAt ?? now)}");
        }

        var subtitle = Workspace.Subtitle(listing, now);

        var needs = fresh.Take(3).Select(r => new NeedsReplyDto(
            r.Id, r.Kind.ToString().ToLowerInvariant(), r.Kind.ToString(), r.MemberName, r.ServiceName ?? r.Kind.ToString(), r.CreatedAt)).ToList();

        return new MyBusinessDto(
            state,
            listing.Id,
            listing.Name,
            listing.Slug,
            listing.Tagline,
            listing.CategorySlug,
            Category.Find(listing.CategorySlug)?.Name,
            subtitle,
            listing.IsPaused,
            listing.PausedAt,
            fresh.Count,
            stats,
            needs,
            summary,
            listing.AwayUntil is { } back && back > now ? back : null)
        {
            Businesses = businesses,
        };
    }

    /// <summary>
    /// How many different members saved the business or one of its products, and how many of them saved the first of
    /// those in the last 7 days: a count, never who (L2-041 AC6, L2-085 AC6). A removed save leaves no row, so the
    /// change is never below zero (ADR 0052).
    /// </summary>
    private async Task<StatDto> SavedByMembers(Guid listingId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var productIds = await db.Products.AsNoTracking().Where(p => p.ListingId == listingId).Select(p => p.Id).ToListAsync(cancellationToken);
        var saves = await db.SavedItems.AsNoTracking()
            .Where(i => (i.Kind == SavedItemKind.Business && i.TargetId == listingId) || (i.Kind == SavedItemKind.Product && productIds.Contains(i.TargetId)))
            .Select(i => new { i.MemberSubject, i.SavedAt }).ToListAsync(cancellationToken);
        var first = saves.GroupBy(i => i.MemberSubject).Select(g => g.Min(i => i.SavedAt)).ToList();
        return new StatDto(first.Count, first.Count(at => at > now.AddDays(-7)));
    }
}

/// <summary>The owner chooses which of their businesses the workspace shows (L2-079 AC5). Only their own can be chosen.</summary>
public sealed record ChooseBusinessCommand(string Subject, Guid ListingId) : IRequest;

public sealed class ChooseBusinessCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ChooseBusinessCommand>
{
    public async Task Handle(ChooseBusinessCommand request, CancellationToken cancellationToken)
    {
        var listing = await db.Listings
            .SingleOrDefaultAsync(l => l.Id == request.ListingId && l.OwnerId == request.Subject && l.DeletedAt == null, cancellationToken)
            ?? throw new ForbiddenException("FORBIDDEN", "This area is for the owner of the business.");
        listing.ChooseForWorkspace(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record GetListingEditorQuery(string Subject) : IRequest<ListingEditorDto>;

public sealed class GetListingEditorQueryHandler(IAppDbContext db) : IRequestHandler<GetListingEditorQuery, ListingEditorDto>
{
    public async Task<ListingEditorDto> Handle(GetListingEditorQuery request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        return await Workspace.Editor(db, listing, cancellationToken);
    }
}

public sealed record SaveListingCommand(
    string Subject, int Version, string? Name, string? Tagline, string? CategorySlug, string? About, string? Where,
    string? Hours, string? Website, string? Highlight, Onboarding.SpaceInput? Space = null, Guid? ListingId = null) : IRequest<ListingEditorDto>;

public sealed partial class SaveListingCommandHandler(IAppDbContext db, TimeProvider clock, AddressSettings addresses)
    : IRequestHandler<SaveListingCommand, ListingEditorDto>
{
    public async Task<ListingEditorDto> Handle(SaveListingCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var name = request.Name?.Trim() ?? string.Empty;
        var tagline = request.Tagline?.Trim() ?? string.Empty;
        var hours = request.Hours?.Trim() ?? string.Empty;
        var website = request.Website?.Trim() ?? string.Empty;
        var errors = new Dictionary<string, string>();
        if (name.Length == 0)
        {
            errors["name"] = "REQUIRED";
        }
        else if (name.Length > Workspace.MaxName)
        {
            errors["name"] = "TOO_LONG";
        }

        if (tagline.Length == 0)
        {
            errors["tagline"] = "REQUIRED";
        }
        else if (tagline.Length > Workspace.MaxTagline)
        {
            errors["tagline"] = "TOO_LONG";
        }

        var isSpace = listing.Kind == ListingKind.Space;
        if (isSpace)
        {
            // A space stays in Rooms & rentals and has no hours; its own fields are checked as when it was listed (L2-209).
            if (request.CategorySlug != Category.RoomsSlug)
            {
                errors["category"] = "CATEGORY_LOCKED";
            }

            Onboarding.Drafts.ValidateSpace(request.Space, errors);
        }
        else
        {
            if (Category.All.All(c => c.Slug != request.CategorySlug))
            {
                errors["category"] = "INVALID";
            }
            else if (request.CategorySlug == Category.RoomsSlug)
            {
                errors["category"] = "CATEGORY_LOCKED";
            }

            if (hours.Length == 0)
            {
                errors["hours"] = "REQUIRED";
            }
            else if (hours.Length > Workspace.MaxHours)
            {
                errors["hours"] = "TOO_LONG";
            }
        }

        if (website.Length > 0
            && (website.Length > Workspace.MaxWebsite
                || !Uri.TryCreate(website, UriKind.Absolute, out var uri)
                || uri.Scheme is not ("http" or "https")))
        {
            errors["website"] = "INVALID";
        }

        if ((request.About?.Trim().Length ?? 0) > Workspace.MaxAbout)
        {
            errors["about"] = "TOO_LONG";
        }

        if ((request.Highlight?.Trim().Length ?? 0) > Workspace.MaxHighlight)
        {
            errors["highlight"] = "TOO_LONG";
        }

        if ((request.Where?.Trim().Length ?? 0) > Workspace.MaxWhere)
        {
            errors["where"] = "TOO_LONG";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        // The editor may say which listing it opened: after a switch in another tab it is not this one (ADR 0052).
        if (request.Version != listing.Version || (request.ListingId is { } opened && opened != listing.Id))
        {
            throw new ConflictException("LISTING_CHANGED", "This listing changed since you opened it. Reload to see the latest.");
        }

        var now = clock.GetUtcNow();
        var before = $"{listing.Name} | {listing.CategorySlug}";
        var oldName = listing.Name;
        var space = isSpace ? Onboarding.Drafts.SpaceFrom(request.Space) : null;
        var reworded = listing.Edit(
            name, tagline, request.CategorySlug!, request.About, space?.Neighbourhood ?? request.Where, hours, website, request.Highlight, now);
        if (space is not null)
        {
            listing.DescribeSpace(space);
        }

        // A new name or category is live at once and tells nobody; the audit log keeps it (L2-087 AC6, ADR 0057).
        // The address follows the name; the old one keeps answering with 301 (L2-113 AC2, ADR 0056).
        if (!string.Equals(oldName, listing.Name, StringComparison.Ordinal))
        {
            await ListingSlugs.FollowNameAsync(db, addresses, listing, now, cancellationToken);
        }

        if (reworded && listing.Stage == ListingStage.Live)
        {
            db.AuditRecords.Add(AuditRecord.Make(
                request.Subject, listing.OwnerName ?? listing.Name, "listing.renamed", "listing", listing.Id.ToString(),
                before, $"{listing.Name} | {listing.CategorySlug}", "The name or category of a live listing changed.", now));
        }

        await db.SaveChangesAsync(cancellationToken);
        return await Workspace.Editor(db, listing, cancellationToken);
    }
}

public sealed record PauseListingCommand(string Subject) : IRequest<PauseResultDto>;

public sealed class PauseListingCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<PauseListingCommand, PauseResultDto>
{
    public async Task<PauseResultDto> Handle(PauseListingCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        if (listing.Stage != ListingStage.Live)
        {
            throw new ConflictException("NOT_LIVE", "Only a live listing can be paused.");
        }

        if (listing.IsPaused)
        {
            throw new ConflictException("ALREADY_PAUSED", "This listing is already paused.");
        }

        listing.Pause(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
        return new PauseResultDto(true, listing.PausedAt, Workspace.State(listing));
    }
}

/// <summary>The owner says the day they are back, or clears it (L2-062 AC3 to AC6). The period ends at the start of that day in Toronto.</summary>
public sealed record SetAwayPeriodCommand(string Subject, string? Until) : IRequest<AwayPeriodDto>;

public sealed class SetAwayPeriodCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SetAwayPeriodCommand, AwayPeriodDto>
{
    public async Task<AwayPeriodDto> Handle(SetAwayPeriodCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        if (request.Until is null)
        {
            listing.SetAway(null);
            await db.SaveChangesAsync(cancellationToken);
            return new AwayPeriodDto(null);
        }

        if (!DateOnly.TryParseExact(request.Until, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var day))
        {
            throw Invalid("REQUIRED");
        }

        var today = TorontoClock.Today(clock.GetUtcNow());
        if (day <= today)
        {
            throw Invalid("IN_PAST");
        }

        if (day > today.AddYears(1))
        {
            throw Invalid("TOO_FAR");
        }

        listing.SetAway(TorontoClock.At(day, TimeOnly.MinValue));
        await db.SaveChangesAsync(cancellationToken);
        return new AwayPeriodDto(listing.AwayUntil);
    }

    private static ValidationFailedException Invalid(string code) => new(new Dictionary<string, string> { ["until"] = code });
}

public sealed record ResumeListingCommand(string Subject) : IRequest<PauseResultDto>;

public sealed class ResumeListingCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ResumeListingCommand, PauseResultDto>
{
    public async Task<PauseResultDto> Handle(ResumeListingCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        if (!listing.IsPaused)
        {
            throw new ConflictException("NOT_PAUSED", "This listing is not paused.");
        }

        // A listing stays paused until its owner agrees to the updated statement of faith (L2-096 AC6).
        if (StatementOfFaith.IsOverdue(clock.GetUtcNow())
            && StatementOfFaith.IsDue(await Onboarding.StatementAgreements.LatestAgreedAsync(db, request.Subject, cancellationToken)))
        {
            throw new ConflictException(
                "STATEMENT_AGREEMENT_REQUIRED", "Agree to the updated statement of faith to resume your listing.");
        }

        listing.Resume();
        await db.SaveChangesAsync(cancellationToken);
        return new PauseResultDto(false, null, Workspace.State(listing));
    }
}

public sealed record AddPhotoCommand(string Subject, byte[] Content) : IRequest<ListingEditorDto>;

public sealed class AddPhotoCommandHandler(IAppDbContext db, IImageProcessor images, IMediaStore store, TimeProvider clock)
    : IRequestHandler<AddPhotoCommand, ListingEditorDto>
{
    public async Task<ListingEditorDto> Handle(AddPhotoCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var count = await db.ListingPhotos.CountAsync(p => p.ListingId == listing.Id, cancellationToken);
        if (count >= ListingPhoto.MaxPerListing)
        {
            throw new ConflictException("TOO_MANY_PHOTOS", $"A listing can have {ListingPhoto.MaxPerListing} photos. Remove one to add another.");
        }

        ProcessedImage processed;
        using (var stream = new MemoryStream(request.Content))
        {
            processed = images.Process(stream);
        }

        var key = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        foreach (var rendition in processed.Renditions)
        {
            await store.Save(key, rendition.Width, rendition.Format, rendition.Data, cancellationToken);
        }

        db.ListingPhotos.Add(ListingPhoto.Add(listing.Id, key, count + 1, processed.Width, processed.Height, clock.GetUtcNow()));
        await db.SaveChangesAsync(cancellationToken);
        return await Workspace.Editor(db, listing, cancellationToken);
    }
}

public sealed record MovePhotoCommand(string Subject, Guid PhotoId, int Position) : IRequest<ListingEditorDto>;

public sealed class MovePhotoCommandHandler(IAppDbContext db) : IRequestHandler<MovePhotoCommand, ListingEditorDto>
{
    public async Task<ListingEditorDto> Handle(MovePhotoCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var photos = (await db.ListingPhotos.Where(p => p.ListingId == listing.Id).ToListAsync(cancellationToken))
            .OrderBy(p => p.Position).ToList();
        var moving = photos.SingleOrDefault(p => p.Id == request.PhotoId)
            ?? throw new NotFoundException("photo_not_found", "We can't find that photo.");
        photos.Remove(moving);
        photos.Insert(Math.Clamp(request.Position - 1, 0, photos.Count), moving);
        for (var i = 0; i < photos.Count; i++)
        {
            photos[i].MoveTo(i + 1);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await Workspace.Editor(db, listing, cancellationToken);
    }
}

public sealed record DescribePhotoCommand(string Subject, Guid PhotoId, string? Alt) : IRequest<ListingEditorDto>;

public sealed class DescribePhotoCommandHandler(IAppDbContext db) : IRequestHandler<DescribePhotoCommand, ListingEditorDto>
{
    public async Task<ListingEditorDto> Handle(DescribePhotoCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        if ((request.Alt?.Trim().Length ?? 0) > ListingPhoto.MaxAltLength)
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["alt"] = "TOO_LONG" });
        }

        var photo = await db.ListingPhotos.SingleOrDefaultAsync(p => p.Id == request.PhotoId && p.ListingId == listing.Id, cancellationToken)
            ?? throw new NotFoundException("photo_not_found", "We can't find that photo.");
        photo.DescribeAs(request.Alt);
        await db.SaveChangesAsync(cancellationToken);
        return await Workspace.Editor(db, listing, cancellationToken);
    }
}

public sealed record RemovePhotoCommand(string Subject, Guid PhotoId) : IRequest<ListingEditorDto>;

public sealed class RemovePhotoCommandHandler(IAppDbContext db, IMediaStore store) : IRequestHandler<RemovePhotoCommand, ListingEditorDto>
{
    public async Task<ListingEditorDto> Handle(RemovePhotoCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var photos = (await db.ListingPhotos.Where(p => p.ListingId == listing.Id).ToListAsync(cancellationToken))
            .OrderBy(p => p.Position).ToList();
        var photo = photos.SingleOrDefault(p => p.Id == request.PhotoId)
            ?? throw new NotFoundException("photo_not_found", "We can't find that photo.");
        photos.Remove(photo);
        db.ListingPhotos.Remove(photo);
        for (var i = 0; i < photos.Count; i++)
        {
            photos[i].MoveTo(i + 1);
        }

        await db.SaveChangesAsync(cancellationToken);
        await store.Delete(photo.Key, cancellationToken);
        return await Workspace.Editor(db, listing, cancellationToken);
    }
}
