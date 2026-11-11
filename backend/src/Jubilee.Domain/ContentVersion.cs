namespace Jubilee.Domain;

/// <summary>
/// One numbered, immutable version of a policy page (L2-107 AC2). The highest number of a slug is the published one;
/// nothing updates or deletes a version, so every earlier text is kept.
/// </summary>
public sealed class ContentVersion
{
    public static readonly string[] Slugs = ["statement-of-faith", "terms", "privacy", "help"];

    private ContentVersion()
    {
    }

    public Guid Id { get; private set; }

    public string Slug { get; private set; } = string.Empty;

    public int Number { get; private set; }

    public string Title { get; private set; } = string.Empty;

    public string Lead { get; private set; } = string.Empty;

    /// <summary>The ordered sections as JSON: heading, anchor and body of each.</summary>
    public string SectionsJson { get; private set; } = "[]";

    public DateTimeOffset PublishedAt { get; private set; }

    public string PublishedBy { get; private set; } = string.Empty;

    public static ContentVersion Publish(
        string slug, int number, string title, string lead, string sectionsJson, DateTimeOffset now, string publishedBy) => new()
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            Number = number,
            Title = title,
            Lead = lead,
            SectionsJson = sectionsJson,
            PublishedAt = now,
            PublishedBy = publishedBy,
        };
}
