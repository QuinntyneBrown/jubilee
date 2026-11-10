using Jubilee.Api.Errors;
using Jubilee.Application.Errors;

namespace Jubilee.Api.Middleware;

/// <summary>Turns exceptions into ProblemDetails. It sits inside the request logging middleware.</summary>
public sealed class ExceptionHandlingMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (NotFoundException notFound) when (!context.Response.HasStarted)
        {
            await ProblemWriter.WriteAsync(
                context, StatusCodes.Status404NotFound, "We can't find that.", notFound.Message, notFound.Code);
        }
    }
}
