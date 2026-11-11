namespace Jubilee.Domain;

/// <summary>
/// One period of maintenance (L2-117). It opens when the switch turns on and closes when it turns off; the length
/// between the two is how far the e-mailed links that were valid at the start are extended.
/// </summary>
public sealed class MaintenanceWindow
{
    private MaintenanceWindow()
    {
    }

    public Guid Id { get; private set; }

    public DateTimeOffset StartedAt { get; private set; }

    /// <summary>When the operator said Jubilee would be back.</summary>
    public DateTimeOffset? BackBy { get; private set; }

    public DateTimeOffset? EndedAt { get; private set; }

    public static MaintenanceWindow Open(DateTimeOffset now, DateTimeOffset? backBy) =>
        new() { Id = Guid.NewGuid(), StartedAt = now, BackBy = backBy };

    /// <summary>Closes the window and returns its length; closing again returns the same length.</summary>
    public TimeSpan Close(DateTimeOffset now)
    {
        EndedAt ??= now;
        return EndedAt.Value - StartedAt;
    }
}

/// <summary>
/// A member's request for access to a page they may not open (L2-114 AC2). It records the address and the account
/// and grants nothing; the verification team reads it.
/// </summary>
public sealed class AccessRequest
{
    public const int MaxUrlLength = 500;

    private AccessRequest()
    {
    }

    public Guid Id { get; private set; }

    public string MemberSubject { get; private set; } = string.Empty;

    /// <summary>The address in Jubilee the member could not open, as a path with its query.</summary>
    public string Url { get; private set; } = string.Empty;

    public string IdempotencyKey { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    public static AccessRequest Create(string memberSubject, string url, string idempotencyKey, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        MemberSubject = memberSubject,
        Url = url,
        IdempotencyKey = idempotencyKey,
        CreatedAt = now,
    };
}
