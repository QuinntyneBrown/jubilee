using System.Globalization;
using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Listings;

/// <summary>
/// The address of a listing (L2-072 AC5, L2-113 AC2, ADR 0056): a slug made from the business name, with a numeric
/// suffix when it is taken. A slug is taken when another listing has it now or had it before.
/// </summary>
public static class ListingSlugs
{
    /// <summary>A free slug for <paramref name="name"/>; the slugs <paramref name="listingId"/> has or had stay free for it.</summary>
    public static async Task<string> UniqueAsync(IAppDbContext db, string name, Guid? listingId, CancellationToken cancellationToken)
    {
        var baseSlug = global::Jubilee.Application.Onboarding.Slugs.From(name, "business");
        var current = await db.Listings.AsNoTracking()
            .Where(l => l.Id != listingId && (l.Slug == baseSlug || l.Slug.StartsWith(baseSlug + "-")))
            .Select(l => l.Slug)
            .ToListAsync(cancellationToken);
        var kept = await db.ListingSlugs.AsNoTracking()
            .Where(s => s.ListingId != listingId && (s.Slug == baseSlug || s.Slug.StartsWith(baseSlug + "-")))
            .Select(s => s.Slug)
            .ToListAsync(cancellationToken);
        var taken = current.Concat(kept).ToHashSet(StringComparer.Ordinal);
        if (!taken.Contains(baseSlug))
        {
            return baseSlug;
        }

        for (var n = 2; ; n++)
        {
            var candidate = $"{baseSlug}-{n.ToString(CultureInfo.InvariantCulture)}";
            if (!taken.Contains(candidate))
            {
                return candidate;
            }
        }
    }

    /// <summary>
    /// Moves <paramref name="listing"/> to the slug of its name when that changed: the old slug is kept, and a kept
    /// slug of this listing that it takes back is no longer kept.
    /// </summary>
    public static async Task FollowNameAsync(IAppDbContext db, Listing listing, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var slug = await UniqueAsync(db, listing.Name, listing.Id, cancellationToken);
        if (slug == listing.Slug)
        {
            return;
        }

        var takenBack = await db.ListingSlugs.SingleOrDefaultAsync(s => s.Slug == slug, cancellationToken);
        if (takenBack is not null)
        {
            db.ListingSlugs.Remove(takenBack);
        }

        db.ListingSlugs.Add(ListingSlug.Keep(listing.Slug, listing.Id, now));
        listing.MoveTo(slug);
    }

    /// <summary>The current slug of the listing that had <paramref name="slug"/>, or null when it was never kept.</summary>
    public static Task<string?> CurrentOfAsync(IAppDbContext db, string slug, CancellationToken cancellationToken)
    {
        var wanted = slug.Trim().ToLowerInvariant();
        return db.ListingSlugs.AsNoTracking()
            .Where(s => s.Slug == wanted)
            .Join(db.Listings.AsNoTracking().Where(l => l.DeletedAt == null), s => s.ListingId, l => l.Id, (s, l) => l.Slug)
            .SingleOrDefaultAsync(cancellationToken);
    }
}

/// <summary>The current slug of the listing that had <paramref name="Slug"/>, or null (L2-113 AC2).</summary>
public sealed record FindCurrentSlugQuery(string Slug) : MediatR.IRequest<string?>;

public sealed class FindCurrentSlugQueryHandler(IAppDbContext db) : MediatR.IRequestHandler<FindCurrentSlugQuery, string?>
{
    public Task<string?> Handle(FindCurrentSlugQuery request, CancellationToken cancellationToken) =>
        ListingSlugs.CurrentOfAsync(db, request.Slug, cancellationToken);
}
