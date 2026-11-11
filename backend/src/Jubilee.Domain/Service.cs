namespace Jubilee.Domain;

/// <summary>What a service row's action opens: the booking dialog or the quote dialog (L2-033 AC2).</summary>
public enum ServiceAction
{
    Book = 0,
    Ask = 1,
}

/// <summary>How a service is priced: "Free", an amount, or "Ask" (L2-033 AC2).</summary>
public enum ServicePriceKind
{
    Free = 0,
    Amount = 1,
    Ask = 2,
}

/// <summary>The price of a service. Jubilee takes no payment; the price is for display.</summary>
public sealed record ServicePrice(ServicePriceKind Kind, int? Cents)
{
    public static readonly ServicePrice Free = new(ServicePriceKind.Free, null);

    public static readonly ServicePrice Ask = new(ServicePriceKind.Ask, null);

    public static ServicePrice Amount(int cents) =>
        cents > 0 ? new(ServicePriceKind.Amount, cents) : throw new ArgumentOutOfRangeException(nameof(cents));
}

/// <summary>Something a business offers to do: one row of "Services", or of a shop's "Custom work".</summary>
public sealed class Service
{
    private Service()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    /// <summary>The owner's order of the services, from 1.</summary>
    public int Position { get; private set; }

    public string Name { get; private set; } = string.Empty;

    /// <summary>Short detail, for example "30 min · In person or video".</summary>
    public string Detail { get; private set; } = string.Empty;

    public ServicePriceKind PriceKind { get; private set; }

    public int? PriceCents { get; private set; }

    public ServiceAction Action { get; private set; }

    /// <summary>The owner's length of a meeting, 15 to 480 minutes; null when the detail says it or the service is not booked (L2-094 AC4).</summary>
    public int? DurationMinutes { get; private set; }

    public bool OffersVideo { get; private set; } = true;

    public bool OffersInPerson { get; private set; }

    /// <summary>Where an in-person meeting happens.</summary>
    public string? InPersonPlace { get; private set; }

    public string? IdempotencyKey { get; private set; }

    /// <summary>A listing offers this many services at most (L2-093 AC3).</summary>
    public const int MaxPerListing = 50;

    public const int MaxNameLength = 80;

    public const int MaxDetailLength = 60;

    public void MoveTo(int position) => Position = position;

    public void Remember(string? idempotencyKey) => IdempotencyKey = idempotencyKey;

    /// <summary>The owner's edit of a service (L2-094).</summary>
    public void Revise(
        string name, string detail, ServicePrice price, ServiceAction action,
        int? durationMinutes, bool offersVideo, bool offersInPerson, string? inPersonPlace)
    {
        Name = name;
        Detail = detail;
        PriceKind = price.Kind;
        PriceCents = price.Cents;
        Action = action;
        var books = action == ServiceAction.Book;
        DurationMinutes = books ? durationMinutes : null;
        OffersVideo = books ? offersVideo : true;
        OffersInPerson = books && offersInPerson;
        InPersonPlace = books && offersInPerson && !string.IsNullOrWhiteSpace(inPersonPlace) ? inPersonPlace.Trim() : null;
    }

    public static Service Create(Guid listingId, int position, string name, string detail, ServicePrice price, ServiceAction action) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        Position = position,
        Name = name,
        Detail = detail,
        PriceKind = price.Kind,
        PriceCents = price.Cents,
        Action = action,
    };
}
