namespace Jubilee.Domain;

/// <summary>
/// A photo an owner uploaded for a product of their listing (L2-091 AC9, ADR 0063). The image is a
/// set of renditions in the media store under <see cref="Key"/>; a product takes it when it is saved.
/// </summary>
public sealed class ProductPhoto
{
    private ProductPhoto()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The listing whose owner uploaded it; only its products can take it.</summary>
    public Guid ListingId { get; private set; }

    /// <summary>A random name for the stored files; never the uploaded file's name.</summary>
    public string Key { get; private set; } = string.Empty;

    public int Width { get; private set; }

    public int Height { get; private set; }

    public DateTimeOffset UploadedAt { get; private set; }

    public static ProductPhoto Upload(Guid listingId, string key, int width, int height, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        Key = key,
        Width = width,
        Height = height,
        UploadedAt = now,
    };
}
