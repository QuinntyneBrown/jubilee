namespace Jubilee.Domain;

/// <summary>
/// What a person typed into the search box, after the input rules (L2-032): trimmed and cut to
/// <see cref="MaxLength"/> characters. Whitespace only is empty.
/// </summary>
public sealed record SearchQueryText
{
    public const int MaxLength = 100;

    private SearchQueryText(string value) => Value = value;

    public string Value { get; }

    public bool IsEmpty => Value.Length == 0;

    public static SearchQueryText From(string? raw)
    {
        var trimmed = (raw ?? string.Empty).Trim();
        if (trimmed.Length > MaxLength)
        {
            trimmed = trimmed[..MaxLength].TrimEnd();
        }

        return new SearchQueryText(trimmed);
    }
}
