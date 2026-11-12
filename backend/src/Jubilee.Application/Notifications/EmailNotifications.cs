using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Notifications;

/// <summary>The one-click unsubscribe link in a notification e-mail (L2-068 AC3): a signed token, no sign-in.</summary>
public interface IUnsubscribeLinks
{
    string For(Guid memberId, string category);

    bool TryRead(string token, out Guid memberId, out string category);
}

public sealed class HmacUnsubscribeLinks(string key) : IUnsubscribeLinks
{
    private readonly byte[] _key = Encoding.UTF8.GetBytes(key);

    public string For(Guid memberId, string category)
    {
        var payload = $"{memberId:N}.{category}";
        return $"{Base64Url(Encoding.UTF8.GetBytes(payload))}.{Base64Url(Sign(payload))}";
    }

    public bool TryRead(string token, out Guid memberId, out string category)
    {
        memberId = Guid.Empty;
        category = string.Empty;
        var parts = token.Split('.');
        if (parts.Length != 2)
        {
            return false;
        }

        try
        {
            var payload = Encoding.UTF8.GetString(FromBase64Url(parts[0]));
            if (!CryptographicOperations.FixedTimeEquals(FromBase64Url(parts[1]), Sign(payload)))
            {
                return false;
            }

            var pieces = payload.Split('.');
            if (pieces.Length != 2 || !Guid.TryParseExact(pieces[0], "N", out memberId))
            {
                return false;
            }

            category = pieces[1];
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private byte[] Sign(string payload) => HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(payload));

    private static string Base64Url(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string text)
    {
        var padded = text.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(padded.PadRight(padded.Length + ((4 - (padded.Length % 4)) % 4), '='));
    }
}

/// <summary>Turns one category off from the link in an e-mail. A link that does not verify is a 404.</summary>
/// <remarks>The answer is the category the link was for, so the unsubscribe page can say what stops (L2-224).</remarks>
public sealed record UnsubscribeCommand(string Token) : IRequest<string>;

public sealed class UnsubscribeCommandHandler(IAppDbContext db, IUnsubscribeLinks links, TimeProvider clock) : IRequestHandler<UnsubscribeCommand, string>
{
    public async Task<string> Handle(UnsubscribeCommand request, CancellationToken cancellationToken)
    {
        if (!links.TryRead(request.Token, out var memberId, out var category))
        {
            throw new NotFoundException("UNSUBSCRIBE_LINK_INVALID", "This link doesn’t work.");
        }

        var member = await db.Members.SingleOrDefaultAsync(m => m.Id == memberId, cancellationToken)
            ?? throw new NotFoundException("UNSUBSCRIBE_LINK_INVALID", "This link doesn’t work.");
        // The daily summary is ended by turning off the two categories it collects (L2-016 AC8).
        string[] categories = category == EmailCategories.Summary ? [EmailCategories.Messages, EmailCategories.Requests] : [category];
        foreach (var one in categories)
        {
            if (!Consent.TrySet(db, member, one, false, ConsentMethod.OneClickUnsubscribe, clock.GetUtcNow()))
            {
                throw new NotFoundException("UNSUBSCRIBE_LINK_INVALID", "This link doesn’t work.");
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return category;
    }
}

/// <summary>The e-mail about a new message (L2-068): not when muted, not to someone reading it now, and one e-mail for a burst.</summary>
public static class MessageMail
{
    /// <summary>A message is e-mailed this long after the first one waiting, so a burst goes out as one.</summary>
    public static readonly TimeSpan Wait = TimeSpan.FromMinutes(2);

    /// <summary>Messages within this long of the last e-mail wait for the next one (AC5).</summary>
    public static readonly TimeSpan Combine = TimeSpan.FromMinutes(10);

    /// <summary>The recipient counts as reading the conversation for this long after they opened it (AC4).</summary>
    public static readonly TimeSpan Reading = TimeSpan.FromMinutes(2);

    public static async Task QueueAsync(
        IAppDbContext db, AccountSettings settings, Conversation conversation, bool toOwner, string? recipientSubject, string senderName,
        DateTimeOffset now, CancellationToken cancellationToken)
    {
        var muted = toOwner ? conversation.OwnerMuted : conversation.MemberMuted;
        var readAt = toOwner ? conversation.OwnerReadAt : conversation.MemberReadAt;
        if (muted
            || (readAt is { } at && now - at < Reading)
            || !Guid.TryParse(recipientSubject, out var memberId))
        {
            return;
        }

        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == memberId, cancellationToken);
        if (member is null || !member.WantsEmail(EmailCategories.Messages))
        {
            return;
        }

        var waiting = await db.OutboxMessages.AnyAsync(
            m => m.CorrelationId == conversation.Id && m.MemberId == member.Id && m.SentAt == null && m.FailedAt == null, cancellationToken);
        if (waiting)
        {
            return;
        }

        var lastSent = (await db.OutboxMessages.AsNoTracking()
            .Where(m => m.CorrelationId == conversation.Id && m.MemberId == member.Id && m.SentAt != null)
            .Select(m => m.SentAt).ToListAsync(cancellationToken)).Max();
        var notBefore = lastSent is { } sent && now - sent < Combine ? sent + Combine : now + Wait;
        EmailPolicy.Queue(
            db,
            member,
            EmailCategories.Messages,
            $"New message from {senderName}",
            $"Hi {member.FirstName},\n\n{senderName} sent you a message on Jubilee.\n\nRead and reply: {settings.PublicBaseUrl.TrimEnd('/')}/messages/{conversation.Id}\n\nJubilee · Toronto's Christian marketplace\n",
            now,
            notBefore,
            conversation.Id);
    }
}

/// <summary>The reminder an hour before a confirmed meeting (L2-069).</summary>
public sealed class MeetingReminders(IAppDbContext db, TimeProvider clock, AccountSettings settings)
{
    public static readonly TimeSpan Lead = TimeSpan.FromHours(1);

    /// <summary>Reminds both sides of every confirmed meeting that starts within the hour and has not been reminded. A cancelled one is not confirmed, so it is skipped (AC2).</summary>
    public async Task<int> SendDueAsync(CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var soon = now + Lead;
        var due = await db.Requests
            .Where(r => r.Kind == RequestKind.Booking && r.Status == RequestStatus.Confirmed && r.RemindedAt == null && r.StartsAt != null && r.StartsAt > now && r.StartsAt <= soon)
            .ToListAsync(cancellationToken);
        foreach (var request in due)
        {
            await RemindAsync(request, now, cancellationToken);
        }

        if (due.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return due.Count;
    }

    /// <summary>A booking confirmed less than an hour before it starts is reminded when it is confirmed (AC3). The caller saves.</summary>
    public async Task RemindIfSoonAsync(Request request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        if (request.Kind == RequestKind.Booking && request.Status == RequestStatus.Confirmed && request.RemindedAt is null
            && request.StartsAt is { } starts && starts > now && starts <= now + Lead)
        {
            await RemindAsync(request, now, cancellationToken);
        }
    }

    private async Task RemindAsync(Request request, DateTimeOffset now, CancellationToken cancellationToken)
    {
        request.Remind(now);
        var listing = await db.Listings.AsNoTracking().SingleAsync(l => l.Id == request.ListingId, cancellationToken);
        var local = TorontoClock.Local(request.StartsAt!.Value);
        var when = local.ToString("ddd d MMM, h:mm tt", CultureInfo.InvariantCulture);
        var how = request.Mode == MeetingMode.InPerson ? $"In person, {request.Location}" : "Video call";
        const string Title = "Your meeting starts in 1 hour";
        var forMember = $"{request.ServiceName} with {listing.Name} · {when} · {how}";
        var forOwner = $"{request.ServiceName} with {request.MemberName} · {when} · {how}";
        NotificationRules.Tell(db, request.MemberSubject, "reminder", Title, forMember, $"/requests/{request.Id}", now, request.Id);
        NotificationRules.Tell(db, listing.OwnerId, "reminder", Title, forOwner, "/my-business/requests", now, request.Id);
        await EmailAsync(request.MemberSubject, forMember, $"/requests/{request.Id}", request.Id, now, cancellationToken);
        await EmailAsync(listing.OwnerId, forOwner, "/my-business/requests", request.Id, now, cancellationToken);
    }

    private async Task EmailAsync(string? subject, string detail, string path, Guid requestId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(subject, out var id))
        {
            return;
        }

        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (member is not null)
        {
            EmailPolicy.Queue(
                db,
                member,
                EmailCategories.Reminders,
                "Your meeting starts in 1 hour",
                $"Hi {member.FirstName},\n\n{detail}\n\nDetails: {settings.PublicBaseUrl.TrimEnd('/')}{path}\n\nJubilee · Toronto's Christian marketplace\n",
                now,
                null,
                requestId);
        }
    }
}
