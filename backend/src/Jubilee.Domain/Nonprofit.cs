namespace Jubilee.Domain;

/// <summary>
/// What a non-profit says of itself (L2-287): its mission, who it serves and where in Toronto it
/// works, in its own words, and its own page for giving when it has one. Owned by its listing or
/// draft; the website is the listing's <see cref="Listing.Website"/>. Jubilee takes, holds, counts
/// and receipts no gift, and keeps no charity registration number (ADR 0074).
/// </summary>
public sealed class NonprofitDetails
{
    public const int MaxMissionLength = 600;

    public const int MaxServesLength = 300;

    public const int MaxAreaLength = 120;

    private NonprofitDetails()
    {
    }

    /// <summary>"Its mission".</summary>
    public string Mission { get; private set; } = string.Empty;

    /// <summary>"Who it serves".</summary>
    public string Serves { get; private set; } = string.Empty;

    /// <summary>"Where in Toronto it works".</summary>
    public string Area { get; private set; } = string.Empty;

    /// <summary>"Page for giving": the non-profit's own page where people give; null when it has none.</summary>
    public string? GiveUrl { get; private set; }

    /// <summary>Keeps what was given, cut to the lengths the form allows, without validating it (L2-287 AC2, AC9).</summary>
    public static NonprofitDetails Create(string? mission, string? serves, string? area, string? giveUrl) => new()
    {
        Mission = Cut(mission, MaxMissionLength),
        Serves = Cut(serves, MaxServesLength),
        Area = Cut(area, MaxAreaLength),
        GiveUrl = Cut(giveUrl, WebAddressRules.MaxLength) is { Length: > 0 } give ? give : null,
    };

    private static string Cut(string? value, int max)
    {
        var trimmed = value?.Trim() ?? string.Empty;
        return trimmed.Length > max ? trimmed[..max] : trimmed;
    }
}
