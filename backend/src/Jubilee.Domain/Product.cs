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

    /// <summary>The owner's order of the products, from 1; products never ordered share 0 and follow newest first (L2-090).</summary>
    public int Position { get; private set; }

    /// <summary>The key of the request that created the product, so a repeat of it creates nothing (L2-132).</summary>
    public string? IdempotencyKey { get; private set; }

    /// <summary>When the owner deleted the product; past requests keep their snapshot (L2-092).</summary>
    public DateTimeOffset? DeletedAt { get; private set; }

    /// <summary>A shop lists this many products at most (L2-089 AC4).</summary>
    public const int MaxPerListing = 100;

    public const int MaxNameLength = 120;

    public const int MaxDescriptionLength = 1000;

    public const int MaxCents = 10_000_000;

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The count of 5-star reviews shown; with the four below it, the stored <see cref="Stars"/> (ADR 0066).</summary>
    public int Stars5 { get; private set; }

    public int Stars4 { get; private set; }

    public int Stars3 { get; private set; }

    public int Stars2 { get; private set; }

    public int Stars1 { get; private set; }

    /// <summary>The count of each star of the reviews shown (L2-231).</summary>
    public StarCounts Stars => new(Stars5, Stars4, Stars3, Stars2, Stars1);

    /// <summary>Stores the counts after a review was written, changed, removed or taken down (L2-238 AC9).</summary>
    public void CountStars(StarCounts stars)
    {
        Stars5 = stars.Five;
        Stars4 = stars.Four;
        Stars3 = stars.Three;
        Stars2 = stars.Two;
        Stars1 = stars.One;
    }

    public TileTint TileTint { get; private set; }

    public TileIcon TileIcon { get; private set; }

    /// <summary>Untracked stock never limits a request beyond this many items (L2-035 AC3).</summary>
    public const int UntrackedMaxQuantity = 99;

    public const int MaxStock = 9999;

    public string? Description { get; private set; }

    /// <summary>The delivery line after the price, for example "plus $9 shipping, or free pickup".</summary>
    public string? DeliveryLine { get; private set; }

    public List<ProductAttribute> Attributes { get; private set; } = [];

    /// <summary>The attributes in the owner's order.</summary>
    public IEnumerable<ProductAttribute> OrderedAttributes => Attributes.OrderBy(a => a.Position);

    /// <summary>What the options choose, for example "Size"; null without options.</summary>
    public string? OptionName { get; private set; }

    public List<ProductOption> Options { get; private set; } = [];

    /// <summary>The options in the owner's order.</summary>
    public IEnumerable<ProductOption> OrderedOptions => Options.OrderBy(o => o.Position);

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

    public void Delete(DateTimeOffset? now = null)
    {
        IsDeleted = true;
        DeletedAt ??= now;
    }

    /// <summary>Puts the product at the end of the owner's order and remembers the key that created it.</summary>
    public void Place(int position, string? idempotencyKey)
    {
        Position = position;
        IdempotencyKey = idempotencyKey;
    }

    public void MoveTo(int position) => Position = position;

    /// <summary>The product's photo, or null: its tile shows instead (L2-091 AC10).</summary>
    public Guid? PhotoId { get; private set; }

    public ProductPhoto? Photo { get; private set; }

    /// <summary>Shows a photo of the same listing in place of the tile, or none (L2-091 AC9).</summary>
    public void ShowPhoto(ProductPhoto? photo)
    {
        if (photo is not null && photo.ListingId != ListingId)
        {
            throw new ArgumentException("A product shows only a photo of its own listing.", nameof(photo));
        }

        Photo = photo;
        PhotoId = photo?.Id;
    }

    /// <summary>The owner's edit of the words and the price; the slug stays, so links keep working (L2-091).</summary>
    public void Revise(string name, int priceCents, string? description)
    {
        Name = name;
        PriceCents = priceCents;
        Description = Clean(description);
    }

    public void Describe(ProductDescription description)
    {
        Description = Clean(description.Description);
        DeliveryLine = Clean(description.DeliveryLine);
        Attributes = [.. description.Attributes];
        for (var i = 0; i < Attributes.Count; i++)
        {
            Attributes[i].Position = i + 1;
        }
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
        for (var i = 0; i < Options.Count; i++)
        {
            Options[i].Position = i + 1;
        }
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
        return ChangeSince(wasSoldOut);
    }

    /// <summary>Sets the stock of one option.</summary>
    public StockChange SetStock(string optionLabel, int? stock)
    {
        var option = Options.Single(o => o.Label == optionLabel);
        var wasSoldOut = IsSoldOut;
        option.Stock = CheckStock(stock);
        return ChangeSince(wasSoldOut);
    }

    /// <summary>
    /// An owner confirmed an order: the stock of the chosen option (or of the product) drops by the
    /// quantity. Untracked stock is left alone; stock below the quantity throws (L2-052 AC4).
    /// </summary>
    public void ReduceStock(string? optionLabel, int quantity)
    {
        var current = StockOf(optionLabel);
        if (current is not { } stock)
        {
            return;
        }

        if (stock < quantity)
        {
            throw new InsufficientStockException(stock, quantity);
        }

        Put(optionLabel, stock - quantity);
    }

    /// <summary>Undoes <see cref="ReduceStock"/>; the last item coming back is <see cref="StockChange.BackInStock"/>.</summary>
    public StockChange RestoreStock(string? optionLabel, int quantity)
    {
        var wasSoldOut = IsSoldOut;
        if (StockOf(optionLabel) is { } stock)
        {
            Put(optionLabel, Math.Min(MaxStock, stock + quantity));
        }

        return ChangeSince(wasSoldOut);
    }

    /// <summary>
    /// What happened to the stock since the product was, or was not, sold out: the answer for an
    /// edit that replaces the options and their stock together (L2-036).
    /// </summary>
    public StockChange ChangeSince(bool wasSoldOut) => (wasSoldOut, IsSoldOut) switch
    {
        (false, true) => StockChange.BecameSoldOut,
        (true, false) => StockChange.BackInStock,
        _ => StockChange.None,
    };

    private int? StockOf(string? optionLabel) =>
        Options.Count > 0 ? Options.SingleOrDefault(o => o.Label == optionLabel)?.Stock : Stock;

    private void Put(string? optionLabel, int stock)
    {
        if (Options.Count > 0)
        {
            Options.Single(o => o.Label == optionLabel).Stock = stock;
        }
        else
        {
            Stock = stock;
        }
    }

    internal static int? CheckStock(int? stock) => stock is null or (>= 0 and <= MaxStock)
        ? stock
        : throw new ArgumentOutOfRangeException(nameof(stock), "Stock is a whole number from 0 to 9,999.");

    internal static int MaxQuantityFor(int? stock) => stock is { } tracked ? Math.Min(tracked, UntrackedMaxQuantity) : UntrackedMaxQuantity;

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

/// <summary>An order asks for more than the shop has.</summary>
public sealed class InsufficientStockException(int available, int requested)
    : Exception($"Only {available} left; {requested} were asked for.")
{
    public int Available { get; } = available;

    public int Requested { get; } = requested;
}
