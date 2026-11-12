namespace Jubilee.Domain;

/// <summary>
/// Someone who asked, on the launching-soon marketing page, to be told when Jubilee launches
/// (L2-217). One per address. The consent is kept with it: these people have no account, so there
/// is no member to tie a <see cref="ConsentRecord"/> to (L2-218 AC1, ADR 0044).
/// </summary>
public sealed class LaunchSubscriber
{
    public const int MaxFirstNameLength = 50;

    /// <summary>How long a sign-up or a pre-registration is kept (L2-148 AC6).</summary>
    public static readonly TimeSpan Retention = TimeSpan.FromDays(365);

    private LaunchSubscriber()
    {
    }

    public Guid Id { get; private set; }

    public string Email { get; private set; } = string.Empty;

    /// <summary>The address in lower case: two sign-ups are the same when their keys are.</summary>
    public string EmailKey { get; private set; } = string.Empty;

    public string? FirstName { get; private set; }

    public DateTimeOffset ConsentedAt { get; private set; }

    public ConsentMethod ConsentMethod { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static LaunchSubscriber SignUp(EmailAddress email, string? firstName, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Email = email.Value,
        EmailKey = email.Key,
        FirstName = string.IsNullOrWhiteSpace(firstName) ? null : firstName.Trim(),
        ConsentedAt = now,
        ConsentMethod = ConsentMethod.MarketingSiteForm,
        CreatedAt = now,
    };
}
