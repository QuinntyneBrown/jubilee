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

    /// <summary>Ten digits, or null (L2-013). A request copies it when it is sent.</summary>
    public string? Phone { get; private set; }

    /// <summary>Canadian postal code in the form <c>M4C 1A1</c>, or null (L2-013).</summary>
    public string? PostalCode { get; private set; }

    /// <summary>Optional; words the copy other people read about the member (L2-013).</summary>
    public string? Pronouns { get; private set; }

    /// <summary>Null until the member first saves the profile.</summary>
    public DateTimeOffset? ProfileSavedAt { get; private set; }

    /// <summary>Null for an account that joined with Google and has set no password.</summary>
    public string? PasswordHash { get; private set; }

    public EmailStatus EmailStatus { get; private set; }

    /// <summary>The last e-mail to the address bounced (L2-004 AC6).</summary>
    public bool EmailBounced { get; private set; }

    /// <summary>New messages, request updates and meeting reminders are on for a new account; the rest are off (L2-016 AC5).</summary>
    public bool EmailMessages { get; private set; } = true;

    public bool EmailRequests { get; private set; } = true;

    public bool EmailReminders { get; private set; } = true;

    public bool EmailNewBusinesses { get; private set; }

    public bool EmailTips { get; private set; }

    /// <summary>"One daily summary" instead of "As it happens" (L2-016 AC1). Kept now; the daily summary job reads it.</summary>
    public bool EmailDailySummary { get; private set; }

    public void SetEmailFrequency(bool dailySummary) => EmailDailySummary = dailySummary;

    /// <summary>What the member chose for a category, ignoring bounces; null for an unknown category.</summary>
    public bool? EmailPreference(string category) => category switch
    {
        EmailCategories.Messages => EmailMessages,
        EmailCategories.Requests => EmailRequests,
        EmailCategories.Reminders => EmailReminders,
        EmailCategories.NewBusinesses => EmailNewBusinesses,
        EmailCategories.Tips => EmailTips,
        _ => null,
    };

    /// <summary>
    /// Whether an e-mail of this category may be sent: the member turned it on and the address has not bounced
    /// (L2-068 AC2, L2-179 AC2). Sign-in, security and other transactional e-mails do not ask.
    /// </summary>
    public bool WantsEmail(string category) => !EmailBounced && category switch
    {
        EmailCategories.Messages => EmailMessages,
        EmailCategories.Requests => EmailRequests,
        EmailCategories.Reminders => EmailReminders,
        EmailCategories.NewBusinesses => EmailNewBusinesses,
        EmailCategories.Tips => EmailTips,
        _ => false,
    };

    /// <summary>Turns one category on or off; false when the category is unknown.</summary>
    public bool SetEmailPreference(string category, bool on)
    {
        switch (category)
        {
            case EmailCategories.Messages:
                EmailMessages = on;
                return true;
            case EmailCategories.Requests:
                EmailRequests = on;
                return true;
            case EmailCategories.Reminders:
                EmailReminders = on;
                return true;
            case EmailCategories.NewBusinesses:
                EmailNewBusinesses = on;
                return true;
            case EmailCategories.Tips:
                EmailTips = on;
                return true;
            default:
                return false;
        }
    }

    /// <summary>When the password last changed; a session that began before this has ended (L2-134 AC3).</summary>
    public DateTimeOffset? PasswordChangedAt { get; private set; }

    public string? GoogleSubject { get; private set; }

    /// <summary>Null until the statement of faith and terms are accepted (L2-003 AC1).</summary>
    public DateTimeOffset? AgreementAcceptedAt { get; private set; }

    /// <summary>The number of the published terms the member agreed to, with the confirmation of being 18 or older (L2-108 AC2).</summary>
    public int? TermsVersionNumber { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>When the member deleted the account (L2-017). Every session has ended and nothing can sign in.</summary>
    public DateTimeOffset? DeletedAt { get; private set; }

    /// <summary>When the personal data was erased, 30 days after deletion (L2-017 AC6, L2-148).</summary>
    public DateTimeOffset? ErasedAt { get; private set; }

    /// <summary>How long a deleted account keeps its personal data before it is erased.</summary>
    public static readonly TimeSpan ErasureAfter = TimeSpan.FromDays(30);

    public string DisplayName => $"{FirstName} {LastName}".Trim();

    public static Member Join(
        EmailAddress email, string firstName, string lastName, string? homeChurch, string passwordHash, DateTimeOffset now, int termsVersion = 1) => new()
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
            TermsVersionNumber = termsVersion,
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

    /// <summary>The member deleted the account: nothing can sign in to it from now on (L2-017 AC3).</summary>
    public void Delete(DateTimeOffset now)
    {
        DeletedAt ??= now;
        PasswordHash = null;
        GoogleSubject = null;
    }

    public bool IsDeleted => DeletedAt is not null;

    /// <summary>Removes the personal data of a deleted account; the row stays so what others wrote still points somewhere (L2-148).</summary>
    public void Erase(DateTimeOffset now)
    {
        var placeholder = $"deleted-{Id:N}@deleted.invalid";
        Email = placeholder;
        EmailKey = placeholder;
        FirstName = "Former";
        LastName = "member";
        HomeChurch = null;
        Phone = null;
        PostalCode = null;
        Pronouns = null;
        PasswordHash = null;
        GoogleSubject = null;
        ErasedAt ??= now;
    }

    /// <summary>Replaces the six profile fields; the caller has validated them (L2-013).</summary>
    public void UpdateProfile(
        string firstName, string lastName, string? phone, string? postalCode, string? homeChurch, string? pronouns, DateTimeOffset now)
    {
        FirstName = firstName.Trim();
        LastName = lastName.Trim();
        Phone = phone;
        PostalCode = postalCode;
        HomeChurch = string.IsNullOrWhiteSpace(homeChurch) ? null : homeChurch.Trim();
        Pronouns = string.IsNullOrWhiteSpace(pronouns) ? null : pronouns.Trim();
        ProfileSavedAt = now;
    }

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

    /// <summary>The new address was confirmed by its link: it replaces the old one (L2-014 AC3).</summary>
    public void ChangeEmail(EmailAddress email)
    {
        Email = email.Value;
        EmailKey = email.Key;
        EmailStatus = EmailStatus.Confirmed;
        EmailBounced = false;
    }

    public void MarkEmailBounced() => EmailBounced = true;

    /// <summary>Replaces the password hash; every session that began before <paramref name="now"/> ends (L2-134 AC3).</summary>
    public void ChangePassword(string passwordHash, DateTimeOffset now)
    {
        PasswordHash = passwordHash;
        PasswordChangedAt = now;
    }

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

    public void AcceptAgreement(DateTimeOffset now, int termsVersion = 1)
    {
        if (AgreementAcceptedAt is not null)
        {
            return;
        }

        AgreementAcceptedAt = now;
        TermsVersionNumber = termsVersion;
    }

    /// <summary>True only for a member whose address is confirmed (restricted actions, L2-005).</summary>
    public bool CanTransact() => IsUsable() && EmailStatus == EmailStatus.Confirmed;

    /// <summary>False until the agreement is accepted (a new Google account).</summary>
    public bool IsUsable() => AgreementAcceptedAt is not null;
}

/// <summary>The kinds of e-mail a member can turn off (L2-016, L2-068). A message without a category is transactional.</summary>
public static class EmailCategories
{
    public const string Messages = "messages";

    public const string Requests = "requests";

    public const string Reminders = "reminders";

    public const string NewBusinesses = "new-businesses";

    public const string Tips = "tips";

    /// <summary>The commercial categories, under CASL (L2-149): consent to them is recorded.</summary>
    public static bool IsPromotional(string category) => category is NewBusinesses or Tips;
}

public enum ConsentMethod
{
    SettingsSwitch = 0,
    UnsubscribeLink = 1,
    OneClickUnsubscribe = 2,
}

/// <summary>
/// One consent to a promotional category, given or withdrawn, with the time and method (L2-149 AC3). Append-only:
/// nothing in the application changes or removes one.
/// </summary>
public sealed class ConsentRecord
{
    private ConsentRecord()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public string Category { get; private set; } = string.Empty;

    public bool Given { get; private set; }

    public ConsentMethod Method { get; private set; }

    public DateTimeOffset OccurredAt { get; private set; }

    public static ConsentRecord Of(Guid memberId, string category, bool given, ConsentMethod method, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        MemberId = memberId,
        Category = category,
        Given = given,
        Method = method,
        OccurredAt = now,
    };
}

public enum LinkTokenPurpose
{
    EmailConfirmation = 0,
    PasswordReset = 1,
    ChangeEmail = 2,
}

/// <summary>
/// A single-purpose link token. Only the SHA-256 hash of the value is stored (L2-140 AC1).
/// </summary>
public sealed class LinkToken
{
    public static readonly TimeSpan EmailConfirmationLifetime = TimeSpan.FromHours(24);
    public static readonly TimeSpan PasswordResetLifetime = TimeSpan.FromMinutes(60);
    public static readonly TimeSpan ChangeEmailLifetime = TimeSpan.FromHours(24);
    public static readonly TimeSpan DataDownloadLifetime = TimeSpan.FromDays(7);

    private LinkToken()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public LinkTokenPurpose Purpose { get; private set; }

    public string TokenHash { get; private set; } = string.Empty;

    /// <summary>For a change of e-mail: the address the link confirms.</summary>
    public string? TargetEmail { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? UsedAt { get; private set; }

    public DateTimeOffset? SupersededAt { get; private set; }

    public static LinkToken Issue(
        Guid memberId, LinkTokenPurpose purpose, string tokenHash, DateTimeOffset now, TimeSpan lifetime, string? targetEmail = null) => new()
    {
        Id = Guid.NewGuid(),
        MemberId = memberId,
        Purpose = purpose,
        TokenHash = tokenHash,
        ExpiresAt = now + lifetime,
        TargetEmail = targetEmail,
    };

    public bool IsRedeemable(DateTimeOffset now) => UsedAt is null && SupersededAt is null && now < ExpiresAt;

    public void Redeem(DateTimeOffset now) => UsedAt = now;

    public void Supersede(DateTimeOffset now) => SupersededAt ??= now;

    /// <summary>Moves the expiry forward by the length of a maintenance window (L2-117 AC2).</summary>
    public void Extend(TimeSpan by) => ExpiresAt += by;
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

    /// <summary>Null for a transactional e-mail; otherwise the category a member can unsubscribe from (L2-068 AC3).</summary>
    public string? Category { get; private set; }

    public static OutboxMessage Email(
        Guid? memberId, string to, string subject, string textBody, DateTimeOffset now, DateTimeOffset? notBefore = null, Guid? correlationId = null,
        string? category = null) => new()
    {
        CorrelationId = correlationId,
        Category = category,
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

/// <summary>
/// A visitor asked for a reset link for an address. Taking the request reads no account, so it takes the same
/// time for any address; the worker decides afterwards whether a link is sent (L2-141 AC1).
/// </summary>
public sealed class PasswordResetRequest
{
    private PasswordResetRequest()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The lower-cased address, which the limit of 3 an hour counts by (L2-137).</summary>
    public string EmailKey { get; private set; } = string.Empty;

    public DateTimeOffset RequestedAt { get; private set; }

    public DateTimeOffset? ProcessedAt { get; private set; }

    public static PasswordResetRequest Record(EmailAddress email, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        EmailKey = email.Key,
        RequestedAt = now,
    };

    public void MarkProcessed(DateTimeOffset now) => ProcessedAt = now;
}
