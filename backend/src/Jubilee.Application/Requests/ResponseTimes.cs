using Jubilee.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Requests;

/// <summary>Reads who carries the "Replies fast" badge (L2-054), as the hourly job last computed it.</summary>
public static class ResponseTimes
{
    /// <summary>The listings whose median first response is under a day over at least 3 responses.</summary>
    public static async Task<IReadOnlySet<Guid>> FastListings(IAppDbContext db, CancellationToken cancellationToken) =>
        (await db.ResponseTimeStats.AsNoTracking().Where(s => s.RepliesFast).Select(s => s.ListingId).ToListAsync(cancellationToken))
        .ToHashSet();
}
