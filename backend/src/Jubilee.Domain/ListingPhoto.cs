namespace Jubilee.Domain;

/// <summary>
/// A photo of a listing (L2-088). The image itself is a set of renditions in the media store under
/// <see cref="Key"/>; the first photo by <see cref="Position"/> is the cover.
/// </summary>
public sealed class ListingPhoto
{
    public const int MaxPerListing = 6;

    public const int MaxAltLength = 125;

    private ListingPhoto()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    /// <summary>A random name for the stored files; never the uploaded file's name.</summary>
    public string Key { get; private set; } = string.Empty;

    public int Position { get; private set; }

    public string? Alt { get; private set; }

    public int Width { get; private set; }

    public int Height { get; private set; }

    public DateTimeOffset AddedAt { get; private set; }

    public static ListingPhoto Add(Guid listingId, string key, int position, int width, int height, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        Key = key,
        Position = position,
        Width = width,
        Height = height,
        AddedAt = now,
    };

    public void MoveTo(int position) => Position = position;

    public void DescribeAs(string? alt) => Alt = string.IsNullOrWhiteSpace(alt) ? null : alt.Trim();
}
