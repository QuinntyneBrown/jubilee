using Jubilee.Domain;

namespace Jubilee.Tests.Shared;

/// <summary>Every way a listing can fail to be public (L2-028).</summary>
public enum NonPublicState
{
    Draft,
    Paused,
    Deleted,
    UnderModerationHold,
}

/// <summary>Builds listings for tests through the domain's own methods.</summary>
public static class ListingMother
{
    public static readonly DateTimeOffset Now = new(2026, 11, 10, 15, 0, 0, TimeSpan.Zero);

    public static Listing Public(
        string slug,
        string category = "home-property",
        string? name = null,
        DateTimeOffset? approvedAt = null,
        OfferFilter offers = OfferFilter.FreeQuote,
        AreaServed areas = AreaServed.Downtown,
        string? highlight = "Free quote",
        string? tagline = null)
    {
        var approved = approvedAt ?? Now.AddDays(-1);
        var listing = Listing.Create(slug, name ?? slug, tagline ?? $"Tagline of {slug}", category, approved.AddDays(-7));
        listing.SetHighlight(highlight);
        listing.SetOffers(offers);
        listing.SetAreasServed(areas);
        listing.Publish(approved);
        listing.RefreshRecommendedScore(Now);
        return listing;
    }

    /// <summary>A live space in "Rooms & rentals" (L2-197), approved like any listing.</summary>
    public static Listing Space(
        string slug,
        SpaceTerm term = SpaceTerm.LongTerm,
        int rent = 1850,
        string neighbourhood = "The Annex",
        DateTimeOffset? approvedAt = null,
        string address = "12 Brunswick Ave, Toronto ON M5S 2L7",
        string? name = null,
        string? household = null,
        int? minimumStay = null)
    {
        var listing = Public(slug, Category.RoomsSlug, name, approvedAt, default, default, highlight: null);
        listing.DescribeSpace(SpaceDetails.Create(
            term,
            rent,
            available: "Mar 1",
            minimumStay: minimumStay ?? SpaceTerms.MinimumStayChoices(term)[0],
            neighbourhood,
            address,
            place: "Basement apartment",
            facts: ["1 bedroom", "1 bath", "Separate entrance"],
            included: ["Utilities", "Wi-Fi"],
            household: household ?? (SpaceTerms.AsksForHousehold(term) ? "Ruth and Kwame with our daughter." : null),
            rules: ["No smoking"]));
        return listing;
    }

    public static Listing NonPublic(NonPublicState state, string? slug = null, string category = "home-property")
    {
        slug ??= $"hidden-{state}".ToLowerInvariant();
        switch (state)
        {
            case NonPublicState.Paused:
                var paused = Public(slug, category, offers: OfferFilter.FreeQuote | OfferFilter.EmergencyCalls);
                paused.Pause();
                return paused;
            case NonPublicState.Deleted:
                var deleted = Public(slug, category, offers: OfferFilter.FreeQuote | OfferFilter.EmergencyCalls);
                deleted.Delete(Now);
                return deleted;
            case NonPublicState.UnderModerationHold:
                var held = Public(slug, category, offers: OfferFilter.FreeQuote | OfferFilter.EmergencyCalls);
                held.PlaceModerationHold();
                return held;
            default:
                var listing = Listing.Create(slug, slug, $"Tagline of {slug}", category, Now.AddDays(-3));
                listing.SetOffers(OfferFilter.FreeQuote | OfferFilter.EmergencyCalls);
                listing.SetAreasServed(AreaServed.Downtown);
                listing.MoveTo(Enum.Parse<ListingStage>(state.ToString()));
                return listing;
        }
    }
}
