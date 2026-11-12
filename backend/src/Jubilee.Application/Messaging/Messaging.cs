using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Application.Listings;
using Jubilee.Application.Requests;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Messaging;

/// <summary>Signs short-lived links to attachments, so a photo is only reachable through a conversation (L2-060 AC4).</summary>
public interface IAttachmentLinks
{
    string Create(Guid attachmentId);

    bool IsValid(Guid attachmentId, long expires, string signature);
}

public sealed record BusinessRefDto(string Name, string Slug);

public sealed record AttachmentDto(Guid Id, string Url, string ContentType);

public sealed record MessageDto(
    Guid Id,
    string Body,
    DateTimeOffset SentAt,
    bool Mine,
    string SenderFirstName,
    AttachmentDto? Attachment);

public sealed record ConversationDto(
    Guid Id,
    BusinessRefDto Business,
    PersonDto Counterpart,
    bool Muted,
    bool CanBlock,
    DateTimeOffset? AwayUntil,
    string? Replies,
    bool HasMore,
    IReadOnlyList<MessageDto> Messages,
    IReadOnlyList<RequestCardDto> Requests);

/// <summary>A request between the member and the business, as its card in their conversation reads (L2-057 AC4).</summary>
public sealed record RequestCardDto(
    Guid Id,
    string Kind,
    string KindLabel,
    string Title,
    string? Detail,
    string Status,
    string StatusLabel,
    DateTimeOffset SentAt,
    string Link);

public sealed record AttachmentLinkDto(string Url);

public sealed record PersonDto(string Name);

public sealed record InboxRowDto(
    Guid Id,
    string Title,
    string BusinessName,
    string BusinessSlug,
    string Preview,
    DateTimeOffset LastMessageAt,
    bool Unread,
    bool Muted);

public sealed record InboxDto(int TotalCount, int UnreadCount, IReadOnlyList<InboxRowDto> Conversations);

public sealed record StartedConversationDto(Guid ConversationId, Guid MessageId);

/// <summary>The words that make a conversation findable and its sides readable.</summary>
internal static class ConversationRules
{
    public const int PageSize = 50;

    /// <summary>How many conversations one answer of the inbox holds (L2-056 AC7).</summary>
    public const int InboxPageSize = 50;
    public const int MessagesPerWindow = 30;
    public static readonly TimeSpan MessageWindow = TimeSpan.FromMinutes(10);
    public const int NewConversationsPerDay = 10;
    public static readonly TimeSpan ConversationWindow = TimeSpan.FromDays(1);

    public const int UploadsPerWindow = 30;

    /// <summary>What an inbox row says of a message that is a photo and nothing else (L2-060 AC6).</summary>
    public const string PhotoPreview = "Photo";

    /// <summary>The text of a message. A message that carries a photo needs none (L2-060 AC6).</summary>
    public static string CleanBody(string? body, bool hasPhoto = false)
    {
        var trimmed = (body ?? string.Empty).Trim();
        if (trimmed.Length == 0 && hasPhoto)
        {
            return trimmed;
        }

        if (trimmed.Length == 0)
        {
            throw Invalid("REQUIRED");
        }

        return trimmed.Length > Message.MaxBodyLength ? throw Invalid("TOO_LONG") : trimmed;
    }

    public static ValidationFailedException Invalid(string code) =>
        new(new Dictionary<string, string> { ["body"] = code });

    /// <summary>A request as its card reads; "View request" goes to the member's request or the owner's Requests.</summary>
    public static RequestCardDto Card(Request r, bool asOwner) => new(
        r.Id,
        IncomingRules.KindWire(r.Kind),
        $"{IncomingRules.KindLabel(r.Kind)} request",
        MemberRequestRules.Title(r),
        r.Kind switch
        {
            RequestKind.Booking => $"{MemberRequestRules.Range(r)} · {(r.Mode == MeetingMode.InPerson ? "In person" : "Video")}",
            RequestKind.Quote => r.NeededBy is { } by ? $"Needed by {by.ToString("ddd d MMM", System.Globalization.CultureInfo.InvariantCulture)}" : null,
            _ => MemberRequestRules.Detail(r),
        },
        RequestLabels.Wire(r.Status),
        RequestLabels.ForMember(r.Status),
        r.CreatedAt,
        asOwner ? "/my-business/requests" : $"/requests/{r.Id}");

    public static string FirstName(string name) => name.Trim().Split(' ', 2)[0];

    /// <summary>"Trevor Chew, CKA®" is shown as "Trevor Chew".</summary>
    public static string OwnerDisplayName(Listing listing)
    {
        var name = listing.OwnerName?.Split(',')[0].Trim();
        return string.IsNullOrEmpty(name) ? listing.Name : name;
    }

    public static async Task EnsureMessageBudget(IAppDbContext db, string sender, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var since = now - MessageWindow;
        var recent = await db.Messages.AsNoTracking()
            .Where(m => m.SenderSubject == sender && m.CreatedAt > since)
            .OrderBy(m => m.CreatedAt)
            .Select(m => m.CreatedAt)
            .ToListAsync(cancellationToken);
        if (recent.Count >= MessagesPerWindow)
        {
            throw new RateLimitedException("rate_limited", recent[recent.Count - MessagesPerWindow] + MessageWindow - now);
        }
    }

    /// <summary>The conversations a person is in: as the member, or as the owner of the business.</summary>
    public static IQueryable<ConversationRow> RowsFor(IAppDbContext db, string subject) =>
        from c in db.Conversations
        join l in db.Listings on c.ListingId equals l.Id
        where c.MemberSubject == subject || l.OwnerId == subject
        select new ConversationRow { Conversation = c, Listing = l, AsOwner = l.OwnerId == subject && c.MemberSubject != subject };
}

internal sealed class ConversationRow
{
    public required Conversation Conversation { get; init; }

    public required Listing Listing { get; init; }

    public bool AsOwner { get; init; }
}

/// <summary>A member starts a conversation with a business, or adds to the one they already have (L2-055).</summary>
public sealed record StartConversationCommand(string Subject, string Name, string ListingSlug, string? Body, string? IdempotencyKey)
    : IRequest<StartedConversationDto>;

public sealed class StartConversationCommandHandler(IAppDbContext db, TimeProvider clock, Accounts.AccountSettings settings)
    : IRequestHandler<StartConversationCommand, StartedConversationDto>
{
    public const string OwnListingCode = "OWN_LISTING";

    public async Task<StartedConversationDto> Handle(StartConversationCommand request, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? Guid.NewGuid().ToString() : request.IdempotencyKey.Trim();
        var earlier = await db.Messages.AsNoTracking()
            .SingleOrDefaultAsync(m => m.SenderSubject == request.Subject && m.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            return new StartedConversationDto(earlier.ConversationId, earlier.Id);
        }

        var body = ConversationRules.CleanBody(request.Body);
        var listing = await db.Listings.WherePublic()
            .SingleOrDefaultAsync(l => l.Slug == request.ListingSlug, cancellationToken)
            ?? throw new NotFoundException("listing_not_found", "There is no such business.");
        if (listing.OwnerId == request.Subject)
        {
            throw new ConflictException(OwnListingCode, "You can't message your own business.");
        }

        var now = clock.GetUtcNow();
        await ConversationRules.EnsureMessageBudget(db, request.Subject, now, cancellationToken);

        var conversation = await db.Conversations
            .SingleOrDefaultAsync(c => c.ListingId == listing.Id && c.MemberSubject == request.Subject, cancellationToken);
        if (conversation is null)
        {
            var since = now - ConversationRules.ConversationWindow;
            var started = await db.Conversations.AsNoTracking()
                .Where(c => c.MemberSubject == request.Subject && c.CreatedAt > since)
                .OrderBy(c => c.CreatedAt)
                .Select(c => c.CreatedAt)
                .ToListAsync(cancellationToken);
            if (started.Count >= ConversationRules.NewConversationsPerDay)
            {
                throw new RateLimitedException(
                    "rate_limited", started[started.Count - ConversationRules.NewConversationsPerDay] + ConversationRules.ConversationWindow - now);
            }

            conversation = Conversation.Start(listing.Id, request.Subject, request.Name, now);
            db.Conversations.Add(conversation);
        }

        var at = conversation.NextMessageTime(now);
        var message = Message.Send(conversation.Id, request.Subject, request.Name, false, body, key, null, false, at);
        db.Messages.Add(message);
        conversation.Touch(at);
        conversation.MarkRead(false, at);
        Notifications.NotificationRules.Tell(
            db, listing.OwnerId, "message", $"New message from {request.Name}", body, $"/messages/{conversation.Id}", at);
        await Notifications.MessageMail.QueueAsync(db, settings, conversation, true, listing.OwnerId, request.Name, now, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new StartedConversationDto(conversation.Id, message.Id);
    }
}

/// <summary>A participant adds a message, optionally with an uploaded photo (L2-058).</summary>
public sealed record SendMessageCommand(Guid ConversationId, string Subject, string Name, string? Body, string? IdempotencyKey, Guid? AttachmentId)
    : IRequest<MessageDto>;

public sealed class SendMessageCommandHandler(IAppDbContext db, TimeProvider clock, IAttachmentLinks links, Accounts.AccountSettings settings)
    : IRequestHandler<SendMessageCommand, MessageDto>
{
    public async Task<MessageDto> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var row = await ConversationRules.RowsFor(db, request.Subject)
            .SingleOrDefaultAsync(r => r.Conversation.Id == request.ConversationId, cancellationToken)
            ?? throw new NotFoundException("conversation_not_found", "There is no such conversation.");

        var key = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? Guid.NewGuid().ToString() : request.IdempotencyKey.Trim();
        var earlier = await db.Messages.AsNoTracking()
            .SingleOrDefaultAsync(m => m.SenderSubject == request.Subject && m.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            return await ToDto(earlier, request.Subject, cancellationToken);
        }

        var body = ConversationRules.CleanBody(request.Body, request.AttachmentId is not null);
        var now = clock.GetUtcNow();
        await ConversationRules.EnsureMessageBudget(db, request.Subject, now, cancellationToken);

        if (request.AttachmentId is { } attachmentId)
        {
            var usable = await db.MessageAttachments.AsNoTracking().AnyAsync(
                a => a.Id == attachmentId && a.ConversationId == row.Conversation.Id && a.UploaderSubject == request.Subject, cancellationToken)
                && !await db.Messages.AnyAsync(m => m.AttachmentId == attachmentId, cancellationToken);
            if (!usable)
            {
                throw new NotFoundException("attachment_not_found", "There is no such photo.");
            }
        }

        var hidden = row.AsOwner && row.Conversation.BlockedByMember;
        var at = row.Conversation.NextMessageTime(now);
        var message = Message.Send(row.Conversation.Id, request.Subject, request.Name, row.AsOwner, body, key, request.AttachmentId, hidden, at);
        db.Messages.Add(message);
        row.Conversation.Touch(at);
        row.Conversation.MarkRead(row.AsOwner, at);
        if (!hidden)
        {
            Notifications.NotificationRules.Tell(
                db,
                row.AsOwner ? row.Conversation.MemberSubject : row.Listing.OwnerId,
                "message",
                $"New message from {(row.AsOwner ? row.Listing.Name : request.Name)}",
                body.Length == 0 ? ConversationRules.PhotoPreview : body,
                $"/messages/{row.Conversation.Id}",
                at);
            await Notifications.MessageMail.QueueAsync(
                db,
                settings,
                row.Conversation,
                !row.AsOwner,
                row.AsOwner ? row.Conversation.MemberSubject : row.Listing.OwnerId,
                row.AsOwner ? row.Listing.Name : request.Name,
                now,
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await ToDto(message, request.Subject, cancellationToken);
    }

    private async Task<MessageDto> ToDto(Message message, string subject, CancellationToken cancellationToken)
    {
        var attachment = message.AttachmentId is { } id
            ? await db.MessageAttachments.AsNoTracking().Where(a => a.Id == id).Select(a => a.ContentType).SingleAsync(cancellationToken)
            : null;
        return new MessageDto(
            message.Id,
            message.Body,
            message.CreatedAt,
            message.SenderSubject == subject,
            ConversationRules.FirstName(message.SenderName),
            message.AttachmentId is { } attachmentId && attachment is not null
                ? new AttachmentDto(attachmentId, links.Create(attachmentId), attachment)
                : null);
    }
}

/// <summary>
/// The inbox: a person's conversations, newest first, optionally searched, 50 at a time after the
/// first <see cref="Skip"/> (L2-056, L2-059). The counts are of the whole inbox or search.
/// </summary>
public sealed record GetInboxQuery(string Subject, string? Search, int Skip = 0) : IRequest<InboxDto>;

public sealed class GetInboxQueryHandler(IAppDbContext db) : IRequestHandler<GetInboxQuery, InboxDto>
{
    public async Task<InboxDto> Handle(GetInboxQuery request, CancellationToken cancellationToken)
    {
        var rows = ConversationRules.RowsFor(db, request.Subject);
        var term = request.Search?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(term))
        {
            rows = rows.Where(r =>
                r.Listing.Name.ToLower().Contains(term)
                || (r.Listing.OwnerName != null && r.Listing.OwnerName.ToLower().Contains(term))
                || r.Conversation.MemberName.ToLower().Contains(term)
                || db.Messages.Any(m => m.ConversationId == r.Conversation.Id
                    && (r.AsOwner || !m.HiddenFromMember)
                    && m.Body.ToLower().Contains(term)));
        }

        var total = await rows.CountAsync(cancellationToken);
        var unread = await rows.CountAsync(
            r => db.Messages.Any(m => m.ConversationId == r.Conversation.Id
                && (r.AsOwner
                    ? !m.FromOwner && (r.Conversation.OwnerReadAt == null || m.CreatedAt > r.Conversation.OwnerReadAt)
                    : m.FromOwner && !m.HiddenFromMember
                        && (r.Conversation.MemberReadAt == null || m.CreatedAt > r.Conversation.MemberReadAt))),
            cancellationToken);

        // The id settles the order of conversations touched in the same instant, so pages never overlap.
        var listed = await rows
            .OrderByDescending(r => r.Conversation.LastMessageAt)
            .ThenBy(r => r.Conversation.Id)
            .Skip(Math.Max(0, request.Skip))
            .Take(ConversationRules.InboxPageSize)
            .Select(r => new
            {
                r.Conversation.Id,
                r.Conversation.MemberName,
                r.Conversation.MemberMuted,
                r.Conversation.OwnerMuted,
                r.Conversation.LastMessageAt,
                r.Listing.Name,
                r.Listing.Slug,
                r.AsOwner,
                Last = db.Messages
                    .Where(m => m.ConversationId == r.Conversation.Id && (r.AsOwner || !m.HiddenFromMember))
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => new { m.Body, m.SenderSubject, m.SenderName, m.AttachmentId })
                    .FirstOrDefault(),
                Unread = db.Messages.Any(m => m.ConversationId == r.Conversation.Id
                    && (r.AsOwner
                        ? !m.FromOwner && (r.Conversation.OwnerReadAt == null || m.CreatedAt > r.Conversation.OwnerReadAt)
                        : m.FromOwner && !m.HiddenFromMember
                            && (r.Conversation.MemberReadAt == null || m.CreatedAt > r.Conversation.MemberReadAt))),
            })
            .ToListAsync(cancellationToken);

        var conversations = listed.Select(r => new InboxRowDto(
            r.Id,
            r.AsOwner ? r.MemberName : r.Name,
            r.Name,
            r.Slug,
            Preview(
                r.Last is { Body.Length: 0, AttachmentId: not null } ? ConversationRules.PhotoPreview : r.Last?.Body,
                r.Last?.SenderSubject,
                r.Last?.SenderName,
                request.Subject),
            r.LastMessageAt,
            r.Unread,
            r.AsOwner ? r.OwnerMuted : r.MemberMuted)).ToList();
        return new InboxDto(total, unread, conversations);
    }

    private static string Preview(string? body, string? sender, string? senderName, string subject)
    {
        if (body is null)
        {
            return string.Empty;
        }

        var line = body.ReplaceLineEndings(" ");
        if (line.Length > 120)
        {
            line = line[..120].TrimEnd() + "…";
        }

        return sender == subject ? $"You: {line}" : $"{ConversationRules.FirstName(senderName ?? string.Empty)}: {line}";
    }
}

/// <summary>Opens a conversation: its latest messages, marked read for the person opening it (L2-057).</summary>
public sealed record GetConversationQuery(string Subject, Guid ConversationId, Guid? Before) : IRequest<ConversationDto>;

public sealed class GetConversationQueryHandler(IAppDbContext db, TimeProvider clock, IAttachmentLinks links)
    : IRequestHandler<GetConversationQuery, ConversationDto>
{
    public async Task<ConversationDto> Handle(GetConversationQuery request, CancellationToken cancellationToken)
    {
        var row = await ConversationRules.RowsFor(db, request.Subject)
            .SingleOrDefaultAsync(r => r.Conversation.Id == request.ConversationId, cancellationToken)
            ?? throw new NotFoundException("conversation_not_found", "There is no such conversation.");
        var now = clock.GetUtcNow();

        var visible = db.Messages.AsNoTracking()
            .Where(m => m.ConversationId == row.Conversation.Id && (row.AsOwner || !m.HiddenFromMember));
        DateTimeOffset? upper = null;
        if (request.Before is { } before)
        {
            upper = await visible.Where(m => m.Id == before).Select(m => (DateTimeOffset?)m.CreatedAt).SingleOrDefaultAsync(cancellationToken);
            if (upper is { } at)
            {
                visible = visible.Where(m => m.CreatedAt < at);
            }
        }

        var page = await visible.OrderByDescending(m => m.CreatedAt).Take(ConversationRules.PageSize + 1).ToListAsync(cancellationToken);
        var hasMore = page.Count > ConversationRules.PageSize;
        var messages = page.Take(ConversationRules.PageSize).Reverse().ToList();

        var attachmentIds = messages.Where(m => m.AttachmentId != null).Select(m => m.AttachmentId!.Value).ToList();
        var types = attachmentIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await db.MessageAttachments.AsNoTracking().Where(a => attachmentIds.Contains(a.Id))
                .ToDictionaryAsync(a => a.Id, a => a.ContentType, cancellationToken);

        if (request.Before is null)
        {
            row.Conversation.MarkRead(row.AsOwner, now);
            await db.SaveChangesAsync(cancellationToken);
        }

        // The cards of this page: the requests sent since its oldest message and before the message the page ends at.
        var asked = db.Requests.AsNoTracking()
            .Where(r => r.ListingId == row.Conversation.ListingId && r.MemberSubject == row.Conversation.MemberSubject);
        if (hasMore && messages.Count > 0)
        {
            var from = messages[0].CreatedAt;
            asked = asked.Where(r => r.CreatedAt >= from);
        }

        if (upper is { } boundaryTime)
        {
            asked = asked.Where(r => r.CreatedAt < boundaryTime);
        }

        var cards = (await asked.ToListAsync(cancellationToken)).OrderBy(r => r.CreatedAt).Select(r => ConversationRules.Card(r, row.AsOwner)).ToList();

        var away = !row.AsOwner && row.Listing.AwayUntil is { } until && until > now ? until : (DateTimeOffset?)null;
        return new ConversationDto(
            row.Conversation.Id,
            new BusinessRefDto(row.Listing.Name, row.Listing.Slug),
            new PersonDto(row.AsOwner ? row.Conversation.MemberName : ConversationRules.OwnerDisplayName(row.Listing)),
            row.AsOwner ? row.Conversation.OwnerMuted : row.Conversation.MemberMuted,
            !row.AsOwner,
            away,
            row.AsOwner ? null : WireValues.Of(row.Listing.ReplyTimeBand),
            hasMore,
            [.. messages.Select(m => new MessageDto(
                m.Id,
                m.Body,
                m.CreatedAt,
                m.SenderSubject == request.Subject,
                ConversationRules.FirstName(m.SenderName),
                m.AttachmentId is { } id && types.TryGetValue(id, out var type) ? new AttachmentDto(id, links.Create(id), type) : null))],
            cards);
    }
}

/// <summary>Mutes or unmutes a conversation for the person asking (L2-061).</summary>
public sealed record SetConversationMutedCommand(string Subject, Guid ConversationId, bool Muted) : IRequest;

public sealed class SetConversationMutedCommandHandler(IAppDbContext db) : IRequestHandler<SetConversationMutedCommand>
{
    public async Task Handle(SetConversationMutedCommand request, CancellationToken cancellationToken)
    {
        var row = await ConversationRules.RowsFor(db, request.Subject)
            .SingleOrDefaultAsync(r => r.Conversation.Id == request.ConversationId, cancellationToken)
            ?? throw new NotFoundException("conversation_not_found", "There is no such conversation.");
        row.Conversation.Mute(row.AsOwner, request.Muted);
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Reports a conversation to the verification team; a member may also block the business (L2-063).</summary>
public sealed record ReportConversationCommand(string Subject, Guid ConversationId, string? Reason, bool Block) : IRequest;

public sealed class ReportConversationCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ReportConversationCommand>
{
    public async Task Handle(ReportConversationCommand request, CancellationToken cancellationToken)
    {
        var row = await ConversationRules.RowsFor(db, request.Subject)
            .SingleOrDefaultAsync(r => r.Conversation.Id == request.ConversationId, cancellationToken)
            ?? throw new NotFoundException("conversation_not_found", "There is no such conversation.");
        var reason = request.Reason?.Trim();
        if (string.IsNullOrEmpty(reason))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["reason"] = "REQUIRED" });
        }

        // One report at a time from a participant: a repeat while it is open files nothing new (L2-063 AC8).
        var open = await db.ConversationReports.AnyAsync(
            r => r.ConversationId == row.Conversation.Id && r.ReporterSubject == request.Subject && r.Status != ReportStatus.Resolved, cancellationToken);
        if (!open)
        {
            db.ConversationReports.Add(ConversationReport.File(
                row.Conversation.Id, request.Subject, reason.Length > 1000 ? reason[..1000] : reason, clock.GetUtcNow()));
        }

        if (request.Block && !row.AsOwner)
        {
            row.Conversation.Block();
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// Stores a photo for a conversation: its metadata is taken out, it is scanned for malware, and only
/// then do its bytes go to the media store under a random name (L2-060 AC9, L2-138).
/// </summary>
public sealed record UploadAttachmentCommand(string Subject, Guid ConversationId, byte[] Content) : IRequest<Guid>;

public sealed class UploadAttachmentCommandHandler(IAppDbContext db, TimeProvider clock, IMalwareScanner scanner, IMediaStore store)
    : IRequestHandler<UploadAttachmentCommand, Guid>
{
    public async Task<Guid> Handle(UploadAttachmentCommand request, CancellationToken cancellationToken)
    {
        var row = await ConversationRules.RowsFor(db, request.Subject)
            .SingleOrDefaultAsync(r => r.Conversation.Id == request.ConversationId, cancellationToken)
            ?? throw new NotFoundException("conversation_not_found", "There is no such conversation.");
        var now = clock.GetUtcNow();
        var since = now - ConversationRules.MessageWindow;
        var recent = await db.MessageAttachments.AsNoTracking()
            .Where(a => a.UploaderSubject == request.Subject && a.CreatedAt > since)
            .OrderBy(a => a.CreatedAt).Select(a => a.CreatedAt).ToListAsync(cancellationToken);
        if (recent.Count >= ConversationRules.UploadsPerWindow)
        {
            throw new RateLimitedException("rate_limited", recent[recent.Count - ConversationRules.UploadsPerWindow] + ConversationRules.MessageWindow - now);
        }

        var image = ImageSanitizer.Sanitize(request.Content);
        if (!image.Accepted)
        {
            throw new InvalidImageException(image.Problem == ImageProblem.TooLarge ? "TOO_LARGE" : "INVALID_IMAGE");
        }

        // Nothing is stored that was not scanned, so the other participant can never be sent it.
        switch (await scanner.Scan(image.Content, cancellationToken))
        {
            case ScanVerdict.Infected:
                throw new InvalidImageException("FAILED_SCAN");
            case ScanVerdict.Unavailable:
                throw new ScanUnavailableException();
        }

        var key = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        var attachment = MessageAttachment.Store(row.Conversation.Id, request.Subject, image.ContentType, key, now);
        await store.Save(key, AttachmentFiles.Width, AttachmentFiles.Format(image.ContentType), image.Content, cancellationToken);
        try
        {
            db.MessageAttachments.Add(attachment);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Without its row nobody can reach the photo: do not leave it behind.
            await store.Delete(key, CancellationToken.None);
            throw;
        }

        return attachment.Id;
    }
}

/// <summary>How a message photo is named in the media store: one file, in the format it was uploaded in.</summary>
internal static class AttachmentFiles
{
    /// <summary>A message photo has one size, its own; listing photos use the widths of their renditions.</summary>
    public const int Width = 0;

    public static string Format(string contentType) => contentType == "image/png" ? "png" : "jpeg";
}

/// <summary>The malware scanner could not be asked, so the photo was not accepted (L2-138 AC4).</summary>
public sealed class ScanUnavailableException() : Exception("We couldn't check that photo just now.")
{
    public const string Code = "SCAN_UNAVAILABLE";
}

/// <summary>A new five-minute link to a photo of a conversation, for a participant who may see it (L2-060 AC8).</summary>
public sealed record RenewAttachmentLinkQuery(string Subject, Guid ConversationId, Guid AttachmentId) : IRequest<AttachmentLinkDto>;

public sealed class RenewAttachmentLinkQueryHandler(IAppDbContext db, IAttachmentLinks links)
    : IRequestHandler<RenewAttachmentLinkQuery, AttachmentLinkDto>
{
    public async Task<AttachmentLinkDto> Handle(RenewAttachmentLinkQuery request, CancellationToken cancellationToken)
    {
        var row = await ConversationRules.RowsFor(db, request.Subject)
            .SingleOrDefaultAsync(r => r.Conversation.Id == request.ConversationId, cancellationToken)
            ?? throw new NotFoundException("conversation_not_found", "There is no such conversation.");
        var shown = await db.Messages.AsNoTracking().AnyAsync(
            m => m.ConversationId == row.Conversation.Id && m.AttachmentId == request.AttachmentId && (row.AsOwner || !m.HiddenFromMember),
            cancellationToken);
        return shown
            ? new AttachmentLinkDto(links.Create(request.AttachmentId))
            : throw new NotFoundException("attachment_not_found", "There is no such photo.");
    }
}

/// <summary>The upload is not a photo we accept; <see cref="Code"/> says why.</summary>
public sealed class InvalidImageException(string code) : Exception("That photo can't be used.")
{
    public string Code { get; } = code;
}

/// <summary>The stored bytes behind a signed link.</summary>
public sealed record GetAttachmentQuery(Guid Id, long Expires, string Signature) : IRequest<AttachmentContent>;

public sealed record AttachmentContent(string ContentType, byte[] Content);

public sealed class GetAttachmentQueryHandler(IAppDbContext db, IAttachmentLinks links, IMediaStore store)
    : IRequestHandler<GetAttachmentQuery, AttachmentContent>
{
    public async Task<AttachmentContent> Handle(GetAttachmentQuery request, CancellationToken cancellationToken)
    {
        if (!links.IsValid(request.Id, request.Expires, request.Signature))
        {
            throw new NotFoundException("attachment_not_found", "There is no such photo.");
        }

        var attachment = await db.MessageAttachments.AsNoTracking().SingleOrDefaultAsync(a => a.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("attachment_not_found", "There is no such photo.");
        // A row stored before the media store kept message photos has its bytes in the row (ADR 0050).
        var content = attachment.Key.Length > 0
            ? await store.Read(attachment.Key, AttachmentFiles.Width, AttachmentFiles.Format(attachment.ContentType), cancellationToken)
            : attachment.Content;
        return content is null
            ? throw new NotFoundException("attachment_not_found", "There is no such photo.")
            : new AttachmentContent(attachment.ContentType, content);
    }
}
