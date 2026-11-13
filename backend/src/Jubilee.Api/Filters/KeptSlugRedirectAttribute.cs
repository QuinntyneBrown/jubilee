using Jubilee.Application.Errors;
using Jubilee.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Jubilee.Api.Filters;

/// <summary>
/// A read of a listing by a slug it had before its name changed answers 301 to the same address under the current
/// slug (L2-113 AC2, ADR 0056). Only a "not found" is looked at again, so a current slug costs nothing more.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class KeptSlugRedirectAttribute : Attribute, IAsyncExceptionFilter
{
    public async Task OnExceptionAsync(ExceptionContext context)
    {
        if (context.Exception is not NotFoundException || context.RouteData.Values["slug"] is not string slug)
        {
            return;
        }

        var sender = context.HttpContext.RequestServices.GetRequiredService<ISender>();
        var current = await sender.Send(new FindCurrentSlugQuery(slug), context.HttpContext.RequestAborted);
        if (current is null)
        {
            return;
        }

        var request = context.HttpContext.Request;
        var prefix = $"/api/listings/{slug}";
        var path = request.Path.Value ?? string.Empty;
        if (!path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        context.Result = new RedirectResult($"/api/listings/{current}{path[prefix.Length..]}{request.QueryString}", permanent: true);
        context.ExceptionHandled = true;
    }
}
