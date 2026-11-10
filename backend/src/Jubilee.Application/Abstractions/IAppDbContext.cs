using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<Listing> Listings { get; }

    DbSet<Product> Products { get; }

    DbSet<FeaturedSlot> FeaturedSlots { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
