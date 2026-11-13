namespace Jubilee.Domain;

/// <summary>
/// An alert raised to the on-call security contact (L2-143 AC4, ADR 0064). Kept so that one burst raises one alert in
/// any 5 minutes, and so the team can see when each was raised.
/// </summary>
public sealed class SecurityAlert
{
    /// <summary>More than 100 password reset requests across all addresses within 5 minutes.</summary>
    public const string PasswordResetBurst = "PasswordResetBurst";

    private SecurityAlert()
    {
    }

    public Guid Id { get; private set; }

    public string Kind { get; private set; } = string.Empty;

    /// <summary>How many events the alert counted in its window.</summary>
    public int Count { get; private set; }

    public DateTimeOffset RaisedAt { get; private set; }

    public static SecurityAlert Raise(string kind, int count, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Kind = kind,
        Count = count,
        RaisedAt = now,
    };
}
