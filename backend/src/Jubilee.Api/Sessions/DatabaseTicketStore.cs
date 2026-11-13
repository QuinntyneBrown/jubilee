using System.Security.Claims;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Sessions;

/// <summary>
/// Keeps sessions in the database instead of in the cookie (L2-010, L2-135): the cookie carries a
/// random 256-bit key, the table keeps its hash and the serialised ticket. A session that is ended,
/// older than 30 days or idle past its limit is not found, so the caller is asked to sign in again.
/// </summary>
public class DatabaseTicketStore(IServiceScopeFactory scopes, TimeProvider clock, IHttpContextAccessor? http = null) : ITicketStore
{
    /// <summary>The kind of session this store keeps; a key is only ever found within its kind (ADR 0040).</summary>
    protected virtual SessionKind Kind => SessionKind.Member;

    public const string SessionIdClaim = "sid";
    private static readonly TimeSpan ActivityGranularity = TimeSpan.FromMinutes(1);

    public async Task<string> StoreAsync(AuthenticationTicket ticket)
    {
        var key = LinkTokens.NewValue();
        var id = Guid.NewGuid();
        ticket.Principal.Identities.First().AddClaim(new Claim(SessionIdClaim, id.ToString()));
        var session = Kind == SessionKind.Staff
            ? MemberSession.StartStaff(
                id,
                Guid.TryParse(ticket.Principal.FindFirst(StaffSession.StaffIdClaim)?.Value, out var staff) ? staff : null,
                LinkTokens.Hash(key),
                TicketSerializer.Default.Serialize(ticket),
                clock.GetUtcNow())
            : MemberSession.Start(
                id,
                Guid.TryParse(ticket.Principal.FindFirst("sub")?.Value, out var member) ? member : null,
                LinkTokens.Hash(key),
                TicketSerializer.Default.Serialize(ticket),
                ticket.Properties.IsPersistent,
                clock.GetUtcNow(),
                SessionOrigin.Device(http?.HttpContext?.Request.Headers.UserAgent.ToString()),
                SessionOrigin.Network(http?.HttpContext?.Connection.RemoteIpAddress));

        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        db.Sessions.Add(session);
        await db.SaveChangesAsync();
        return key;
    }

    public async Task RenewAsync(string key, AuthenticationTicket ticket)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var session = await Find(db, key);
        if (session is not null)
        {
            session.Replace(TicketSerializer.Default.Serialize(ticket));
            await db.SaveChangesAsync();
        }
    }

    public async Task<AuthenticationTicket?> RetrieveAsync(string key)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var session = await Find(db, key);
        if (session is null)
        {
            return null;
        }

        var now = clock.GetUtcNow();
        if (SessionPolicy.IsExpired(session, now))
        {
            session.End(now);
            await db.SaveChangesAsync();
            return null;
        }

        if (now - session.LastActivityAt >= ActivityGranularity)
        {
            session.Touch(now);
            await db.SaveChangesAsync();
        }

        return TicketSerializer.Default.Deserialize(session.Ticket);
    }

    public async Task RemoveAsync(string key)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var session = await Find(db, key);
        if (session is not null)
        {
            session.End(clock.GetUtcNow());
            await db.SaveChangesAsync();
        }
    }

    private Task<MemberSession?> Find(IAppDbContext db, string key)
    {
        var hash = LinkTokens.Hash(key);
        var kind = Kind;
        return db.Sessions.SingleOrDefaultAsync(s => s.KeyHash == hash && s.Kind == kind);
    }
}

/// <summary>Keeps staff sessions (L2-190) the same way, as rows of kind <c>Staff</c>.</summary>
public sealed class StaffTicketStore(IServiceScopeFactory scopes, TimeProvider clock) : DatabaseTicketStore(scopes, clock, null)
{
    protected override SessionKind Kind => SessionKind.Staff;
}
