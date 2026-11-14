using System.Security.Cryptography;

namespace Jubilee.Domain;

/// <summary>The three fits of the Purpose Tee, in the order the page shows them (L2-264).</summary>
public enum MerchFit
{
    Youth,
    Womens,
    Mens,
}

public enum MerchOrderStatus
{
    Pending,
    Paid,
    Expired,
}

/// <summary>Shipped by Canada Post in Canada, or picked up free at the Jubilee gathering in Toronto (L2-266 AC3).</summary>
public enum MerchDelivery
{
    Ship,
    Pickup,
}

/// <summary>
/// Jubilee's own merchandise, the one thing Jubilee sells (L1-034, ADR 0073). Its price and shipping
/// are rows, never constants, so a change of price is a change of data (L2-263 AC5).
/// </summary>
public sealed class MerchProduct
{
    public const string PurposeTeeSlug = "purpose-tee";

    private readonly List<MerchVariant> _variants = [];

    private MerchProduct()
    {
    }

    public Guid Id { get; private set; }

    public string Slug { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    public string Colour { get; private set; } = string.Empty;

    public int UnitPriceCents { get; private set; }

    public string Currency { get; private set; } = "CAD";

    public int ShippingCents { get; private set; }

    public int FreeShippingFromCents { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public IReadOnlyList<MerchVariant> Variants => _variants;

    public static MerchProduct Create(
        string slug, string name, string colour, int unitPriceCents, int shippingCents, int freeShippingFromCents, DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            Name = name,
            Colour = colour,
            UnitPriceCents = unitPriceCents,
            Currency = "CAD",
            ShippingCents = shippingCents,
            FreeShippingFromCents = freeShippingFromCents,
            CreatedAt = now,
        };

    public MerchVariant AddVariant(MerchFit fit, string size, string? ages, decimal chestInches, decimal lengthInches, int? stock)
    {
        var variant = MerchVariant.Create(Id, fit, size, ages, chestInches, lengthInches, stock, _variants.Count);
        _variants.Add(variant);
        return variant;
    }

    public void Reprice(int unitPriceCents) => UnitPriceCents = unitPriceCents;

    /// <summary>What a delivery costs for shirts that come to <paramref name="subtotalCents"/> (L2-266 AC3).</summary>
    public int ShippingFor(MerchDelivery delivery, int subtotalCents) =>
        delivery == MerchDelivery.Pickup || subtotalCents >= FreeShippingFromCents ? 0 : ShippingCents;
}

/// <summary>One size of one fit, sold under its SKU (<c>mens-L</c>).</summary>
public sealed class MerchVariant
{
    private MerchVariant()
    {
    }

    public Guid Id { get; private set; }

    public Guid ProductId { get; private set; }

    public string Sku { get; private set; } = string.Empty;

    public MerchFit Fit { get; private set; }

    public string Size { get; private set; } = string.Empty;

    /// <summary>The ages a youth size is for ("14–16"); null for the other fits.</summary>
    public string? Ages { get; private set; }

    public decimal ChestInches { get; private set; }

    public decimal LengthInches { get; private set; }

    /// <summary>How many are on hand; null when the stock is not counted.</summary>
    public int? Stock { get; private set; }

    public int SortOrder { get; private set; }

    public static string SkuOf(MerchFit fit, string size) => $"{fit.ToString().ToLowerInvariant()}-{size}";

    internal static MerchVariant Create(
        Guid productId, MerchFit fit, string size, string? ages, decimal chest, decimal length, int? stock, int sortOrder) => new()
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Sku = SkuOf(fit, size),
            Fit = fit,
            Size = size,
            Ages = ages,
            ChestInches = chest,
            LengthInches = length,
            Stock = stock,
            SortOrder = sortOrder,
        };

    public void SetStock(int? stock) => Stock = stock is < 0 ? 0 : stock;

    /// <summary>
    /// Lowers the stock by a paid quantity, never below 0. Answers true when there was not enough
    /// (the order was paid after its hold expired, L2-268 AC6).
    /// </summary>
    public bool TakeStock(int quantity)
    {
        if (Stock is not { } stock)
        {
            return false;
        }

        Stock = Math.Max(0, stock - quantity);
        return quantity > stock;
    }
}

/// <summary>
/// An order of the Purpose Tee. It is priced from the rows when it starts, holds its quantities
/// until it is paid or expires, and is paid only on the provider's signed event (L2-267, L2-268).
/// It holds no card data (L2-270 AC4).
/// </summary>
public sealed class MerchOrder
{
    /// <summary>The life of the provider's checkout session, and of the hold.</summary>
    public static readonly TimeSpan HoldFor = TimeSpan.FromMinutes(30);

    /// <summary>An order never paid is deleted this long after it expired (L2-270 AC5).</summary>
    public static readonly TimeSpan UnpaidRetention = TimeSpan.FromDays(30);

    /// <summary>A paid order's e-mail, name and address are erased this long after payment (L2-270 AC5).</summary>
    public static readonly TimeSpan PaidRetention = TimeSpan.FromDays(6 * 365 + 2);

    private const string NumberAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    private readonly List<MerchOrderLine> _lines = [];

    private MerchOrder()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>What a person reads: "PT-4F7K2Q".</summary>
    public string Number { get; private set; } = string.Empty;

    /// <summary>What a link holds: 128 random bits, base64url (L2-270 AC3).</summary>
    public string Reference { get; private set; } = string.Empty;

    public MerchOrderStatus Status { get; private set; }

    public MerchDelivery Delivery { get; private set; }

    public int SubtotalCents { get; private set; }

    public int ShippingCents { get; private set; }

    public int TaxCents { get; private set; }

    public int TotalCents { get; private set; }

    public string Currency { get; private set; } = "CAD";

    public string? CheckoutSessionId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? PaidAt { get; private set; }

    public DateTimeOffset? ExpiredAt { get; private set; }

    public string? BuyerEmail { get; private set; }

    public string? BuyerName { get; private set; }

    /// <summary>The address it ships to, one line per part; null when picked up.</summary>
    public string? ShippingAddress { get; private set; }

    public DateTimeOffset? PersonalDataErasedAt { get; private set; }

    public IReadOnlyList<MerchOrderLine> Lines => _lines;

    /// <summary>The lines in the order the buyer put them in the bag.</summary>
    public IEnumerable<MerchOrderLine> OrderedLines => _lines.OrderBy(l => l.Position);

    /// <summary>Starts an order priced from the product's rows, never from the browser (L2-270 AC2).</summary>
    public static MerchOrder Start(
        MerchProduct product, IEnumerable<(MerchVariant Variant, int Quantity)> lines, MerchDelivery delivery, DateTimeOffset now)
    {
        var order = new MerchOrder
        {
            Id = Guid.NewGuid(),
            Number = NewNumber(),
            Reference = NewReference(),
            Status = MerchOrderStatus.Pending,
            Delivery = delivery,
            Currency = product.Currency,
            CreatedAt = now,
            ExpiresAt = now + HoldFor,
        };
        foreach (var (variant, quantity) in lines)
        {
            order._lines.Add(MerchOrderLine.Create(order.Id, variant, quantity, product.UnitPriceCents, order._lines.Count));
        }

        order.SubtotalCents = order._lines.Sum(l => l.UnitPriceCents * l.Quantity);
        order.ShippingCents = product.ShippingFor(delivery, order.SubtotalCents);
        order.TotalCents = order.SubtotalCents + order.ShippingCents;
        return order;
    }

    public void AttachCheckoutSession(string sessionId) => CheckoutSessionId = sessionId;

    /// <summary>Paid once: a paid order is left as it is, so a replayed event changes nothing (L2-268 AC2).</summary>
    public bool MarkPaid(string? email, string? name, string? shippingAddress, int taxCents, int totalCents, DateTimeOffset now)
    {
        if (Status == MerchOrderStatus.Paid)
        {
            return false;
        }

        Status = MerchOrderStatus.Paid;
        PaidAt = now;
        BuyerEmail = email;
        BuyerName = name;
        ShippingAddress = Delivery == MerchDelivery.Ship ? shippingAddress : null;
        TaxCents = taxCents;
        TotalCents = totalCents;
        return true;
    }

    /// <summary>A pending order expires and stops holding; a paid one is left as it is (L2-268 AC4).</summary>
    public void Expire(DateTimeOffset now)
    {
        if (Status == MerchOrderStatus.Pending)
        {
            Status = MerchOrderStatus.Expired;
            ExpiredAt = now;
        }
    }

    public bool Holds(DateTimeOffset now) => Status == MerchOrderStatus.Pending && ExpiresAt > now;

    /// <summary>Erases what identifies the buyer and keeps the rest for the tax records (L2-270 AC5).</summary>
    public void ErasePersonalData(DateTimeOffset now)
    {
        BuyerEmail = null;
        BuyerName = null;
        ShippingAddress = null;
        PersonalDataErasedAt = now;
    }

    private static string NewNumber() =>
        "PT-" + new string([.. Enumerable.Range(0, 6).Select(_ => NumberAlphabet[RandomNumberGenerator.GetInt32(NumberAlphabet.Length)])]);

    private static string NewReference() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(16)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

/// <summary>One size of an order, priced when the order started so a later change of price changes no order.</summary>
public sealed class MerchOrderLine
{
    private MerchOrderLine()
    {
    }

    public Guid Id { get; private set; }

    public Guid OrderId { get; private set; }

    public Guid VariantId { get; private set; }

    public string Sku { get; private set; } = string.Empty;

    public MerchFit Fit { get; private set; }

    public string Size { get; private set; } = string.Empty;

    public int Quantity { get; private set; }

    public int UnitPriceCents { get; private set; }

    /// <summary>Where the line stood in the bag.</summary>
    public int Position { get; private set; }

    internal static MerchOrderLine Create(Guid orderId, MerchVariant variant, int quantity, int unitPriceCents, int position) => new()
    {
        Position = position,
        Id = Guid.NewGuid(),
        OrderId = orderId,
        VariantId = variant.Id,
        Sku = variant.Sku,
        Fit = variant.Fit,
        Size = variant.Size,
        Quantity = quantity,
        UnitPriceCents = unitPriceCents,
    };
}
