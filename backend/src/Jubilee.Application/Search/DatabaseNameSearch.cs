using Jubilee.Application.Abstractions;
using Jubilee.Application.Directory;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Search;

/// <summary>
/// The fallback when the search index is unavailable: public listings whose name contains the
/// query. It gives no match explanations (L2-181 AC3).
/// </summary>
public sealed class DatabaseNameSearch(IAppDbContext db)
{
    public async Task<SearchResults> SearchAsync(string query, CancellationToken cancellationToken)
    {
        var folded = SearchAnalyzer.Fold(query);
        var listings = await db.Listings.AsNoTracking().WherePublic().ToListAsync(cancellationToken);
        var hits = listings
            .Where(l => SearchAnalyzer.Fold(l.Name).Contains(folded, StringComparison.Ordinal))
            .OrderByDescending(l => l.RecommendedScore)
            .ThenBy(l => l.SortName)
            .Select(l => new SearchHit(
                SearchResultKind.Business, l.Name, l.Slug, null, l.Name, l.CategorySlug, null, l.Space is null ? null : SpaceCardDto.From(l)))
            .ToList();
        return new SearchResults(query, hits.Count, 0, 0, false, hits, null);
    }
}
