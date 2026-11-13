namespace Jubilee.Domain;

public enum RequestKind
{
    Booking = 0,
    Quote = 1,
    Order = 2,

    /// <summary>A renter asks to rent a space (L2-206, ADR 0042).</summary>
    Space = 3,
}

/// <summary>The one lifecycle every request follows (L2-043).</summary>
public enum RequestStatus
{
    New = 0,
    Confirmed = 1,
    Declined = 2,
    Cancelled = 3,
    Completed = 4,
}

public enum MeetingMode
{
    Video = 0,
    InPerson = 1,
}

/// <summary>A transition the lifecycle does not allow (L2-043 AC6); the API answers 409 <c>INVALID_TRANSITION</c>.</summary>
public sealed class InvalidTransitionException(RequestStatus from, RequestStatus to)
    : Exception($"A request that is {from} cannot become {to}.")
{
    public RequestStatus From { get; } = from;

    public RequestStatus To { get; } = to;
}

/// <summary>Who did what to a request, when, and what it was before (L2-043 AC7).</summary>
public sealed class RequestTransition
{
    private RequestTransition()
    {
    }

    public Guid Id { get; private set; }

    public Guid RequestId { get; private set; }

    public RequestStatus From { get; private set; }

    public RequestStatus To { get; private set; }

    public string Actor { get; private set; } = string.Empty;

    public DateTimeOffset At { get; private set; }

    /// <summary>Set on a confirm: until then its actor may undo it (L2-052 AC3).</summary>
    public DateTimeOffset? UndoableUntil { get; private set; }

    public static RequestTransition Record(
        Guid requestId, RequestStatus from, RequestStatus to, string actor, DateTimeOffset at, DateTimeOffset? undoableUntil = null) => new()
    {
        Id = Guid.NewGuid(),
        RequestId = requestId,
        From = from,
        To = to,
        Actor = actor,
        At = at,
        UndoableUntil = undoableUntil,
    };
}

/// <summary>
/// A member's ask of a business: a booking, a quote or an order (L2-043), or of the owner of a
/// space: a space request (L2-206). Jubilee takes no payment. The booking fields are filled for a
/// booking only, the space fields for a space request only.
/// </summary>
public sealed class Request
{
    public const int MaxNoteLength = 1000;

    public const int MaxDescriptionLength = 2000;

    public const int MaxBudgetLength = 60;

    /// <summary>How long after a confirm the owner may undo it.</summary>
    public static readonly TimeSpan UndoWindow = TimeSpan.FromSeconds(8);

    /// <summary>A request nobody answered after this long is one the member may cancel or ask again, and the owner is reminded once (L2-043 AC8).</summary>
    public static readonly TimeSpan UnansweredAfter = TimeSpan.FromDays(7);

    /// <summary>The reasons an owner picks from when declining (L2-053 AC1).</summary>
    public static readonly string[] DeclineReasons = ["cant-meet-the-date", "out-of-stock", "outside-what-i-offer", "something-else"];

    private readonly List<RequestTransition> _transitions = [];

    private Request()
    {
    }

    public Guid Id { get; private set; }

    public RequestKind Kind { get; private set; }

    /// <summary>The member's session subject.</summary>
    public string MemberSubject { get; private set; } = string.Empty;

    public string MemberName { get; private set; } = string.Empty;

    public Guid ListingId { get; private set; }

    public RequestStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Makes a repeat of the same send the same request (L2-132).</summary>
    public string IdempotencyKey { get; private set; } = string.Empty;

    public Guid? ServiceId { get; private set; }

    public string? ServiceName { get; private set; }

    public DateTimeOffset? StartsAt { get; private set; }

    public DateTimeOffset? EndsAt { get; private set; }

    public MeetingMode? Mode { get; private set; }

    public string? Location { get; private set; }

    /// <summary>A booking note, or what a quote request describes.</summary>
    public string? Note { get; private set; }

    /// <summary>A quote request: the date the work is needed by.</summary>
    public DateOnly? NeededBy { get; private set; }

    public string? Budget { get; private set; }

    /// <summary>Ten digits, shared with the business for this request only.</summary>
    public string? Phone { get; private set; }

    /// <summary>An order request: the chosen option, for example "M"; null without options.</summary>
    public string? OptionLabel { get; private set; }

    public int? Quantity { get; private set; }

    /// <summary>The prices as the server computed them from stored data (L2-046 AC6).</summary>
    public int? UnitPriceCents { get; private set; }

    public int? ItemCents { get; private set; }

    public int? ShippingCents { get; private set; }

    public int? TotalCents { get; private set; }

    public string? DeliveryLabel { get; private set; }

    public string? ShippingAddress { get; private set; }

    /// <summary>One of <see cref="DeclineReasons"/>; set when the owner declined.</summary>
    public string? DeclineReason { get; private set; }

    /// <summary>The note the owner wrote to the customer with the decline.</summary>
    public string? DeclineMessage { get; private set; }

    /// <summary>When the owner was reminded of a request nobody answered; set once.</summary>
    public DateTimeOffset? NudgedAt { get; private set; }

    /// <summary>When the one-hour reminder of a confirmed meeting was sent (L2-069).</summary>
    public DateTimeOffset? RemindedAt { get; private set; }

    /// <summary>A space request: the term of the space when it was asked for.</summary>
    public SpaceTerm? SpaceTerm { get; private set; }

    /// <summary>A Short stay: the first night.</summary>
    public DateOnly? CheckIn { get; private set; }

    /// <summary>A Short stay: the day the renter leaves.</summary>
    public DateOnly? CheckOut { get; private set; }

    /// <summary>A Long term, Room or Roommate request: the day the renter moves in.</summary>
    public DateOnly? MoveIn { get; private set; }

    /// <summary>A Long term, Room or Roommate request: how many months the renter stays.</summary>
    public int? StayMonths { get; private set; }

    /// <summary>A Short stay: the nights between check-in and check-out.</summary>
    public int? Nights => CheckIn is { } from && CheckOut is { } to ? to.DayNumber - from.DayNumber : null;

    public IReadOnlyList<RequestTransition> Transitions => _transitions;

    public static Request Book(
        string memberSubject,
        string memberName,
        Guid listingId,
        Guid serviceId,
        string serviceName,
        DateTimeOffset startsAt,
        TimeSpan length,
        MeetingMode mode,
        string? location,
        string? note,
        string idempotencyKey,
        DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            Kind = RequestKind.Booking,
            MemberSubject = memberSubject,
            MemberName = memberName,
            ListingId = listingId,
            Status = RequestStatus.New,
            CreatedAt = now,
            IdempotencyKey = idempotencyKey,
            ServiceId = serviceId,
            ServiceName = serviceName,
            StartsAt = startsAt,
            EndsAt = startsAt + length,
            Mode = mode,
            Location = location,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
        };

    public static Request AskForQuote(
        string memberSubject,
        string memberName,
        Guid listingId,
        Guid? serviceId,
        string? serviceName,
        string description,
        DateOnly? neededBy,
        string? budget,
        string? phone,
        string idempotencyKey,
        DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            Kind = RequestKind.Quote,
            MemberSubject = memberSubject,
            MemberName = memberName,
            ListingId = listingId,
            Status = RequestStatus.New,
            CreatedAt = now,
            IdempotencyKey = idempotencyKey,
            ServiceId = serviceId,
            ServiceName = serviceName,
            Note = description.Trim(),
            NeededBy = neededBy,
            Budget = string.IsNullOrWhiteSpace(budget) ? null : budget.Trim(),
            Phone = phone,
        };

    /// <summary>
    /// A space request. The space's name is kept as the request's title; the rent and, for a Short
    /// stay, the total come from the stored rent (L2-206 AC8).
    /// </summary>
    public static Request AskForSpace(
        string memberSubject,
        string memberName,
        Guid listingId,
        string spaceName,
        SpaceDetails space,
        DateOnly? checkIn,
        DateOnly? checkOut,
        DateOnly? moveIn,
        int? stayMonths,
        string? note,
        string idempotencyKey,
        DateTimeOffset now)
    {
        var request = new Request
        {
            Id = Guid.NewGuid(),
            Kind = RequestKind.Space,
            MemberSubject = memberSubject,
            MemberName = memberName,
            ListingId = listingId,
            Status = RequestStatus.New,
            CreatedAt = now,
            IdempotencyKey = idempotencyKey,
            ServiceName = spaceName,
            SpaceTerm = space.Term,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            UnitPriceCents = space.Rent * 100,
        };
        if (SpaceTerms.IsNightly(space.Term))
        {
            request.CheckIn = checkIn;
            request.CheckOut = checkOut;
            request.TotalCents = space.Rent * 100 * request.Nights;
        }
        else
        {
            request.MoveIn = moveIn;
            request.StayMonths = stayMonths;
        }

        return request;
    }

    public static Request AskForOrder(
        string memberSubject,
        string memberName,
        Guid listingId,
        Guid productId,
        string productName,
        string? optionLabel,
        int quantity,
        OrderAmounts amounts,
        string deliveryLabel,
        string? shippingAddress,
        string? note,
        string idempotencyKey,
        DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            Kind = RequestKind.Order,
            MemberSubject = memberSubject,
            MemberName = memberName,
            ListingId = listingId,
            Status = RequestStatus.New,
            CreatedAt = now,
            IdempotencyKey = idempotencyKey,
            ServiceId = productId,
            ServiceName = productName,
            OptionLabel = optionLabel,
            Quantity = quantity,
            UnitPriceCents = amounts.UnitCents,
            ItemCents = amounts.ItemCents,
            ShippingCents = amounts.ShippingCents,
            TotalCents = amounts.TotalCents,
            DeliveryLabel = deliveryLabel,
            ShippingAddress = shippingAddress,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
        };

    /// <summary>The owner confirms a new request.</summary>
    public void Confirm(string actor, DateTimeOffset now)
    {
        if (Status != RequestStatus.New)
        {
            throw new InvalidTransitionException(Status, RequestStatus.Confirmed);
        }

        MoveTo(RequestStatus.Confirmed, actor, now, now + UndoWindow);
    }

    /// <summary>Takes back a confirm: only its actor, and only within the undo window (L2-052 AC3).</summary>
    public void UndoConfirm(string actor, DateTimeOffset now)
    {
        var last = _transitions.OrderBy(t => t.At).LastOrDefault();
        if (Status != RequestStatus.Confirmed || last is not { To: RequestStatus.Confirmed, UndoableUntil: { } until } || last.Actor != actor || now > until)
        {
            throw new InvalidTransitionException(Status, RequestStatus.New);
        }

        MoveTo(RequestStatus.New, actor, now);
    }

    /// <summary>The owner declines a new request.</summary>
    public void Decline(string actor, DateTimeOffset now)
    {
        if (Status != RequestStatus.New)
        {
            throw new InvalidTransitionException(Status, RequestStatus.Declined);
        }

        MoveTo(RequestStatus.Declined, actor, now);
    }

    /// <summary>The owner declines a new request and tells the customer why (L2-053).</summary>
    public void Decline(string actor, DateTimeOffset now, string reason, string message)
    {
        Decline(actor, now);
        DeclineReason = reason;
        DeclineMessage = message.Trim();
    }

    /// <summary>The member cancels a new or confirmed request.</summary>
    public void Cancel(string actor, DateTimeOffset now)
    {
        if (Status is not (RequestStatus.New or RequestStatus.Confirmed))
        {
            throw new InvalidTransitionException(Status, RequestStatus.Cancelled);
        }

        MoveTo(RequestStatus.Cancelled, actor, now, now + UndoWindow);
    }

    /// <summary>Takes back a cancel: only its actor, only within the undo window; the request returns to what it was (L2-049 AC3).</summary>
    public void UndoCancel(string actor, DateTimeOffset now)
    {
        var last = _transitions.OrderBy(t => t.At).LastOrDefault();
        if (Status != RequestStatus.Cancelled || last is not { To: RequestStatus.Cancelled, UndoableUntil: { } until } || last.Actor != actor || now > until)
        {
            throw new InvalidTransitionException(Status, RequestStatus.New);
        }

        MoveTo(last.From, actor, now);
    }

    /// <summary>Records that the owner was reminded of a request nobody answered (L2-043 AC8).</summary>
    /// <summary>
    /// The member's account was erased: the business sees a former member, and the member's phone and delivery address
    /// are gone (L2-017 AC6).
    /// </summary>
    public void ForgetMember()
    {
        MemberName = "Former member";
        Phone = null;
        ShippingAddress = null;
    }

    public void Nudge(DateTimeOffset now) => NudgedAt ??= now;

    public void Remind(DateTimeOffset now) => RemindedAt ??= now;

    /// <summary>Whether a new request has waited long enough for the member to be offered "Cancel or ask again".</summary>
    public bool IsUnanswered(DateTimeOffset now) => Status == RequestStatus.New && now - CreatedAt >= UnansweredAfter;

    /// <summary>A confirmed booking whose meeting has ended, or a confirmed order the owner fulfilled.</summary>
    public void Complete(string actor, DateTimeOffset now)
    {
        if (Status != RequestStatus.Confirmed)
        {
            throw new InvalidTransitionException(Status, RequestStatus.Completed);
        }

        MoveTo(RequestStatus.Completed, actor, now);
    }

    private void MoveTo(RequestStatus status, string actor, DateTimeOffset now, DateTimeOffset? undoableUntil = null)
    {
        _transitions.Add(RequestTransition.Record(Id, Status, status, actor, now, undoableUntil));
        Status = status;
    }
}
