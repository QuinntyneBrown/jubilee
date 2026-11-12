using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Jubilee.Api.Errors;

namespace Jubilee.Api.Middleware;

/// <summary>
/// The allow-list of the staff endpoints (L2-192): <c>StaffAccess:AllowedNetworks</c>, addresses and
/// CIDR ranges, IPv4 and IPv6, as a comma-separated string or an array. An entry that does not parse
/// stops the API at start-up; an empty list refuses everyone (AC3).
/// </summary>
public sealed class StaffNetworks
{
    private readonly IReadOnlyList<IPNetwork> _networks;

    private StaffNetworks(IReadOnlyList<IPNetwork> networks) => _networks = networks;

    public static StaffNetworks From(IConfiguration configuration)
    {
        var section = configuration.GetSection("StaffAccess:AllowedNetworks");
        var entries = section.Value is { } single
            ? single.Split([',', ';', ' ', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            : section.GetChildren().Select(c => c.Value ?? string.Empty).Where(v => v.Length > 0).ToArray();
        return new StaffNetworks([.. entries.Select(Parse)]);
    }

    private static IPNetwork Parse(string entry)
    {
        if (IPNetwork.TryParse(entry, out var network))
        {
            return network;
        }

        if (IPAddress.TryParse(entry, out var address))
        {
            return new IPNetwork(address, address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? 32 : 128);
        }

        throw new InvalidOperationException($"StaffAccess:AllowedNetworks has an entry that is not an address or a range: '{entry}'.");
    }

    public bool Allows(IPAddress? address)
    {
        if (address is null)
        {
            return false;
        }

        var caller = address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;
        return _networks.Any(n => n.Contains(caller));
    }
}

/// <summary>
/// The admin host's proxy states the staff member's address in <c>X-Jubilee-Client-Address</c> and
/// proves itself with <c>X-Jubilee-Proxy-Key</c> (ADR 0040). Only then is the address believed; both
/// headers are removed from every request, so nothing after this sees a caller's own copy (L2-192 AC4).
/// The marketing host's proxy also states when it received a launch submission
/// (<c>X-Jubilee-Received-At</c>) and that it kept one and sends it again (<c>X-Jubilee-Kept</c>);
/// they are believed and removed the same way (L2-218 AC9, ADR 0047).
/// </summary>
/// <summary>
/// What the marketing host's proxy said of a launch submission, present only when it proved itself:
/// when it received it, and whether it kept it and is sending it again (ADR 0047).
/// </summary>
public sealed record ProxiedSubmission(DateTimeOffset? ReceivedAt, bool Kept);

public sealed class StaffProxyMiddleware(RequestDelegate next, IConfiguration configuration)
{
    public const string ProxyKeyHeader = "X-Jubilee-Proxy-Key";
    public const string ClientAddressHeader = "X-Jubilee-Client-Address";
    public const string ReceivedAtHeader = "X-Jubilee-Received-At";
    public const string KeptHeader = "X-Jubilee-Kept";

    private readonly byte[] _key = Encoding.UTF8.GetBytes(configuration["StaffAccess:ProxyKey"] ?? string.Empty);

    public Task InvokeAsync(HttpContext context)
    {
        var headers = context.Request.Headers;
        if (_key.Length > 0
            && headers.TryGetValue(ProxyKeyHeader, out var presented)
            && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(presented.ToString()), _key))
        {
            if (IPAddress.TryParse(headers[ClientAddressHeader].ToString(), out var address))
            {
                context.Connection.RemoteIpAddress = address;
            }

            DateTimeOffset? receivedAt = DateTimeOffset.TryParse(
                headers[ReceivedAtHeader].ToString(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var at)
                ? at.ToUniversalTime()
                : null;
            var kept = string.Equals(headers[KeptHeader].ToString(), "true", StringComparison.OrdinalIgnoreCase);
            if (receivedAt is not null || kept)
            {
                context.Features.Set(new ProxiedSubmission(receivedAt, kept));
            }
        }

        headers.Remove(ProxyKeyHeader);
        headers.Remove(ClientAddressHeader);
        headers.Remove(ReceivedAtHeader);
        headers.Remove(KeptHeader);
        return next(context);
    }
}

/// <summary>
/// Refuses a caller outside the allow-list on <c>/api/admin</c> and <c>/api/staff</c>, before any
/// authentication or authorization (L2-192 AC1), on every host (AC2). Other paths pass (AC7).
/// </summary>
public sealed class StaffNetworkMiddleware(RequestDelegate next, StaffNetworks networks, ILogger<StaffNetworkMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;
        var staffPath = path.StartsWithSegments("/api/admin", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/api/staff", StringComparison.OrdinalIgnoreCase);
        if (staffPath && !networks.Allows(context.Connection.RemoteIpAddress))
        {
            logger.LogWarning(
                "Failed authorization (NETWORK_NOT_ALLOWED) for anonymous from {Address} on {Method} {Path}. CorrelationId {CorrelationId}",
                context.Connection.RemoteIpAddress,
                context.Request.Method,
                LoggedPath.Of(context),
                context.TraceIdentifier);
            await ProblemWriter.WriteAsync(
                context,
                StatusCodes.Status403Forbidden,
                "This is only open on a Jubilee staff network.",
                "Connect to a Jubilee staff network and try again.",
                code: "NETWORK_NOT_ALLOWED");
            return;
        }

        await next(context);
    }
}
