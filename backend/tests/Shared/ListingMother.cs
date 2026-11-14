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

    /// <summary>A live software platform in "Software platforms" (L2-248), with the founder's words and its web address.</summary>
    public static Listing Platform(
        string slug,
        string? name = null,
        string website = "https://lanternread.example",
        DateTimeOffset? approvedAt = null,
        string? does = null,
        string? @for = null,
        string? tagline = null)
    {
        var listing = Public(slug, Category.PlatformsSlug, name, approvedAt, default, default, highlight: null, tagline: tagline);
        listing.DescribePlatform(
            PlatformDetails.Create(does ?? "Families log the books their children read.", @for ?? "Families with children aged 4 to 12.", "Free for families."),
            website);
        return listing;
    }

    public const string NonprofitMission = "We share meals, beds and friendship with men leaving the shelter system.";
    public const string NonprofitServes = "Men aged 18 and over leaving shelters downtown.";
    public const string NonprofitArea = "Moss Park and Regent Park";

    /// <summary>A live non-profit in "Non-profits" (L2-285), with its own words, its website and its page for giving.</summary>
    public static Listing Nonprofit(
        string slug,
        string? name = null,
        string website = "https://hopehouse.example",
        string? giveUrl = "https://hopehouse.example/give",
        DateTimeOffset? approvedAt = null,
        string? mission = null,
        string? serves = null,
        string? area = null,
        string? tagline = null)
    {
        var listing = Public(slug, Category.NonprofitsSlug, name, approvedAt, default, default, highlight: null, tagline: tagline);
        listing.DescribeNonprofit(
            NonprofitDetails.Create(mission ?? NonprofitMission, serves ?? NonprofitServes, area ?? NonprofitArea, giveUrl),
            website);
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
