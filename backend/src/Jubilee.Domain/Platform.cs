namespace Jubilee.Domain;

/// <summary>The rules a software platform's web address follows (L2-250 AC4, ADR 0072): those of <see cref="WebAddressRules"/>.</summary>
public static class PlatformRules
{
    public const int MaxWebsiteLength = WebAddressRules.MaxLength;

    /// <inheritdoc cref="WebAddressRules.IsWebAddress"/>
    public static bool IsWebAddress(string? value) => WebAddressRules.IsWebAddress(value);

    /// <summary>The host the link out names, without <c>www.</c>: "lanternread.example" (L2-255 AC1).</summary>
    public static string Host(string website) => WebAddressRules.Host(website);
}

/// <summary>
/// What a founder says of a software platform (L2-250): what it does, who it is for and how it is
/// priced, in their own words. Owned by its listing or draft; the web address is the listing's
/// <see cref="Listing.Website"/>.
/// </summary>
public sealed class PlatformDetails
{
    public const int MaxDoesLength = 600;

    public const int MaxForLength = 300;

    public const int MaxPricingLength = 120;

    private PlatformDetails()
    {
    }

    /// <summary>"What it does".</summary>
    public string Does { get; private set; } = string.Empty;

    /// <summary>"Who it is for".</summary>
    public string For { get; private set; } = string.Empty;

    /// <summary>"Pricing", as the founder words it; Jubilee takes no payment and compares no prices.</summary>
    public string Pricing { get; private set; } = string.Empty;

    /// <summary>Keeps what was given, cut to the lengths the form allows, without validating it (L2-250 AC2).</summary>
    public static PlatformDetails Create(string? does, string? @for, string? pricing) => new()
    {
        Does = Cut(does, MaxDoesLength),
        For = Cut(@for, MaxForLength),
        Pricing = Cut(pricing, MaxPricingLength),
    };

    private static string Cut(string? value, int max)
    {
        var trimmed = value?.Trim() ?? string.Empty;
        return trimmed.Length > max ? trimmed[..max] : trimmed;
    }
}
