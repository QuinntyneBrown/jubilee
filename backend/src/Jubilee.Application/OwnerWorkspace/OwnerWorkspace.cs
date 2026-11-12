using System.Globalization;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Application.Reference;
using Jubilee.Application.Verification;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.OwnerWorkspace;

/// <summary>A figure on My business with how it moved against the week before (L2-085 AC2).</summary>
public sealed record StatDto(int Value, int Change);

public sealed record MyBusinessStatsDto(StatDto Views, int OpenRequests, int NewSinceYesterday, int UnansweredMessages, int? Saved);

public sealed record NeedsReplyDto(Guid Id, string Kind, string KindLabel, string CustomerName, string Title, DateTimeOffset SentAt);

public sealed record MyBusinessSummaryDto(int Products, int SoldOut, int Services, string Reference);

/// <summary>What the owner sees on My business (L2-085, L2-086).</summary>
public sealed record MyBusinessDto(
    string State,
    Guid? ListingId,
    string? Name,
    string? Slug,
    string? Tagline,
    string? CategorySlug,
    string Subtitle,
    bool Paused,
    DateTimeOffset? PausedAt,
    bool JustApproved,
    int NewRequests,
    MyBusinessStatsDto? Stats,
    IReadOnlyList<NeedsReplyDto> NeedsReply,
    MyBusinessSummaryDto? Summary,
    ReferenceStatusDto? Reference,
    OwnerVerificationDto? Verification,
    DateTimeOffset? AwayUntil = null);

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
    bool RecheckRequested,
    Onboarding.SpaceDraftDto? Space = null);

public sealed record PauseResultDto(bool Paused, DateTimeOffset? PausedAt, string State, bool NeedsReview);

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
    public static readonly TimeSpan JustApprovedFor = TimeSpan.FromDays(7);

    /// <summary>The owner's listing (the live one first). A caller who owns nothing is refused (L2-097 AC1, L2-133).</summary>
    public static async Task<Listing?> Find(IAppDbContext db, string subject, bool track, CancellationToken cancellationToken)
    {
        var query = track ? db.Listings : db.Listings.AsNoTracking();
        var owned = (await query.Where(l => l.OwnerId == subject && l.DeletedAt == null).ToListAsync(cancellationToken))
            .OrderBy(l => l.CreatedAt).ToList();
        return owned.FirstOrDefault(l => l.Stage == ListingStage.Live) ?? owned.FirstOrDefault();
    }

    public static async Task<Listing> Owned(IAppDbContext db, string subject, CancellationToken cancellationToken) =>
        await Find(db, subject, true, cancellationToken)
            ?? throw new ForbiddenException("FORBIDDEN", "This area is for the owner of the business.");

    public static string State(Listing listing) => listing.Stage switch
    {
        ListingStage.Live => listing.IsPaused ? "paused" : "live",
        ListingStage.Draft => "draft",
        ListingStage.PendingReference => "pending-reference",
        ListingStage.ReadyToReview => "ready-to-review",
        ListingStage.NeedsDecision => "needs-a-decision",
        ListingStage.ChangesRequested => "changes-requested",
        _ => "declined",
    };

    public static string Month(DateTimeOffset at) => at.ToString("MMMM yyyy", CultureInfo.InvariantCulture);

    public static string SubmittedWords(DateTimeOffset? at, DateTimeOffset now)
    {
        if (at is null)
        {
            return "today";
        }

        var days = (int)(now - at.Value).TotalDays;
        return days <= 0 ? "today" : days == 1 ? "yesterday" : $"{days} days ago";
    }

    /// <summary>The line under the business name on every page of the workspace (L2-097 AC3).</summary>
    public static string Subtitle(Listing listing, DateTimeOffset? submittedAt, DateTimeOffset now) => State(listing) switch
    {
        "live" => $"Verified · live since {Month(listing.ApprovedAt ?? now)}",
        "paused" => "Verified · paused, not public",
        "changes-requested" => "Changes requested · not public yet",
        "declined" => "Declined · not public",
        "draft" => "Draft · not submitted yet",
        _ => $"Pending verification · submitted {SubmittedWords(submittedAt, now)}",
    };

    public static async Task<string> SubtitleOf(IAppDbContext db, Listing listing, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var submitted = await db.ListingSubmissions.AsNoTracking()
            .Where(x => x.ListingId == listing.Id).Select(x => (DateTimeOffset?)x.SubmittedAt).SingleOrDefaultAsync(cancellationToken);
        return Subtitle(listing, submitted, now);
    }

    public static string DefaultAlt(string business, int position) => $"{business} photo {position}";

    public static async Task<ListingEditorDto> Editor(IAppDbContext db, Listing listing, CancellationToken cancellationToken)
    {
        var photos = (await db.ListingPhotos.AsNoTracking().Where(p => p.ListingId == listing.Id).ToListAsync(cancellationToken))
            .OrderBy(p => p.Position).ToList();
        return new ListingEditorDto(
            listing.Id,
            listing.Version,
            listing.Slug,
            StageWire.Of(listing.Stage),
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
            listing.RecheckRequestedAt is not null,
            listing.Space is null ? null : Onboarding.SpaceDraftDto.From(listing.Space));
    }
}

public sealed record GetMyBusinessQuery(string Subject) : IRequest<MyBusinessDto>;

public sealed class GetMyBusinessQueryHandler(IAppDbContext db, IMediator mediator, TimeProvider clock)
    : IRequestHandler<GetMyBusinessQuery, MyBusinessDto>
{
    public async Task<MyBusinessDto> Handle(GetMyBusinessQuery request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var listing = await Workspace.Find(db, request.Subject, false, cancellationToken);
        if (listing is null)
        {
            return new MyBusinessDto("none", null, null, null, null, null, "You haven't listed a business yet", false, null, false, 0, null, [], null, null, null);
        }

        var state = Workspace.State(listing);
        var submission = await db.ListingSubmissions.AsNoTracking().SingleOrDefaultAsync(s => s.ListingId == listing.Id, cancellationToken);
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
                await SavedByMembers(listing.Id, cancellationToken));

            var products = await db.Products.AsNoTracking().Where(p => p.ListingId == listing.Id).ToListAsync(cancellationToken);
            var services = await db.Services.AsNoTracking().CountAsync(s => s.ListingId == listing.Id, cancellationToken);
            summary = new MyBusinessSummaryDto(
                products.Count,
                products.Count(p => p.IsSoldOut),
                services,
                $"Confirmed {Workspace.Month(listing.ApprovedAt ?? now)} · Verified");
        }

        ReferenceStatusDto? reference = null;
        if (listing.Stage == ListingStage.PendingReference && submission is not null)
        {
            reference = await mediator.Send(new GetReferenceStatusQuery(request.Subject, listing.Id), cancellationToken);
        }

        OwnerVerificationDto? verification = null;
        if (listing.Stage is ListingStage.ChangesRequested or ListingStage.Declined)
        {
            verification = await mediator.Send(new GetOwnerVerificationQuery(request.Subject, listing.Id), cancellationToken);
        }

        var subtitle = Workspace.Subtitle(listing, submission?.SubmittedAt, now);

        var needs = fresh.Take(3).Select(r => new NeedsReplyDto(
            r.Id, r.Kind.ToString().ToLowerInvariant(), r.Kind.ToString(), r.MemberName, r.ServiceName ?? r.Kind.ToString(), r.CreatedAt)).ToList();

        return new MyBusinessDto(
            state,
            listing.Id,
            listing.Name,
            listing.Slug,
            listing.Tagline,
            listing.CategorySlug,
            subtitle,
            listing.IsPaused,
            listing.PausedAt,
            live && !listing.IsPaused && listing.ApprovedAt is { } approved && now - approved <= Workspace.JustApprovedFor,
            fresh.Count,
            stats,
            needs,
            summary,
            reference,
            verification,
            listing.AwayUntil is { } back && back > now ? back : null);
    }

    /// <summary>How many different members saved the business or one of its products: a count, never who (L2-041 AC6).</summary>
    private async Task<int> SavedByMembers(Guid listingId, CancellationToken cancellationToken)
    {
        var productIds = await db.Products.AsNoTracking().Where(p => p.ListingId == listingId).Select(p => p.Id).ToListAsync(cancellationToken);
        return await db.SavedItems.AsNoTracking()
            .Where(i => (i.Kind == SavedItemKind.Business && i.TargetId == listingId) || (i.Kind == SavedItemKind.Product && productIds.Contains(i.TargetId)))
            .Select(i => i.MemberSubject).Distinct().CountAsync(cancellationToken);
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
    string? Hours, string? Website, string? Highlight, Onboarding.SpaceInput? Space = null) : IRequest<ListingEditorDto>;

public sealed class SaveListingCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SaveListingCommand, ListingEditorDto>
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
            // A space stays in Rooms & rentals and has no hours; its own fields are checked as when it was listed (L2-200).
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

        if (request.Version != listing.Version)
        {
            throw new ConflictException("LISTING_CHANGED", "This listing changed since you opened it. Reload to see the latest.");
        }

        var now = clock.GetUtcNow();
        var before = $"{listing.Name} | {listing.CategorySlug}";
        var space = isSpace ? Onboarding.Drafts.SpaceFrom(request.Space) : null;
        var reworded = listing.Edit(
            name, tagline, request.CategorySlug!, request.About, space?.Neighbourhood ?? request.Where, hours, website, request.Highlight, now);
        if (space is not null)
        {
            listing.DescribeSpace(space);
        }

        if (reworded && listing.Stage == ListingStage.Live)
        {
            db.AuditRecords.Add(AuditRecord.Make(
                request.Subject, listing.OwnerName ?? listing.Name, "listing.recheck-requested", "listing", listing.Id.ToString(),
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
        return new PauseResultDto(true, listing.PausedAt, Workspace.State(listing), false);
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

        listing.Resume(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
        return new PauseResultDto(false, null, Workspace.State(listing), listing.Stage != ListingStage.Live);
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
