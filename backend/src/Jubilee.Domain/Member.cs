using System.Net.Mail;

namespace Jubilee.Domain;

public enum EmailStatus
{
    Unconfirmed = 0,
    Confirmed = 1,
}

/// <summary>
/// An e-mail address in its stored form: trimmed, with the domain lower-cased (L2-001 AC5). The
/// local part keeps its case, because it may be case-sensitive; uniqueness compares ignoring case.
/// </summary>
public sealed record EmailAddress
{
    public const int MaxLength = 254;

    private EmailAddress(string value) => Value = value;

    public string Value { get; }

    /// <summary>Lower-cased form two addresses are compared by.</summary>
    public string Key => Value.ToLowerInvariant();

    public static EmailAddress? TryParse(string? raw)
    {
        var trimmed = (raw ?? string.Empty).Trim();
        if (trimmed.Length is 0 or > MaxLength || trimmed.Contains(' '))
        {
            return null;
        }

        var at = trimmed.LastIndexOf('@');
        if (at < 1 || at == trimmed.Length - 1 || !trimmed[(at + 1)..].Contains('.'))
        {
            return null;
        }

        var normalised = trimmed[..at] + "@" + trimmed[(at + 1)..].ToLowerInvariant();
        return MailAddress.TryCreate(normalised, out var parsed) && parsed.Address == normalised
            ? new EmailAddress(normalised)
            : null;
    }
}

/// <summary>A person with an account (L2-001, L2-004, L2-003).</summary>
public sealed class Member
{
    private Member()
    {
    }

    public Guid Id { get; private set; }

    public string Email { get; private set; } = string.Empty;

    /// <summary>The lower-cased address, for the one-account-per-address rule.</summary>
    public string EmailKey { get; private set; } = string.Empty;

    public string FirstName { get; private set; } = string.Empty;

    public string LastName { get; private set; } = string.Empty;

    public string? HomeChurch { get; private set; }

    /// <summary>Null for an account that joined with Google and has set no password.</summary>
    public string? PasswordHash { get; private set; }

    public EmailStatus EmailStatus { get; private set; }

    /// <summary>The last e-mail to the address bounced (L2-004 AC6).</summary>
    public bool EmailBounced { get; private set; }

    public string? GoogleSubject { get; private set; }

    /// <summary>Null until the statement of faith and terms are accepted (L2-003 AC1).</summary>
    public DateTimeOffset? AgreementAcceptedAt { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public string DisplayName => $"{FirstName} {LastName}".Trim();

    public static Member Join(
        EmailAddress email, string firstName, string lastName, string? homeChurch, string passwordHash, DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            Email = email.Value,
            EmailKey = email.Key,
            FirstName = firstName.Trim(),
            LastName = lastName.Trim(),
            HomeChurch = string.IsNullOrWhiteSpace(homeChurch) ? null : homeChurch.Trim(),
            PasswordHash = passwordHash,
            EmailStatus = EmailStatus.Unconfirmed,
            AgreementAcceptedAt = now,
            CreatedAt = now,
        };

    /// <summary>A Google account with a verified address: confirmed, but not yet usable (L2-003 AC1).</summary>
    public static Member JoinWithGoogle(EmailAddress email, string firstName, string lastName, string googleSubject, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Email = email.Value,
        EmailKey = email.Key,
        FirstName = firstName.Trim(),
        LastName = lastName.Trim(),
        GoogleSubject = googleSubject,
        EmailStatus = EmailStatus.Confirmed,
        CreatedAt = now,
    };

    public void ConfirmEmail()
    {
        EmailStatus = EmailStatus.Confirmed;
        EmailBounced = false;
    }

    /// <summary>"Use another e-mail": the unconfirmed address is replaced (L2-004 AC5).</summary>
    public void ReplaceUnconfirmedEmail(EmailAddress email)
    {
        if (EmailStatus == EmailStatus.Confirmed)
        {
            throw new InvalidOperationException("Only an unconfirmed address can be replaced this way.");
        }

        Email = email.Value;
        EmailKey = email.Key;
        EmailBounced = false;
    }

    public void MarkEmailBounced() => EmailBounced = true;

    /// <summary>Links Google to an account whose address Google has verified. Google proves the address, so it is confirmed.</summary>
    public void LinkGoogle(string googleSubject)
    {
        GoogleSubject = googleSubject;
        if (EmailStatus == EmailStatus.Unconfirmed)
        {
            // Whoever registered the address by password could be someone else (pre-hijacking):
            // the proven owner gets an account with no password the earlier registrant chose.
            PasswordHash = null;
            ConfirmEmail();
        }
    }

    public void AcceptAgreement(DateTimeOffset now) => AgreementAcceptedAt ??= now;

    /// <summary>True only for a member whose address is confirmed (restricted actions, L2-005).</summary>
    public bool CanTransact() => IsUsable() && EmailStatus == EmailStatus.Confirmed;

    /// <summary>False until the agreement is accepted (a new Google account).</summary>
    public bool IsUsable() => AgreementAcceptedAt is not null;
}

public enum LinkTokenPurpose
{
    EmailConfirmation = 0,
}

/// <summary>
/// A single-purpose link token. Only the SHA-256 hash of the value is stored (L2-140 AC1).
/// </summary>
public sealed class LinkToken
{
    public static readonly TimeSpan EmailConfirmationLifetime = TimeSpan.FromHours(24);

    private LinkToken()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public LinkTokenPurpose Purpose { get; private set; }

    public string TokenHash { get; private set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? UsedAt { get; private set; }

    public DateTimeOffset? SupersededAt { get; private set; }

    public static LinkToken Issue(Guid memberId, LinkTokenPurpose purpose, string tokenHash, DateTimeOffset now, TimeSpan lifetime) => new()
    {
        Id = Guid.NewGuid(),
        MemberId = memberId,
        Purpose = purpose,
        TokenHash = tokenHash,
        ExpiresAt = now + lifetime,
    };

    public bool IsRedeemable(DateTimeOffset now) => UsedAt is null && SupersededAt is null && now < ExpiresAt;

    public void Redeem(DateTimeOffset now) => UsedAt = now;

    public void Supersede(DateTimeOffset now) => SupersededAt ??= now;
}

/// <summary>
/// An e-mail waiting to be sent by the worker. The body holds the link, so it is cleared once the
/// e-mail is sent; the token it carries is stored hashed everywhere else.
/// </summary>
public sealed class OutboxMessage
{
    public static readonly TimeSpan GiveUpAfter = TimeSpan.FromHours(24);

    private OutboxMessage()
    {
    }

    public Guid Id { get; private set; }

    public string ToAddress { get; private set; } = string.Empty;

    public string Subject { get; private set; } = string.Empty;

    public string TextBody { get; private set; } = string.Empty;

    public Guid? MemberId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset NextAttemptAt { get; private set; }

    public int Attempts { get; private set; }

    public DateTimeOffset? SentAt { get; private set; }

    public DateTimeOffset? FailedAt { get; private set; }

    /// <summary>Ties the message to what caused it (a request), so it can be withdrawn before it is sent.</summary>
    public Guid? CorrelationId { get; private set; }

    public static OutboxMessage Email(
        Guid? memberId, string to, string subject, string textBody, DateTimeOffset now, DateTimeOffset? notBefore = null, Guid? correlationId = null) => new()
    {
        CorrelationId = correlationId,
        Id = Guid.NewGuid(),
        MemberId = memberId,
        ToAddress = to,
        Subject = subject,
        TextBody = textBody,
        CreatedAt = now,
        NextAttemptAt = notBefore ?? now,
    };

    public bool IsDue(DateTimeOffset now) => SentAt is null && FailedAt is null && NextAttemptAt <= now;

    public void MarkSent(DateTimeOffset now)
    {
        SentAt = now;
        TextBody = string.Empty;
    }

    /// <summary>A transient failure: try again later with back-off, for up to 24 hours (L2-179 AC3).</summary>
    public void MarkAttemptFailed(DateTimeOffset now)
    {
        Attempts++;
        if (now - CreatedAt >= GiveUpAfter)
        {
            FailedAt = now;
            TextBody = string.Empty;
            return;
        }

        NextAttemptAt = now + TimeSpan.FromMinutes(Math.Min(Math.Pow(2, Attempts), 240));
    }
}

/// <summary>A return path after sign-in: only a same-origin relative path is accepted (L2-012 AC3).</summary>
public static class ReturnUrl
{
    public static string Parse(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value[0] != '/' || value.Length > 2000)
        {
            return "/";
        }

        // "//host" and "/\host" are protocol-relative to a browser; control characters are never a path.
        if (value.Length > 1 && (value[1] == '/' || value[1] == '\\'))
        {
            return "/";
        }

        return value.Any(char.IsControl) || value.Contains('\\') ? "/" : value;
    }
}
