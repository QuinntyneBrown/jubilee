namespace Jubilee.Domain;

/// <summary>
/// One counted visit to a listing page, for the owner's statistics (L2-037 AC3). The visitor is
/// a member's subject or a one-way hash of the caller's address and user agent; no address is
/// stored.
/// </summary>
public sealed class ListingView
{
    /// <summary>A second visit by the same visitor within this time is the same view.</summary>
    public static readonly TimeSpan RepeatWindow = TimeSpan.FromMinutes(30);

    private ListingView()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public string VisitorKey { get; private set; } = string.Empty;

    public DateTimeOffset ViewedAt { get; private set; }

    public static ListingView Record(Guid listingId, string visitorKey, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        VisitorKey = visitorKey,
        ViewedAt = now,
    };
}
