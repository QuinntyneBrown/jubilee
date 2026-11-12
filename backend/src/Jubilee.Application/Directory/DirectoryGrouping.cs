using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Directory;

/// <summary>
/// Turns the public listings into the category groups of the browse home (L2-021 AC3, AC4): per
/// category, in the fixed order, its count and its first four listings in Recommended order,
/// with <c>HasMore</c> when it holds more than four. A category with no public listing is omitted.
/// </summary>
public sealed class DirectoryGrouping(IAppDbContext db)
{
    public const int RowsPerGroup = 4;

    public async Task<IReadOnlyList<CategoryGroupDto>> BuildAsync(CancellationToken cancellationToken)
    {
        // Spaces have their own shelf and are not part of the businesses' groups (L2-201 AC6).
        var publicListings = db.Listings.AsNoTracking().WherePublic().WhereBusiness();
        var counts = await publicListings
            .GroupBy(l => l.CategorySlug)
            .Select(g => new { Slug = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Slug, g => g.Count, cancellationToken);

        var groups = new List<CategoryGroupDto>();
        foreach (var category in Category.All)
        {
            if (!counts.TryGetValue(category.Slug, out var count) || count == 0)
            {
                continue;
            }

            var firstRows = await ListingSortPolicy
                .Apply(publicListings.Where(l => l.CategorySlug == category.Slug), ListingSort.Recommended)
                .Take(RowsPerGroup)
                .ToListAsync(cancellationToken);

            groups.Add(new CategoryGroupDto(
                category.Slug,
                category.Name,
                count,
                HasMore: count > RowsPerGroup,
                [.. firstRows.Select(DirectoryRowDto.From)]));
        }

        return groups;
    }
}
