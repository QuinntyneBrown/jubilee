using MediatR;

namespace Jubilee.Application.Navigation;

public sealed record GetNavigationSummaryQuery : IRequest<NavigationSummary>;

public sealed record NavigationSummary(
    int UnreadConversationCount,
    int UnreadNotificationCount,
    int NewRequestCount,
    bool OwnsListing);

public sealed class GetNavigationSummaryQueryHandler : IRequestHandler<GetNavigationSummaryQuery, NavigationSummary>
{
    // Messaging, notifications, requests and listing ownership arrive in later journeys. Until
    // they exist a member has nothing unread and owns no listing, so the summary is constant.
    public Task<NavigationSummary> Handle(GetNavigationSummaryQuery request, CancellationToken cancellationToken) =>
        Task.FromResult(new NavigationSummary(0, 0, 0, false));
}
