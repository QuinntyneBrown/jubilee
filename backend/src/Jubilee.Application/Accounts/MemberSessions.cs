using System.Net;
using System.Net.Sockets;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Jubilee.Application.Accounts;

/// <summary>
/// What a session records about where it started (L2-143 AC3, ADR 0065): the browser and system,
/// and the network with the last part of its address hidden. The full address is never kept.
/// </summary>
public static class SessionOrigin
{
    public const string UnknownDevice = "Unknown browser";

    /// <summary>"Chrome on Windows" from a <c>User-Agent</c>; "Unknown browser" when neither part is recognised.</summary>
    public static string Device(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return UnknownDevice;
        }

        var browser = Browser(userAgent);
        var system = System(userAgent);
        return browser is null || system is null ? UnknownDevice : $"{browser} on {system}";
    }

    private static string? Browser(string agent) =>
        Has(agent, "Edg/") ? "Edge"
        : Has(agent, "OPR/") ? "Opera"
        : Has(agent, "Firefox/") || Has(agent, "FxiOS/") ? "Firefox"
        : Has(agent, "Chrome/") || Has(agent, "CriOS/") ? "Chrome"
        : Has(agent, "Safari/") && Has(agent, "Version/") ? "Safari"
        : null;

    private static string? System(string agent) =>
        Has(agent, "iPhone") ? "iPhone"
        : Has(agent, "iPad") ? "iPad"
        : Has(agent, "Android") ? "Android"
        : Has(agent, "Windows") ? "Windows"
        : Has(agent, "CrOS") ? "ChromeOS"
        : Has(agent, "Macintosh") || Has(agent, "Mac OS X") ? "macOS"
        : Has(agent, "Linux") ? "Linux"
        : null;

    private static bool Has(string agent, string part) => agent.Contains(part, StringComparison.Ordinal);

    /// <summary><c>203.0.113.x</c> for IPv4, the first three groups and <c>::</c> for IPv6; nothing without an address.</summary>
    public static string? Network(IPAddress? address)
    {
        if (address is null)
        {
            return null;
        }

        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var bytes = address.GetAddressBytes();
            return $"{bytes[0]}.{bytes[1]}.{bytes[2]}.x";
        }

        var groups = address.GetAddressBytes();
        var kept = new byte[16];
        Array.Copy(groups, kept, 6);
        return new IPAddress(kept).ToString();
    }
}

public sealed record MemberSessionDto(Guid Id, string Device, string? Network, DateTimeOffset LastActiveAt, bool Current);

/// <summary>"Where you're signed in": the member's live sessions, this device first, then the most recently active (L2-143 AC3).</summary>
public sealed record ListMemberSessionsQuery(Guid MemberId, Guid? CurrentSessionId) : IRequest<IReadOnlyList<MemberSessionDto>>;

public sealed class ListMemberSessionsQueryHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<ListMemberSessionsQuery, IReadOnlyList<MemberSessionDto>>
{
    public async Task<IReadOnlyList<MemberSessionDto>> Handle(ListMemberSessionsQuery request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var sessions = await db.Sessions.AsNoTracking()
            .Where(s => s.MemberId == request.MemberId && s.Kind == SessionKind.Member && s.EndedAt == null)
            .ToListAsync(cancellationToken);
        return [.. sessions
            .Where(s => !SessionPolicy.IsExpired(s, now))
            .OrderByDescending(s => s.Id == request.CurrentSessionId)
            .ThenByDescending(s => s.LastActivityAt)
            .Select(s => new MemberSessionDto(s.Id, s.Device ?? SessionOrigin.UnknownDevice, s.Network, s.LastActivityAt, s.Id == request.CurrentSessionId))];
    }
}

/// <summary>
/// Signs one session of the member out (L2-143 AC3). Another member's session, a staff session and an
/// unknown id are not found (L2-133 AC2); one already ended is ended again, which changes nothing.
/// </summary>
public sealed record EndMemberSessionCommand(Guid MemberId, Guid SessionId, string? Address) : IRequest;

public sealed class EndMemberSessionCommandHandler(IAppDbContext db, TimeProvider clock, ILogger<EndMemberSessionCommandHandler> logger)
    : IRequestHandler<EndMemberSessionCommand>
{
    public async Task Handle(EndMemberSessionCommand request, CancellationToken cancellationToken)
    {
        var session = await db.Sessions.SingleOrDefaultAsync(
            s => s.Id == request.SessionId && s.MemberId == request.MemberId && s.Kind == SessionKind.Member, cancellationToken)
            ?? throw new NotFoundException("session_not_found", "There is no such session.");
        if (session.EndedAt is not null)
        {
            return;
        }

        session.End(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation(
            "Security event: SessionEnded {SessionId} for member {MemberId} from {Address}", session.Id, request.MemberId, request.Address ?? "unknown");
    }
}
