using Jubilee.Api.Errors;
using Jubilee.Application.Errors;

namespace Jubilee.Api.Middleware;

/// <summary>
/// Turns exceptions into ProblemDetails with the correlation ID, and never with exception text.
/// It sits inside the request logging middleware, so the logged status is the one sent.
/// </summary>
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The caller went away; there is no one to answer.
        }
        catch (Exception exception) when (!context.Response.HasStarted)
        {
            context.Response.Clear();
            await HandleAsync(context, exception);
        }
    }

    private Task HandleAsync(HttpContext context, Exception exception)
    {
        if (exception is NotFoundException notFound)
        {
            return ProblemWriter.WriteAsync(
                context, StatusCodes.Status404NotFound, "We can't find that.", notFound.Message, notFound.Code);
        }

        if (exception is ConflictException conflict)
        {
            return ProblemWriter.WriteAsync(
                context, StatusCodes.Status409Conflict, "That can't be done now.", conflict.Message, conflict.Code);
        }

        // An endpoint that declares an error reference is a read the page shows a load-error
        // state for: whatever stopped it (database down, timeout, anything unhandled), the
        // service was unavailable to the caller.
        var reference = context.GetEndpoint()?.Metadata.GetMetadata<ErrorReferenceAttribute>()?.Reference;
        if (reference is not null)
        {
            logger.LogError(
                exception,
                "{Reference}: could not serve {Method} {Path}. CorrelationId {CorrelationId}",
                reference,
                context.Request.Method,
                context.Request.Path.Value,
                context.TraceIdentifier);
            return ProblemWriter.WriteAsync(
                context,
                StatusCodes.Status503ServiceUnavailable,
                "The service is unavailable.",
                "Nothing is lost. Try again in a moment.",
                code: "service_unavailable",
                reference: reference);
        }

        logger.LogError(
            exception,
            "Unhandled error serving {Method} {Path}. CorrelationId {CorrelationId}",
            context.Request.Method,
            context.Request.Path.Value,
            context.TraceIdentifier);
        return ProblemWriter.WriteAsync(
            context, StatusCodes.Status500InternalServerError, "Something went wrong.", code: "unexpected_error");
    }
}
