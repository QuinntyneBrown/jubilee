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

    DbSet<MemberSession> Sessions { get; }

    DbSet<SignInFailure> SignInFailures { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
