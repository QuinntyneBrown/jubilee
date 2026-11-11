using System.Globalization;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Directory;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Requests;

public sealed record OwnerListingDto(string Name, string Slug, bool Verified);

public sealed record RequestCountsDto(int New, int Confirmed, int Declined, int All);

public sealed record IncomingRequestRowDto(
    Guid Id,
    string Kind,
    string KindLabel,
    string CustomerName,
    string CustomerInitials,
    string Title,
    string Detail,
    DateTimeOffset SentAt,
    string Status,
    string StatusLabel,
    string? Total,
    string? When);

public sealed record IncomingRequestsDto(
    OwnerListingDto Listing,
    string Tab,
    RequestCountsDto Counts,
    bool RepliesFast,
    IReadOnlyList<IncomingRequestRowDto> Rows);

/// <summary>What an owner's answer to a request did (L2-052, L2-053).</summary>
public sealed record RequestDecisionDto(
    Guid Id, string Status, string StatusLabel, string Kind, string CustomerFirstName, DateTimeOffset? UndoUntil);

/// <summary>The words and rules the owner's side of a request shares.</summary>
internal static class IncomingRules
{
    /// <summary>Declined requests stay on the page for this long (L2-051 AC4).</summary>
    public static readonly TimeSpan DeclinedKept = TimeSpan.FromDays(90);

    public static string OwnerLabel(RequestStatus status) => status == RequestStatus.New ? "New" : RequestLabels.ForMember(status);

    public static string KindWire(RequestKind kind) => kind.ToString().ToLowerInvariant();

    public static string KindLabel(RequestKind kind) => kind switch
    {
        RequestKind.Order => "Order",
        RequestKind.Booking => "Booking",
        _ => "Quote",
    };

    /// <summary>"an order", "a booking" or "a quote request", for sentences to the customer.</summary>
    public static string Noun(RequestKind kind) => kind switch
    {
        RequestKind.Order => "order",
        RequestKind.Booking => "booking",
        _ => "quote request",
    };

    public static string Initials(string name)
    {
        var words = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return words.Length == 0
            ? "?"
            : string.Concat(words.Take(2).Select(w => char.ToUpperInvariant(w[0])));
    }

    public static string FirstName(string name) => name.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? name;

    public static string Title(Request r) => r.Kind switch
    {
        RequestKind.Order => $"{r.ServiceName} × {r.Quantity}",
        RequestKind.Booking => r.ServiceName ?? "Booking",
        _ => r.ServiceName ?? "Quote request",
    };

    /// <summary>An order's total as the owner reads it: "$528.00 + tax" (L2-052 AC1).</summary>
    public static string? Total(Request r) =>
        r.TotalCents is { } cents ? $"${(cents / 100m).ToString("N2", CultureInfo.InvariantCulture)} + tax" : null;

    /// <summary>A booking's time, or the date a quote is needed by.</summary>
    public static string? When(Request r) => r.Kind switch
    {
        RequestKind.Booking => TorontoClock.Local(r.StartsAt!.Value).ToString("ddd d MMM, HH:mm", CultureInfo.InvariantCulture),
        RequestKind.Quote when r.NeededBy is { } by => by.ToString("ddd d MMM", CultureInfo.InvariantCulture),
        _ => null,
    };

    public static string Detail(Request r)
    {
        var parts = new List<string>();
        switch (r.Kind)
        {
            case RequestKind.Order:
                parts.Add(r.Note ?? string.Empty);
                parts.Add(r.DeliveryLabel ?? string.Empty);
                break;
            case RequestKind.Booking:
                var when = TorontoClock.Local(r.StartsAt!.Value).ToString("ddd d MMM, HH:mm", CultureInfo.InvariantCulture);
                parts.Add($"{when} · {(r.Mode == MeetingMode.InPerson ? $"In person, {r.Location}" : "Video call")}");
                parts.Add(r.Note ?? string.Empty);
                break;
            default:
                parts.Add(r.Note ?? string.Empty);
                if (r.NeededBy is { } by)
                {
                    parts.Add($"needed by {by.ToString("ddd d MMM", CultureInfo.InvariantCulture)}");
                }

                break;
        }

        return string.Join(" · ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));
    }

    public static ConflictException Invalid(Request request) => new(
        "INVALID_TRANSITION",
        request.Status == RequestStatus.Cancelled
            ? $"{request.MemberName} cancelled this request."
            : $"This request is already {RequestLabels.ForMember(request.Status).ToLowerInvariant()}.")
    {
        Facts = new Dictionary<string, string> { ["requestStatus"] = RequestLabels.Wire(request.Status) },
    };

    /// <summary>
    /// The listing the owner works on: the one named, or else their live listing. A caller who owns
    /// nothing, or not the one named, is refused (L2-051 AC6, L2-133 AC3).
    /// </summary>
    public static async Task<Listing> Owned(IAppDbContext db, string subject, string? slug, CancellationToken cancellationToken)
    {
        var owned = (await db.Listings.AsNoTracking().Where(l => l.OwnerId == subject && l.DeletedAt == null).ToListAsync(cancellationToken))
            .OrderBy(l => l.CreatedAt).ToList();
        var listing = slug is null
            ? owned.FirstOrDefault(l => l.Stage == ListingStage.Live) ?? owned.FirstOrDefault()
            : owned.SingleOrDefault(l => l.Slug == slug);
        return listing ?? throw new ForbiddenException("FORBIDDEN", "This area is for the owner of the business.");
    }

    /// <summary>The request, provided it is one of the caller's own listing's.</summary>
    public static async Task<(Request Request, Listing Listing)> OwnedRequest(
        IAppDbContext db, string subject, Guid id, CancellationToken cancellationToken)
    {
        var request = await db.Requests.Include(r => r.Transitions).SingleOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException("request_not_found", "We can't find that request.");
        var listing = await db.Listings.SingleAsync(l => l.Id == request.ListingId, cancellationToken);
        return listing.OwnerId == subject
            ? (request, listing)
            : throw new ForbiddenException("FORBIDDEN", "This request belongs to another business.");
    }

    /// <summary>Writes the owner's line to the customer in their conversation, starting it when there is none.</summary>
    public static void TellCustomer(IAppDbContext db, Conversation? existing, Request request, Listing listing, string body, string key, DateTimeOffset now)
    {
        var conversation = existing;
        if (conversation is null)
        {
            conversation = Conversation.Start(listing.Id, request.MemberSubject, request.MemberName, now);
            db.Conversations.Add(conversation);
        }

        var at = conversation.NextMessageTime(now);
        db.Messages.Add(Message.Send(
            conversation.Id, listing.OwnerId!, listing.OwnerName ?? listing.Name, true, body, key, null, conversation.BlockedByMember, at));
        conversation.Touch(at);
        conversation.MarkRead(true, at);
    }

    public static async Task QueueEmail(
        IAppDbContext db, Request request, string subject, string body, DateTimeOffset now, DateTimeOffset? notBefore, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(request.MemberSubject, out var memberId))
        {
            return;
        }

        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == memberId, cancellationToken);
        if (member is not null)
        {
            db.OutboxMessages.Add(OutboxMessage.Email(member.Id, member.Email, subject, body, now, notBefore, request.Id));
        }
    }
}

/// <summary>The requests customers sent the owner's business, by tab (L2-051).</summary>
public sealed record ListIncomingRequestsQuery(string Subject, string? Tab, string? ListingSlug) : IRequest<IncomingRequestsDto>;

public sealed class ListIncomingRequestsQueryHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<ListIncomingRequestsQuery, IncomingRequestsDto>
{
    /// <summary>The newest requests shown on a tab.</summary>
    public const int PageSize = 50;

    public async Task<IncomingRequestsDto> Handle(ListIncomingRequestsQuery query, CancellationToken cancellationToken)
    {
        var listing = await IncomingRules.Owned(db, query.Subject, query.ListingSlug, cancellationToken);
        var now = clock.GetUtcNow();
        var all = (await db.Requests.AsNoTracking().Include(r => r.Transitions).Where(r => r.ListingId == listing.Id).ToListAsync(cancellationToken))
            .Where(r => r.Status != RequestStatus.Declined
                || r.Transitions.Any(t => t.To == RequestStatus.Declined && now - t.At <= IncomingRules.DeclinedKept))
            .OrderByDescending(r => r.CreatedAt)
            .ToList();
        var counts = new RequestCountsDto(
            all.Count(r => r.Status == RequestStatus.New),
            all.Count(r => r.Status == RequestStatus.Confirmed),
            all.Count(r => r.Status == RequestStatus.Declined),
            all.Count);
        var tab = query.Tab?.ToLowerInvariant() switch
        {
            "confirmed" => "confirmed",
            "declined" => "declined",
            "all" => "all",
            _ => "new",
        };
        var shown = tab switch
        {
            "confirmed" => all.Where(r => r.Status == RequestStatus.Confirmed),
            "declined" => all.Where(r => r.Status == RequestStatus.Declined),
            "all" => all,
            _ => all.Where(r => r.Status == RequestStatus.New),
        };
        var repliesFast = await db.ResponseTimeStats.AsNoTracking().AnyAsync(s => s.ListingId == listing.Id && s.RepliesFast, cancellationToken);
        var rows = shown.Take(PageSize).Select(r => new IncomingRequestRowDto(
            r.Id,
            IncomingRules.KindWire(r.Kind),
            IncomingRules.KindLabel(r.Kind),
            r.MemberName,
            IncomingRules.Initials(r.MemberName),
            IncomingRules.Title(r),
            IncomingRules.Detail(r),
            r.CreatedAt,
            RequestLabels.Wire(r.Status),
            IncomingRules.OwnerLabel(r.Status),
            IncomingRules.Total(r),
            IncomingRules.When(r))).ToList();
        return new IncomingRequestsDto(
            new OwnerListingDto(listing.Name, listing.Slug, VerifiedListingSpecification.IsSatisfiedBy(listing)), tab, counts, repliesFast, rows);
    }
}

/// <summary>The owner confirms a new request (L2-052). The customer is told once the undo window has passed.</summary>
public sealed record ConfirmRequestCommand(string Subject, Guid RequestId) : IRequest<RequestDecisionDto>;

public sealed class ConfirmRequestCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<ConfirmRequestCommand, RequestDecisionDto>
{
    public async Task<RequestDecisionDto> Handle(ConfirmRequestCommand command, CancellationToken cancellationToken)
    {
        var (request, listing) = await IncomingRules.OwnedRequest(db, command.Subject, command.RequestId, cancellationToken);
        var now = clock.GetUtcNow();
        if (request.Status != RequestStatus.New)
        {
            throw IncomingRules.Invalid(request);
        }

        if (request.Kind == RequestKind.Order && await db.Products.SingleOrDefaultAsync(p => p.Id == request.ServiceId, cancellationToken) is { } product)
        {
            try
            {
                product.ReduceStock(request.OptionLabel, request.Quantity ?? 0);
            }
            catch (InsufficientStockException stock)
            {
                throw new ConflictException(
                    "INSUFFICIENT_STOCK", $"You have {stock.Available} of {product.Name} left; {request.MemberName} asked for {stock.Requested}.");
            }
        }

        request.Confirm(command.Subject, now);
        var title = IncomingRules.Title(request);
        var conversation = await db.Conversations.SingleOrDefaultAsync(
            c => c.ListingId == listing.Id && c.MemberSubject == request.MemberSubject, cancellationToken);
        IncomingRules.TellCustomer(
            db, conversation, request, listing,
            $"Confirmed: {title}. Message me about payment and pickup.", ConfirmedKey(request.Id), now);
        var first = IncomingRules.FirstName(request.MemberName);
        await IncomingRules.QueueEmail(
            db,
            request,
            $"{listing.Name} confirmed your {IncomingRules.Noun(request.Kind)}",
            $"Hi {first},\n\n{listing.Name} confirmed your {IncomingRules.Noun(request.Kind)}: {title}.\n\nJubilee doesn't take payment. Message {listing.Name} about payment and pickup: {settings.PublicBaseUrl.TrimEnd('/')}/messages\n\nJubilee · Toronto's Christian marketplace\n",
            now,
            now + Request.UndoWindow,
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new RequestDecisionDto(
            request.Id, RequestLabels.Wire(request.Status), IncomingRules.OwnerLabel(request.Status), IncomingRules.KindWire(request.Kind), first, now + Request.UndoWindow);
    }

    public static string ConfirmedKey(Guid requestId) => $"request:{requestId}:confirmed";
}

/// <summary>Takes back a confirm within 8 seconds (L2-052 AC3).</summary>
public sealed record UndoConfirmRequestCommand(string Subject, Guid RequestId) : IRequest<RequestDecisionDto>;

public sealed class UndoConfirmRequestCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<UndoConfirmRequestCommand, RequestDecisionDto>
{
    public async Task<RequestDecisionDto> Handle(UndoConfirmRequestCommand command, CancellationToken cancellationToken)
    {
        var (request, _) = await IncomingRules.OwnedRequest(db, command.Subject, command.RequestId, cancellationToken);
        try
        {
            request.UndoConfirm(command.Subject, clock.GetUtcNow());
        }
        catch (InvalidTransitionException)
        {
            throw IncomingRules.Invalid(request);
        }

        if (request.Kind == RequestKind.Order && await db.Products.SingleOrDefaultAsync(p => p.Id == request.ServiceId, cancellationToken) is { } product)
        {
            product.RestoreStock(request.OptionLabel, request.Quantity ?? 0);
        }

        var key = ConfirmRequestCommandHandler.ConfirmedKey(request.Id);
        db.Messages.RemoveRange(await db.Messages.Where(m => m.IdempotencyKey == key).ToListAsync(cancellationToken));
        db.OutboxMessages.RemoveRange(
            await db.OutboxMessages.Where(m => m.CorrelationId == request.Id && m.SentAt == null && m.FailedAt == null).ToListAsync(cancellationToken));
        await db.SaveChangesAsync(cancellationToken);
        return new RequestDecisionDto(
            request.Id, RequestLabels.Wire(request.Status), IncomingRules.OwnerLabel(request.Status), IncomingRules.KindWire(request.Kind),
            IncomingRules.FirstName(request.MemberName), null);
    }
}

/// <summary>The owner declines a new request with a reason and a note to the customer (L2-053).</summary>
public sealed record DeclineRequestCommand(string Subject, Guid RequestId, string? Reason, string? Message) : IRequest<RequestDecisionDto>;

public sealed class DeclineRequestCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<DeclineRequestCommand, RequestDecisionDto>
{
    public async Task<RequestDecisionDto> Handle(DeclineRequestCommand command, CancellationToken cancellationToken)
    {
        var (request, listing) = await IncomingRules.OwnedRequest(db, command.Subject, command.RequestId, cancellationToken);
        var errors = new Dictionary<string, string>();
        var message = command.Message?.Trim() ?? string.Empty;
        if (message.Length == 0)
        {
            errors["message"] = "REQUIRED";
        }
        else if (message.Length > Request.MaxNoteLength)
        {
            errors["message"] = "TOO_LONG";
        }

        if (command.Reason is null || !Request.DeclineReasons.Contains(command.Reason))
        {
            errors["reason"] = "INVALID";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        if (request.Status != RequestStatus.New)
        {
            throw IncomingRules.Invalid(request);
        }

        var now = clock.GetUtcNow();
        request.Decline(command.Subject, now, command.Reason!, message);
        var conversation = await db.Conversations.SingleOrDefaultAsync(
            c => c.ListingId == listing.Id && c.MemberSubject == request.MemberSubject, cancellationToken);
        IncomingRules.TellCustomer(db, conversation, request, listing, message, $"request:{request.Id}:declined", now);
        var first = IncomingRules.FirstName(request.MemberName);
        await IncomingRules.QueueEmail(
            db,
            request,
            $"{listing.Name} declined your {IncomingRules.Noun(request.Kind)}",
            $"Hi {first},\n\n{listing.Name} couldn't take your {IncomingRules.Noun(request.Kind)}: {IncomingRules.Title(request)}.\n\n\"{message}\"\n\nReply in your messages: {settings.PublicBaseUrl.TrimEnd('/')}/messages\n\nJubilee · Toronto's Christian marketplace\n",
            now,
            null,
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new RequestDecisionDto(
            request.Id, RequestLabels.Wire(request.Status), IncomingRules.OwnerLabel(request.Status), IncomingRules.KindWire(request.Kind), first, null);
    }
}

/// <summary>
/// Recomputes each live listing's median first response over the last 30 days and with it the
/// "Replies fast" badge (L2-054). A response is an owner's confirm or decline of a request, or the
/// owner's first reply after a customer's message. Safe to repeat.
/// </summary>
public sealed record RecomputeResponseTimesCommand : IRequest<int>;

public sealed class RecomputeResponseTimesCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<RecomputeResponseTimesCommand, int>
{
    public async Task<int> Handle(RecomputeResponseTimesCommand command, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var since = now - ResponseTimeStat.Window;
        var listings = await db.Listings.Where(l => l.Stage == ListingStage.Live && l.DeletedAt == null && l.OwnerId != null).ToListAsync(cancellationToken);
        var requests = (await db.Requests.AsNoTracking().Include(r => r.Transitions).ToListAsync(cancellationToken))
            .ToLookup(r => r.ListingId);
        var conversations = (await db.Conversations.AsNoTracking().ToListAsync(cancellationToken)).ToLookup(c => c.ListingId);
        var messages = (await db.Messages.AsNoTracking().ToListAsync(cancellationToken)).ToLookup(m => m.ConversationId);
        var stats = await db.ResponseTimeStats.ToDictionaryAsync(s => s.ListingId, cancellationToken);
        foreach (var listing in listings)
        {
            var responses = new List<TimeSpan>();
            foreach (var request in requests[listing.Id])
            {
                var answer = request.Transitions
                    .Where(t => t.Actor == listing.OwnerId && t.To is RequestStatus.Confirmed or RequestStatus.Declined)
                    .OrderBy(t => t.At).FirstOrDefault();
                if (answer is not null && answer.At >= since)
                {
                    responses.Add(answer.At - request.CreatedAt);
                }
            }

            foreach (var conversation in conversations[listing.Id])
            {
                DateTimeOffset? waiting = null;
                foreach (var message in messages[conversation.Id].OrderBy(m => m.CreatedAt))
                {
                    if (!message.FromOwner)
                    {
                        waiting ??= message.CreatedAt;
                    }
                    else if (waiting is { } asked)
                    {
                        if (message.CreatedAt >= since)
                        {
                            responses.Add(message.CreatedAt - asked);
                        }

                        waiting = null;
                    }
                }
            }

            if (stats.TryGetValue(listing.Id, out var stat))
            {
                stat.Set(responses, now);
            }
            else
            {
                db.ResponseTimeStats.Add(ResponseTimeStat.Compute(listing.Id, responses, now));
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return listings.Count;
    }
}
