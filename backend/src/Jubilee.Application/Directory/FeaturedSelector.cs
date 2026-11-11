using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Directory;

/// <summary>
/// Chooses the "Featured this week" businesses (L2-106, L2-021 AC7): the public listings of the
/// featured slots that are current in Toronto, in slot order, skipping any listing that is no
/// longer public. When no slot is current, the most recently verified public listings.
/// </summary>
public sealed class FeaturedSelector(IAppDbContext db)
{
    public async Task<IReadOnlyList<Listing>> SelectAsync(DateTimeOffset now, int limit, CancellationToken cancellationToken)
    {
        var today = TorontoClock.Today(now);
        var earliestStart = today.AddDays(1 - FeaturedSlot.DurationDays);
        var currentSlots = db.FeaturedSlots.Where(s => s.StartsOn <= today && s.StartsOn >= earliestStart);
        var publicListings = db.Listings.AsNoTracking().WherePublic();

        if (!await currentSlots.AnyAsync(cancellationToken))
        {
            return await publicListings
                .WhereBusiness()
                .OrderByDescending(l => l.ApprovedAt)
                .ThenBy(l => l.SortName)
                .Take(limit)
                .ToListAsync(cancellationToken);
        }

        return await currentSlots
            .Join(publicListings, slot => slot.ListingId, listing => listing.Id, (slot, listing) => new { slot, listing })
            .OrderBy(x => x.slot.Position)
            .ThenByDescending(x => x.slot.StartsOn)
            .Select(x => x.listing)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }
}
