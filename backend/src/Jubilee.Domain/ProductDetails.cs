namespace Jubilee.Domain;

/// <summary>One line of a product's "Details" list, for example Fit: "Relaxed, true to size".</summary>
public sealed class ProductAttribute
{
    private ProductAttribute()
    {
    }

    public ProductAttribute(string label, string value)
    {
        Label = label.Trim();
        Value = value.Trim();
    }

    public string Label { get; private set; } = string.Empty;

    public string Value { get; private set; } = string.Empty;
}

/// <summary>
/// A selectable variant of a product, such as a size, with its own stock. A null stock is not
/// tracked.
/// </summary>
public sealed class ProductOption
{
    private ProductOption()
    {
    }

    public ProductOption(string label, int? stock)
    {
        Label = label.Trim();
        Stock = Product.CheckStock(stock);
    }

    public string Label { get; private set; } = string.Empty;

    public int? Stock { get; internal set; }

    /// <summary>The most a member may ask for in one request: the stock, or 99 untracked (L2-035 AC3).</summary>
    public int MaxQuantity => Product.MaxQuantityFor(Stock);
}

/// <summary>What the product page tells members about a product.</summary>
/// <param name="DeliveryLine">For example "plus $9 shipping, or free pickup".</param>
public sealed record ProductDescription(string? Description, string? DeliveryLine, IReadOnlyList<ProductAttribute> Attributes);

/// <summary>What a stock change did to a product (L2-036).</summary>
public enum StockChange
{
    None = 0,

    /// <summary>Stock reached 0 in every option.</summary>
    BecameSoldOut = 1,

    /// <summary>Stock rose from sold out to above 0.</summary>
    BackInStock = 2,
}
