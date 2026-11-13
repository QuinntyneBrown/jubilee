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
    /// <summary>
    /// A free slug for <paramref name="name"/> by the rules of <see cref="AddressRules"/>; the slugs
    /// <paramref name="listingId"/> has or had stay free for it. A reserved word is taken (L2-242 AC4).
    /// </summary>
    public static async Task<string> UniqueAsync(
        IAppDbContext db, AddressSettings settings, string name, ListingKind kind, Guid? listingId, CancellationToken cancellationToken)
    {
        var (baseSlug, numbered) = AddressRules.SlugOf(name, kind);

        // A suffix may cut the base (L2-241 AC4), so every slug that shares its first 30 characters is read.
        var stem = baseSlug.Length > 30 ? baseSlug[..30] : baseSlug;
        var current = await db.Listings.AsNoTracking()
            .Where(l => l.Id != listingId && l.Slug.StartsWith(stem))
            .Select(l => l.Slug)
            .ToListAsync(cancellationToken);
        var kept = await db.ListingSlugs.AsNoTracking()
            .Where(s => s.ListingId != listingId && s.Slug.StartsWith(stem))
            .Select(s => s.Slug)
            .ToListAsync(cancellationToken);
        var taken = current.Concat(kept).ToHashSet(StringComparer.OrdinalIgnoreCase);
        bool Free(string candidate) => !taken.Contains(candidate) && !settings.IsReserved(candidate);
        if (!numbered && Free(baseSlug))
        {
            return baseSlug;
        }

        for (var n = numbered ? 1 : 2; ; n++)
        {
            var candidate = AddressRules.WithNumber(baseSlug, n);
            if (Free(candidate))
            {
                return candidate;
            }
        }
    }

    /// <summary>
    /// Moves <paramref name="listing"/> to the slug of its name when that changed: the old slug is kept, and a kept
    /// slug of this listing that it takes back is no longer kept.
    /// </summary>
    public static async Task FollowNameAsync(
        IAppDbContext db, AddressSettings settings, Listing listing, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var slug = await UniqueAsync(db, settings, listing.Name, listing.Kind, listing.Id, cancellationToken);
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

    /// <summary>
    /// The current slug of the public listing that had <paramref name="slug"/>, or null: when it was never kept, and
    /// when its listing is not public, so an address never names a hidden listing (L2-243 AC4, L2-245 AC2).
    /// </summary>
    public static Task<string?> CurrentPublicOfAsync(IAppDbContext db, string slug, CancellationToken cancellationToken) =>
        db.ListingSlugs.AsNoTracking()
            .Where(s => s.Slug == slug)
            .Join(db.Listings.AsNoTracking().WherePublic(), s => s.ListingId, l => l.Id, (s, l) => l.Slug)
            .SingleOrDefaultAsync(cancellationToken);
}

/// <summary>The current slug of the listing that had <paramref name="Slug"/>, or null (L2-113 AC2).</summary>
public sealed record FindCurrentSlugQuery(string Slug) : MediatR.IRequest<string?>;

public sealed class FindCurrentSlugQueryHandler(IAppDbContext db) : MediatR.IRequestHandler<FindCurrentSlugQuery, string?>
{
    public Task<string?> Handle(FindCurrentSlugQuery request, CancellationToken cancellationToken) =>
        ListingSlugs.CurrentOfAsync(db, request.Slug, cancellationToken);
}

/// <summary>
/// Gives every listing whose slug breaks the address rules (not a well-formed label, or a reserved word) a slug that
/// keeps them, and keeps the old one so it redirects (L2-241 AC5, ADR 0067). <c>jubilee migrate</c> sends it; a
/// second run changes nothing. The answer is the number of listings realigned.
/// </summary>
public sealed record RealignListingSlugsCommand : MediatR.IRequest<int>;

public sealed class RealignListingSlugsCommandHandler(IAppDbContext db, AddressSettings settings, TimeProvider clock)
    : MediatR.IRequestHandler<RealignListingSlugsCommand, int>
{
    public async Task<int> Handle(RealignListingSlugsCommand request, CancellationToken cancellationToken)
    {
        var broken = (await db.Listings.ToListAsync(cancellationToken))
            .Where(l => !AddressRules.IsWellFormed(l.Slug) || settings.IsReserved(l.Slug))
            .OrderBy(l => l.Slug, StringComparer.Ordinal)
            .ToList();
        var realigned = 0;
        foreach (var listing in broken)
        {
            var before = listing.Slug;
            await ListingSlugs.FollowNameAsync(db, settings, listing, clock.GetUtcNow(), cancellationToken);
            if (listing.Slug != before)
            {
                realigned++;
            }

            // Saved one by one, so the next listing sees the slug this one took.
            await db.SaveChangesAsync(cancellationToken);
        }

        return realigned;
    }
}
