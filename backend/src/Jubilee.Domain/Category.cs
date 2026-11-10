namespace Jubilee.Domain;

/// <summary>One of the ten fixed categories of the directory (L2-023 AC5). There is no table.</summary>
public sealed record Category(string Slug, string Name)
{
    public const string ShopsSlug = "shops";

    /// <summary>The ten categories in their fixed display order.</summary>
    public static IReadOnlyList<Category> All { get; } =
    [
        new(ShopsSlug, "Shops"),
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

    public static Category? Find(string? slug) =>
        All.FirstOrDefault(c => string.Equals(c.Slug, slug, StringComparison.Ordinal));
}
