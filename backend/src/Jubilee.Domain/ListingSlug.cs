namespace Jubilee.Domain;

/// <summary>
/// A slug a listing had before its business name changed (L2-113 AC2, ADR 0056). It answers 301 to the listing's
/// current slug and is never given to another listing.
/// </summary>
public sealed class ListingSlug
{
    private ListingSlug()
    {
    }

    public string Slug { get; private set; } = string.Empty;

    public Guid ListingId { get; private set; }

    public DateTimeOffset RetiredAt { get; private set; }

    public static ListingSlug Keep(string slug, Guid listingId, DateTimeOffset now) =>
        new() { Slug = slug, ListingId = listingId, RetiredAt = now };
}
