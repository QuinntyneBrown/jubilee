namespace Jubilee.Domain;

/// <summary>Which application a session belongs to: a member's in the app, or a staff member's in the admin application (L2-190).</summary>
public enum SessionKind
{
    Member = 0,
    Staff = 1,
}

/// <summary>
/// A server-side session (L2-010, L2-135, L2-190). The browser holds only an opaque identifier; the
/// database keeps its SHA-256, so a copy of the table cannot be used to impersonate a member.
/// </summary>
public sealed class MemberSession
{
    public Guid Id { get; private set; }

    /// <summary>SHA-256 of the identifier in the cookie, hex.</summary>
    public string KeyHash { get; private set; } = string.Empty;

    public SessionKind Kind { get; private set; }

    public Guid? MemberId { get; private set; }

    /// <summary>The staff account of a staff session (L2-190); empty for a member session.</summary>
    public Guid? StaffMemberId { get; private set; }

    /// <summary>The serialised authentication ticket: who the session belongs to and their claims.</summary>
    public byte[] Ticket { get; private set; } = [];

    /// <summary>True when "Keep me signed in" was ticked.</summary>
    public bool Persistent { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset LastActivityAt { get; private set; }

    public DateTimeOffset? EndedAt { get; private set; }

    /// <summary>The browser and system the session started on, "Chrome on Windows" (L2-143 AC3).</summary>
    public string? Device { get; private set; }

    /// <summary>The network the session started from, with the last part of its address hidden (L2-143 AC3).</summary>
    public string? Network { get; private set; }

    public static MemberSession Start(
        Guid id, Guid? memberId, string keyHash, byte[] ticket, bool persistent, DateTimeOffset now, string? device = null, string? network = null) => new()
    {
        Device = device,
        Network = network,
        Id = id,
        KeyHash = keyHash,
        MemberId = memberId,
        Ticket = ticket,
        Persistent = persistent,
        CreatedAt = now,
        LastActivityAt = now,
    };

    /// <summary>A staff session: never persistent, never a member's (L2-190, L2-191 AC4).</summary>
    public static MemberSession StartStaff(Guid id, Guid? staffMemberId, string keyHash, byte[] ticket, DateTimeOffset now) => new()
    {
        Id = id,
        Kind = SessionKind.Staff,
        StaffMemberId = staffMemberId,
        KeyHash = keyHash,
        Ticket = ticket,
        CreatedAt = now,
        LastActivityAt = now,
    };

    public void Touch(DateTimeOffset now) => LastActivityAt = now;

    public void End(DateTimeOffset now) => EndedAt ??= now;

    public void Replace(byte[] ticket) => Ticket = ticket;
}

/// <summary>
/// When a session is over. A member's: 30 days after sign-in, or 12 hours without activity unless
/// "Keep me signed in" was ticked (L2-010). A staff member's: 8 hours after sign-in, or 30 minutes
/// without activity (L2-190 AC2).
/// </summary>
public static class SessionPolicy
{
    public static readonly TimeSpan AbsoluteLifetime = TimeSpan.FromDays(30);
    public static readonly TimeSpan IdleTimeout = TimeSpan.FromHours(12);
    public static readonly TimeSpan StaffAbsoluteLifetime = TimeSpan.FromHours(8);
    public static readonly TimeSpan StaffIdleTimeout = TimeSpan.FromMinutes(30);

    public static bool IsExpired(MemberSession session, DateTimeOffset now) =>
        session.EndedAt is not null
        || (session.Kind == SessionKind.Staff
            ? now - session.CreatedAt > StaffAbsoluteLifetime || now - session.LastActivityAt > StaffIdleTimeout
            : now - session.CreatedAt > AbsoluteLifetime || (!session.Persistent && now - session.LastActivityAt > IdleTimeout));
}

/// <summary>One failed sign-in, kept for 15 minutes to throttle guessing (L2-007).</summary>
public sealed class SignInFailure
{
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);
    public const int AccountLimit = 5;
    public const int AddressLimit = 20;

    public Guid Id { get; private set; }

    /// <summary>SHA-256 of the normalised e-mail, so an unknown address is counted like a known one.</summary>
    public string AccountKey { get; private set; } = string.Empty;

    public string Address { get; private set; } = string.Empty;

    public DateTimeOffset At { get; private set; }

    public static SignInFailure Record(string accountKey, string address, DateTimeOffset at) => new()
    {
        Id = Guid.NewGuid(),
        AccountKey = accountKey,
        Address = address,
        At = at,
    };
}
