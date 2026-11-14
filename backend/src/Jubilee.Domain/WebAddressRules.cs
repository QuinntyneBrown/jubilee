namespace Jubilee.Domain;

/// <summary>
/// The rule an address a listing links out to follows: a platform's web address (L2-250 AC4) and a
/// non-profit's website and page for giving (L2-287 AC4, ADR 0074).
/// </summary>
public static class WebAddressRules
{
    public const int MaxLength = 200;

    /// <summary>
    /// True for an absolute <c>https</c> address with a dotted host and no user or password, 200
    /// characters at most. It is a page's main action, so plain <c>http</c> is not accepted.
    /// The address is only ever read as text: nothing here or elsewhere requests it (L2-255 AC4, L2-292 AC4).
    /// </summary>
    public static bool IsWebAddress(string? value)
    {
        var text = value?.Trim() ?? string.Empty;
        return text.Length is > 0 and <= MaxLength
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

    /// <summary>The host a link out names, without <c>www.</c>: "hopehouse.example" (L2-255 AC1, L2-292 AC1).</summary>
    public static string Host(string address)
    {
        var host = new Uri(address.Trim()).Host;
        return host.StartsWith("www.", StringComparison.OrdinalIgnoreCase) ? host[4..] : host;
    }
}
