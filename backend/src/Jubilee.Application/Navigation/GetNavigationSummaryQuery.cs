using Jubilee.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Navigation;

public sealed record GetNavigationSummaryQuery(string? Subject = null, bool IsModerator = false) : IRequest<NavigationSummary>;

public sealed record NavigationSummary(
    int UnreadConversationCount,
    int UnreadNotificationCount,
    int NewRequestCount,
    bool OwnsListing,
    bool IsModerator = false);

public sealed class GetNavigationSummaryQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<GetNavigationSummaryQuery, NavigationSummary>
{
    public async Task<NavigationSummary> Handle(GetNavigationSummaryQuery request, CancellationToken cancellationToken)
    {
        if (request.Subject is not { } subject)
        {
            return new NavigationSummary(0, 0, 0, false);
        }

        var unread = await Messaging.ConversationRules.RowsFor(db, subject)
            .CountAsync(r => db.Messages.Any(m => m.ConversationId == r.Conversation.Id
                && (r.AsOwner
                    ? !m.FromOwner && (r.Conversation.OwnerReadAt == null || m.CreatedAt > r.Conversation.OwnerReadAt)
                    : m.FromOwner && !m.HiddenFromMember
                        && (r.Conversation.MemberReadAt == null || m.CreatedAt > r.Conversation.MemberReadAt))),
                cancellationToken);
        var owns = await db.Listings.AnyAsync(l => l.OwnerId == subject, cancellationToken);
        var newRequests = owns && request.Subject is not null
            ? await (from r in db.Requests join l in db.Listings on r.ListingId equals l.Id where l.OwnerId == request.Subject && r.Status == Domain.RequestStatus.New select r.Id).CountAsync(cancellationToken)
            : 0;
        var notifications = await Notifications.NotificationRules.UnreadCount(db, subject, clock.GetUtcNow(), cancellationToken);
        return new NavigationSummary(unread, notifications, newRequests, owns, request.IsModerator);
    }
}
