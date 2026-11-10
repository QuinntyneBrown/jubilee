namespace Jubilee.Domain;

/// <summary>A query a signed-in member submitted, shown on the empty search page (L2-031).</summary>
public sealed class RecentSearch
{
    private RecentSearch()
    {
    }

    public Guid Id { get; private set; }

    public string MemberSubject { get; private set; } = string.Empty;

    public string Query { get; private set; } = string.Empty;

    public DateTimeOffset SearchedAt { get; private set; }

    public static RecentSearch Record(string memberSubject, string query, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        MemberSubject = memberSubject,
        Query = query,
        SearchedAt = now,
    };

    /// <summary>Searching the same words again moves the entry to the top.</summary>
    public void Touch(DateTimeOffset now) => SearchedAt = now;
}
