using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Infrastructure.Seed;

/// <summary>
/// The Purpose Tee and its seventeen sizes, as the Magic Patterns frame has them (L1-034, ADR 0073).
/// Seeding adds the product only when there is none, so it never changes a price or a stock the
/// Jubilee team has set, and is safe to run again.
/// </summary>
public static class MerchCatalogue
{
    private static readonly (MerchFit Fit, string Size, string? Ages, decimal Chest, decimal Length, int? Stock)[] Sizes =
    [
        (MerchFit.Youth, "XS", "4–5", 15m, 20m, null),
        (MerchFit.Youth, "S", "6–8", 16m, 22m, null),
        (MerchFit.Youth, "M", "10–12", 17m, 24m, null),
        (MerchFit.Youth, "L", "14–16", 18m, 26m, 3),
        (MerchFit.Youth, "XL", "18–20", 19m, 27m, 0),
        (MerchFit.Womens, "XS", null, 16.5m, 25m, null),
        (MerchFit.Womens, "S", null, 17.5m, 25.75m, null),
        (MerchFit.Womens, "M", null, 18.5m, 26.5m, null),
        (MerchFit.Womens, "L", null, 19.5m, 27.25m, null),
        (MerchFit.Womens, "XL", null, 20.5m, 28m, 2),
        (MerchFit.Womens, "2XL", null, 21.5m, 28.75m, null),
        (MerchFit.Mens, "S", null, 18m, 28m, null),
        (MerchFit.Mens, "M", null, 20m, 29m, null),
        (MerchFit.Mens, "L", null, 22m, 30m, null),
        (MerchFit.Mens, "XL", null, 24m, 31m, null),
        (MerchFit.Mens, "2XL", null, 26m, 32m, null),
        (MerchFit.Mens, "3XL", null, 28m, 33m, 2),
    ];

    public static MerchProduct PurposeTee(DateTimeOffset now)
    {
        var product = MerchProduct.Create(MerchProduct.PurposeTeeSlug, "Purpose Tee", "Black", 2500, 900, 6000, now);
        foreach (var size in Sizes)
        {
            product.AddVariant(size.Fit, size.Size, size.Ages, size.Chest, size.Length, size.Stock);
        }

        return product;
    }

    public static async Task SeedAsync(AppDbContext db, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (await db.MerchProducts.AnyAsync(p => p.Slug == MerchProduct.PurposeTeeSlug, cancellationToken))
        {
            return;
        }

        db.MerchProducts.Add(PurposeTee(now));
        await db.SaveChangesAsync(cancellationToken);
    }
}
