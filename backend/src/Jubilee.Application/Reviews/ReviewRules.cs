using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Reviews;

/// <summary>The words the API uses for who may write a review (L2-226, L2-238 AC1).</summary>
public static class ReviewWriting
{
    public const string SignIn = "sign-in";
    public const string Eligible = "eligible";
    public const string NotEligible = "not-eligible";
    public const string Written = "written";
    public const string Owner = "owner";
}

/// <summary>The rules every review handler shares (ADR 0066).</summary>
public static class ReviewRules
{
    public const string NotFoundCode = "listing_not_found";
    public const string NotEligibleCode = "NOT_ELIGIBLE";
    public const string OwnListingCode = "OWN_LISTING";
    public const string AlreadyReviewedCode = "ALREADY_REVIEWED";

    /// <summary>The listing whose reviews are asked for, as the caller may see it: public, or theirs or the team's to preview (L2-226 AC7).</summary>
    public static async Task<Listing> ListingAsync(IAppDbContext db, string slug, Viewer viewer, CancellationToken cancellationToken)
    {
        slug = slug.Trim().ToLowerInvariant();
        var listing = await db.Listings.AsNoTracking().SingleOrDefaultAsync(l => l.Slug == slug && l.DeletedAt == null, cancellationToken);
        if (listing is null || !(listing.IsPublic() || (viewer.Subject is { } subject && listing.OwnerId == subject) || viewer.IsModerator))
        {
            throw new NotFoundException(NotFoundCode, "There is no such business.");
        }

        return listing;
    }

    /// <summary>A request the owner confirmed or completed makes a member eligible (L2-226 AC1).</summary>
    public static Task<bool> HasConfirmedRequestAsync(IAppDbContext db, Guid listingId, string subject, CancellationToken cancellationToken) =>
        db.Requests.AsNoTracking().AnyAsync(
            r => r.ListingId == listingId && r.MemberSubject == subject && (r.Status == RequestStatus.Confirmed || r.Status == RequestStatus.Completed),
            cancellationToken);

    /// <summary>The member's review of the listing that is shown, if they have one (L2-226 AC5).</summary>
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

    /// <summary>Refuses the owner, a member with no confirmed request and a member who has a review shown (L2-226 AC2, AC4, AC5).</summary>
    public static async Task EnsureMayWriteAsync(IAppDbContext db, Listing listing, string subject, CancellationToken cancellationToken)
    {
        switch (await WritingAsync(db, listing, new Viewer(subject, false), cancellationToken))
        {
            case ReviewWriting.Owner:
                throw new ForbiddenException(OwnListingCode, "You can't review your own business.");
            case ReviewWriting.Written:
                throw new ConflictException(AlreadyReviewedCode, "You have already reviewed this business.");
            case ReviewWriting.NotEligible:
                throw new ForbiddenException(NotEligibleCode, "You can review a business after it confirms a request of yours.");
        }
    }

    /// <summary>The rating and the trimmed text, or HTTP 422 with a code per field (L2-238 AC4).</summary>
    public static string Validate(int? rating, string? text, bool itemUnknown)
    {
        var errors = new Dictionary<string, string>();
        if (!Review.IsRating(rating))
        {
            errors["rating"] = "RATING_REQUIRED";
        }

        if (itemUnknown)
        {
            errors["itemId"] = "ITEM_UNKNOWN";
        }

        var trimmed = text?.Trim() ?? string.Empty;
        if (trimmed.Length < Review.MinTextLength)
        {
            errors["text"] = "TOO_SHORT";
        }
        else if (trimmed.Length > Review.MaxTextLength)
        {
            errors["text"] = "TOO_LONG";
        }

        return errors.Count > 0 ? throw new ValidationFailedException(errors) : trimmed;
    }

    /// <summary>Who the reply is from: the owner's name without credentials, or the listing's name (L2-229 AC5).</summary>
    public static string ReplyFrom(Listing listing) =>
        listing.Kind == ListingKind.Space || string.IsNullOrWhiteSpace(listing.OwnerName)
            ? listing.Kind == ListingKind.Space && !string.IsNullOrWhiteSpace(listing.OwnerName) ? listing.OwnerName.Trim() : listing.Name
            : listing.OwnerName.Split(',')[0].Trim();

    /// <summary>
    /// Recounts the stars of the review's listing and of the products it is or was about (L2-238 AC9), before the
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
