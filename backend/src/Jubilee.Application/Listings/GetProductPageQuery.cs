using Jubilee.Application.Abstractions;
using Jubilee.Application.Directory;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Listings;

/// <summary>The shop that sells a product, as the product page names it.</summary>
public sealed record ProductShopDto(string Slug, string Name, bool Verified);

/// <summary>One option; <see cref="MaxQuantity"/> bounds the quantity without revealing the stock (L2-035 AC3).</summary>
public sealed record ProductOptionDto(string Label, int MaxQuantity);

public sealed record ProductAttributeDto(string Label, string Value);

/// <summary>The product page at <c>/b/:slug/p/:product</c> (L2-035, L2-036).</summary>
public sealed record ProductPageDto(
    Guid Id,
    string Slug,
    string Name,
    int PriceCents,
    bool PerUnit,
    string? DeliveryLine,
    ProductTileDto Tile,
    ProductShopDto Shop,
    string? Description,
    IReadOnlyList<ProductAttributeDto> Attributes,
    string? OptionName,
    IReadOnlyList<ProductOptionDto> Options,
    int MinimumQuantity,
    int MaxQuantity,
    bool SoldOut,
    string? RestockNote,
    IReadOnlyList<ProductCardDto> More,
    bool StockAlertRequested = false);

public sealed record GetProductPageQuery(string ListingSlug, string ProductSlug, Viewer Viewer) : IRequest<ProductPageDto>;

public sealed class GetProductPageQueryHandler(IAppDbContext db, IDirectoryReadCache cache)
    : IRequestHandler<GetProductPageQuery, ProductPageDto>
{
    public const string NotFoundCode = "product_not_found";

    /// <summary>"More from {shop}" shows at most this many other products, newest first (L2-035 AC5).</summary>
    public const int MoreCount = 3;

    public async Task<ProductPageDto> Handle(GetProductPageQuery request, CancellationToken cancellationToken)
    {
        var listingSlug = request.ListingSlug.Trim().ToLowerInvariant();
        var productSlug = request.ProductSlug.Trim().ToLowerInvariant();
        // The public page is the same for everyone and cached; whether the member already asked
        // to be told when it is back is their own.
        var page = await cache.GetOrCreateAsync<ProductPageDto>(
            $"product|{listingSlug}|{productSlug}",
            ct => BuildAsync(listingSlug, productSlug, ct),
            cancellationToken);
        if (!page.SoldOut || request.Viewer.Subject is not { } subject)
        {
            return page;
        }

        var requested = await db.StockAlerts.AnyAsync(
            a => a.ProductId == page.Id && a.MemberSubject == subject && a.NotifiedAt == null,
            cancellationToken);
        return page with { StockAlertRequested = requested };
    }

    private async Task<ProductPageDto> BuildAsync(string listingSlug, string productSlug, CancellationToken cancellationToken)
    {
        // A product is only as visible as its shop (L2-028).
        var shop = await db.Listings.AsNoTracking().WherePublic().SingleOrDefaultAsync(l => l.Slug == listingSlug, cancellationToken)
            ?? throw NotFound();
        var shopProducts = db.Products.AsNoTracking().Where(p => p.ListingId == shop.Id && !p.IsDeleted);
        var product = await shopProducts.SingleOrDefaultAsync(p => p.Slug == productSlug, cancellationToken)
            ?? throw NotFound();
        var more = await shopProducts
            .Where(p => p.Id != product.Id)
            .OrderByDescending(p => p.CreatedAt)
            .ThenBy(p => p.Slug)
            .Take(MoreCount)
            .ToListAsync(cancellationToken);

        return new ProductPageDto(
            product.Id,
            product.Slug,
            product.Name,
            product.PriceCents,
            product.IsPerUnit,
            product.DeliveryLine,
            new ProductTileDto(WireValues.Of(product.TileTint), WireValues.Of(product.TileIcon)),
            new ProductShopDto(shop.Slug, shop.Name, VerifiedListingSpecification.IsSatisfiedBy(shop)),
            product.Description,
            [.. product.OrderedAttributes.Select(a => new ProductAttributeDto(a.Label, a.Value))],
            product.OptionName,
            [.. product.OrderedOptions.Select(o => new ProductOptionDto(o.Label, o.MaxQuantity))],
            product.MinimumQuantity,
            product.MaxQuantity,
            product.IsSoldOut,
            product.IsSoldOut ? product.RestockNote : null,
            [.. more.Select(p => ProductCardDto.From(p, shop))]);
    }

    private static NotFoundException NotFound() => new(NotFoundCode, "There is no such product.");
}
