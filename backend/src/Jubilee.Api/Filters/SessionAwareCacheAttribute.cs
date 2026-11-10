using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Net.Http.Headers;

namespace Jubilee.Api.Filters;

/// <summary>
/// Marks a read whose answer depends on the session. A visitor's successful answer may be cached by
/// the browser and the edge for 60 seconds, varied by the session cookie (L2-156 AC2); a signed-in
/// caller's answer carries their relation to the object and is never stored.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class SessionAwareCacheAttribute : ResultFilterAttribute
{
    public override void OnResultExecuting(ResultExecutingContext context)
    {
        if (context.Result is not ObjectResult { StatusCode: null or StatusCodes.Status200OK })
        {
            return;
        }

        var headers = context.HttpContext.Response.Headers;
        if (context.HttpContext.User.Identity?.IsAuthenticated == true)
        {
            headers.CacheControl = "private, no-store";
            return;
        }

        headers.CacheControl = $"public, max-age={PublicDirectoryCacheAttribute.MaxAgeSeconds}";
        headers.Append(HeaderNames.Vary, HeaderNames.Cookie);
    }
}
