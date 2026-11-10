namespace Jubilee.Domain;

/// <summary>Maps a <see cref="ListingSort"/> to an ordering (L2-025).</summary>
public static class ListingSortPolicy
{
    /// <summary>Reads the untrusted <c>sort</c> query value; anything unknown means Recommended.</summary>
    public static ListingSort Parse(string? raw) =>
        raw is null ? ListingSort.Recommended : WireValues.ParseSort(raw.Trim()) ?? ListingSort.Recommended;

    public static IOrderedQueryable<Listing> Apply(IQueryable<Listing> listings, ListingSort sort) => sort switch
    {
        ListingSort.NameAscending => listings.OrderBy(l => l.SortName).ThenBy(l => l.Slug),
        ListingSort.Newest => listings.OrderByDescending(l => l.ApprovedAt).ThenBy(l => l.SortName).ThenBy(l => l.Slug),
        _ => listings.OrderByDescending(l => l.RecommendedScore).ThenBy(l => l.SortName).ThenBy(l => l.Slug),
    };
}
