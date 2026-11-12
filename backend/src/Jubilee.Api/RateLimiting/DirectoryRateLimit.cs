using System.Globalization;
using System.Threading.RateLimiting;
using Jubilee.Api.Errors;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace Jubilee.Api.RateLimiting;

/// <summary>Bound from the <c>RateLimits</c> configuration section.</summary>
public sealed class RateLimitOptions
{
    public const string Section = "RateLimits";

    /// <summary>Public directory reads allowed per client IP address per minute.</summary>
    public int DirectoryReadsPerMinute { get; set; } = 120;

    /// <summary>Searches allowed per client IP address per minute (L2-032 AC4).</summary>
    public int SearchesPerMinute { get; set; } = 60;

    public int JoinsPerHour { get; set; } = 5;

    public int ConfirmationResendsPerHour { get; set; } = 5;

    /// <summary>Launch notification sign-ups allowed per client IP address per hour (L2-137 AC1).</summary>
    public int LaunchSignUpsPerHour { get; set; } = 5;

    /// <summary>Business pre-registrations allowed per client IP address per hour (L2-137 AC1).</summary>
    public int LaunchPreRegistrationsPerHour { get; set; } = 5;
}

/// <summary>The forms of the launching-soon marketing page: 5 an hour each per IP address (L2-218 AC3).</summary>
public static class LaunchRateLimit
{
    public const string SignUps = "launch-sign-ups";
    public const string PreRegistrations = "launch-pre-registrations";
}

/// <summary>Account limits per hour: 5 joins per IP address, 5 confirmation resends per member (L2-137 AC1).</summary>
public static class AccountRateLimit
{
    public const string Joins = "joins";
    public const string Resends = "confirmation-resends";
}

/// <summary>Searches have their own budget of 60 a minute per client IP address (L2-032 AC4).</summary>
public static class SearchRateLimit
{
    public const string Policy = "searches";
}

/// <summary>
/// Abuse protection for the public directory reads: a fixed window per client IP address,
/// answered with 429 ProblemDetails and <c>Retry-After</c> when exceeded (L2-137).
/// </summary>
public static class DirectoryRateLimit
{
    public const string Policy = "directory-reads";

    public static IServiceCollection AddJubileeRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<RateLimitOptions>(configuration.GetSection(RateLimitOptions.Section));
        services.AddRateLimiter(limiter =>
        {
            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limiter.AddPolicy(Policy, context =>
            {
                var limit = context.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value;
                var client = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter(client, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = Math.Max(1, limit.DirectoryReadsPerMinute),
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                });
            });
            limiter.AddPolicy(SearchRateLimit.Policy, context =>
            {
                var limit = context.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value;
                var client = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter(client, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = Math.Max(1, limit.SearchesPerMinute),
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                });
            });
            limiter.AddPolicy(AccountRateLimit.Joins, context =>
            {
                var limit = context.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value;
                var client = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter($"join:{client}", _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = Math.Max(1, limit.JoinsPerHour),
                    Window = TimeSpan.FromHours(1),
                    QueueLimit = 0,
                });
            });
            limiter.AddPolicy(AccountRateLimit.Resends, context =>
            {
                var limit = context.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value;
                var member = context.User.FindFirst("sub")?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter($"resend:{member}", _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = Math.Max(1, limit.ConfirmationResendsPerHour),
                    Window = TimeSpan.FromHours(1),
                    QueueLimit = 0,
                });
            });
            limiter.AddPolicy(LaunchRateLimit.SignUps, context =>
            {
                var limit = context.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value;
                var client = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter($"launch-sign-up:{client}", _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = Math.Max(1, limit.LaunchSignUpsPerHour),
                    Window = TimeSpan.FromHours(1),
                    QueueLimit = 0,
                });
            });
            limiter.AddPolicy(LaunchRateLimit.PreRegistrations, context =>
            {
                var limit = context.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value;
                var client = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter($"launch-pre-registration:{client}", _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = Math.Max(1, limit.LaunchPreRegistrationsPerHour),
                    Window = TimeSpan.FromHours(1),
                    QueueLimit = 0,
                });
            });
            limiter.OnRejected = async (rejected, cancellationToken) =>
            {
                var retryAfter = rejected.Lease.TryGetMetadata(MetadataName.RetryAfter, out var wait)
                    ? wait
                    : TimeSpan.FromMinutes(1);
                var seconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
                rejected.HttpContext.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
                await ProblemWriter.WriteAsync(
                    rejected.HttpContext,
                    StatusCodes.Status429TooManyRequests,
                    "You're doing that a lot.",
                    $"Try again in {seconds} seconds.",
                    code: "rate_limited");
            };
        });
        return services;
    }
}
