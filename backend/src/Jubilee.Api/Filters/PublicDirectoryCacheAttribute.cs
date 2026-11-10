using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Jubilee.Api.Filters;

/// <summary>
/// Marks a public directory read whose successful response carries no personal data and may be
/// cached by the browser and the edge for 60 seconds (L2-156 AC2).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class PublicDirectoryCacheAttribute : ResultFilterAttribute
{
    public const int MaxAgeSeconds = 60;

    public override void OnResultExecuting(ResultExecutingContext context)
    {
        if (context.Result is ObjectResult { StatusCode: null or StatusCodes.Status200OK })
        {
            context.HttpContext.Response.Headers.CacheControl = $"public, max-age={MaxAgeSeconds}";
        }
    }
}
