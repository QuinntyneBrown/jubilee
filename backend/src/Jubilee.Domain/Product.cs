namespace Jubilee.Domain;

/// <summary>Something a shop sells. Jubilee takes no payment; the price is for display.</summary>
public sealed class Product
{
    private Product()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public string Slug { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    public int PriceCents { get; private set; }

    /// <summary>True when the price is per unit ("$22 ea").</summary>
    public bool IsPerUnit { get; private set; }

    public bool IsDeleted { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public TileTint TileTint { get; private set; }

    public TileIcon TileIcon { get; private set; }

    /// <summary>Untracked stock never limits a request beyond this many items (L2-035 AC3).</summary>
    public const int UntrackedMaxQuantity = 99;

    public const int MaxStock = 9999;

    public string? Description { get; private set; }

    /// <summary>The delivery line after the price, for example "plus $9 shipping, or free pickup".</summary>
    public string? DeliveryLine { get; private set; }

    public List<ProductAttribute> Attributes { get; private set; } = [];

    /// <summary>What the options choose, for example "Size"; null without options.</summary>
    public string? OptionName { get; private set; }

    public List<ProductOption> Options { get; private set; } = [];

    /// <summary>Stock of a product without options; null is not tracked.</summary>
    public int? Stock { get; private set; }

    /// <summary>Smallest quantity the shop accepts for one request ("min. 12").</summary>
    public int MinimumQuantity { get; private set; } = 1;

    /// <summary>The owner's optional note shown while the product is sold out.</summary>
    public string? RestockNote { get; private set; }

    /// <summary>Stock 0 in every option, or 0 for a product without options; untracked never is (L2-036).</summary>
    public bool IsSoldOut => Options.Count > 0 ? Options.All(o => o.Stock == 0) : Stock == 0;

    /// <summary>The most a member may ask for: the stock, or 99 untracked; with options, the largest of them.</summary>
    public int MaxQuantity => Options.Count > 0 ? Options.Max(o => o.MaxQuantity) : MaxQuantityFor(Stock);

    public static Product Create(
        Guid listingId,
        string slug,
        string name,
        int priceCents,
        bool isPerUnit,
        TileTint tileTint,
        TileIcon tileIcon,
        DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            ListingId = listingId,
            Slug = slug,
            Name = name,
            PriceCents = priceCents,
            IsPerUnit = isPerUnit,
            TileTint = tileTint,
            TileIcon = tileIcon,
            CreatedAt = now,
        };

    public void Delete() => IsDeleted = true;

    public void Describe(ProductDescription description)
    {
        Description = Clean(description.Description);
        DeliveryLine = Clean(description.DeliveryLine);
        Attributes = [.. description.Attributes];
    }

    /// <summary>Replaces the options; a product without options keeps its own stock.</summary>
    public void SetOptions(string? optionName, IReadOnlyList<ProductOption> options)
    {
        if (options.Count > 10)
        {
            throw new ArgumentException("A product has at most 10 options.", nameof(options));
        }

        OptionName = options.Count == 0 ? null : Clean(optionName) ?? "Option";
        Options = [.. options];
    }

    public void SetMinimumQuantity(int minimum) => MinimumQuantity = minimum is >= 1 and <= 999
        ? minimum
        : throw new ArgumentOutOfRangeException(nameof(minimum), "The minimum order quantity is 1 to 999.");

    public void SetRestockNote(string? note) => RestockNote = Clean(note);

    /// <summary>Sets the stock of a product without options.</summary>
    public StockChange SetStock(int? stock)
    {
        if (Options.Count > 0)
        {
            throw new InvalidOperationException("A product with options keeps its stock on each option.");
        }

        var wasSoldOut = IsSoldOut;
        Stock = CheckStock(stock);
        return Change(wasSoldOut);
    }

    /// <summary>Sets the stock of one option.</summary>
    public StockChange SetStock(string optionLabel, int? stock)
    {
        var option = Options.Single(o => o.Label == optionLabel);
        var wasSoldOut = IsSoldOut;
        option.Stock = CheckStock(stock);
        return Change(wasSoldOut);
    }

    internal static int? CheckStock(int? stock) => stock is null or (>= 0 and <= MaxStock)
        ? stock
        : throw new ArgumentOutOfRangeException(nameof(stock), "Stock is a whole number from 0 to 9,999.");

    internal static int MaxQuantityFor(int? stock) => stock is { } tracked ? Math.Min(tracked, UntrackedMaxQuantity) : UntrackedMaxQuantity;

    private StockChange Change(bool wasSoldOut) => (wasSoldOut, IsSoldOut) switch
    {
        (false, true) => StockChange.BecameSoldOut,
        (true, false) => StockChange.BackInStock,
        _ => StockChange.None,
    };

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
