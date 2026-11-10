using Jubilee.Domain;

namespace Jubilee.Application.Directory;

public sealed record CategoryLinkDto(string Slug, string Name)
{
    public static IReadOnlyList<CategoryLinkDto> All { get; } = [.. Category.All.Select(From)];

    public static CategoryLinkDto From(Category category) => new(category.Slug, category.Name);
}

/// <summary>The large tile of one business (L2-027 AC1).</summary>
public sealed record BusinessCardDto(
    string Slug,
    string Name,
    string Tagline,
    string? Highlight,
    string CategorySlug,
    bool Verified,
    string? CoverPhoto)
{
    /// <summary><c>Verified</c> comes from <see cref="VerifiedListingSpecification"/> (L2-111).</summary>
    public static BusinessCardDto From(Listing listing) => new(
        listing.Slug,
        listing.Name,
        listing.Tagline,
        listing.Highlight,
        listing.CategorySlug,
        VerifiedListingSpecification.IsSatisfiedBy(listing),
        CoverPhoto: null); // Photo upload arrives with the listing form; cards show the category tile.
}

public sealed record WelcomeDto(
    int LiveBusinessCount,
    IReadOnlyList<CategoryLinkDto> Categories,
    IReadOnlyList<BusinessCardDto> Featured);

public sealed record ProductTileDto(string Tint, string Icon);

/// <summary>One product of a shop (L2-027 AC5). The tile stands in until photo upload exists.</summary>
public sealed record ProductCardDto(
    string Slug,
    string BusinessSlug,
    string Name,
    string ShopName,
    int PriceCents,
    bool PerUnit,
    ProductTileDto Tile);

/// <summary>The compact one-line entry inside a category group (L2-027 AC3).</summary>
public sealed record DirectoryRowDto(string Slug, string Name, string Tagline, bool Verified)
{
    public static DirectoryRowDto From(Listing listing) =>
        new(listing.Slug, listing.Name, listing.Tagline, VerifiedListingSpecification.IsSatisfiedBy(listing));
}

public sealed record CategoryGroupDto(
    string Slug,
    string Name,
    int Count,
    bool HasMore,
    IReadOnlyList<DirectoryRowDto> Businesses);

public sealed record BrowseHomeDto(
    int LiveBusinessCount,
    IReadOnlyList<CategoryLinkDto> Categories,
    IReadOnlyList<BusinessCardDto> Featured,
    IReadOnlyList<ProductCardDto> Products,
    IReadOnlyList<CategoryGroupDto> Groups);
