using Jubilee.Domain;

namespace Jubilee.Application.Tests;

public class SortNameTests
{
    // L2-025 AC1: Name A–Z ignores case, accents and a leading "The".
    [Theory]
    [InlineData("Legacy Financial", "legacy financial")]
    [InlineData("FAITH TV", "faith tv")]
    [InlineData("Café Élan", "cafe elan")]
    [InlineData("The Scott Mission", "scott mission")]
    [InlineData("THE Revelation Centre", "revelation centre")]
    [InlineData("  The  Padded Name ", "padded name")]
    [InlineData("Theology Books", "theology books")]
    [InlineData("The", "the")]
    public void L2_025_AC1_sort_name_folds_case_strips_accents_and_a_leading_the(string name, string expected)
    {
        Assert.Equal(expected, SortName.From(name));
    }
}

public class PageWindowTests
{
    // L2-026 AC3
    [Theory]
    [InlineData(0, 312, 1)]
    [InlineData(-5, 312, 1)]
    [InlineData(1, 312, 1)]
    [InlineData(20, 312, 20)]
    [InlineData(21, 312, 20)]
    [InlineData(int.MaxValue, 312, 20)]
    [InlineData(2, 16, 1)]
    [InlineData(2, 17, 2)]
    [InlineData(7, 0, 1)]
    public void L2_026_AC3_page_is_clamped_to_the_nearest_valid_page(int requested, int total, int expected)
    {
        Assert.Equal(expected, PageWindow.Clamp(requested, total).Page);
    }

    [Fact]
    public void L2_026_AC1_pages_hold_sixteen_businesses()
    {
        var window = PageWindow.Clamp(2, 312);

        Assert.Equal(16, PageWindow.PageSize);
        Assert.Equal(20, window.PageCount);
        Assert.Equal(16, window.Skip);
    }

    [Fact]
    public void An_empty_result_has_one_page()
    {
        Assert.Equal(1, PageWindow.Clamp(1, 0).PageCount);
    }

    [Theory]
    [InlineData(null, 1)]
    [InlineData("", 1)]
    [InlineData("abc", 1)]
    [InlineData("2", 2)]
    [InlineData("-3", -3)]
    [InlineData("99999999999999999999", int.MaxValue)]
    [InlineData("2.5", 1)]
    public void L2_026_AC3_a_page_parameter_that_is_not_a_number_means_the_first_page(string? raw, int expected)
    {
        Assert.Equal(expected, PageWindow.ParseRequestedPage(raw));
    }
}

public class RecommendedScoreTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 15, 0, 0, TimeSpan.Zero);

    [Fact]
    public void L2_025_AC3_a_complete_fast_just_approved_listing_scores_one()
    {
        var score = RecommendedScore.Compute(
            "tagline", "highlight", OfferFilter.FreeQuote, AreaServed.Downtown, medianResponseMinutes: 0, Now, Now);

        Assert.Equal(1.0, score, 6);
    }

    [Fact]
    public void L2_025_AC3_an_empty_slow_old_listing_scores_zero()
    {
        var score = RecommendedScore.Compute(
            "", null, OfferFilter.None, AreaServed.None, medianResponseMinutes: 5000, Now.AddDays(-800), Now);

        Assert.Equal(0.0, score, 6);
    }

    [Fact]
    public void L2_025_AC3_unknown_response_time_counts_as_half()
    {
        // completeness 2/4, responsiveness 0.5, recency 0.5 (182.5 days)
        var score = RecommendedScore.Compute(
            "tagline", null, OfferFilter.FreeQuote, AreaServed.None, null, Now.AddDays(-182.5), Now);

        Assert.Equal((0.5 * 0.5) + (0.3 * 0.5) + (0.2 * 0.5), score, 6);
    }

    [Fact]
    public void L2_025_AC3_a_twelve_hour_median_response_counts_as_half()
    {
        var score = RecommendedScore.Compute("t", "h", OfferFilter.FreeQuote, AreaServed.Downtown, 720, Now, Now);

        Assert.Equal(0.5 + 0.15 + 0.2, score, 6);
    }

    [Fact]
    public void L2_025_AC3_a_newer_approval_outranks_an_older_one_all_else_equal()
    {
        var older = ApprovedListing(Now.AddDays(-30));
        var newer = ApprovedListing(Now.AddDays(-2));

        Assert.True(newer.RecommendedScore > older.RecommendedScore);
    }

    [Fact]
    public void Approving_a_listing_refreshes_its_score()
    {
        var listing = Listing.Create("a", "A", "tagline", "shops", Now.AddDays(-10));
        Assert.Equal(0, listing.RecommendedScore);

        listing.Approve("verifier", Now);

        Assert.True(listing.RecommendedScore > 0);
    }

    private static Listing ApprovedListing(DateTimeOffset approvedAt)
    {
        var listing = Listing.Create("a", "A", "tagline", "shops", approvedAt);
        listing.Approve("verifier", approvedAt);
        listing.RefreshRecommendedScore(Now);
        return listing;
    }
}

public class CategoryFilterSetTests
{
    [Fact]
    public void L2_024_AC6_values_outside_the_allowed_set_are_dropped()
    {
        var filters = CategoryFilterSet.Parse("free-quote,cheap,<script>,EMERGENCY-CALLS", "mars,east-york,,  ");

        Assert.Equal([OfferFilter.FreeQuote, OfferFilter.EmergencyCalls], filters.Offers);
        Assert.Equal([AreaServed.EastYork], filters.Areas);
    }

    [Fact]
    public void L2_024_AC5_values_keep_request_order_without_repeats()
    {
        var filters = CategoryFilterSet.Parse("open-saturdays,free-quote,open-saturdays", "downtown, scarborough");

        Assert.Equal(["open-saturdays", "free-quote"], filters.OfferValues);
        Assert.Equal(["downtown", "scarborough"], filters.AreaValues);
    }

    [Fact]
    public void Nothing_requested_is_an_empty_set()
    {
        Assert.True(CategoryFilterSet.Parse(null, null).IsEmpty);
        Assert.True(CategoryFilterSet.Parse("nope", "").IsEmpty);
        Assert.False(CategoryFilterSet.Parse("free-quote", null).IsEmpty);
    }

    [Fact]
    public void L2_024_AC3_any_value_within_a_group_and_every_group_must_match()
    {
        var filters = CategoryFilterSet.Parse("free-quote,emergency-calls", "east-york");
        var listings = new[]
        {
            Listing("both-groups", OfferFilter.EmergencyCalls, AreaServed.EastYork | AreaServed.Downtown),
            Listing("offer-only", OfferFilter.FreeQuote, AreaServed.Scarborough),
            Listing("area-only", OfferFilter.OpenSaturdays, AreaServed.EastYork),
        };

        var matched = filters.Apply(listings.AsQueryable()).Select(l => l.Slug).ToArray();

        Assert.Equal(["both-groups"], matched);
    }

    [Fact]
    public void L2_024_AC4_removing_one_filter_gives_the_nearby_combination()
    {
        var filters = CategoryFilterSet.Parse("emergency-calls,open-saturdays", "scarborough");

        var nearby = filters.WithoutOneFilter().ToArray();

        Assert.Equal(3, nearby.Length);
        Assert.Equal(("offers", "emergency-calls"), (nearby[0].Group, nearby[0].Value));
        Assert.Equal(["open-saturdays"], nearby[0].Remaining.OfferValues);
        Assert.Equal(("areas", "scarborough"), (nearby[2].Group, nearby[2].Value));
        Assert.Empty(nearby[2].Remaining.AreaValues);
        Assert.Equal(["emergency-calls", "open-saturdays"], nearby[2].Remaining.OfferValues);
    }

    private static Listing Listing(string slug, OfferFilter offers, AreaServed areas)
    {
        var listing = Domain.Listing.Create(slug, slug, "tagline", "home-property", DateTimeOffset.UnixEpoch);
        listing.SetOffers(offers);
        listing.SetAreasServed(areas);
        return listing;
    }
}

public class ListingSortTests
{
    [Theory]
    [InlineData("recommended", ListingSort.Recommended)]
    [InlineData("newest", ListingSort.Newest)]
    [InlineData("name", ListingSort.NameAscending)]
    [InlineData("NAME", ListingSort.NameAscending)]
    [InlineData("price", ListingSort.Recommended)]
    [InlineData(null, ListingSort.Recommended)]
    public void L2_025_an_unknown_sort_falls_back_to_recommended(string? raw, ListingSort expected)
    {
        Assert.Equal(expected, ListingSortPolicy.Parse(raw));
    }
}

public class VerifiedMarkTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 15, 0, 0, TimeSpan.Zero);

    // L2-111 AC1: only an approved listing that is currently live carries the mark.
    [Theory]
    [InlineData(ListingStage.Draft)]
    [InlineData(ListingStage.ReadyToReview)]
    [InlineData(ListingStage.ChangesRequested)]
    public void L2_111_AC1_a_listing_that_is_not_live_is_never_verified(ListingStage stage)
    {
        var neverApproved = Listing.Create("a", "A", "t", "shops", Now);
        neverApproved.MoveTo(stage);
        var approvedThenMoved = Listing.Create("b", "B", "t", "shops", Now);
        approvedThenMoved.Approve("verifier", Now);
        approvedThenMoved.MoveTo(stage);

        Assert.False(neverApproved.IsVerified);
        Assert.False(approvedThenMoved.IsVerified);
        Assert.False(approvedThenMoved.IsPublic());
    }

    [Fact]
    public void L2_111_AC1_an_approved_live_listing_is_verified()
    {
        var listing = Listing.Create("a", "A", "t", "shops", Now);

        listing.Approve("Miriam Castillo", Now);

        Assert.Equal(ListingStage.Live, listing.Stage);
        Assert.Equal(Now, listing.ApprovedAt);
        Assert.Equal("Miriam Castillo", listing.ApprovedBy);
        Assert.True(listing.IsVerified);
        Assert.True(listing.IsPublic());
    }

    [Fact]
    public void L2_111_AC1_a_listing_cannot_be_made_live_without_approval()
    {
        var listing = Listing.Create("a", "A", "t", "shops", Now);

        Assert.Throws<InvalidOperationException>(() => listing.MoveTo(ListingStage.Live));
        Assert.False(listing.IsVerified);
    }

    [Fact]
    public void L2_028_a_paused_deleted_or_held_listing_stays_verified_but_is_not_public()
    {
        var paused = Approved();
        paused.Pause();
        var deleted = Approved();
        deleted.Delete(Now);
        var held = Approved();
        held.PlaceModerationHold();

        Assert.All([paused, deleted, held], l => Assert.False(l.IsPublic()));

        paused.Resume();
        held.LiftModerationHold();
        Assert.True(paused.IsPublic());
        Assert.True(held.IsPublic());
    }

    private static Listing Approved()
    {
        var listing = Listing.Create("a", "A", "t", "shops", Now);
        listing.Approve("verifier", Now);
        return listing;
    }
}

public class CategoryCatalogueTests
{
    [Fact]
    public void L2_023_AC5_the_ten_categories_are_fixed_and_ordered()
    {
        Assert.Equal(
            [
                ("shops", "Shops"),
                ("financial-insurance", "Financial & insurance"),
                ("legal-immigration", "Legal & immigration"),
                ("home-property", "Home & property"),
                ("real-estate-living", "Real estate & living"),
                ("health-family", "Health & family"),
                ("business-tech", "Business & tech"),
                ("learning", "Learning"),
                ("media", "Media"),
                ("community", "Community"),
            ],
            Category.All.Select(c => (c.Slug, c.Name)));
    }

    [Fact]
    public void L2_023_AC2_an_unknown_slug_is_no_category()
    {
        Assert.Null(Category.Find("pets"));
        Assert.Equal("Home & property", Category.Find("home-property")?.Name);
    }
}
