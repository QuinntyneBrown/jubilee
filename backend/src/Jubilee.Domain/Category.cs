namespace Jubilee.Domain;

/// <summary>One of the eleven fixed categories of the directory (L2-023 AC5). There is no table.</summary>
public sealed record Category(string Slug, string Name)
{
    public const string ShopsSlug = "shops";

    /// <summary>"Rooms & rentals": every space and nothing else (L2-197 AC3).</summary>
    public const string RoomsSlug = "rooms-rentals";

    /// <summary>The eleven categories in their fixed display order.</summary>
    public static IReadOnlyList<Category> All { get; } =
    [
        new(ShopsSlug, "Shops"),
        new(RoomsSlug, "Rooms & rentals"),
        new("financial-insurance", "Financial & insurance"),
        new("legal-immigration", "Legal & immigration"),
        new("home-property", "Home & property"),
        new("real-estate-living", "Real estate & living"),
        new("health-family", "Health & family"),
        new("business-tech", "Business & tech"),
        new("learning", "Learning"),
        new("media", "Media"),
        new("community", "Community"),
    ];

    /// <summary>The kind a listing in this category has: a shop in Shops, a space in Rooms & rentals, otherwise services.</summary>
    public static ListingKind KindOf(string slug) => slug switch
    {
        ShopsSlug => ListingKind.Shop,
        RoomsSlug => ListingKind.Space,
        _ => ListingKind.Services,
    };

    public static Category? Find(string? slug) =>
        All.FirstOrDefault(c => string.Equals(c.Slug, slug, StringComparison.Ordinal));
}
