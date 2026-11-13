using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Directory;
using Jubilee.Application.Errors;
using Jubilee.Application.Notifications;
using Jubilee.Application.Reviews;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Moderation;

public sealed record ReportListingInfoDto(string Name, string Slug);

public sealed record ReportListItemDto(
    Guid Id, string Type, ReportListingInfoDto Listing, string Reason, string Description, string ReporterName,
    DateTimeOffset CreatedAt, string Status, bool Overdue);

public sealed record ReportListDto(IReadOnlyList<ReportListItemDto> Items, int UnresolvedCount, int OverdueCount);

public sealed record ReportedListingDto(string Name, string Slug, string State);

public sealed record ReportEntryDto(string Reason, string Description, DateTimeOffset At);

public sealed record ReportedMessageDto(string From, bool FromOwner, string Body, DateTimeOffset At);

public sealed record ReportedConversationDto(string MemberName, IReadOnlyList<ReportedMessageDto> Messages);

public sealed record ReportActionDto(string Kind, string ResolutionNote, string? MessageText, string By, DateTimeOffset At);

/// <summary>A reported review as it stands, for the Jubilee team (L2-237 AC2).</summary>
public sealed record ReportedReviewDto(
    string Author, string Initials, int Rating, string ItemName, string Text, DateTimeOffset CreatedAt, DateTimeOffset? EditedAt,
    ReviewReplyDto? Reply, bool TakenDown);

public sealed record ReportDetailDto(
    Guid Id, string Type, string Status, bool Overdue, DateTimeOffset CreatedAt, string ReporterName, ReportedListingDto Listing,
    IReadOnlyList<ReportEntryDto> Entries, ReportedConversationDto? Conversation, IReadOnlyList<ReportActionDto> Actions,
    string? ResolutionNote, ReportedReviewDto? Review = null);

/// <summary>The words the API uses for the states and actions of a report.</summary>
public static class ReportWire
{
    public static string Status(ReportStatus status) => status switch
    {
        ReportStatus.InReview => "in-review",
        ReportStatus.Resolved => "resolved",
        _ => "open",
    };

    public static string Action(ReportActionKind kind) => kind switch
    {
        ReportActionKind.Dismiss => "dismiss",
        ReportActionKind.MessageReporter => "message-reporter",
        ReportActionKind.MessageOwner => "message-owner",
        ReportActionKind.PlaceOnHold => "hold",
        ReportActionKind.RemoveListing => "remove",
        ReportActionKind.TakeDownReview => "take-down",
        _ => "lift-hold",
    };

    public static ReportActionKind? ParseAction(string? wire) => wire switch
    {
        "dismiss" => ReportActionKind.Dismiss,
        "message-reporter" => ReportActionKind.MessageReporter,
        "message-owner" => ReportActionKind.MessageOwner,
        "hold" => ReportActionKind.PlaceOnHold,
        "remove" => ReportActionKind.RemoveListing,
        "lift-hold" => ReportActionKind.LiftHold,
        "take-down" => ReportActionKind.TakeDownReview,
        _ => null,
    };

    /// <summary>The actions a report of a review takes; the listing's actions do not apply to it (L2-237 AC2).</summary>
    public static bool AppliesTo(ReportActionKind kind, bool isReview) => isReview
        ? kind is ReportActionKind.Dismiss or ReportActionKind.MessageReporter or ReportActionKind.TakeDownReview
        : kind is not ReportActionKind.TakeDownReview;

    /// <summary>The reason of a review report as the reporter chose it (L2-236 AC1).</summary>
    public static string ReasonLabel(ReviewReportReason reason) => reason switch
    {
        ReviewReportReason.NotARealDealing => "It isn’t about a real dealing with them",
        ReviewReportReason.Abusive => "It’s abusive or hateful",
        ReviewReportReason.PrivateDetails => "It shares private details",
        ReviewReportReason.Advertising => "It’s advertising or off-topic",
        _ => "Something else",
    };

    public static string ReasonLabel(ReportReason reason) => reason switch
    {
        ReportReason.NotRealBusiness => "Not a real business",
        ReportReason.Misleading => "Misleading",
        ReportReason.BadExperience => "Bad experience",
        _ => "Other",
    };

    /// <summary>How a listing stands: <c>live</c>, <c>paused</c>, <c>on-hold</c>, <c>removed</c> or <c>not-live</c>.</summary>
    public static string ListingState(Listing listing) =>
        listing.DeletedAt is not null ? "removed"
        : listing.IsUnderModerationHold ? "on-hold"
        : listing.IsPaused ? "paused"
        : listing.Stage == ListingStage.Live ? "live"
        : "not-live";
}

/// <summary>A listing report or a conversation report, read the same way (L2-105).</summary>
internal sealed class LoadedReport
{
    public required Guid Id { get; init; }

    public required string Type { get; init; }

    public required Guid ListingId { get; init; }

    public required string ReporterSubject { get; init; }

    public required string ReporterName { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }

    public required ReportStatus Status { get; init; }

    public required string? ResolutionNote { get; init; }

    public required string Reason { get; init; }

    public required string Description { get; init; }

    public required IReadOnlyList<ReportEntryDto> Entries { get; init; }

    public Guid? ConversationId { get; init; }

    public ListingReport? ListingReport { get; init; }

    public ConversationReport? ConversationReport { get; init; }

    public ReviewReport? ReviewReport { get; init; }

    public bool IsOverdue(DateTimeOffset now) => Status == ReportStatus.Open && now > BusinessDays.Add(CreatedAt, 1);

    public ReportStatus CurrentStatus => ListingReport?.Status ?? ConversationReport?.Status ?? ReviewReport!.Status;

    public string? CurrentNote => ListingReport is not null ? ListingReport.ResolutionNote
        : ConversationReport is not null ? ConversationReport.ResolutionNote
        : ReviewReport!.ResolutionNote;

    public void StartReview()
    {
        ListingReport?.StartReview();
        ConversationReport?.StartReview();
        ReviewReport?.StartReview();
    }

    public void Resolve(string note, DateTimeOffset now)
    {
        ListingReport?.Resolve(note, now);
        ConversationReport?.Resolve(note, now);
        ReviewReport?.Resolve(note, now);
    }
}

internal static class ReportStore
{
    public static async Task<List<LoadedReport>> LoadAll(IAppDbContext db, CancellationToken cancellationToken)
    {
        var loaded = new List<LoadedReport>();
        foreach (var report in await db.ListingReports.Include(r => r.Entries).ToListAsync(cancellationToken))
        {
            loaded.Add(From(report));
        }

        var conversations = await db.ConversationReports.ToListAsync(cancellationToken);
        var ids = conversations.Select(c => c.ConversationId).ToList();
        var byId = await db.Conversations.AsNoTracking().Where(c => ids.Contains(c.Id)).ToDictionaryAsync(c => c.Id, cancellationToken);
        foreach (var report in conversations)
        {
            loaded.Add(From(report, byId[report.ConversationId]));
        }

        var reviewReports = await db.ReviewReports.ToListAsync(cancellationToken);
        foreach (var report in reviewReports)
        {
            loaded.Add(From(report, reviewReports.Where(r => r.ReviewId == report.ReviewId)));
        }

        return loaded;
    }

    public static async Task<LoadedReport> Load(IAppDbContext db, Guid id, CancellationToken cancellationToken)
    {
        var listing = await db.ListingReports.Include(r => r.Entries).SingleOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (listing is not null)
        {
            return From(listing);
        }

        var conversation = await db.ConversationReports.SingleOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (conversation is not null)
        {
            var thread = await db.Conversations.AsNoTracking().SingleAsync(c => c.Id == conversation.ConversationId, cancellationToken);
            return From(conversation, thread);
        }

        var review = await db.ReviewReports.SingleOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (review is not null)
        {
            return From(review, await db.ReviewReports.AsNoTracking().Where(r => r.ReviewId == review.ReviewId).ToListAsync(cancellationToken));
        }

        throw new NotFoundException("report_not_found", "There is no such report.");
    }

    private static LoadedReport From(ListingReport report)
    {
        var entries = report.Entries.OrderBy(e => e.CreatedAt).ToList();
        var first = entries.FirstOrDefault();
        return new LoadedReport
        {
            Id = report.Id,
            Type = "listing",
            ListingId = report.ListingId,
            ReporterSubject = report.ReporterSubject,
            ReporterName = string.IsNullOrWhiteSpace(report.ReporterName) ? "A member" : report.ReporterName,
            CreatedAt = report.CreatedAt,
            Status = report.Status,
            ResolutionNote = report.ResolutionNote,
            Reason = first is null ? string.Empty : ReportWire.ReasonLabel(first.Reason),
            Description = first?.Description ?? string.Empty,
            Entries = [.. entries.Select(e => new ReportEntryDto(ReportWire.ReasonLabel(e.Reason), e.Description, e.CreatedAt))],
            ListingReport = report,
        };
    }

    private static LoadedReport From(ConversationReport report, Conversation conversation) => new()
    {
        Id = report.Id,
        Type = "conversation",
        ListingId = conversation.ListingId,
        ReporterSubject = report.ReporterSubject,
        ReporterName = string.IsNullOrWhiteSpace(conversation.MemberName) ? "A member" : conversation.MemberName,
        CreatedAt = report.CreatedAt,
        Status = report.Status,
        ResolutionNote = report.ResolutionNote,
        Reason = "Conversation",
        Description = report.Reason,
        Entries = [new ReportEntryDto("Conversation", report.Reason, report.CreatedAt)],
        ConversationId = report.ConversationId,
        ConversationReport = report,
    };

    /// <summary>A report of a review, with every report of that review as its entries (L2-237 AC2).</summary>
    private static LoadedReport From(ReviewReport report, IEnumerable<ReviewReport> ofTheReview) => new()
    {
        Id = report.Id,
        Type = "review",
        ListingId = report.ListingId,
        ReporterSubject = report.ReporterSubject,
        ReporterName = string.IsNullOrWhiteSpace(report.ReporterName) ? "A member" : report.ReporterName,
        CreatedAt = report.CreatedAt,
        Status = report.Status,
        ResolutionNote = report.ResolutionNote,
        Reason = ReportWire.ReasonLabel(report.Reason),
        Description = report.Note ?? string.Empty,
        Entries = [.. ofTheReview.OrderBy(r => r.CreatedAt).Select(r => new ReportEntryDto(ReportWire.ReasonLabel(r.Reason), r.Note ?? string.Empty, r.CreatedAt))],
        ReviewReport = report,
    };

    public static async Task<ReportDetailDto> Detail(
        IAppDbContext db, LoadedReport report, Listing listing, bool withConversation, DateTimeOffset now, CancellationToken cancellationToken)
    {
        ReportedConversationDto? conversation = null;
        if (withConversation && report.ConversationId is { } conversationId)
        {
            var thread = await db.Conversations.AsNoTracking().SingleAsync(c => c.Id == conversationId, cancellationToken);
            var messages = await db.Messages.AsNoTracking().Where(m => m.ConversationId == conversationId).ToListAsync(cancellationToken);
            conversation = new ReportedConversationDto(
                thread.MemberName,
                [.. messages.OrderBy(m => m.CreatedAt).Select(m => new ReportedMessageDto(m.SenderName, m.FromOwner, m.Body, m.CreatedAt))]);
        }

        var actions = (await db.ReportActions.AsNoTracking().Where(a => a.ReportId == report.Id).ToListAsync(cancellationToken))
            .OrderBy(a => a.At)
            .Select(a => new ReportActionDto(ReportWire.Action(a.Kind), a.ResolutionNote, a.MessageText, a.ActorName, a.At))
            .ToList();
        ReportedReviewDto? review = null;
        if (report.ReviewReport is { } reviewReport
            && await db.Reviews.AsNoTracking().SingleOrDefaultAsync(r => r.Id == reviewReport.ReviewId, cancellationToken) is { } reported)
        {
            var shown = ReviewDto.From(reported, null);
            review = new ReportedReviewDto(
                shown.Author, shown.Initials, shown.Rating, shown.ItemName, shown.Text, shown.CreatedAt, shown.EditedAt, shown.Reply, !reported.IsShown);
        }

        var status = report.CurrentStatus;
        return new ReportDetailDto(
            report.Id, report.Type, ReportWire.Status(status), status == ReportStatus.Open && now > BusinessDays.Add(report.CreatedAt, 1),
            report.CreatedAt, report.ReporterName,
            new ReportedListingDto(listing.Name, listing.Slug, ReportWire.ListingState(listing)), report.Entries, conversation, actions,
            report.CurrentNote, review);
    }

    /// <summary>A moderator cannot work on a report of their own listing (L2-098 AC5).</summary>
    public static void EnsureNotOwn(Reviewer reviewer, Listing listing)
    {
        if (listing.OwnerId == reviewer.Subject)
        {
            throw new ForbiddenException("OWN_LISTING", "You can't handle a report about your own business.");
        }
    }
}

/// <summary>The reports the Jubilee team reviews, oldest first (L2-105 AC1, AC4).</summary>
public sealed record GetReportsQuery(string? Status) : IRequest<ReportListDto>;

public sealed class GetReportsQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<GetReportsQuery, ReportListDto>
{
    public async Task<ReportListDto> Handle(GetReportsQuery request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var reports = await ReportStore.LoadAll(db, cancellationToken);
        var ids = reports.Select(r => r.ListingId).Distinct().ToList();
        var listings = await db.Listings.AsNoTracking().Where(l => ids.Contains(l.Id)).ToDictionaryAsync(l => l.Id, cancellationToken);
        var shown = reports.Where(r => request.Status switch
        {
            "resolved" => r.Status == ReportStatus.Resolved,
            "all" => true,
            "open" => r.Status == ReportStatus.Open,
            "in-review" => r.Status == ReportStatus.InReview,
            _ => r.Status != ReportStatus.Resolved,
        });
        var items = shown
            .OrderBy(r => r.Status == ReportStatus.Resolved).ThenBy(r => r.CreatedAt)
            .Select(r => new ReportListItemDto(
                r.Id, r.Type, new ReportListingInfoDto(listings[r.ListingId].Name, listings[r.ListingId].Slug), r.Reason, r.Description,
                r.ReporterName, r.CreatedAt, ReportWire.Status(r.Status), r.IsOverdue(now)))
            .ToList();
        var unresolved = reports.Where(r => r.Status != ReportStatus.Resolved).ToList();
        return new ReportListDto(items, unresolved.Count, unresolved.Count(r => r.IsOverdue(now)));
    }
}

/// <summary>
/// Opens a report: it moves to review and the access is audited with the report as the reason. A reported
/// conversation's messages are read only while its report is unresolved (L2-063 AC3, L2-150 AC1).
/// </summary>
public sealed record OpenReportCommand(Reviewer Reviewer, Guid ReportId) : IRequest<ReportDetailDto>;

public sealed class OpenReportCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<OpenReportCommand, ReportDetailDto>
{
    public async Task<ReportDetailDto> Handle(OpenReportCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var report = await ReportStore.Load(db, request.ReportId, cancellationToken);
        var listing = await db.Listings.SingleAsync(l => l.Id == report.ListingId, cancellationToken);
        ReportStore.EnsureNotOwn(request.Reviewer, listing);
        var readsConversation = report.ConversationId is not null && report.Status != ReportStatus.Resolved;
        report.StartReview();
        if (report.ConversationId is null)
        {
            AuditLog.Record(db, request.Reviewer, "report.opened", "report", report.Id.ToString(), null, null, $"Report {report.Id}", now);
        }
        else if (readsConversation)
        {
            AuditLog.Record(db, request.Reviewer, "conversation.viewed", "report", report.Id.ToString(), null, null, $"Report {report.Id}", now);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await ReportStore.Detail(db, report, listing, readsConversation, now, cancellationToken);
    }
}

/// <summary>One of the six actions on a report, with the note the moderator must write (L2-105 AC2).</summary>
public sealed record ApplyReportActionCommand(Reviewer Reviewer, Guid ReportId, string? Kind, string? ResolutionNote, string? MessageText)
    : IRequest<ReportDetailDto>;

public sealed class ApplyReportActionCommandHandler(IAppDbContext db, TimeProvider clock, IDirectoryReadCache cache, AccountSettings settings)
    : IRequestHandler<ApplyReportActionCommand, ReportDetailDto>
{
    public const string HoldTitle = "We’ve paused your listing while we look into a report";
    public const string TeamTitle = "Message from the Jubilee team";

    public async Task<ReportDetailDto> Handle(ApplyReportActionCommand request, CancellationToken cancellationToken)
    {
        var kind = ReportWire.ParseAction(request.Kind);
        var note = request.ResolutionNote?.Trim() ?? string.Empty;
        var text = request.MessageText?.Trim();
        var errors = new Dictionary<string, string>();
        if (kind is null)
        {
            errors["kind"] = "INVALID";
        }

        if (note.Length == 0)
        {
            errors["resolutionNote"] = "REQUIRED";
        }
        else if (note.Length > ReportAction.MaxNoteLength)
        {
            errors["resolutionNote"] = "TOO_LONG";
        }

        if (kind is ReportActionKind.MessageReporter or ReportActionKind.MessageOwner or ReportActionKind.TakeDownReview)
        {
            var most = kind is ReportActionKind.TakeDownReview ? Review.MaxReasonLength : ReportAction.MaxMessageLength;
            if (string.IsNullOrEmpty(text))
            {
                errors["messageText"] = "REQUIRED";
            }
            else if (text.Length > most)
            {
                errors["messageText"] = "TOO_LONG";
            }
        }

        var now = clock.GetUtcNow();
        var report = await ReportStore.Load(db, request.ReportId, cancellationToken);
        if (kind is { } chosen && !ReportWire.AppliesTo(chosen, report.ReviewReport is not null))
        {
            errors["kind"] = "INVALID";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var listing = await db.Listings.SingleAsync(l => l.Id == report.ListingId, cancellationToken);
        ReportStore.EnsureNotOwn(request.Reviewer, listing);
        if (report.Status == ReportStatus.Resolved)
        {
            throw new ConflictException("REPORT_RESOLVED", "This report has been resolved.");
        }

        var reviewer = request.Reviewer;
        var statusBefore = ReportWire.Status(report.Status);
        var before = ReportWire.ListingState(listing);
        var target = report.Id.ToString();
        switch (kind!.Value)
        {
            case ReportActionKind.Dismiss:
                report.Resolve(note, now);
                AuditLog.Record(db, reviewer, "report.dismissed", "report", target, statusBefore, "resolved", note, now);
                break;
            case ReportActionKind.MessageReporter:
                report.StartReview();
                NotificationRules.Tell(db, report.ReporterSubject, "staff-message", TeamTitle, text!, "/notifications", now);
                AuditLog.Record(db, reviewer, "report.messaged-reporter", "report", target, null, text, note, now);
                break;
            case ReportActionKind.MessageOwner:
                report.StartReview();
                NotificationRules.Tell(db, listing.OwnerId, "staff-message", TeamTitle, text!, "/notifications", now);
                AuditLog.Record(db, reviewer, "report.messaged-owner", "report", target, null, text, note, now);
                break;
            case ReportActionKind.PlaceOnHold:
                report.StartReview();
                listing.PlaceModerationHold();
                NotificationRules.Tell(
                    db, listing.OwnerId, "listing-paused", HoldTitle,
                    "Your listing is hidden from the public until the Jubilee team has finished. We’ll tell you what we decide.",
                    "/my-business", now);
                AuditLog.Record(db, reviewer, "listing.held", "listing", listing.Id.ToString(), before, ReportWire.ListingState(listing), note, now);
                break;
            case ReportActionKind.RemoveListing:
                listing.Delete(now);
                report.Resolve(note, now);
                NotificationRules.Tell(
                    db, listing.OwnerId, "listing-removed", "We’ve removed your listing",
                    "The Jubilee team removed your listing from Jubilee. You can write to us if you have questions.", "/my-business", now);
                AuditLog.Record(db, reviewer, "listing.removed", "listing", listing.Id.ToString(), before, ReportWire.ListingState(listing), note, now);
                break;
            case ReportActionKind.LiftHold:
                if (!listing.IsUnderModerationHold)
                {
                    throw new ConflictException("NOT_ON_HOLD", "This listing is not on hold.");
                }

                listing.LiftModerationHold();
                report.Resolve(note, now);
                NotificationRules.Tell(
                    db, listing.OwnerId, "listing-live", "Your listing is live again",
                    "The Jubilee team finished looking into a report and your listing is public again.", "/my-business", now);
                AuditLog.Record(db, reviewer, "listing.hold-lifted", "listing", listing.Id.ToString(), before, ReportWire.ListingState(listing), note, now);
                break;
            case ReportActionKind.TakeDownReview:
                await TakeDownAsync(report.ReviewReport!, listing, reviewer, note, text!, now, cancellationToken);
                report.Resolve(note, now);
                break;
        }

        db.ReportActions.Add(ReportAction.Take(report.Id, kind.Value, note, text, reviewer.Subject, reviewer.Name, now));
        await db.SaveChangesAsync(cancellationToken);
        if (kind is ReportActionKind.TakeDownReview)
        {
            cache.Invalidate();
        }

        return await ReportStore.Detail(db, report, listing, false, now, cancellationToken);
    }

    /// <summary>
    /// The review leaves the page, the average, the count and the cards; every report of it is resolved; its author
    /// is told the reason and nobody else is told anything (L2-237 AC3, L2-235 AC3).
    /// </summary>
    private async Task TakeDownAsync(
        ReviewReport reported, Listing listing, Reviewer reviewer, string note, string reason, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var review = await db.Reviews.SingleAsync(r => r.Id == reported.ReviewId, cancellationToken);
        if (!review.IsShown)
        {
            throw new ConflictException("REVIEW_TAKEN_DOWN", "This review has already been taken down.");
        }

        review.TakeDown(reason, now);
        await ReviewRules.RecountAsync(db, review, gone: false, productBefore: null, cancellationToken);
        foreach (var other in await db.ReviewReports.Where(r => r.ReviewId == review.Id && r.Id != reported.Id && r.Status != ReportStatus.Resolved)
            .ToListAsync(cancellationToken))
        {
            other.Resolve(note, now);
        }

        var title = $"We took down your review of {listing.Name}";
        NotificationRules.Tell(db, review.AuthorSubject, ReviewNotices.Kind, title, review.TakeDownReason!, $"/b/{listing.Slug}", now, review.Id);
        await ReviewNotices.EmailAsync(db, settings, review.AuthorSubject, title, review.TakeDownReason!, $"/b/{listing.Slug}", review.Id, now, cancellationToken);
        AuditLog.Record(db, reviewer, "review.taken-down", "review", review.Id.ToString(), "shown", review.TakeDownReason, note, now);
    }
}
