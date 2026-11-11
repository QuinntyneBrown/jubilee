using System.Text.RegularExpressions;

namespace Jubilee.Api.Middleware;

/// <summary>
/// First middleware of the pipeline. Honours a usable <c>X-Correlation-ID</c> sent by the caller,
/// otherwise creates one; stamps it on the request, the response and the log scope so a reference
/// quoted to support leads to the failing request's log entries (L2-118).
/// </summary>
public sealed partial class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
{
    public const string HeaderName = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context)
    {
        var supplied = context.Request.Headers[HeaderName].ToString();
        var correlationId = Usable().IsMatch(supplied) ? supplied : Guid.NewGuid().ToString("N");

        context.TraceIdentifier = correlationId;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[HeaderName] = correlationId;
            context.Response.Headers["X-Request-Id"] = correlationId;
            return Task.CompletedTask;
        });

        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await next(context);
        }
    }

    [GeneratedRegex("^[A-Za-z0-9._-]{1,64}$")]
    private static partial Regex Usable();
}
