namespace Jubilee.Api.Middleware;

/// <summary>
/// The request path as a log line may write it (L2-140 AC3, ADR 0047). A token in the path is replaced
/// by <see cref="Marker"/>: the value of a route parameter named <c>token</c>, and, where the request
/// matched no route (a 404 or a 405), any segment long enough to be one. Bodies, query strings and
/// cookies are never logged, so the path is the only place a token could reach a log.
/// </summary>
public static class LoggedPath
{
    public const string Marker = "[redacted]";

    /// <summary>The route parameter every token-carrying route uses.</summary>
    public const string TokenParameter = "token";

    /// <summary>Shorter than any token Jubilee issues (43 characters), longer than a GUID (36).</summary>
    private const int TokenLength = 40;

    public static string Of(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        var route = context.Request.RouteValues;
        if (route.TryGetValue(TokenParameter, out var value) && value is string token && token.Length > 0)
        {
            return path.Replace(token, Marker, StringComparison.Ordinal)
                .Replace(Uri.EscapeDataString(token), Marker, StringComparison.Ordinal);
        }

        if (route.Count > 0 || path.Length < TokenLength)
        {
            return path;
        }

        var segments = path.Split('/');
        for (var i = 0; i < segments.Length; i++)
        {
            if (segments[i].Length >= TokenLength)
            {
                segments[i] = Marker;
            }
        }

        return string.Join('/', segments);
    }
}
