using System.Linq.Expressions;

namespace Jubilee.Domain;

/// <summary>
/// The one definition of "verified": approved by the verification team and currently live
/// (L2-111). EF Core translates <see cref="Criteria"/>; <see cref="Listing.IsVerified"/> runs the
/// same expression in memory.
/// </summary>
public static class VerifiedListingSpecification
{
    public static readonly Expression<Func<Listing, bool>> Criteria =
        listing => listing.Stage == ListingStage.Live && listing.ApprovedAt != null;

    private static readonly Func<Listing, bool> Compiled = Criteria.Compile();

    public static bool IsSatisfiedBy(Listing listing) => Compiled(listing);
}

/// <summary>
/// The one definition of a public listing: verified, not paused, not deleted and not under a
/// moderation hold (L2-028). Every public list and count applies it.
/// </summary>
public static class PublicListingFilter
{
    public static readonly Expression<Func<Listing, bool>> Criteria =
        listing => listing.Stage == ListingStage.Live
            && listing.ApprovedAt != null
            && !listing.IsPaused
            && listing.DeletedAt == null
            && !listing.IsUnderModerationHold;

    private static readonly Func<Listing, bool> Compiled = Criteria.Compile();

    public static bool IsSatisfiedBy(Listing listing) => Compiled(listing);

    public static IQueryable<Listing> WherePublic(this IQueryable<Listing> listings) => listings.Where(Criteria);

    /// <summary>Businesses only: services and shops, never a space (L2-192 AC6).</summary>
    public static IQueryable<Listing> WhereBusiness(this IQueryable<Listing> listings) =>
        listings.Where(l => l.CategorySlug != Category.RoomsSlug);

    /// <summary>Spaces only: the listings in "Rooms & rentals" (L2-188 AC3).</summary>
    public static IQueryable<Listing> WhereSpace(this IQueryable<Listing> listings) =>
        listings.Where(l => l.CategorySlug == Category.RoomsSlug);
}
