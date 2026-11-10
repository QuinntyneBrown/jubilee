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
}
