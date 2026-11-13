namespace Jubilee.Domain;

/// <summary>One of the twelve fixed categories of the directory (L2-023 AC5). There is no table.</summary>
public sealed record Category(string Slug, string Name)
{
    public const string ShopsSlug = "shops";

    /// <summary>"Rooms & rentals": every space and nothing else (L2-197 AC3).</summary>
    public const string RoomsSlug = "rooms-rentals";

    /// <summary>"Software platforms": every platform and nothing else (L2-248 AC1).</summary>
    public const string PlatformsSlug = "software-platforms";

    /// <summary>The twelve categories in their fixed display order.</summary>
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
        new(PlatformsSlug, "Software platforms"),
    ];

    /// <summary>
    /// The kind a listing in this category has: a shop in Shops, a space in Rooms & rentals, a platform in
    /// Software platforms, otherwise services.
    /// </summary>
    public static ListingKind KindOf(string slug) => slug switch
    {
        ShopsSlug => ListingKind.Shop,
        RoomsSlug => ListingKind.Space,
        PlatformsSlug => ListingKind.Platform,
        _ => ListingKind.Services,
    };

    public static Category? Find(string? slug) =>
        All.FirstOrDefault(c => string.Equals(c.Slug, slug, StringComparison.Ordinal));
}
