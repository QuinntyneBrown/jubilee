using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Notifications;

public sealed record NotificationDto(Guid Id, string Kind, string Title, string Detail, string Target, DateTimeOffset At, bool Read);

public sealed record NotificationListDto(int Unread, IReadOnlyList<NotificationDto> Items);

/// <summary>What creates and reads notifications (L2-064).</summary>
public static class NotificationRules
{
    /// <summary>Older notifications are neither shown nor counted (L2-064 AC5).</summary>
    public static readonly TimeSpan Window = TimeSpan.FromDays(90);

    /// <summary>The newest notifications the centre lists.</summary>
    public const int PageSize = 100;

    /// <summary>Tells a member about an event. The caller saves.</summary>
    public static void Tell(IAppDbContext db, string? memberSubject, string kind, string title, string detail, string target, DateTimeOffset now,
        Guid? correlationId = null)
    {
        if (!string.IsNullOrWhiteSpace(memberSubject))
        {
            db.Notifications.Add(Notification.Create(memberSubject, kind, title, detail, target, now, null, correlationId));
        }
    }

    public static IQueryable<Notification> Visible(IAppDbContext db, string subject, DateTimeOffset now)
    {
        var since = now - Window;
        return db.Notifications.Where(n => n.MemberSubject == subject && n.CreatedAt >= since);
    }

    public static Task<int> UnreadCount(IAppDbContext db, string subject, DateTimeOffset now, CancellationToken cancellationToken) =>
        Visible(db, subject, now).CountAsync(n => n.ReadAt == null, cancellationToken);

    public static NotificationDto Row(Notification n) => new(n.Id, n.Kind, n.Title, n.Detail, n.Target, n.CreatedAt, n.ReadAt is not null);
}

public sealed record ListNotificationsQuery(string Subject) : IRequest<NotificationListDto>;

public sealed class ListNotificationsQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ListNotificationsQuery, NotificationListDto>
{
    public async Task<NotificationListDto> Handle(ListNotificationsQuery request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var rows = await NotificationRules.Visible(db, request.Subject, now).AsNoTracking()
            .OrderByDescending(n => n.CreatedAt).Take(NotificationRules.PageSize).ToListAsync(cancellationToken);
        var unread = await NotificationRules.UnreadCount(db, request.Subject, now, cancellationToken);
        return new NotificationListDto(unread, [.. rows.Select(NotificationRules.Row)]);
    }
}

public sealed record UnreadDto(int Unread);

/// <summary>Opening a notification marks it read. Someone else's is a 404 (L2-133 AC2).</summary>
public sealed record MarkNotificationReadCommand(string Subject, Guid Id) : IRequest<UnreadDto>;

public sealed class MarkNotificationReadCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<MarkNotificationReadCommand, UnreadDto>
{
    public async Task<UnreadDto> Handle(MarkNotificationReadCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var notification = await db.Notifications.SingleOrDefaultAsync(n => n.Id == request.Id && n.MemberSubject == request.Subject, cancellationToken)
            ?? throw new NotFoundException("NOTIFICATION_NOT_FOUND", "We couldn’t find that notification.");
        notification.MarkRead(now);
        await db.SaveChangesAsync(cancellationToken);
        return new UnreadDto(await NotificationRules.UnreadCount(db, request.Subject, now, cancellationToken));
    }
}

public sealed record MarkAllNotificationsReadCommand(string Subject) : IRequest<UnreadDto>;

public sealed class MarkAllNotificationsReadCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<MarkAllNotificationsReadCommand, UnreadDto>
{
    public async Task<UnreadDto> Handle(MarkAllNotificationsReadCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        foreach (var notification in await NotificationRules.Visible(db, request.Subject, now).Where(n => n.ReadAt == null).ToListAsync(cancellationToken))
        {
            notification.MarkRead(now);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new UnreadDto(0);
    }
}
