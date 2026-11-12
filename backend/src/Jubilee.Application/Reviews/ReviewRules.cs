using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Reviews;

/// <summary>The words the API uses for who may write a review (L2-225, L2-237 AC1).</summary>
public static class ReviewWriting
{
    public const string SignIn = "sign-in";
    public const string Eligible = "eligible";
    public const string NotEligible = "not-eligible";
    public const string Written = "written";
    public const string Owner = "owner";
}

/// <summary>The rules every review handler shares (ADR 0058).</summary>
public static class ReviewRules
{
    public const string NotFoundCode = "listing_not_found";

    /// <summary>The listing whose reviews are asked for, as the caller may see it: public, or theirs or the team's to preview (L2-225 AC7).</summary>
    public static async Task<Listing> ListingAsync(IAppDbContext db, string slug, Viewer viewer, CancellationToken cancellationToken)
    {
        slug = slug.Trim().ToLowerInvariant();
        var listing = await db.Listings.AsNoTracking().SingleOrDefaultAsync(l => l.Slug == slug && l.DeletedAt == null, cancellationToken);
        if (listing is null || !(listing.IsPublic() || (viewer.Subject is { } subject && listing.OwnerId == subject) || viewer.IsVerifier))
        {
            throw new NotFoundException(NotFoundCode, "There is no such business.");
        }

        return listing;
    }

    /// <summary>A request the owner confirmed or completed makes a member eligible (L2-225 AC1).</summary>
    public static Task<bool> HasConfirmedRequestAsync(IAppDbContext db, Guid listingId, string subject, CancellationToken cancellationToken) =>
        db.Requests.AsNoTracking().AnyAsync(
            r => r.ListingId == listingId && r.MemberSubject == subject && (r.Status == RequestStatus.Confirmed || r.Status == RequestStatus.Completed),
            cancellationToken);

    /// <summary>The member's review of the listing that is shown, if they have one (L2-225 AC5).</summary>
    public static Task<Review?> OwnReviewAsync(IAppDbContext db, Guid listingId, string subject, CancellationToken cancellationToken) =>
        db.Reviews.SingleOrDefaultAsync(r => r.ListingId == listingId && r.AuthorSubject == subject && r.TakenDownAt == null, cancellationToken);

    public static async Task<string> WritingAsync(IAppDbContext db, Listing listing, Viewer viewer, CancellationToken cancellationToken)
    {
        if (viewer.Subject is not { } subject)
        {
            return ReviewWriting.SignIn;
        }

        if (listing.OwnerId == subject)
        {
            return ReviewWriting.Owner;
        }

        if (await OwnReviewAsync(db, listing.Id, subject, cancellationToken) is not null)
        {
            return ReviewWriting.Written;
        }

        return await HasConfirmedRequestAsync(db, listing.Id, subject, cancellationToken) ? ReviewWriting.Eligible : ReviewWriting.NotEligible;
    }

    /// <summary>Who the reply is from: the owner's name without credentials, or the listing's name (L2-228 AC5).</summary>
    public static string ReplyFrom(Listing listing) =>
        listing.Kind == ListingKind.Space || string.IsNullOrWhiteSpace(listing.OwnerName)
            ? listing.Kind == ListingKind.Space && !string.IsNullOrWhiteSpace(listing.OwnerName) ? listing.OwnerName.Trim() : listing.Name
            : listing.OwnerName.Split(',')[0].Trim();

    /// <summary>
    /// Recounts the stars of the review's listing and of the products it is or was about (L2-237 AC9), before the
    /// caller saves, so the counts are written in the same transaction as the change. <paramref name="changed"/> is
    /// the review as it will be stored; <paramref name="gone"/> says it is being deleted.
    /// </summary>
    public static async Task RecountAsync(IAppDbContext db, Review changed, bool gone, Guid? productBefore, CancellationToken cancellationToken)
    {
        var stored = await db.Reviews.AsNoTracking()
            .Where(r => r.ListingId == changed.ListingId && r.TakenDownAt == null && r.Id != changed.Id)
            .Select(r => new { r.Rating, r.ProductId })
            .ToListAsync(cancellationToken);
        var ratings = stored.Select(s => (s.Rating, s.ProductId)).ToList();
        if (!gone && changed.IsShown)
        {
            ratings.Add((changed.Rating, changed.ProductId));
        }

        var listing = await db.Listings.SingleAsync(l => l.Id == changed.ListingId, cancellationToken);
        listing.CountStars(StarCounts.Of(ratings.Select(r => r.Rating)));
        foreach (var id in new[] { changed.ProductId, productBefore }.OfType<Guid>().Distinct())
        {
            var product = await db.Products.SingleOrDefaultAsync(p => p.Id == id, cancellationToken);
            product?.CountStars(StarCounts.Of(ratings.Where(r => r.ProductId == id).Select(r => r.Rating)));
        }
    }
}
