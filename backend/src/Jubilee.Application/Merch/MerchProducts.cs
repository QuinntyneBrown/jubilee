using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Merch;

/// <summary>The fixed words of each fit, shown beside the sizes and in the size guide (L2-264).</summary>
public static class MerchFits
{
    public sealed record FitContent(MerchFit Fit, string Key, string Name, string Note, string GuideNote);

    public static readonly IReadOnlyList<FitContent> All =
    [
        new(MerchFit.Youth, "youth", "Youth", "Kids’ cut for ages 4–16. Same print, scaled to fit a smaller chest.", "Between sizes? Size up; they grow."),
        new(MerchFit.Womens, "womens", "Women’s",
            "Slim through the body with a slightly shorter length. For a relaxed look, size up or choose Men’s.", "Slim fit."),
        new(MerchFit.Mens, "mens", "Men’s", "Classic straight fit, true to size. Unisex, so it suits anyone who likes a roomier tee.", "Classic fit."),
    ];

    public static FitContent Of(MerchFit fit) => All.Single(f => f.Fit == fit);
}

/// <summary>What can still be sold of each size: its stock less what pending orders hold (L2-267 AC2).</summary>
public static class MerchStock
{
    /// <summary>Quantities held by pending orders whose session has not expired, by variant.</summary>
    public static async Task<Dictionary<Guid, int>> HeldAsync(IAppDbContext db, DateTimeOffset now, CancellationToken cancellationToken, Guid? exceptOrder = null)
    {
        var held = await db.MerchOrders
            .Where(o => o.Status == MerchOrderStatus.Pending && o.ExpiresAt > now && o.Id != exceptOrder)
            .SelectMany(o => o.Lines)
            .Select(l => new { l.VariantId, l.Quantity })
            .ToListAsync(cancellationToken);
        return held.GroupBy(l => l.VariantId).ToDictionary(g => g.Key, g => g.Sum(l => l.Quantity));
    }

    public static int? Left(MerchVariant variant, IReadOnlyDictionary<Guid, int> held) =>
        variant.Stock is { } stock ? Math.Max(0, stock - held.GetValueOrDefault(variant.Id)) : null;
}

public sealed record MerchSizeDto(string Sku, string Label, string? Ages, decimal Chest, decimal Length, int? Left);

public sealed record MerchFitDto(string Key, string Name, string Note, string GuideNote, IReadOnlyList<MerchSizeDto> Sizes);

public sealed record MerchProductDto(
    string Name, string Colour, int UnitPriceCents, string Currency, int ShippingCents, int FreeShippingFromCents, IReadOnlyList<MerchFitDto> Fits);

/// <summary>The Purpose Tee as anyone reads it (L2-263 AC4).</summary>
public sealed record GetMerchProductQuery(string Slug) : IRequest<MerchProductDto>;

public sealed class GetMerchProductQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<GetMerchProductQuery, MerchProductDto>
{
    public async Task<MerchProductDto> Handle(GetMerchProductQuery request, CancellationToken cancellationToken)
    {
        var product = await db.MerchProducts.AsNoTracking().Include(p => p.Variants)
            .SingleOrDefaultAsync(p => p.Slug == request.Slug, cancellationToken)
            ?? throw new NotFoundException("product_not_found", "We can't find that product.");
        var held = await MerchStock.HeldAsync(db, clock.GetUtcNow(), cancellationToken);
        var fits = MerchFits.All
            .Select(fit => new MerchFitDto(
                fit.Key,
                fit.Name,
                fit.Note,
                fit.GuideNote,
                [.. product.Variants.Where(v => v.Fit == fit.Fit).OrderBy(v => v.SortOrder)
                    .Select(v => new MerchSizeDto(v.Sku, v.Size, v.Ages, v.ChestInches, v.LengthInches, MerchStock.Left(v, held)))]))
            .ToList();
        return new MerchProductDto(
            product.Name, product.Colour, product.UnitPriceCents, product.Currency, product.ShippingCents, product.FreeShippingFromCents, fits);
    }
}
