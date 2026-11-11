using System.Globalization;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Jubilee.Application.Requests;

public sealed record MemberRequestCountsDto(int All, int Bookings, int Quotes, int Orders, int Declined);

public sealed record MemberRequestRowDto(
    Guid Id,
    string Kind,
    string KindLabel,
    string Title,
    string Business,
    string BusinessSlug,
    string? Detail,
    DateTimeOffset SentAt,
    string Status,
    string StatusLabel);

public sealed record MemberRequestsDto(
    string Tab,
    MemberRequestCountsDto Counts,
    int Open,
    int Awaiting,
    IReadOnlyList<MemberRequestRowDto> Rows,
    string? NextCursor);

public sealed record DetailLineDto(string Label, string Value);

public sealed record TimelineStepDto(string Title, string? Meta, DateTimeOffset? At, string State);

public sealed record CalloutDto(string Tone, string Title, string Text, string? Quote);

public sealed record MemberRequestDetailDto(
    Guid Id,
    string Kind,
    string KindLabel,
    string Title,
    string Business,
    string BusinessSlug,
    string CategorySlug,
    string CategoryWord,
    string OwnerFirstName,
    string Status,
    string StatusLabel,
    CalloutDto Callout,
    IReadOnlyList<DetailLineDto> Details,
    IReadOnlyList<TimelineStepDto> Timeline,
    bool CanCancel,
    string CancelLabel,
    bool ShortNotice,
    bool CanAskAgain,
    bool CanAddToCalendar,
    Guid? ConversationId,
    bool Unanswered);

/// <summary>What cancelling a request, or taking the cancel back, did (L2-049).</summary>
public sealed record MemberRequestDecisionDto(Guid Id, string Status, string StatusLabel, string Business, DateTimeOffset? UndoUntil);

/// <summary>The words a member reads about their own requests.</summary>
internal static class MemberRequestRules
{
    /// <summary>Requests listed at a time (L2-047 AC6).</summary>
    public const int PageSize = 20;

    public static bool IsOpen(Request r) => r.Status is RequestStatus.New or RequestStatus.Confirmed;

    /// <summary>The date that sorts an open request: the meeting, the day the quote is needed by, or when it was sent.</summary>
    public static DateTimeOffset SortDate(Request r) => r.Kind switch
    {
        RequestKind.Booking => r.StartsAt ?? r.CreatedAt,
        RequestKind.Quote when r.NeededBy is { } by => TorontoClock.At(by, new TimeOnly(23, 59)),
        _ => r.CreatedAt,
    };

    public static string Title(Request r) =>
        r.Kind == RequestKind.Quote && r.ServiceName is null ? Summary(r.Note) : IncomingRules.Title(r);

    private static string Summary(string? note)
    {
        var text = (note ?? string.Empty).Trim();
        var end = text.IndexOfAny(['.', '\n', '!', '?']);
        var first = end > 0 ? text[..end] : text;
        return first.Length <= 70 ? first : first[..69].TrimEnd() + "…";
    }

    /// <summary>The line under the title of a row: the meeting, or how the order is delivered and what it costs.</summary>
    public static string? Detail(Request r) => r.Kind switch
    {
        RequestKind.Booking => $"{Day(r.StartsAt!.Value)} · {(r.Mode == MeetingMode.InPerson ? "In person" : "Video")}",
        RequestKind.Order => IncomingRules.Total(r) is { } total ? $"{r.DeliveryLabel} · {total}" : r.DeliveryLabel,
        _ => null,
    };

    public static string Day(DateTimeOffset at) =>
        $"{TorontoClock.Local(at).ToString("ddd d MMM, h:mm", CultureInfo.InvariantCulture)} {(TorontoClock.Local(at).Hour < 12 ? "a.m." : "p.m.")}";

    public static string Range(Request r)
    {
        var start = TorontoClock.Local(r.StartsAt!.Value);
        var end = TorontoClock.Local(r.EndsAt!.Value);
        var meridiem = end.Hour < 12 ? "a.m." : "p.m.";
        return $"{start.ToString("ddd d MMM, h:mm", CultureInfo.InvariantCulture)}–{end.ToString("h:mm", CultureInfo.InvariantCulture)} {meridiem}";
    }

    public static bool InTab(Request r, string tab) => tab switch
    {
        "bookings" => r.Kind == RequestKind.Booking,
        "quotes" => r.Kind == RequestKind.Quote,
        "orders" => r.Kind == RequestKind.Order,
        "declined" => r.Status == RequestStatus.Declined,
        _ => true,
    };

    public static string Tab(string? raw) => raw?.ToLowerInvariant() switch
    {
        "bookings" => "bookings",
        "quotes" => "quotes",
        "orders" => "orders",
        "declined" => "declined",
        _ => "all",
    };

    public static Request OwnOrNotFound(Request? request, string subject, ILogger logger, Guid id)
    {
        if (request is not null && request.MemberSubject == subject)
        {
            return request;
        }

        if (request is not null)
        {
            // Another member's request is "not found", and the attempt is on record (L2-133 AC2).
            logger.LogWarning("Member {Subject} asked for request {RequestId}, which belongs to someone else.", subject, id);
        }

        throw new NotFoundException("request_not_found", "We can't find that request.");
    }
}

/// <summary>The member's own requests, by tab, 20 at a time (L2-047).</summary>
public sealed record ListRequestsQuery(string Subject, string? Tab, string? Cursor) : IRequest<MemberRequestsDto>;

public sealed class ListRequestsQueryHandler(IAppDbContext db) : IRequestHandler<ListRequestsQuery, MemberRequestsDto>
{
    public async Task<MemberRequestsDto> Handle(ListRequestsQuery query, CancellationToken cancellationToken)
    {
        var mine = await db.Requests.AsNoTracking().Include(r => r.Transitions)
            .Where(r => r.MemberSubject == query.Subject).ToListAsync(cancellationToken);
        var listings = await db.Listings.AsNoTracking().Where(l => mine.Select(r => r.ListingId).Contains(l.Id)).ToDictionaryAsync(l => l.Id, cancellationToken);
        var tab = MemberRequestRules.Tab(query.Tab);

        // Open requests first by the soonest date, then closed ones, newest first (L2-047 AC3).
        var ordered = mine.Where(MemberRequestRules.IsOpen).OrderBy(MemberRequestRules.SortDate).ThenBy(r => r.CreatedAt)
            .Concat(mine.Where(r => !MemberRequestRules.IsOpen(r)).OrderByDescending(Closed))
            .Where(r => MemberRequestRules.InTab(r, tab))
            .ToList();

        _ = int.TryParse(query.Cursor, NumberStyles.None, CultureInfo.InvariantCulture, out var skip);
        var page = ordered.Skip(skip).Take(MemberRequestRules.PageSize).ToList();
        var next = skip + page.Count < ordered.Count ? (skip + page.Count).ToString(CultureInfo.InvariantCulture) : null;

        return new MemberRequestsDto(
            tab,
            new MemberRequestCountsDto(
                mine.Count,
                mine.Count(r => r.Kind == RequestKind.Booking),
                mine.Count(r => r.Kind == RequestKind.Quote),
                mine.Count(r => r.Kind == RequestKind.Order),
                mine.Count(r => r.Status == RequestStatus.Declined)),
            mine.Count(MemberRequestRules.IsOpen),
            mine.Count(r => r.Status == RequestStatus.New),
            page.Select(r =>
            {
                var listing = listings[r.ListingId];
                return new MemberRequestRowDto(
                    r.Id,
                    IncomingRules.KindWire(r.Kind),
                    IncomingRules.KindLabel(r.Kind),
                    MemberRequestRules.Title(r),
                    listing.Name,
                    listing.Slug,
                    MemberRequestRules.Detail(r),
                    r.CreatedAt,
                    RequestLabels.Wire(r.Status),
                    RequestLabels.ForMember(r.Status));
            }).ToList(),
            next);
    }

    private static DateTimeOffset Closed(Request r) => r.Transitions.Select(t => t.At).DefaultIfEmpty(r.CreatedAt).Max();
}

/// <summary>One of the member's requests with its details and progress (L2-048).</summary>
public sealed record GetRequestQuery(string Subject, Guid Id) : IRequest<MemberRequestDetailDto>;

public sealed class GetRequestQueryHandler(IAppDbContext db, TimeProvider clock, ILogger<GetRequestQueryHandler> logger)
    : IRequestHandler<GetRequestQuery, MemberRequestDetailDto>
{
    public async Task<MemberRequestDetailDto> Handle(GetRequestQuery query, CancellationToken cancellationToken)
    {
        var found = await db.Requests.AsNoTracking().Include(r => r.Transitions).SingleOrDefaultAsync(r => r.Id == query.Id, cancellationToken);
        var request = MemberRequestRules.OwnOrNotFound(found, query.Subject, logger, query.Id);
        var listing = await db.Listings.AsNoTracking().SingleAsync(l => l.Id == request.ListingId, cancellationToken);
        var conversation = await db.Conversations.AsNoTracking()
            .Where(c => c.ListingId == listing.Id && c.MemberSubject == query.Subject)
            .Select(c => (Guid?)c.Id).FirstOrDefaultAsync(cancellationToken);
        var now = clock.GetUtcNow();
        var ownerMember = Guid.TryParse(listing.OwnerId, out var ownerId)
            ? await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == ownerId, cancellationToken)
            : null;
        var owner = ownerMember?.FirstName ?? IncomingRules.FirstName(listing.OwnerName ?? listing.Name);
        var category = Category.Find(listing.CategorySlug);
        var categoryWord = (category?.Name ?? "businesses").ToLowerInvariant();
        var confirmedBooking = request is { Kind: RequestKind.Booking, Status: RequestStatus.Confirmed };

        return new MemberRequestDetailDto(
            request.Id,
            IncomingRules.KindWire(request.Kind),
            IncomingRules.KindLabel(request.Kind),
            MemberRequestRules.Title(request),
            listing.Name,
            listing.Slug,
            listing.CategorySlug,
            categoryWord,
            owner,
            RequestLabels.Wire(request.Status),
            RequestLabels.ForMember(request.Status),
            Callout(request, listing, owner, now),
            Details(request),
            Timeline(request, listing, now),
            MemberRequestRules.IsOpen(request),
            confirmedBooking ? "Cancel booking" : "Cancel request",
            confirmedBooking && request.StartsAt is { } starts && starts - now < TimeSpan.FromHours(24),
            request.Status is RequestStatus.Cancelled or RequestStatus.Declined || request.IsUnanswered(now),
            request.Kind == RequestKind.Booking && request.Status is RequestStatus.Confirmed or RequestStatus.Completed,
            conversation,
            request.IsUnanswered(now));
    }

    private static CalloutDto Callout(Request r, Listing listing, string owner, DateTimeOffset now)
    {
        var noun = IncomingRules.Noun(r.Kind);
        switch (r.Status)
        {
            case RequestStatus.New when r.IsUnanswered(now):
                return new CalloutDto("warning", $"{listing.Name} has not replied yet", "It has been over a week. You can cancel this request or ask again.", null);
            case RequestStatus.New:
                return new CalloutDto("info", $"Waiting for {listing.Name} to reply", "They usually answer within a day. We’ll notify you the moment they do.", null);
            case RequestStatus.Confirmed when r.Kind == RequestKind.Booking:
                var how = r.Mode == MeetingMode.InPerson ? "in person" : "video";
                return new CalloutDto(
                    "success",
                    $"{owner} confirmed your meeting",
                    $"{MemberRequestRules.Range(r)} by {how}. The link is in your messages and we’ll remind you an hour before.",
                    null);
            case RequestStatus.Confirmed:
                return new CalloutDto("success", $"{owner} confirmed your {noun}", $"{owner} will message you about payment and pickup.", null);
            case RequestStatus.Declined:
                var job = r.Kind switch { RequestKind.Order => "order", RequestKind.Booking => "booking", _ => "job" };
                return new CalloutDto("warning", $"{listing.Name} can’t take this {job}", string.Empty, r.DeclineMessage);
            case RequestStatus.Cancelled:
                return new CalloutDto("info", "You cancelled this request", $"{listing.Name} has been told. Nothing more will happen with it.", null);
            default:
                return new CalloutDto("success", "Completed", r.Kind == RequestKind.Booking ? "This meeting is done." : $"{listing.Name} marked this {noun} as fulfilled.", null);
        }
    }

    private static List<DetailLineDto> Details(Request r)
    {
        var lines = new List<DetailLineDto>();
        void Add(string label, string? value)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                lines.Add(new DetailLineDto(label, value));
            }
        }

        switch (r.Kind)
        {
            case RequestKind.Booking:
                Add("Service", r.ServiceName);
                Add("When", MemberRequestRules.Range(r));
                Add("How", r.Mode == MeetingMode.InPerson ? $"In person, {r.Location}" : "Video call");
                Add("Your note", r.Note);
                break;
            case RequestKind.Quote:
                Add("What you need", r.Note);
                Add("When", r.NeededBy is { } by ? $"Needed by {by.ToString("ddd d MMM", CultureInfo.InvariantCulture)}" : null);
                Add("Budget", r.Budget);
                Add("Contact", r.Phone is { Length: 10 } p ? $"Message on Jubilee, or {p[..3]}-{p[3..6]}-{p[6..]}" : "Message on Jubilee");
                break;
            default:
                Add("Item", $"{r.ServiceName}{(r.OptionLabel is null ? string.Empty : $" · {r.OptionLabel}")} × {r.Quantity}");
                Add("Delivery", r.DeliveryLabel);
                Add("Address", r.ShippingAddress);
                Add("Total", IncomingRules.Total(r));
                Add("Your note", r.Note);
                break;
        }

        return lines;
    }

    /// <summary>
    /// The progress: what happened, in order, then what comes next (L2-043 AC7). A change the member took
    /// back inside the undo window is left out, as it never happened.
    /// </summary>
    private static List<TimelineStepDto> Timeline(Request r, Listing listing, DateTimeOffset now)
    {
        var steps = new List<TimelineStepDto> { new("You asked", null, r.CreatedAt, "complete") };
        var kept = new List<RequestTransition>();
        foreach (var t in r.Transitions.OrderBy(t => t.At))
        {
            if (kept.Count > 0 && kept[^1] is { UndoableUntil: not null } last && last.Actor == t.Actor && last.From == t.To)
            {
                kept.RemoveAt(kept.Count - 1);
                continue;
            }

            kept.Add(t);
        }

        foreach (var t in kept)
        {
            steps.Add(t.To switch
            {
                RequestStatus.Confirmed => new TimelineStepDto($"{listing.Name} confirmed", null, t.At, "complete"),
                RequestStatus.Declined => new TimelineStepDto($"{listing.Name} declined", null, t.At, "stopped"),
                RequestStatus.Cancelled => new TimelineStepDto("You cancelled", null, t.At, "stopped"),
                _ => new TimelineStepDto("Completed", null, t.At, "complete"),
            });
        }

        switch (r.Status)
        {
            case RequestStatus.New:
                steps.Add(new TimelineStepDto($"{listing.Name} replies", "Usually within a day", null, "current"));
                steps.Add(new TimelineStepDto(
                    r.Kind switch { RequestKind.Booking => "Meeting", RequestKind.Quote => "You accept and arrange a visit", _ => "Pickup or delivery" },
                    null, null, "upcoming"));
                break;
            case RequestStatus.Confirmed:
                steps.Add(new TimelineStepDto(r.Kind == RequestKind.Booking ? "Meeting" : "Pickup or delivery", null, r.StartsAt, "current"));
                steps.Add(new TimelineStepDto("Completed", null, null, "upcoming"));
                break;
        }

        return steps;
    }
}

/// <summary>The member cancels an open request; the business is told at once (L2-049).</summary>
public sealed record CancelRequestCommand(string Subject, Guid Id) : IRequest<MemberRequestDecisionDto>;

public sealed class CancelRequestCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings, ILogger<CancelRequestCommandHandler> logger)
    : IRequestHandler<CancelRequestCommand, MemberRequestDecisionDto>
{
    public async Task<MemberRequestDecisionDto> Handle(CancelRequestCommand command, CancellationToken cancellationToken)
    {
        var found = await db.Requests.Include(r => r.Transitions).SingleOrDefaultAsync(r => r.Id == command.Id, cancellationToken);
        var request = MemberRequestRules.OwnOrNotFound(found, command.Subject, logger, command.Id);
        var listing = await db.Listings.SingleAsync(l => l.Id == request.ListingId, cancellationToken);
        var now = clock.GetUtcNow();
        try
        {
            request.Cancel(command.Subject, now);
        }
        catch (InvalidTransitionException)
        {
            throw MemberRequestMail.Invalid(request);
        }

        await MemberRequestMail.TellOwner(
            db, settings, listing, request, now,
            $"{request.MemberName} cancelled a {IncomingRules.Noun(request.Kind)}",
            $"{request.MemberName} cancelled their {IncomingRules.Noun(request.Kind)} ({MemberRequestRules.Title(request)}). Nothing more is needed from you.",
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new MemberRequestDecisionDto(request.Id, RequestLabels.Wire(request.Status), RequestLabels.ForMember(request.Status), listing.Name, now + Request.UndoWindow);
    }
}

/// <summary>The member takes a cancel back within 8 seconds; the business is told it was withdrawn (L2-049 AC3).</summary>
public sealed record UndoCancelRequestCommand(string Subject, Guid Id) : IRequest<MemberRequestDecisionDto>;

public sealed class UndoCancelRequestCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings, ILogger<UndoCancelRequestCommandHandler> logger)
    : IRequestHandler<UndoCancelRequestCommand, MemberRequestDecisionDto>
{
    public async Task<MemberRequestDecisionDto> Handle(UndoCancelRequestCommand command, CancellationToken cancellationToken)
    {
        var found = await db.Requests.Include(r => r.Transitions).SingleOrDefaultAsync(r => r.Id == command.Id, cancellationToken);
        var request = MemberRequestRules.OwnOrNotFound(found, command.Subject, logger, command.Id);
        var listing = await db.Listings.SingleAsync(l => l.Id == request.ListingId, cancellationToken);
        var now = clock.GetUtcNow();
        try
        {
            request.UndoCancel(command.Subject, now);
        }
        catch (InvalidTransitionException)
        {
            throw MemberRequestMail.Invalid(request);
        }

        await MemberRequestMail.TellOwner(
            db, settings, listing, request, now,
            $"{request.MemberName} withdrew the cancellation",
            $"{request.MemberName} took back their cancellation of the {IncomingRules.Noun(request.Kind)} ({MemberRequestRules.Title(request)}). It is {RequestLabels.ForMember(request.Status).ToLowerInvariant()} again.",
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new MemberRequestDecisionDto(request.Id, RequestLabels.Wire(request.Status), RequestLabels.ForMember(request.Status), listing.Name, null);
    }
}

internal static class MemberRequestMail
{
    public static ConflictException Invalid(Request request) => new(
        "INVALID_TRANSITION",
        $"This request is already {RequestLabels.ForMember(request.Status).ToLowerInvariant()}.")
    {
        Facts = new Dictionary<string, string> { ["requestStatus"] = RequestLabels.Wire(request.Status) },
    };

    /// <summary>Writes an e-mail to the business's owner through the outbox.</summary>
    public static async Task TellOwner(
        IAppDbContext db, AccountSettings settings, Listing listing, Request request, DateTimeOffset now,
        string subject, string text, CancellationToken cancellationToken)
    {
        Notifications.NotificationRules.Tell(db, listing.OwnerId, "request", subject, MemberRequestRules.Title(request), "/my-business/requests", now, request.Id);
        if (!Guid.TryParse(listing.OwnerId, out var ownerId))
        {
            return;
        }

        var owner = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == ownerId, cancellationToken);
        if (owner is null)
        {
            return;
        }

        var body = $"Hi {owner.FirstName},\n\n{text}\n\nYour requests: {settings.PublicBaseUrl.TrimEnd('/')}/my-business/requests\n\nJubilee · Toronto's Christian marketplace\n";
        EmailPolicy.Queue(db, owner, EmailCategories.Requests, subject, body, now, null, request.Id);
    }
}

/// <summary>The owner marks a confirmed order fulfilled (L2-043 AC5).</summary>
public sealed record FulfilRequestCommand(string Subject, Guid Id) : IRequest<RequestDecisionDto>;

public sealed class FulfilRequestCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<FulfilRequestCommand, RequestDecisionDto>
{
    public async Task<RequestDecisionDto> Handle(FulfilRequestCommand command, CancellationToken cancellationToken)
    {
        var (request, _) = await IncomingRules.OwnedRequest(db, command.Subject, command.Id, cancellationToken);
        if (request.Kind != RequestKind.Order)
        {
            throw IncomingRules.Invalid(request);
        }

        try
        {
            request.Complete(command.Subject, clock.GetUtcNow());
        }
        catch (InvalidTransitionException)
        {
            throw IncomingRules.Invalid(request);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new RequestDecisionDto(
            request.Id, RequestLabels.Wire(request.Status), RequestLabels.ForMember(request.Status), IncomingRules.KindWire(request.Kind),
            IncomingRules.FirstName(request.MemberName), null);
    }
}

/// <summary>Completes each confirmed booking whose meeting has ended (L2-043 AC5). Safe to repeat.</summary>
public sealed record CompleteFinishedBookingsCommand : IRequest<int>;

public sealed class CompleteFinishedBookingsCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<CompleteFinishedBookingsCommand, int>
{
    public async Task<int> Handle(CompleteFinishedBookingsCommand command, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var finished = (await db.Requests.Include(r => r.Transitions)
                .Where(r => r.Kind == RequestKind.Booking && r.Status == RequestStatus.Confirmed).ToListAsync(cancellationToken))
            .Where(r => r.EndsAt is { } end && end <= now)
            .ToList();
        foreach (var request in finished)
        {
            request.Complete("system", now);
        }

        await db.SaveChangesAsync(cancellationToken);
        return finished.Count;
    }
}

/// <summary>Reminds the owner once of each request nobody answered in a week (L2-043 AC8). Safe to repeat.</summary>
public sealed record RemindUnansweredRequestsCommand : IRequest<int>;

public sealed class RemindUnansweredRequestsCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<RemindUnansweredRequestsCommand, int>
{
    public async Task<int> Handle(RemindUnansweredRequestsCommand command, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var waiting = (await db.Requests.Where(r => r.Status == RequestStatus.New && r.NudgedAt == null).ToListAsync(cancellationToken))
            .Where(r => r.IsUnanswered(now))
            .ToList();
        foreach (var request in waiting)
        {
            var listing = await db.Listings.SingleAsync(l => l.Id == request.ListingId, cancellationToken);
            request.Nudge(now);
            await MemberRequestMail.TellOwner(
                db, settings, listing, request, now,
                $"{request.MemberName} is still waiting for a reply",
                $"{request.MemberName}'s {IncomingRules.Noun(request.Kind)} ({MemberRequestRules.Title(request)}) has had no reply for a week. Please confirm or decline it.",
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return waiting.Count;
    }
}
