using Jubilee.Application.Abstractions;
using Jubilee.Application.Directory;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Listings;

/// <summary>The listing page at <c>/b/:slug</c>, as <paramref name="Viewer"/> may see it.</summary>
public sealed record GetListingPageQuery(string Slug, Viewer Viewer) : IRequest<ListingPageDto>;

public sealed class GetListingPageQueryHandler(IAppDbContext db, IDirectoryReadCache cache)
    : IRequestHandler<GetListingPageQuery, ListingPageDto>
{
    public const string NotFoundCode = "listing_not_found";

    /// <summary>"More in {category}" shows at most this many other businesses (L2-040).</summary>
    public const int RelatedCount = 2;

    /// <summary>"More rooms & rentals" shows at most this many other spaces (L2-205 AC1).</summary>
    public const int RelatedSpaceCount = 4;

    /// <summary>A shop page lists at most this many products; the count covers them all (L2-153 AC3).</summary>
    public const int MaxProducts = 50;

    public async Task<ListingPageDto> Handle(GetListingPageQuery request, CancellationToken cancellationToken)
    {
        var slug = request.Slug.Trim().ToLowerInvariant();
        var viewer = request.Viewer;

        // The owner and the Jubilee team see the listing whatever its stage, uncached, as a
        // preview with its status (L2-219); the relation comes from the session, never from the
        // client (L2-133). A deleted listing has nothing to preview.
        if (viewer.Subject is { } subject)
        {
            var ownerId = await db.Listings.AsNoTracking()
                .Where(l => l.Slug == slug && l.DeletedAt == null)
                .Select(l => l.OwnerId)
                .SingleOrDefaultAsync(cancellationToken);
            var relation = ownerId == subject ? ViewerRelation.Owner
                : viewer.IsModerator ? ViewerRelation.Moderator
                : ViewerRelation.Member;
            if (relation != ViewerRelation.Member)
            {
                var listing = await db.Listings.AsNoTracking().SingleOrDefaultAsync(l => l.Slug == slug && l.DeletedAt == null, cancellationToken)
                    ?? throw NotFound();
                return await BuildAsync(listing, cancellationToken) with { ViewerRelation = Wire(relation) };
            }
        }

        // The public page is the same for every visitor and member, so it is cached; only the
        // viewer relation is the caller's own.
        var page = await cache.GetOrCreateAsync<ListingPageDto>(
            $"listing|{slug}",
            ct => BuildPublicAsync(slug, ct),
            cancellationToken);
        page = page with { ViewerRelation = Wire(request.Viewer.SignedIn ? ViewerRelation.Member : ViewerRelation.Visitor) };

        // The member's own open space request is theirs alone, so it is added after the cache (L2-206 AC9).
        if (page.Space is not null && viewer.Subject is { } member)
        {
            var listingId = await db.Listings.AsNoTracking().Where(l => l.Slug == slug).Select(l => l.Id).SingleAsync(cancellationToken);
            var open = await db.Requests.AsNoTracking()
                .Where(r => r.ListingId == listingId && r.MemberSubject == member && r.Kind == RequestKind.Space
                    && (r.Status == RequestStatus.New || r.Status == RequestStatus.Confirmed))
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => (Guid?)r.Id)
                .FirstOrDefaultAsync(cancellationToken);
            page = page with { OpenRequestId = open };
        }

        return page;
    }

    private async Task<ListingPageDto> BuildPublicAsync(string slug, CancellationToken cancellationToken)
    {
        var listing = await db.Listings.AsNoTracking().WherePublic().SingleOrDefaultAsync(l => l.Slug == slug, cancellationToken)
            ?? throw NotFound();
        return await BuildAsync(listing, cancellationToken);
    }

    private async Task<ListingPageDto> BuildAsync(Listing listing, CancellationToken cancellationToken)
    {
        var category = Category.Find(listing.CategorySlug)!;

        var services = await db.Services.AsNoTracking()
            .Where(s => s.ListingId == listing.Id)
            .OrderBy(s => s.Position)
            .ToListAsync(cancellationToken);

        var shopProducts = db.Products.AsNoTracking().Where(p => p.ListingId == listing.Id && !p.IsDeleted);
        var productCount = await shopProducts.CountAsync(cancellationToken);
        var products = await shopProducts
            .OrderBy(p => p.Position)
            .ThenByDescending(p => p.CreatedAt)
            .ThenBy(p => p.Slug)
            .Take(MaxProducts)
            .ToListAsync(cancellationToken);

        var others = db.Listings.AsNoTracking().WherePublic().Where(l => l.CategorySlug == category.Slug && l.Id != listing.Id);
        var isSpace = listing.Kind == ListingKind.Space;
        var related = isSpace
            ? []
            : await ListingSortPolicy.Apply(others, ListingSort.Recommended).Take(RelatedCount).ToListAsync(cancellationToken);
        var relatedSpaces = isSpace
            ? await others.OrderByDescending(l => l.PublishedAt).ThenBy(l => l.SortName).Take(RelatedSpaceCount).ToListAsync(cancellationToken)
            : [];

        var fast = await Requests.ResponseTimes.FastListings(db, cancellationToken);
        var photos = (await db.ListingPhotos.AsNoTracking().Where(p => p.ListingId == listing.Id).ToListAsync(cancellationToken))
            .OrderBy(p => p.Position)
            .Select((p, i) => new ListingPagePhotoDto(p.Key, p.Alt ?? $"{listing.Name} photo {i + 1}", p.Width, p.Height))
            .ToList();
        return new ListingPageDto(
            listing.Slug,
            WireValues.Of(listing.Kind),
            listing.Name,
            CategoryLinkDto.From(category),
            WireValues.Of(listing.Stage),
            ListingStatus.Of(listing),
            Wire(ViewerRelation.Visitor),
            listing.OwnerName,
            listing.Tagline,
            listing.Credentials,
            listing.Highlight,
            listing.About,
            CoverPhoto: null, // Not read: the page shows Photos, or the category tile when there are none (L2-088 AC6, L2-221).
            new ListingDetailsDto(
                listing.Where,
                listing.Hours,
                listing.Languages,
                listing.Delivery,
                listing.MadeToOrder,
                listing.CreatedAt,
                WireValues.Of(listing.ReplyTimeBand)),
            [.. services.Select(ServiceRowDto.From)],
            productCount,
            [.. products.Select(p => ProductCardDto.From(p, listing))],
            [.. related.Select(l => BusinessCardDto.From(l, fast))],
            SpacePageDto.From(listing),
            [.. relatedSpaces.Where(l => l.Space is not null).Select(SpaceCardDto.From)],
            RepliesFast: !isSpace && fast.Contains(listing.Id))
        {
            Photos = photos,
        };
    }

    private static string Wire(ViewerRelation relation) => relation.ToString().ToLowerInvariant();

    private static NotFoundException NotFound() => new(NotFoundCode, "There is no such business.");
}
