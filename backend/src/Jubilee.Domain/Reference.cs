namespace Jubilee.Domain;

/// <summary>How well the reference knows the owner (L2-081 AC1).</summary>
public enum ReferenceAnswerKind
{
    Vouches = 1,
    CantVouch = 2,
    DoesntKnow = 3,
}

/// <summary>Why a reference link was issued.</summary>
public enum ReferenceLinkKind
{
    Initial = 0,
    Resend = 1,
    Reminder = 2,
    Change = 3,
}

/// <summary>How a reference link stopped working before it expired.</summary>
public enum ReferenceLinkEnd
{
    Answered = 1,
    Replaced = 2,
    Reported = 3,
}

/// <summary>
/// The link in a reference request: bound to one listing and one reference e-mail, stored only as a
/// hash, working once for 14 days (L2-080 AC2, L2-140). The raw token exists only in the e-mail.
/// </summary>
public sealed class ReferenceLink
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(14);

    private ReferenceLink()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    /// <summary>SHA-256 of the token, in lower-case hex.</summary>
    public string TokenHash { get; private set; } = string.Empty;

    public string ReferenceEmail { get; private set; } = string.Empty;

    public string Church { get; private set; } = string.Empty;

    public ReferenceLinkKind Kind { get; private set; }

    public DateTimeOffset IssuedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? ClosedAt { get; private set; }

    public ReferenceLinkEnd? EndedBy { get; private set; }

    /// <summary>Set when the owner was told that the link expired unanswered (L2-084 AC4).</summary>
    public DateTimeOffset? ExpiryNoticeSentAt { get; private set; }

    public bool IsOpen(DateTimeOffset now) => ClosedAt is null && now < ExpiresAt;

    public static ReferenceLink Issue(
        Guid listingId, string tokenHash, string referenceEmail, string church, ReferenceLinkKind kind, DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            ListingId = listingId,
            TokenHash = tokenHash,
            ReferenceEmail = referenceEmail,
            Church = church,
            Kind = kind,
            IssuedAt = now,
            ExpiresAt = now + Lifetime,
        };

    public void Close(ReferenceLinkEnd end, DateTimeOffset now)
    {
        if (ClosedAt is not null)
        {
            return;
        }

        ClosedAt = now;
        EndedBy = end;
    }

    public void NoticeSent(DateTimeOffset now) => ExpiryNoticeSentAt = now;
}

/// <summary>
/// What a church reference said. Only the verification team reads it; the owner and the public
/// never do (L2-146).
/// </summary>
public sealed class ReferenceAnswer
{
    private ReferenceAnswer()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public Guid LinkId { get; private set; }

    public ReferenceAnswerKind Kind { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string Role { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public DateTimeOffset AnsweredAt { get; private set; }

    public static ReferenceAnswer Record(
        Guid listingId, Guid linkId, ReferenceAnswerKind kind, string name, string role, string? note, DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            ListingId = listingId,
            LinkId = linkId,
            Kind = kind,
            Name = name,
            Role = role,
            Note = string.IsNullOrWhiteSpace(note) ? null : note,
            AnsweredAt = now,
        };
}
