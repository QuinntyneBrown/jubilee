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
    string? CoverPhoto,
    bool RepliesFast)
{
    /// <summary>
    /// <paramref name="fast"/> holds the listings that carry the "Replies fast" badge (L2-054 AC1); a space never does
    /// (AC3). No card says a listing is verified (ADR 0057).
    /// </summary>
    public static BusinessCardDto From(Listing listing, IReadOnlySet<Guid> fast) => new(
        listing.Slug,
        listing.Name,
        listing.Tagline,
        listing.Highlight,
        listing.CategorySlug,
        CoverPhoto: null, // Photo upload arrives with the listing form; cards show the category tile.
        RepliesFast: listing.Kind != ListingKind.Space && fast.Contains(listing.Id));
}

/// <summary>
/// The card of one space (L2-203). Built without the exact address, which no public list carries
/// (L2-208 AC1).
/// </summary>
public sealed record SpaceCardDto(
    string Slug,
    string Name,
    string Term,
    int Rent,
    string Per,
    IReadOnlyList<string> Facts,
    string Neighbourhood,
    string Available,
    string? CoverPhoto)
{
    public static SpaceCardDto From(Listing listing)
    {
        var space = listing.Space ?? throw new InvalidOperationException($"'{listing.Slug}' is not a space.");
        return new SpaceCardDto(
            listing.Slug,
            listing.Name,
            WireValues.Of(space.Term),
            space.Rent,
            SpaceTerms.Per(space.Term),
            [.. space.Facts.Take(2)],
            space.Neighbourhood,
            space.Available,
            CoverPhoto: null);
    }
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
    ProductTileDto Tile,
    bool SoldOut)
{
    public static ProductCardDto From(Product product, Listing shop) => new(
        product.Slug,
        shop.Slug,
        product.Name,
        shop.Name,
        product.PriceCents,
        product.IsPerUnit,
        new ProductTileDto(WireValues.Of(product.TileTint), WireValues.Of(product.TileIcon)),
        product.IsSoldOut);
}

/// <summary>The compact one-line entry inside a category group (L2-027 AC3).</summary>
public sealed record DirectoryRowDto(string Slug, string Name, string Tagline)
{
    public static DirectoryRowDto From(Listing listing) => new(listing.Slug, listing.Name, listing.Tagline);
}

public sealed record CategoryGroupDto(
    string Slug,
    string Name,
    int Count,
    bool HasMore,
    IReadOnlyList<DirectoryRowDto> Businesses);

/// <summary>
/// "Rooms & places to stay" (L2-201): the live space count and, newest first, the union of the
/// newest four spaces and the newest four of each term, so the term filter needs no request.
/// </summary>
public sealed record RoomsShelfDto(int Count, IReadOnlyList<SpaceCardDto> Spaces);

public sealed record BrowseHomeDto(
    int LiveBusinessCount,
    IReadOnlyList<CategoryLinkDto> Categories,
    IReadOnlyList<BusinessCardDto> Featured,
    IReadOnlyList<ProductCardDto> Products,
    IReadOnlyList<CategoryGroupDto> Groups,
    RoomsShelfDto Rooms);

/// <summary>A short count shown beside the business count, for example "3 take emergency calls".</summary>
public sealed record CategoryFactDto(string Offer, int Count);

/// <summary>The sanitised filters that were applied, in request order.</summary>
public sealed record AppliedFiltersDto(IReadOnlyList<string> Offers, IReadOnlyList<string> Areas)
{
    public static AppliedFiltersDto From(CategoryFilterSet filters) => new(filters.OfferValues, filters.AreaValues);
}

public sealed record RemovedFilterDto(string Group, string Value);

/// <summary>How many businesses match when one applied filter is removed (L2-024 AC4).</summary>
public sealed record FilterSuggestion(RemovedFilterDto Removed, int Count);

public sealed record CategoryPageResult(
    CategoryLinkDto Category,
    int TotalCount,
    int MatchCount,
    CategoryFactDto? Fact,
    AppliedFiltersDto Filters,
    string Sort,
    int Page,
    int PageSize,
    int PageCount,
    IReadOnlyList<BusinessCardDto> Businesses,
    IReadOnlyList<FilterSuggestion> Suggestions,
    string? Term,
    IReadOnlyList<SpaceCardDto> Spaces);

public sealed record CategoryCountDto(int Count);
