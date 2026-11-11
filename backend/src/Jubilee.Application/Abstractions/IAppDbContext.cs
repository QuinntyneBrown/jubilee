using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<Listing> Listings { get; }

    DbSet<Product> Products { get; }

    DbSet<Service> Services { get; }

    DbSet<FeaturedSlot> FeaturedSlots { get; }

    DbSet<StockAlert> StockAlerts { get; }

    DbSet<ListingView> ListingViews { get; }

    DbSet<RecentSearch> RecentSearches { get; }

    DbSet<Member> Members { get; }

    DbSet<LinkToken> LinkTokens { get; }

    DbSet<OutboxMessage> OutboxMessages { get; }

    DbSet<Conversation> Conversations { get; }

    DbSet<Message> Messages { get; }

    DbSet<MessageAttachment> MessageAttachments { get; }

    DbSet<ConversationReport> ConversationReports { get; }

    DbSet<Request> Requests { get; }

    DbSet<RequestTransition> RequestTransitions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
