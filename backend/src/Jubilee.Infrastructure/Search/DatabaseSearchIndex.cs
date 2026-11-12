using Jubilee.Application.Abstractions;
using Jubilee.Application.Directory;
using Jubilee.Application.Search;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Infrastructure.Search;

/// <summary>
/// The search index (ADR 0011): documents are the public listings with their services and
/// products, analysed at query time by <see cref="SearchAnalyzer"/>, so the index is current the
/// moment a listing changes. Only public listings are searchable (L2-028).
/// </summary>
public sealed class DatabaseSearchIndex(IAppDbContext db) : ISearchIndex
{
    private const int HitsPerKind = 20;

    public async Task<SearchResults> SearchAsync(string query, CancellationToken cancellationToken)
    {
        var stems = SearchAnalyzer.QueryStems(query);
        var listings = await db.Listings.AsNoTracking().WherePublic().ToListAsync(cancellationToken);
        var ids = listings.Select(l => l.Id).ToHashSet();
        var services = (await db.Services.AsNoTracking().ToListAsync(cancellationToken))
            .Where(s => ids.Contains(s.ListingId)).ToLookup(s => s.ListingId);
        var products = (await db.Products.AsNoTracking().Where(p => !p.IsDeleted).ToListAsync(cancellationToken))
            .Where(p => ids.Contains(p.ListingId)).ToLookup(p => p.ListingId);

        var businessHits = new List<SearchHit>();
        var serviceHits = new List<SearchHit>();
        var productHits = new List<SearchHit>();
        foreach (var listing in listings.OrderByDescending(l => l.RecommendedScore).ThenBy(l => l.SortName))
        {
            var matchedServices = services[listing.Id].Where(s => Matches(stems, s.Name, s.Detail)).OrderBy(s => s.Position).ToList();
            var matchedProducts = products[listing.Id].Where(p => Matches(stems, p.Name, p.Description)).OrderBy(p => p.Name).ToList();

            var fields = new List<(string Label, string? Source)>();
            if (Matches(stems, listing.Name))
            {
                fields.Add(("name", listing.Name));
            }

            if (Matches(stems, listing.Tagline))
            {
                fields.Add(("tagline", listing.Tagline));
            }

            if (Matches(stems, listing.About))
            {
                fields.Add(("description", listing.About));
            }

            // A space is found by its neighbourhood, the space and its key facts; never by its address (L2-195).
            if (listing.Space is { } space)
            {
                if (Matches(stems, space.Neighbourhood))
                {
                    fields.Add(("neighbourhood", space.Neighbourhood));
                }

                if (Matches(stems, space.Place))
                {
                    fields.Add(("the space", space.Place));
                }

                var fact = space.Facts.FirstOrDefault(f => Matches(stems, f));
                if (fact is not null)
                {
                    fields.Add(("key facts", fact));
                }
            }

            if (matchedServices.Count > 0)
            {
                fields.Add((Count(matchedServices.Count, "service"), matchedServices[0].Name));
            }

            if (matchedProducts.Count > 0)
            {
                fields.Add((Count(matchedProducts.Count, "product"), matchedProducts[0].Name));
            }

            if (fields.Count > 0)
            {
                businessHits.Add(new SearchHit(
                    SearchResultKind.Business, listing.Name, listing.Slug, null, listing.Name, listing.CategorySlug,
                    Explain(stems, fields.Select(f => f.Source), fields.Select(f => f.Label)),
                    listing.Space is null ? null : SpaceCardDto.From(listing)));
            }

            serviceHits.AddRange(matchedServices.Select(s => new SearchHit(
                SearchResultKind.Service, s.Name, listing.Slug, null, listing.Name, listing.CategorySlug,
                Explain(stems, [s.Name, s.Detail], [Matches(stems, s.Name) ? "name" : "details"]))));
            productHits.AddRange(matchedProducts.Select(p => new SearchHit(
                SearchResultKind.Product, p.Name, listing.Slug, p.Slug, listing.Name, listing.CategorySlug,
                Explain(stems, [p.Name, p.Description], [Matches(stems, p.Name) ? "name" : "description"]))));
        }

        IReadOnlyList<SearchHit> hits =
        [
            .. businessHits.Take(HitsPerKind),
            .. serviceHits.Take(HitsPerKind),
            .. productHits.Take(HitsPerKind),
        ];
        var suggestion = hits.Count == 0 ? Suggest(query, listings, services, products) : null;
        return new SearchResults(query, businessHits.Count, serviceHits.Count, productHits.Count, true, hits, suggestion);
    }

    private static bool Matches(IReadOnlyList<string> stems, params string?[] texts) =>
        texts.Any(t => SearchAnalyzer.Matches(t, stems));

    private static string Count(int n, string noun) => $"{n} {noun}{(n == 1 ? string.Empty : "s")}";

    /// <summary>"Matches plumbing in name and 4 services", with the matched word highlighted.</summary>
    private static MatchExplanation Explain(IReadOnlyList<string> stems, IEnumerable<string?> sources, IEnumerable<string> labels)
    {
        var term = stems.Count == 0
            ? string.Empty
            : sources.Select(s => SearchAnalyzer.WordFor(s, stems[0])).FirstOrDefault(w => w is not null) ?? stems[0];
        term = term.ToLowerInvariant();
        var list = labels.ToList();
        var where = list.Count == 1
            ? list[0]
            : string.Join(", ", list.Take(list.Count - 1)) + " and " + list[^1];
        var prefix = "Matches ";
        return new MatchExplanation($"{prefix}{term} in {where}", [new HighlightRange(prefix.Length, term.Length)]);
    }

    /// <summary>The nearest word of the directory within two edits, and the category it is most used in.</summary>
    private static SearchSuggestion? Suggest(
        string query, List<Listing> listings, ILookup<Guid, Service> services, ILookup<Guid, Product> products)
    {
        var typed = SearchAnalyzer.Words(query).Select(w => SearchAnalyzer.Fold(w.Text)).OrderByDescending(w => w.Length).FirstOrDefault();
        if (typed is null || typed.Length < 3)
        {
            return null;
        }

        var vocabulary = new Dictionary<string, (string Word, Dictionary<string, int> Categories)>();
        foreach (var listing in listings)
        {
            var sources = new List<string?> { listing.Name, listing.Tagline };
            sources.AddRange(services[listing.Id].Select(s => s.Name));
            sources.AddRange(products[listing.Id].Select(p => p.Name));
            foreach (var word in sources.Where(s => s is not null).SelectMany(s => SearchAnalyzer.Words(s!)))
            {
                var folded = SearchAnalyzer.Fold(word.Text);
                if (folded.Length < 4)
                {
                    continue;
                }

                if (!vocabulary.TryGetValue(folded, out var entry))
                {
                    entry = (word.Text.ToLowerInvariant(), []);
                    vocabulary[folded] = entry;
                }

                entry.Categories[listing.CategorySlug] = entry.Categories.GetValueOrDefault(listing.CategorySlug) + 1;
            }
        }

        var allowed = typed.Length <= 4 ? 1 : 2;
        var best = vocabulary
            .Where(v => v.Key != typed)
            .Select(v => (v.Key, v.Value, Distance: SearchAnalyzer.Distance(typed, v.Key)))
            .Where(v => v.Distance <= allowed)
            .OrderBy(v => v.Distance)
            .ThenBy(v => v.Key, StringComparer.Ordinal)
            .FirstOrDefault();
        if (best.Key is null)
        {
            return null;
        }

        var category = best.Value.Categories.OrderByDescending(c => c.Value).ThenBy(c => c.Key, StringComparer.Ordinal).First().Key;
        return new SearchSuggestion(best.Value.Word, category);
    }
}
