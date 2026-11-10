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
