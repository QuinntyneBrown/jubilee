using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Directory;

/// <summary>One page of a category for a category query: filters, sort order and page number.</summary>
/// <remarks><paramref name="Term"/> narrows "Rooms & rentals" to one term (L2-202 AC2); other categories ignore it.</remarks>
public sealed record GetCategoryListingsQuery(string Slug, CategoryFilterSet Filters, ListingSort Sort, int Page, SpaceTerm? Term = null)
    : IRequest<CategoryPageResult>
{
    /// <summary>Builds the query from the untrusted route and query-string values; an unknown term is ignored.</summary>
    public static GetCategoryListingsQuery FromUntrusted(string slug, string? offers, string? areas, string? sort, string? page, string? term = null) =>
        new(slug, CategoryFilterSet.Parse(offers, areas), ListingSortPolicy.Parse(sort), PageWindow.ParseRequestedPage(page), WireValues.ParseTerm(term));
}

public sealed class GetCategoryListingsQueryHandler(IAppDbContext db, IDirectoryReadCache cache)
    : IRequestHandler<GetCategoryListingsQuery, CategoryPageResult>
{
    /// <summary>The offer the category fact is derived from.</summary>
    public const OfferFilter FactOffer = OfferFilter.EmergencyCalls;

    public Task<CategoryPageResult> Handle(GetCategoryListingsQuery request, CancellationToken cancellationToken)
    {
        // An unknown slug is refused before the cache, so junk slugs never become cache keys.
        var category = CategoryQueries.Require(request.Slug);

        // One entry per result page: slug plus the sanitised category query.
        var key = string.Join(
            '|',
            "category",
            category.Slug,
            string.Join(',', request.Filters.OfferValues),
            string.Join(',', request.Filters.AreaValues),
            WireValues.Of(request.Sort),
            Math.Max(1, request.Page),
            request.Term is { } term ? WireValues.Of(term) : string.Empty);
        return cache.GetOrCreateAsync(key, ct => BuildAsync(category, request, ct), cancellationToken);
    }

    private async Task<CategoryPageResult> BuildAsync(
        Category category, GetCategoryListingsQuery request, CancellationToken cancellationToken)
    {
        if (category.Slug == Category.RoomsSlug)
        {
            return await BuildSpacesAsync(category, request, cancellationToken);
        }

        // A software platform has no offers and serves no area: its category has no filters and no fact (L2-252 AC3).
        var platforms = category.Slug == Category.PlatformsSlug;
        var filters = platforms ? CategoryFilterSet.Empty : request.Filters;

        var inCategory = CategoryQueries.PublicListingsIn(db, category);
        var matches = filters.Apply(inCategory);

        var totalCount = await inCategory.CountAsync(cancellationToken);
        var matchCount = filters.IsEmpty ? totalCount : await matches.CountAsync(cancellationToken);
        var factCount = platforms ? 0 : await inCategory.CountAsync(l => (l.Offers & FactOffer) != 0, cancellationToken);

        var window = PageWindow.Clamp(request.Page, matchCount);
        var listings = await ListingSortPolicy.Apply(matches, request.Sort)
            .Skip(window.Skip)
            .Take(PageWindow.PageSize)
            .ToListAsync(cancellationToken);

        var suggestions = new List<FilterSuggestion>();
        if (matchCount == 0 && !filters.IsEmpty)
        {
            foreach (var (group, value, remaining) in filters.WithoutOneFilter())
            {
                var count = await remaining.Apply(inCategory).CountAsync(cancellationToken);
                suggestions.Add(new FilterSuggestion(new RemovedFilterDto(group, value), count));
            }
        }

        var fast = await Requests.ResponseTimes.FastListings(db, cancellationToken);
        return new CategoryPageResult(
            CategoryLinkDto.From(category),
            totalCount,
            matchCount,
            factCount > 0 ? new CategoryFactDto(WireValues.Of(FactOffer), factCount) : null,
            AppliedFiltersDto.From(filters),
            WireValues.Of(request.Sort),
            window.Page,
            PageWindow.PageSize,
            window.PageCount,
            [.. listings.Select(l => BusinessCardDto.From(l, fast))],
            suggestions,
            Term: null,
            Spaces: []);
    }

    /// <summary>"Rooms & rentals": space cards, newest first, narrowed by term; no business filters or sort (L2-202).</summary>
    private async Task<CategoryPageResult> BuildSpacesAsync(
        Category category, GetCategoryListingsQuery request, CancellationToken cancellationToken)
    {
        var inCategory = CategoryQueries.PublicListingsIn(db, category);
        var totalCount = await inCategory.CountAsync(cancellationToken);

        // The term is inside the JSON column, so the (small) category is narrowed in memory.
        var all = await inCategory.OrderByDescending(l => l.PublishedAt).ThenBy(l => l.SortName).ToListAsync(cancellationToken);
        var matches = all.Where(l => l.Space is not null && (request.Term is null || l.Space.Term == request.Term)).ToList();

        var window = PageWindow.Clamp(request.Page, matches.Count);
        var page = matches.Skip(window.Skip).Take(PageWindow.PageSize);

        return new CategoryPageResult(
            CategoryLinkDto.From(category),
            totalCount,
            matches.Count,
            Fact: null,
            new AppliedFiltersDto([], []),
            WireValues.Of(ListingSort.Newest),
            window.Page,
            PageWindow.PageSize,
            window.PageCount,
            Businesses: [],
            Suggestions: [],
            request.Term is { } term ? WireValues.Of(term) : null,
            [.. page.Select(SpaceCardDto.From)]);
    }
}

/// <summary>The number of businesses a filter set matches, for "Show {n} businesses".</summary>
public sealed record GetCategoryListingCountQuery(string Slug, CategoryFilterSet Filters) : IRequest<CategoryCountDto>
{
    public static GetCategoryListingCountQuery FromUntrusted(string slug, string? offers, string? areas) =>
        new(slug, CategoryFilterSet.Parse(offers, areas));
}

public sealed class GetCategoryListingCountQueryHandler(IAppDbContext db)
    : IRequestHandler<GetCategoryListingCountQuery, CategoryCountDto>
{
    public async Task<CategoryCountDto> Handle(GetCategoryListingCountQuery request, CancellationToken cancellationToken)
    {
        var category = CategoryQueries.Require(request.Slug);
        var matches = request.Filters.Apply(CategoryQueries.PublicListingsIn(db, category));
        return new CategoryCountDto(await matches.CountAsync(cancellationToken));
    }
}

internal static class CategoryQueries
{
    public const string NotFoundCode = "category_not_found";

    public static Category Require(string slug) =>
        Category.Find(slug) ?? throw new NotFoundException(NotFoundCode, "There is no such category.");

    public static IQueryable<Listing> PublicListingsIn(IAppDbContext db, Category category) =>
        db.Listings.AsNoTracking().WherePublic().Where(l => l.CategorySlug == category.Slug);
}
