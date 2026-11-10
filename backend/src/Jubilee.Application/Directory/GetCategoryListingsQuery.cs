using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Directory;

/// <summary>One page of a category for a category query: filters, sort order and page number.</summary>
public sealed record GetCategoryListingsQuery(string Slug, CategoryFilterSet Filters, ListingSort Sort, int Page)
    : IRequest<CategoryPageResult>
{
    /// <summary>Builds the query from the untrusted route and query-string values.</summary>
    public static GetCategoryListingsQuery FromUntrusted(string slug, string? offers, string? areas, string? sort, string? page) =>
        new(slug, CategoryFilterSet.Parse(offers, areas), ListingSortPolicy.Parse(sort), PageWindow.ParseRequestedPage(page));
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
            Math.Max(1, request.Page));
        return cache.GetOrCreateAsync(key, ct => BuildAsync(category, request, ct), cancellationToken);
    }

    private async Task<CategoryPageResult> BuildAsync(
        Category category, GetCategoryListingsQuery request, CancellationToken cancellationToken)
    {
        var inCategory = CategoryQueries.PublicListingsIn(db, category);
        var matches = request.Filters.Apply(inCategory);

        var totalCount = await inCategory.CountAsync(cancellationToken);
        var matchCount = request.Filters.IsEmpty ? totalCount : await matches.CountAsync(cancellationToken);
        var factCount = await inCategory.CountAsync(l => (l.Offers & FactOffer) != 0, cancellationToken);

        var window = PageWindow.Clamp(request.Page, matchCount);
        var listings = await ListingSortPolicy.Apply(matches, request.Sort)
            .Skip(window.Skip)
            .Take(PageWindow.PageSize)
            .ToListAsync(cancellationToken);

        var suggestions = new List<FilterSuggestion>();
        if (matchCount == 0 && !request.Filters.IsEmpty)
        {
            foreach (var (group, value, remaining) in request.Filters.WithoutOneFilter())
            {
                var count = await remaining.Apply(inCategory).CountAsync(cancellationToken);
                suggestions.Add(new FilterSuggestion(new RemovedFilterDto(group, value), count));
            }
        }

        return new CategoryPageResult(
            CategoryLinkDto.From(category),
            totalCount,
            matchCount,
            factCount > 0 ? new CategoryFactDto(WireValues.Of(FactOffer), factCount) : null,
            AppliedFiltersDto.From(request.Filters),
            WireValues.Of(request.Sort),
            window.Page,
            PageWindow.PageSize,
            window.PageCount,
            [.. listings.Select(BusinessCardDto.From)],
            suggestions);
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
