using Jubilee.Api.Controllers;
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
            if (notFound.Code == "conversation_not_found")
            {
                // Asking for a conversation that is not yours is answered as if there were none, and
                // the attempt is logged (L2-133 AC2).
                logger.LogWarning(
                    "Refused ({Code}) for {Actor} from {Address} on {Method} {Path}. CorrelationId {CorrelationId}",
                    notFound.Code,
                    context.User.ToViewer().Subject ?? "anonymous",
                    context.Connection.RemoteIpAddress,
                    context.Request.Method,
                    LoggedPath.Of(context),
                    context.TraceIdentifier);
            }

            return ProblemWriter.WriteAsync(
                context, StatusCodes.Status404NotFound, "We can't find that.", notFound.Message, notFound.Code);
        }

        if (exception is ForbiddenException forbidden)
        {
            // A failed authorization is a security event: time, actor, address and outcome (L2-143 AC1).
            logger.LogWarning(
                "Failed authorization ({Code}) for {Actor} from {Address} on {Method} {Path}. CorrelationId {CorrelationId}",
                forbidden.Code,
                context.User.FindFirst("sub")?.Value ?? "anonymous",
                context.Connection.RemoteIpAddress,
                context.Request.Method,
                LoggedPath.Of(context),
                context.TraceIdentifier);
            return ProblemWriter.WriteAsync(
                context, StatusCodes.Status403Forbidden, "You don't have access to this.", forbidden.Message, forbidden.Code);
        }

        if (exception is Application.Errors.GoneException gone)
        {
            return ProblemWriter.WriteAsync(
                context, StatusCodes.Status410Gone, "This request is closed.", gone.Message, gone.Code);
        }

        if (exception is Application.Accounts.ValidationFailedException invalid)
        {
            return ProblemWriter.WriteAsync(
                context, StatusCodes.Status422UnprocessableEntity, "Fix the highlighted fields.", code: "validation_failed", errors: invalid.Errors);
        }

        if (exception is RateLimitedException limited)
        {
            context.Response.Headers.RetryAfter = Math.Max(1, (int)Math.Ceiling(limited.RetryAfter.TotalSeconds)).ToString(System.Globalization.CultureInfo.InvariantCulture);
            return ProblemWriter.WriteAsync(
                context, StatusCodes.Status429TooManyRequests, "Slow down for a moment.", "You're doing that too often.", limited.Code);
        }

        if (exception is ConflictException conflict)
        {
            return ProblemWriter.WriteAsync(
                context, StatusCodes.Status409Conflict, "That can't be done now.", conflict.Message, conflict.Code, facts: conflict.Facts);
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
                LoggedPath.Of(context),
                context.TraceIdentifier);
            return ProblemWriter.WriteAsync(
                context,
                StatusCodes.Status503ServiceUnavailable,
                "The service is unavailable.",
                "Nothing is lost. Try again in a moment.",
                code: "service_unavailable",
                reference: reference);
        }

        var unhandled = ErrorReferences.ForUnhandled(context.TraceIdentifier);
        logger.LogError(
            exception,
            "{Reference}: unhandled error serving {Method} {Path}. CorrelationId {CorrelationId}",
            unhandled,
            context.Request.Method,
            LoggedPath.Of(context),
            context.TraceIdentifier);
        return ProblemWriter.WriteAsync(
            context, StatusCodes.Status500InternalServerError, "Something went wrong.", code: "unexpected_error", reference: unhandled);
    }
}
