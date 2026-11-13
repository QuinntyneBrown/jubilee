namespace Jubilee.Domain;

/// <summary>The rules a software platform's web address follows (L2-250 AC4, ADR 0072).</summary>
public static class PlatformRules
{
    public const int MaxWebsiteLength = 200;

    /// <summary>
    /// True for an absolute <c>https</c> address with a dotted host and no user or password, 200
    /// characters at most. It is the page's main action, so plain <c>http</c> is not accepted.
    /// The address is only ever read as text: nothing here or elsewhere requests it (L2-255 AC4).
    /// </summary>
    public static bool IsWebAddress(string? value)
    {
        var text = value?.Trim() ?? string.Empty;
        return text.Length is > 0 and <= MaxWebsiteLength
            && !text.Any(char.IsWhiteSpace)
            && text.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            && Uri.TryCreate(text, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps
            && string.IsNullOrEmpty(uri.UserInfo)
            && uri.HostNameType == UriHostNameType.Dns
            && uri.Host.Contains('.')
            && !uri.Host.StartsWith('.')
            && !uri.Host.EndsWith('.');
    }

    /// <summary>The host the link out names, without <c>www.</c>: "lanternread.example" (L2-255 AC1).</summary>
    public static string Host(string website)
    {
        var host = new Uri(website.Trim()).Host;
        return host.StartsWith("www.", StringComparison.OrdinalIgnoreCase) ? host[4..] : host;
    }
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
