using System.Diagnostics;

namespace Jubilee.Api.Middleware;

/// <summary>
/// Logs one line per request. It sits outside the exception-handling middleware so the status it
/// logs is the status the client received, including handled failures.
/// </summary>
public sealed class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var started = Stopwatch.GetTimestamp();
        try
        {
            await next(context);
        }
        finally
        {
            logger.LogInformation(
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs} ms. CorrelationId {CorrelationId}",
                context.Request.Method,
                LoggedPath.Of(context),
                context.Response.StatusCode,
                (long)Stopwatch.GetElapsedTime(started).TotalMilliseconds,
                context.TraceIdentifier);
        }
    }
}
