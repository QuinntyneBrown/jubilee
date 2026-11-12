namespace Jubilee.Domain;

/// <summary>
/// A member's conversation with one business (L2-055 to L2-063). There is one per member and
/// listing; the business side is the listing's owner. Each side has its own read mark and mute.
/// </summary>
public sealed class Conversation
{
    private Conversation()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    /// <summary>The member's session subject.</summary>
    public string MemberSubject { get; private set; } = string.Empty;

    public string MemberName { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The member's account was erased: the business sees a former member (L2-017 AC6).</summary>
    public void ForgetMember() => MemberName = FormerMember;

    public const string FormerMember = "Former member";

    public DateTimeOffset LastMessageAt { get; private set; }

    public DateTimeOffset? MemberReadAt { get; private set; }

    public DateTimeOffset? OwnerReadAt { get; private set; }

    public bool MemberMuted { get; private set; }

    public bool OwnerMuted { get; private set; }

    /// <summary>The member blocked the business: it is not told, and its messages stop reaching the member (L2-063 AC2).</summary>
    public bool BlockedByMember { get; private set; }

    public static Conversation Start(Guid listingId, string memberSubject, string memberName, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        MemberSubject = memberSubject,
        MemberName = memberName,
        CreatedAt = now,
        LastMessageAt = now,
    };

    /// <summary>
    /// When the next message happens: never before the last one, so messages keep their order
    /// even when two arrive in the same instant.
    /// </summary>
    public DateTimeOffset NextMessageTime(DateTimeOffset now) => now > LastMessageAt ? now : LastMessageAt.AddTicks(1);

    public void Touch(DateTimeOffset now) => LastMessageAt = now;

    public void MarkRead(bool asOwner, DateTimeOffset now)
    {
        // Reading covers everything written so far, even a message stamped a tick after "now".
        var at = now > LastMessageAt ? now : LastMessageAt;
        if (asOwner)
        {
            OwnerReadAt = at;
        }
        else
        {
            MemberReadAt = at;
        }
    }

    public void Mute(bool asOwner, bool muted)
    {
        if (asOwner)
        {
            OwnerMuted = muted;
        }
        else
        {
            MemberMuted = muted;
        }
    }

    public void Block() => BlockedByMember = true;
}

/// <summary>One message in a conversation, with at most one attachment.</summary>
public sealed class Message
{
    public const int MaxBodyLength = 4000;

    private Message()
    {
    }

    public Guid Id { get; private set; }

    public Guid ConversationId { get; private set; }

    public string SenderSubject { get; private set; } = string.Empty;

    public string SenderName { get; private set; } = string.Empty;

    /// <summary>True when the business wrote it; false when the member did.</summary>
    public bool FromOwner { get; private set; }

    public string Body { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Makes a retry of the same send the same message (L2-132, L2-058 AC3).</summary>
    public string IdempotencyKey { get; private set; } = string.Empty;

    public Guid? AttachmentId { get; private set; }

    /// <summary>The sender's account was erased: what they wrote stays, from a former member (L2-017 AC6).</summary>
    public void ForgetSender() => SenderName = Conversation.FormerMember;

    /// <summary>Written after the member blocked the business: stored, never shown to the member.</summary>
    public bool HiddenFromMember { get; private set; }

    public static Message Send(
        Guid conversationId,
        string senderSubject,
        string senderName,
        bool fromOwner,
        string body,
        string idempotencyKey,
        Guid? attachmentId,
        bool hiddenFromMember,
        DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderSubject = senderSubject,
            SenderName = senderName,
            FromOwner = fromOwner,
            Body = body,
            IdempotencyKey = idempotencyKey,
            AttachmentId = attachmentId,
            HiddenFromMember = hiddenFromMember,
            CreatedAt = now,
        };
}

/// <summary>
/// A photo a participant uploaded, without its metadata and scanned (L2-060, L2-138). The row says
/// whose it is; the bytes are kept by the media store under <see cref="Key"/>.
/// </summary>
public sealed class MessageAttachment
{
    private MessageAttachment()
    {
    }

    public Guid Id { get; private set; }

    public Guid ConversationId { get; private set; }

    public string UploaderSubject { get; private set; } = string.Empty;

    public string ContentType { get; private set; } = string.Empty;

    /// <summary>The random name the media store keeps the bytes under: 128 bits, hexadecimal (L2-138 AC5).</summary>
    public string Key { get; private set; } = string.Empty;

    /// <summary>
    /// The bytes of a photo stored before the media store kept message photos (ADR 0051): read only
    /// when a row has no <see cref="Key"/>, and never written again.
    /// </summary>
    public byte[]? Content { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static MessageAttachment Store(Guid conversationId, string uploaderSubject, string contentType, string key, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ConversationId = conversationId,
        UploaderSubject = uploaderSubject,
        ContentType = contentType,
        Key = key,
        CreatedAt = now,
    };
}

/// <summary>A participant's report of a conversation to the verification team (L2-063).</summary>
public sealed class ConversationReport
{
    private ConversationReport()
    {
    }

    public Guid Id { get; private set; }

    public Guid ConversationId { get; private set; }

    public string ReporterSubject { get; private set; } = string.Empty;

    public string Reason { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    public ReportStatus Status { get; private set; }

    public string? ResolutionNote { get; private set; }

    public DateTimeOffset? ResolvedAt { get; private set; }

    public void StartReview()
    {
        if (Status == ReportStatus.Open)
        {
            Status = ReportStatus.InReview;
        }
    }

    public void Resolve(string note, DateTimeOffset now)
    {
        Status = ReportStatus.Resolved;
        ResolutionNote = note;
        ResolvedAt = now;
    }

    public static ConversationReport File(Guid conversationId, string reporterSubject, string reason, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ConversationId = conversationId,
        ReporterSubject = reporterSubject,
        Reason = reason,
        CreatedAt = now,
    };
}
