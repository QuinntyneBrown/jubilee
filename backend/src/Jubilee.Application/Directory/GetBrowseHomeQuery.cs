using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Directory;

public sealed record GetBrowseHomeQuery : IRequest<BrowseHomeDto>;

public sealed class GetBrowseHomeQueryHandler(
    IAppDbContext db,
    FeaturedSelector featuredSelector,
    DirectoryGrouping grouping,
    IDirectoryReadCache cache,
    TimeProvider clock) : IRequestHandler<GetBrowseHomeQuery, BrowseHomeDto>
{
    public const int FeaturedLimit = 5;
    public const int ShopProductLimit = 5;

    public Task<BrowseHomeDto> Handle(GetBrowseHomeQuery request, CancellationToken cancellationToken) =>
        cache.GetOrCreateAsync("home", BuildAsync, cancellationToken);

    private async Task<BrowseHomeDto> BuildAsync(CancellationToken cancellationToken)
    {
        var count = await db.Listings.WherePublic().CountAsync(cancellationToken);
        var featured = await featuredSelector.SelectAsync(clock.GetUtcNow(), FeaturedLimit, cancellationToken);
        var products = await ShopProductsAsync(cancellationToken);
        var groups = await grouping.BuildAsync(cancellationToken);

        return new BrowseHomeDto(count, CategoryLinkDto.All, [.. featured.Select(BusinessCardDto.From)], products, groups);
    }

    /// <summary>
    /// "From the shops": the five most recently added products, newest first, that are not
    /// deleted and belong to a public listing in the Shops category.
    /// </summary>
    private async Task<IReadOnlyList<ProductCardDto>> ShopProductsAsync(CancellationToken cancellationToken)
    {
        var shops = db.Listings.WherePublic().Where(l => l.CategorySlug == Category.ShopsSlug);
        var rows = await db.Products.AsNoTracking()
            .Where(p => !p.IsDeleted)
            .Join(shops, p => p.ListingId, l => l.Id, (p, l) => new { Product = p, ShopSlug = l.Slug, ShopName = l.Name })
            .OrderByDescending(x => x.Product.CreatedAt)
            .ThenBy(x => x.Product.Slug)
            .Take(ShopProductLimit)
            .ToListAsync(cancellationToken);

        return
        [
            .. rows.Select(x => new ProductCardDto(
                x.Product.Slug,
                x.ShopSlug,
                x.Product.Name,
                x.ShopName,
                x.Product.PriceCents,
                x.Product.IsPerUnit,
                new ProductTileDto(WireValues.Of(x.Product.TileTint), WireValues.Of(x.Product.TileIcon)))),
        ];
    }
}
