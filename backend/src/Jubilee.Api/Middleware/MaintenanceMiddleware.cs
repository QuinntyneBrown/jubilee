using System.Globalization;
using Jubilee.Api.Errors;
using Jubilee.Application.Maintenance;

namespace Jubilee.Api.Middleware;

/// <summary>
/// While maintenance mode is on, every request but the health probe is answered 503 with <c>Retry-After</c> and the
/// code <c>MAINTENANCE</c> and the back-by time, so the app can show the maintenance page (L2-117 AC1).
/// </summary>
public sealed class MaintenanceMiddleware(RequestDelegate next)
{
    public static readonly TimeSpan DefaultRetry = TimeSpan.FromMinutes(5);

    public async Task InvokeAsync(HttpContext context, IMaintenanceState state, TimeProvider clock)
    {
        if (!state.Enabled || string.Equals(context.Request.Path.Value?.TrimEnd('/'), "/api/health", StringComparison.OrdinalIgnoreCase))
        {
            await next(context);
            return;
        }

        var wait = state.BackBy is { } backBy ? backBy - clock.GetUtcNow() : DefaultRetry;
        context.Response.Headers.RetryAfter =
            Math.Max(1, (int)Math.Ceiling(wait.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
        var facts = state.BackBy is { } at
            ? new Dictionary<string, string> { ["backBy"] = at.ToString("O", CultureInfo.InvariantCulture) }
            : null;
        await ProblemWriter.WriteAsync(
            context,
            StatusCodes.Status503ServiceUnavailable,
            "Jubilee is being updated.",
            "Nothing you've sent is lost.",
            code: "MAINTENANCE",
            facts: facts);
    }
}
