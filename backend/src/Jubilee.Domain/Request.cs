namespace Jubilee.Domain;

public enum RequestKind
{
    Booking = 0,
    Quote = 1,
    Order = 2,
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

    public static RequestTransition Record(Guid requestId, RequestStatus from, RequestStatus to, string actor, DateTimeOffset at) => new()
    {
        Id = Guid.NewGuid(),
        RequestId = requestId,
        From = from,
        To = to,
        Actor = actor,
        At = at,
    };
}

/// <summary>
/// A member's ask of a business: a booking, a quote or an order (L2-043). Jubilee takes no
/// payment. The booking fields are filled for a booking only.
/// </summary>
public sealed class Request
{
    public const int MaxNoteLength = 1000;

    public const int MaxDescriptionLength = 2000;

    public const int MaxBudgetLength = 60;

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

        MoveTo(RequestStatus.Confirmed, actor, now);
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

    /// <summary>The member cancels a new or confirmed request.</summary>
    public void Cancel(string actor, DateTimeOffset now)
    {
        if (Status is not (RequestStatus.New or RequestStatus.Confirmed))
        {
            throw new InvalidTransitionException(Status, RequestStatus.Cancelled);
        }

        MoveTo(RequestStatus.Cancelled, actor, now);
    }

    /// <summary>A confirmed booking whose meeting has ended, or a confirmed order the owner fulfilled.</summary>
    public void Complete(string actor, DateTimeOffset now)
    {
        if (Status != RequestStatus.Confirmed)
        {
            throw new InvalidTransitionException(Status, RequestStatus.Completed);
        }

        MoveTo(RequestStatus.Completed, actor, now);
    }

    private void MoveTo(RequestStatus status, string actor, DateTimeOffset now)
    {
        _transitions.Add(RequestTransition.Record(Id, Status, status, actor, now));
        Status = status;
    }
}
