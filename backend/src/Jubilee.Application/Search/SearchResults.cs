namespace Jubilee.Application.Search;

public static class SearchResultKind
{
    public const string Business = "business";
    public const string Service = "service";
    public const string Product = "product";
}

/// <summary>A span of <see cref="MatchExplanation.Text"/> to highlight. The client builds the markup.</summary>
public sealed record HighlightRange(int Start, int Length);

/// <summary>Plain text plus highlight ranges, never markup (design: MatchExplanation).</summary>
public sealed record MatchExplanation(string Text, IReadOnlyList<HighlightRange> Highlights);

/// <summary>One result. <see cref="Slug"/> is always the business's slug.</summary>
public sealed record SearchHit(
    string Kind,
    string Name,
    string Slug,
    string? ProductSlug,
    string BusinessName,
    string CategorySlug,
    MatchExplanation? Explanation);

/// <summary>A close term for a query that matched nothing, and the category it belongs to.</summary>
public sealed record SearchSuggestion(string CloseTerm, string? CategorySlug);

public sealed record SearchResults(
    string Query,
    int BusinessCount,
    int ServiceCount,
    int ProductCount,
    bool HasMatchExplanations,
    IReadOnlyList<SearchHit> Hits,
    SearchSuggestion? Suggestion);

/// <summary>The full-text search over the directory's public listings, services and products.</summary>
public interface ISearchIndex
{
    Task<SearchResults> SearchAsync(string query, CancellationToken cancellationToken);
}

public sealed record RecentSearchDto(Guid Id, string Query);

public sealed record PopularCategoryDto(string Slug, string Name, int Count);

/// <summary>The empty search page (L2-031).</summary>
public sealed record SearchStartDto(IReadOnlyList<RecentSearchDto> Recent, IReadOnlyList<PopularCategoryDto> PopularCategories);

/// <summary>The answer to a search: results, or for an empty query the start payload.</summary>
public sealed record SearchAnswer(SearchResults? Results, SearchStartDto? Start);
