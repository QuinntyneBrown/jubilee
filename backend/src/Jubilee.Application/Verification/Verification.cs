using System.Text.Json;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Application.Reference;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Verification;

/// <summary>The member who acts: the session subject and the name shown in the audit log.</summary>
public sealed record Reviewer(string Subject, string Name)
{
    public string FirstName => Name.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? Name;
}

public static class StageWire
{
    public static string Of(ListingStage stage) => stage switch
    {
        ListingStage.PendingReference => "waiting-on-reference",
        ListingStage.ReadyToReview => "ready-to-review",
        ListingStage.NeedsDecision => "needs-a-decision",
        ListingStage.ChangesRequested => "changes-requested",
        ListingStage.Live => "live",
        ListingStage.Declined => "declined",
        _ => "draft",
    };

    public static string LabelOf(ListingStage stage) => stage switch
    {
        ListingStage.PendingReference => "Waiting on reference",
        ListingStage.ReadyToReview => "Ready to review",
        ListingStage.NeedsDecision => "Needs a decision",
        ListingStage.ChangesRequested => "Changes requested",
        ListingStage.Live => "Live",
        ListingStage.Declined => "Declined",
        _ => "Draft",
    };

    public static ListingStage? Parse(string? wire) => wire switch
    {
        "waiting-on-reference" => ListingStage.PendingReference,
        "ready-to-review" => ListingStage.ReadyToReview,
        "needs-a-decision" => ListingStage.NeedsDecision,
        "changes-requested" => ListingStage.ChangesRequested,
        _ => null,
    };

    /// <summary>The stages the queue lists.</summary>
    public static readonly ListingStage[] Queue =
        [ListingStage.ReadyToReview, ListingStage.PendingReference, ListingStage.NeedsDecision, ListingStage.ChangesRequested];
}

/// <summary>Business days for "overdue": Saturdays and Sundays do not count (L2-099 AC5).</summary>
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

internal static class ReferenceStates
{
    /// <summary><c>confirmed</c>, <c>waiting</c>, <c>cant-vouch</c>, <c>doesnt-know</c>, <c>expired</c> or <c>deleted</c>.</summary>
    public static string Of(IEnumerable<ReferenceLink> links, IEnumerable<ReferenceAnswer> answers, DateTimeOffset now)
    {
        var answer = answers.OrderByDescending(a => a.AnsweredAt).FirstOrDefault();
        if (answer is not null)
        {
            return answer.Kind switch
            {
                ReferenceAnswerKind.Vouches => "confirmed",
                ReferenceAnswerKind.CantVouch => "cant-vouch",
                _ => "doesnt-know",
            };
        }

        var head = links.OrderByDescending(l => l.IssuedAt).ThenBy(l => l.ClosedAt != null).FirstOrDefault();
        if (head is null)
        {
            return "deleted";
        }

        return head.IsOpen(now) ? "waiting" : "expired";
    }
}

public sealed record QueueTab(string Stage, string Label, int Count);

public sealed record QueueRow(
    Guid Id,
    string Name,
    string CategoryName,
    string OwnerName,
    string Church,
    string Reference,
    DateTimeOffset SubmittedAt,
    string Stage,
    string StageLabel,
    bool Overdue);

public sealed record VerificationQueueDto(
    int Total,
    int ReadyToReview,
    int? OldestWaitingDays,
    string Filter,
    IReadOnlyList<QueueTab> Tabs,
    IReadOnlyList<QueueRow> Rows);

/// <summary>The submitted listings, oldest first, with a count per stage (L2-099).</summary>
public sealed record GetVerificationQueueQuery(string? Stage, string? Search) : IRequest<VerificationQueueDto>;

public sealed class GetVerificationQueueQueryHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<GetVerificationQueueQuery, VerificationQueueDto>
{
    public async Task<VerificationQueueDto> Handle(GetVerificationQueueQuery request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var rows = await (
            from listing in db.Listings.AsNoTracking()
            join submission in db.ListingSubmissions.AsNoTracking() on listing.Id equals submission.ListingId
            where listing.DeletedAt == null && VerificationStages.Contains(listing.Stage)
            select new { listing, submission }).ToListAsync(cancellationToken);
        var ids = rows.Select(r => r.listing.Id).ToList();
        var links = await db.ReferenceLinks.AsNoTracking().Where(l => ids.Contains(l.ListingId)).ToListAsync(cancellationToken);
        var answers = await db.ReferenceAnswers.AsNoTracking().Where(a => ids.Contains(a.ListingId)).ToListAsync(cancellationToken);
        var owners = await OwnerNames(rows.Select(r => r.listing.OwnerId), cancellationToken);

        var all = rows.Select(r => new QueueRow(
                r.listing.Id,
                r.listing.Name,
                Category.Find(r.listing.CategorySlug)?.Name ?? r.listing.CategorySlug,
                r.listing.OwnerName ?? (r.listing.OwnerId is { } id && owners.TryGetValue(id, out var name) ? name : "Unknown"),
                r.submission.Church,
                ReferenceStates.Of(links.Where(l => l.ListingId == r.listing.Id), answers.Where(a => a.ListingId == r.listing.Id), now),
                r.submission.SubmittedAt,
                StageWire.Of(r.listing.Stage),
                StageWire.LabelOf(r.listing.Stage),
                r.listing.Stage == ListingStage.ReadyToReview
                    && r.submission.ReadyAt is { } ready
                    && now > BusinessDays.Add(ready, 2)))
            .OrderBy(r => r.SubmittedAt)
            .ToList();

        var tabs = StageWire.Queue
            .Select(s => new QueueTab(StageWire.Of(s), StageWire.LabelOf(s), all.Count(r => r.Stage == StageWire.Of(s))))
            .ToList();
        var filter = StageWire.Parse(request.Stage) is { } parsed ? StageWire.Of(parsed) : "all";
        IEnumerable<QueueRow> shown = all;
        if (filter != "all")
        {
            shown = shown.Where(r => r.Stage == filter);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            shown = shown.Where(r =>
                r.Name.Contains(term, StringComparison.OrdinalIgnoreCase)
                || r.OwnerName.Contains(term, StringComparison.OrdinalIgnoreCase)
                || r.Church.Contains(term, StringComparison.OrdinalIgnoreCase));
        }

        int? oldest = all.Count == 0 ? null : (int)Math.Floor((now - all[0].SubmittedAt).TotalDays);
        return new VerificationQueueDto(all.Count, tabs.First(t => t.Stage == "ready-to-review").Count, oldest, filter, tabs, shown.ToList());
    }

    private static readonly ListingStage[] VerificationStages = StageWire.Queue;

    private async Task<Dictionary<string, string>> OwnerNames(IEnumerable<string?> subjects, CancellationToken cancellationToken)
    {
        var ids = subjects.Select(s => Guid.TryParse(s, out var id) ? id : (Guid?)null).Where(g => g is not null).Select(g => g!.Value).ToList();
        var members = await db.Members.AsNoTracking().Where(m => ids.Contains(m.Id)).ToListAsync(cancellationToken);
        return members.ToDictionary(m => m.Id.ToString(), m => m.DisplayName);
    }
}

public sealed record ReviewOwner(string Name, string Email, bool EmailConfirmed, DateTimeOffset MemberSince, int OtherListings);

public sealed record ReviewReference(
    string Church,
    string ReferenceEmail,
    string State,
    string? AnsweredByName,
    string? AnsweredByRole,
    DateTimeOffset? AnsweredAt,
    string? Answer,
    string? Note);

public sealed record ReviewCheck(string Key, string Label, bool Ticked, string? TickedBy, DateTimeOffset? TickedAt);

public sealed record ReviewDecision(string Kind, DateTimeOffset DecidedAt, string DecidedByName, string? Note, IReadOnlyList<string> Areas);

public sealed record VerificationReviewDto(
    Guid Id,
    string Slug,
    string Name,
    string Tagline,
    string? About,
    string Kind,
    string CategorySlug,
    string CategoryName,
    DateTimeOffset SubmittedAt,
    string Stage,
    string StageLabel,
    ReviewOwner Owner,
    ReviewReference Reference,
    IReadOnlyList<string> Flags,
    IReadOnlyList<ReviewCheck> Checklist,
    ReviewDecision? Decision,
    IReadOnlyList<string> ChangedSinceRequest,
    bool IsOwnListing,
    string? CannotDecideBecause,
    ReviewSpace? Space = null);

/// <summary>What the verification team reads of a space: every field but its exact address (L2-191 AC3).</summary>
public sealed record ReviewSpace(
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
    public static ReviewSpace From(SpaceDetails space) => new(
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

internal static class Reviews
{
    public static async Task<(Listing Listing, ListingSubmission Submission)> Load(
        IAppDbContext db, Guid id, CancellationToken cancellationToken)
    {
        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == id && l.DeletedAt == null, cancellationToken);
        var submission = listing is null ? null : await db.ListingSubmissions.SingleOrDefaultAsync(s => s.ListingId == id, cancellationToken);
        if (listing is null || submission is null)
        {
            throw new NotFoundException("listing_not_found", "We can't find that listing.");
        }

        return (listing, submission);
    }

    public static void NotOwn(Reviewer reviewer, Listing listing)
    {
        if (listing.OwnerId == reviewer.Subject)
        {
            throw new ForbiddenException("OWN_LISTING", "You can't decide on your own listing.");
        }
    }

    public static async Task<Member?> OwnerOf(IAppDbContext db, Listing listing, CancellationToken cancellationToken) =>
        Guid.TryParse(listing.OwnerId, out var id)
            ? await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == id, cancellationToken)
            : null;

    public static string Json(object value) => JsonSerializer.Serialize(value);
}

/// <summary>One listing to review: the owner, the reference's answer, the flags and the checklist (L2-100).</summary>
public sealed record GetVerificationReviewQuery(Reviewer Reviewer, Guid ListingId) : IRequest<VerificationReviewDto>;

public sealed class GetVerificationReviewQueryHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<GetVerificationReviewQuery, VerificationReviewDto>
{
    public async Task<VerificationReviewDto> Handle(GetVerificationReviewQuery request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (listing, submission) = await Reviews.Load(db, request.ListingId, cancellationToken);
        var links = await db.ReferenceLinks.AsNoTracking().Where(l => l.ListingId == listing.Id).ToListAsync(cancellationToken);
        var answers = await db.ReferenceAnswers.AsNoTracking().Where(a => a.ListingId == listing.Id).ToListAsync(cancellationToken);
        var answer = answers.OrderByDescending(a => a.AnsweredAt).FirstOrDefault();
        var member = await Reviews.OwnerOf(db, listing, cancellationToken);
        var otherListings = member is null
            ? 0
            : await db.Listings.CountAsync(l => l.OwnerId == listing.OwnerId && l.Id != listing.Id && l.DeletedAt == null, cancellationToken);
        var ticks = await db.ReviewTicks.AsNoTracking().Where(t => t.ListingId == listing.Id).ToListAsync(cancellationToken);
        var decision = await db.ListingDecisions.AsNoTracking()
            .Where(d => d.ListingId == listing.Id)
            .OrderByDescending(d => d.DecidedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (answer is not null)
        {
            // Reading the reference's answer is access to personal data and is recorded with its reason (L2-150 AC1).
            AuditLog.Record(db, request.Reviewer, "reference.viewed", "listing", listing.Id.ToString(), null, null, $"Review of listing {listing.Id}", now);
            await db.SaveChangesAsync(cancellationToken);
        }

        var changed = new List<string>();
        if (decision is { Kind: DecisionKind.ChangesRequested, ResolvedAt: not null })
        {
            if (decision.SnapshotName != listing.Name) changed.Add("name");
            if (decision.SnapshotTagline != listing.Tagline) changed.Add("tagline");
            if (decision.SnapshotCategory != listing.CategorySlug) changed.Add("category");
            if (decision.SnapshotAbout != listing.About) changed.Add("about");
        }

        var isOwn = listing.OwnerId == request.Reviewer.Subject;
        return new VerificationReviewDto(
            listing.Id,
            listing.Slug,
            listing.Name,
            listing.Tagline,
            listing.About,
            Onboarding.ListingDraftDto.Wire(listing.Kind),
            listing.CategorySlug,
            Category.Find(listing.CategorySlug)?.Name ?? listing.CategorySlug,
            submission.SubmittedAt,
            StageWire.Of(listing.Stage),
            StageWire.LabelOf(listing.Stage),
            new ReviewOwner(
                listing.OwnerName ?? member?.DisplayName ?? "Unknown",
                member?.Email ?? string.Empty,
                member?.EmailStatus == EmailStatus.Confirmed,
                member?.CreatedAt ?? listing.CreatedAt,
                otherListings),
            new ReviewReference(
                submission.Church,
                submission.PastorEmail,
                ReferenceStates.Of(links, answers, now),
                answer?.Name,
                answer?.Role,
                answer?.AnsweredAt,
                answer is null ? null : answer.Kind switch
                {
                    ReferenceAnswerKind.Vouches => "vouches",
                    ReferenceAnswerKind.CantVouch => "cant-vouch",
                    _ => "doesnt-know",
                },
                answer?.Note),
            submission.Flags,
            [.. ChecklistItems.All.Select(i =>
            {
                var tick = ticks.SingleOrDefault(t => t.Item == i.Key);
                return new ReviewCheck(i.Key, i.Label, tick is not null, tick?.TickedByName, tick?.TickedAt);
            })],
            decision is null ? null : new ReviewDecision(decision.Kind.ToString(), decision.DecidedAt, decision.DecidedByName, decision.Note, decision.Areas),
            changed,
            isOwn,
            isOwn ? "This is your own listing."
                : listing.Stage switch
                {
                    ListingStage.PendingReference => "Waiting for the church reference.",
                    ListingStage.ChangesRequested => "Waiting on the owner.",
                    ListingStage.Live or ListingStage.Declined => "A decision has been made.",
                    _ => null,
                },
            listing.Space is null ? null : ReviewSpace.From(listing.Space));
    }
}

/// <summary>The ticks of the checklist, saved with the reviewer and the time (L2-100 AC3).</summary>
public sealed record SaveChecklistCommand(Reviewer Reviewer, Guid ListingId, IReadOnlyList<string> Ticked) : IRequest<IReadOnlyList<ReviewCheck>>;

public sealed class SaveChecklistCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<SaveChecklistCommand, IReadOnlyList<ReviewCheck>>
{
    public async Task<IReadOnlyList<ReviewCheck>> Handle(SaveChecklistCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (listing, _) = await Reviews.Load(db, request.ListingId, cancellationToken);
        Reviews.NotOwn(request.Reviewer, listing);
        if (listing.Stage is ListingStage.Live or ListingStage.Declined)
        {
            throw new ConflictException("ALREADY_DECIDED", "A decision has already been made on this listing.");
        }

        var wanted = request.Ticked.Where(ChecklistItems.IsKnown).Distinct().ToHashSet();
        var current = await db.ReviewTicks.Where(t => t.ListingId == listing.Id).ToListAsync(cancellationToken);
        db.ReviewTicks.RemoveRange(current.Where(t => !wanted.Contains(t.Item)));
        foreach (var item in wanted.Where(w => current.All(t => t.Item != w)))
        {
            db.ReviewTicks.Add(ReviewTick.Make(listing.Id, item, request.Reviewer.Subject, request.Reviewer.Name, now));
        }

        await db.SaveChangesAsync(cancellationToken);
        var ticks = await db.ReviewTicks.AsNoTracking().Where(t => t.ListingId == listing.Id).ToListAsync(cancellationToken);
        return [.. ChecklistItems.All.Select(i =>
        {
            var tick = ticks.SingleOrDefault(t => t.Item == i.Key);
            return new ReviewCheck(i.Key, i.Label, tick is not null, tick?.TickedByName, tick?.TickedAt);
        })];
    }
}

public sealed record DecisionResultDto(string Stage, string StageLabel, DateTimeOffset DecidedAt, string DecidedByName, string OwnerFirstName);

/// <summary>"Approve and publish": the listing goes live with the Verified mark (L2-101).</summary>
public sealed record ApproveListingCommand(Reviewer Reviewer, Guid ListingId, string? Note) : IRequest<DecisionResultDto>;

public sealed class ApproveListingCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<ApproveListingCommand, DecisionResultDto>
{
    public async Task<DecisionResultDto> Handle(ApproveListingCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (listing, submission) = await Reviews.Load(db, request.ListingId, cancellationToken);
        Reviews.NotOwn(request.Reviewer, listing);
        switch (listing.Stage)
        {
            case ListingStage.PendingReference:
                throw new ConflictException("WAITING_ON_REFERENCE", "Waiting for the church reference.");
            case ListingStage.ChangesRequested:
                throw new ConflictException("WAITING_ON_OWNER", "Waiting on the owner.");
            case ListingStage.Live or ListingStage.Declined or ListingStage.Draft:
                throw new ConflictException("ALREADY_DECIDED", "A decision has already been made on this listing.");
        }

        var ticked = await db.ReviewTicks.Where(t => t.ListingId == listing.Id).Select(t => t.Item).ToListAsync(cancellationToken);
        var note = request.Note?.Trim();
        if (ticked.Count < ChecklistItems.All.Count && string.IsNullOrEmpty(note))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["note"] = "NOTE_REQUIRED" });
        }

        var before = StageWire.Of(listing.Stage);
        listing.Approve(request.Reviewer.Subject, now);
        listing.ConfirmReference(now);
        db.ListingDecisions.Add(ListingDecision.Make(
            listing.Id, DecisionKind.Approved, request.Reviewer.Subject, request.Reviewer.Name, note, [], ticked, listing, now));
        AuditLog.Record(
            db, request.Reviewer, "listing.approved", "listing", listing.Id.ToString(), before,
            Reviews.Json(new { stage = "live", ticked, unticked = ChecklistItems.All.Select(i => i.Key).Except(ticked) }), note, now);
        Notifications.NotificationRules.Tell(
            db, listing.OwnerId, "listing", $"{listing.Name} is verified and live", "Members can find your business now.", "/my-business", now);
        var owner = await Reviews.OwnerOf(db, listing, cancellationToken);
        if (owner is not null)
        {
            db.OutboxMessages.Add(OutboxMessage.Email(
                owner.Id,
                owner.Email,
                $"{listing.Name} is verified and live on Jubilee",
                $"Hi {owner.FirstName},\n\n{listing.Name} is verified and live. Members can find you in {Category.Find(listing.CategorySlug)?.Name ?? listing.CategorySlug}.\n\nSee it here: {settings.PublicBaseUrl.TrimEnd('/')}/b/{listing.Slug}\n\nJubilee · Toronto's Christian marketplace\n",
                now));
        }

        await db.SaveChangesAsync(cancellationToken);
        return new DecisionResultDto("live", "Live", now, request.Reviewer.Name, owner?.FirstName ?? "the owner");
    }
}

/// <summary>"Request changes": the listing stays unpublished and the owner is told what to change (L2-102).</summary>
public sealed record RequestChangesCommand(Reviewer Reviewer, Guid ListingId, IReadOnlyList<string>? Areas, string? Message) : IRequest<DecisionResultDto>;

public sealed class RequestChangesCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<RequestChangesCommand, DecisionResultDto>
{
    public const int MessageLimit = 2000;

    public async Task<DecisionResultDto> Handle(RequestChangesCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (listing, _) = await Reviews.Load(db, request.ListingId, cancellationToken);
        Reviews.NotOwn(request.Reviewer, listing);
        switch (listing.Stage)
        {
            case ListingStage.PendingReference:
                throw new ConflictException("WAITING_ON_REFERENCE", "Waiting for the church reference.");
            case ListingStage.ChangesRequested:
                throw new ConflictException("WAITING_ON_OWNER", "Waiting on the owner.");
            case ListingStage.Live or ListingStage.Declined or ListingStage.Draft:
                throw new ConflictException("ALREADY_DECIDED", "A decision has already been made on this listing.");
        }

        var message = request.Message?.Trim() ?? string.Empty;
        var errors = new Dictionary<string, string>();
        if (message.Length == 0)
        {
            errors["message"] = "MESSAGE_REQUIRED";
        }
        else if (message.Length > MessageLimit)
        {
            errors["message"] = "MESSAGE_TOO_LONG";
        }

        var areas = (request.Areas ?? []).Where(ChangeAreas.IsKnown).Distinct().ToList();
        if (areas.Count == 0)
        {
            errors["areas"] = "AREA_REQUIRED";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var before = StageWire.Of(listing.Stage);
        listing.MoveTo(ListingStage.ChangesRequested);
        db.ListingDecisions.Add(ListingDecision.Make(
            listing.Id, DecisionKind.ChangesRequested, request.Reviewer.Subject, request.Reviewer.Name, message, areas, [], listing, now));
        AuditLog.Record(
            db, request.Reviewer, "listing.changes-requested", "listing", listing.Id.ToString(), before,
            Reviews.Json(new { stage = "changes-requested", areas }), message, now);
        Notifications.NotificationRules.Tell(
            db, listing.OwnerId, "listing", $"Changes needed for {listing.Name}", message, "/my-business", now);
        var owner = await Reviews.OwnerOf(db, listing, cancellationToken);
        if (owner is not null)
        {
            var wanted = string.Join(", ", areas.Select(a => ChangeAreas.All.First(x => x.Key == a).Label.ToLowerInvariant()));
            db.OutboxMessages.Add(OutboxMessage.Email(
                owner.Id,
                owner.Email,
                $"{listing.Name}: changes needed before we can publish",
                $"Hi {owner.FirstName},\n\n{request.Reviewer.FirstName} from the Jubilee verification team asked for changes to {listing.Name} ({wanted}):\n\n{message}\n\nMake the changes and resubmit from My business: {settings.PublicBaseUrl.TrimEnd('/')}/my-business\n\nJubilee · Toronto's Christian marketplace\n",
                now));
        }

        await db.SaveChangesAsync(cancellationToken);
        return new DecisionResultDto("changes-requested", "Changes requested", now, request.Reviewer.Name, owner?.FirstName ?? "the owner");
    }
}

/// <summary>"Decline listing": from Needs a decision only; the owner is e-mailed the reason (L2-104).</summary>
public sealed record DeclineListingCommand(Reviewer Reviewer, Guid ListingId, string? Reason) : IRequest<DecisionResultDto>;

public sealed class DeclineListingCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<DeclineListingCommand, DecisionResultDto>
{
    public async Task<DecisionResultDto> Handle(DeclineListingCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (listing, _) = await Reviews.Load(db, request.ListingId, cancellationToken);
        Reviews.NotOwn(request.Reviewer, listing);
        if (listing.Stage is ListingStage.Live or ListingStage.Declined)
        {
            throw new ConflictException("ALREADY_DECIDED", "A decision has already been made on this listing.");
        }

        if (listing.Stage != ListingStage.NeedsDecision)
        {
            throw new ConflictException("NOT_NEEDS_DECISION", "Only a listing that needs a decision can be declined.");
        }

        var reason = request.Reason?.Trim() ?? string.Empty;
        if (reason.Length == 0)
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["reason"] = "REASON_REQUIRED" });
        }

        listing.MoveTo(ListingStage.Declined);
        db.ListingDecisions.Add(ListingDecision.Make(
            listing.Id, DecisionKind.Declined, request.Reviewer.Subject, request.Reviewer.Name, reason, [], [], listing, now));
        AuditLog.Record(
            db, request.Reviewer, "listing.declined", "listing", listing.Id.ToString(), "needs-a-decision",
            Reviews.Json(new { stage = "declined" }), reason, now);
        Notifications.NotificationRules.Tell(
            db, listing.OwnerId, "listing", $"We couldn’t verify {listing.Name}", reason, "/my-business", now);
        var owner = await Reviews.OwnerOf(db, listing, cancellationToken);
        if (owner is not null)
        {
            db.OutboxMessages.Add(OutboxMessage.Email(
                owner.Id,
                owner.Email,
                $"We couldn’t verify {listing.Name}",
                $"Hi {owner.FirstName},\n\nWe couldn’t verify {listing.Name}.\n\n{reason}\n\nYou can list again after naming a different pastor or elder: {settings.PublicBaseUrl.TrimEnd('/')}/list\n\nJubilee · Toronto's Christian marketplace\n",
                now));
        }

        await db.SaveChangesAsync(cancellationToken);
        return new DecisionResultDto("declined", "Declined", now, request.Reviewer.Name, owner?.FirstName ?? "the owner");
    }
}

public sealed record ChangeRequestDto(IReadOnlyList<string> Areas, string Message, string ReviewerFirstName, DateTimeOffset RequestedAt);

public sealed record DeclinedDto(string Reason, DateTimeOffset DecidedAt);

/// <summary>What the owner sees of the verification: the stage, the requested changes, the reason for declining.</summary>
public sealed record OwnerVerificationDto(
    Guid ListingId,
    string Business,
    string Stage,
    string StageLabel,
    ChangeRequestDto? ChangesRequested,
    DeclinedDto? Declined,
    DateTimeOffset? ApprovedAt);

public sealed record GetOwnerVerificationQuery(string Subject, Guid ListingId) : IRequest<OwnerVerificationDto>;

public sealed class GetOwnerVerificationQueryHandler(IAppDbContext db) : IRequestHandler<GetOwnerVerificationQuery, OwnerVerificationDto>
{
    public async Task<OwnerVerificationDto> Handle(GetOwnerVerificationQuery request, CancellationToken cancellationToken)
    {
        var listing = await db.Listings.AsNoTracking()
            .SingleOrDefaultAsync(l => l.Id == request.ListingId && l.OwnerId == request.Subject && l.DeletedAt == null, cancellationToken)
            ?? throw new NotFoundException("listing_not_found", "We can't find that listing.");
        var decision = await db.ListingDecisions.AsNoTracking()
            .Where(d => d.ListingId == listing.Id)
            .OrderByDescending(d => d.DecidedAt)
            .FirstOrDefaultAsync(cancellationToken);
        return new OwnerVerificationDto(
            listing.Id,
            listing.Name,
            StageWire.Of(listing.Stage),
            StageWire.LabelOf(listing.Stage),
            listing.Stage == ListingStage.ChangesRequested && decision is { Kind: DecisionKind.ChangesRequested }
                ? new ChangeRequestDto(
                    [.. decision.Areas.Select(a => ChangeAreas.All.First(x => x.Key == a).Label)],
                    decision.Note ?? string.Empty,
                    decision.DecidedByName.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? decision.DecidedByName,
                    decision.DecidedAt)
                : null,
            listing.Stage == ListingStage.Declined && decision is { Kind: DecisionKind.Declined }
                ? new DeclinedDto(decision.Note ?? string.Empty, decision.DecidedAt)
                : null,
            listing.ApprovedAt);
    }
}

/// <summary>
/// The owner presses "Resubmit" after changes: the listing returns to the queue with its original
/// submitted date, or waits on a new reference request when the verifier asked for one (L2-103,
/// L2-102 AC5). The words may be edited in the same call until My business has its own editor.
/// </summary>
public sealed record ResubmitListingCommand(
    string Subject, string OwnerName, Guid ListingId, string? Name, string? Tagline, string? CategorySlug, string? About)
    : IRequest<OwnerVerificationDto>;

public sealed class ResubmitListingCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings, ISender sender)
    : IRequestHandler<ResubmitListingCommand, OwnerVerificationDto>
{
    public async Task<OwnerVerificationDto> Handle(ResubmitListingCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var listing = await db.Listings.SingleOrDefaultAsync(
                l => l.Id == request.ListingId && l.OwnerId == request.Subject && l.DeletedAt == null, cancellationToken)
            ?? throw new NotFoundException("listing_not_found", "We can't find that listing.");
        var submission = await db.ListingSubmissions.SingleAsync(s => s.ListingId == listing.Id, cancellationToken);
        if (listing.Stage != ListingStage.ChangesRequested)
        {
            throw new ConflictException("NOT_CHANGES_REQUESTED", "This listing isn't waiting for changes.");
        }

        var decision = await db.ListingDecisions
            .Where(d => d.ListingId == listing.Id && d.Kind == DecisionKind.ChangesRequested && d.ResolvedAt == null)
            .OrderByDescending(d => d.DecidedAt)
            .FirstAsync(cancellationToken);

        var errors = new Dictionary<string, string>();
        var name = request.Name?.Trim() is { Length: > 0 } n ? n : listing.Name;
        var tagline = request.Tagline?.Trim() is { Length: > 0 } t ? t : listing.Tagline;
        var category = request.CategorySlug is { Length: > 0 } c ? c : listing.CategorySlug;
        if (tagline.Length > 90)
        {
            errors["tagline"] = $"TOO_LONG:{tagline.Length}";
        }

        if (Category.Find(category) is null)
        {
            errors["categorySlug"] = "INVALID";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        listing.Reword(name, tagline, category, request.About is null ? listing.About : request.About.Trim());
        decision.Resolve(now);
        if (decision.Areas.Contains("reference"))
        {
            listing.MoveTo(ListingStage.PendingReference);
            var (_, first) = await Reference.ReferenceRequests.OwnerNames(db, request.Subject, cancellationToken);
            Reference.ReferenceRequests.Issue(
                db, settings, listing, request.OwnerName, first, submission, ReferenceLinkKind.Change,
                await Reference.ReferenceRequests.OpenLinks(db, listing.Id, now, cancellationToken), now);
        }
        else
        {
            listing.MoveTo(ListingStage.ReadyToReview);
            submission.MarkReady(now);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await sender.Send(new GetOwnerVerificationQuery(request.Subject, listing.Id), cancellationToken);
    }
}

/// <summary>
/// The daily retention pass: 90 days after an approval or a decline the reference's answer, name,
/// role, note and e-mail are deleted; the listing keeps only the month it was confirmed (L2-146,
/// L2-101 AC5, L2-104 AC2). Safe to repeat.
/// </summary>
public sealed record DeleteDecidedReferenceDataCommand : IRequest<int>;

public sealed class DeleteDecidedReferenceDataCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<DeleteDecidedReferenceDataCommand, int>
{
    public static readonly TimeSpan Retention = TimeSpan.FromDays(90);

    public async Task<int> Handle(DeleteDecidedReferenceDataCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var due = await db.ListingDecisions
            .Where(d => d.Kind != DecisionKind.ChangesRequested && d.ReferenceDeletedAt == null && d.DecidedAt <= now - Retention)
            .ToListAsync(cancellationToken);
        foreach (var decision in due)
        {
            db.ReferenceAnswers.RemoveRange(db.ReferenceAnswers.Where(a => a.ListingId == decision.ListingId));
            foreach (var link in await db.ReferenceLinks.Where(l => l.ListingId == decision.ListingId).ToListAsync(cancellationToken))
            {
                link.Scrub();
            }

            (await db.ListingSubmissions.SingleOrDefaultAsync(s => s.ListingId == decision.ListingId, cancellationToken))?.ScrubReference();
            decision.ReferenceDeleted(now);
        }

        await db.SaveChangesAsync(cancellationToken);
        return due.Count;
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
