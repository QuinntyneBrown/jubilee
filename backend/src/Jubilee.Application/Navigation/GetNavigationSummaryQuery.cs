using Jubilee.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Navigation;

public sealed record GetNavigationSummaryQuery(string? Subject = null) : IRequest<NavigationSummary>;

public sealed record NavigationSummary(
    int UnreadConversationCount,
    int UnreadNotificationCount,
    int NewRequestCount,
    bool OwnsListing);

public sealed class GetNavigationSummaryQueryHandler(IAppDbContext db) : IRequestHandler<GetNavigationSummaryQuery, NavigationSummary>
{
    // Notifications and requests arrive in later journeys; until then only conversations count.
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
        return new NavigationSummary(unread, 0, 0, owns);
    }
}
