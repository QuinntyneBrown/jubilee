using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public class CategoryListingsTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Url = "/api/categories/home-property/listings";
    private readonly JubileeApiFactory _factory;

    public CategoryListingsTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static Listing Home(
        string slug,
        OfferFilter offers = OfferFilter.FreeQuote,
        AreaServed areas = AreaServed.Downtown,
        int approvedDaysAgo = 1,
        string? name = null) =>
        ListingMother.Public(slug, "home-property", name, ListingMother.Now.AddDays(-approvedDaysAgo), offers, areas);

    [Fact]
    public async Task L2_023_AC1_a_category_page_names_the_category_and_lists_its_business_cards()
    {
        await _factory.Arrange(
            Home("waterworks", OfferFilter.EmergencyCalls, approvedDaysAgo: 1),
            Home("ace", approvedDaysAgo: 2),
            ListingMother.Public("elsewhere", "media"));

        var json = await _factory.GetJson(Url);

        Assert.Equal("home-property", json.GetProperty("category").GetProperty("slug").GetString());
        Assert.Equal("Home & property", json.GetProperty("category").GetProperty("name").GetString());
        Assert.Equal(2, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(2, json.GetProperty("matchCount").GetInt32());
        Assert.Equal("recommended", json.GetProperty("sort").GetString());
        Assert.Equal(1, json.GetProperty("page").GetInt32());
        Assert.Equal(16, json.GetProperty("pageSize").GetInt32());
        Assert.Equal(1, json.GetProperty("pageCount").GetInt32());
        Assert.Equal(["waterworks", "ace"], json.GetProperty("businesses").Slugs());
        Assert.Equal(0, json.GetProperty("filters").GetProperty("offers").GetArrayLength());
        Assert.Equal(0, json.GetProperty("filters").GetProperty("areas").GetArrayLength());
        Assert.Equal(0, json.GetProperty("suggestions").GetArrayLength());

        var card = json.GetProperty("businesses")[0];
        Assert.Equal("Tagline of waterworks", card.GetProperty("tagline").GetString());
        Assert.Equal("Free quote", card.GetProperty("highlight").GetString());
        Assert.Equal("home-property", card.GetProperty("categorySlug").GetString());
        Assert.False(card.TryGetProperty("verified", out _)); // ADR 0057: no listing is called verified
        Assert.Equal(JsonValueKind.Null, card.GetProperty("coverPhoto").ValueKind);
    }

    [Fact]
    public async Task L2_023_AC1_the_category_fact_counts_businesses_taking_emergency_calls_whatever_the_filters()
    {
        await _factory.Arrange(
            Home("a", OfferFilter.EmergencyCalls),
            Home("b", OfferFilter.EmergencyCalls | OfferFilter.FreeQuote),
            Home("c", OfferFilter.EmergencyCalls | OfferFilter.OpenSaturdays),
            Home("d", OfferFilter.FreeQuote));

        var fact = (await _factory.GetJson($"{Url}?offers=free-quote")).GetProperty("fact");

        Assert.Equal("emergency-calls", fact.GetProperty("offer").GetString());
        Assert.Equal(3, fact.GetProperty("count").GetInt32());
    }

    [Fact]
    public async Task L2_023_AC1_a_category_where_no_one_takes_emergency_calls_has_no_fact()
    {
        await _factory.Arrange(Home("a", OfferFilter.FreeQuote));

        var json = await _factory.GetJson(Url);

        Assert.Equal(JsonValueKind.Null, json.GetProperty("fact").ValueKind);
    }

    [Theory]
    [InlineData("/api/categories/pets/listings")]
    [InlineData("/api/categories/pets/listings/count")]
    [InlineData("/api/categories/HOME-PROPERTY/listings")]
    public async Task L2_023_AC2_an_unknown_category_is_not_found(string url)
    {
        var response = await _factory.CreateClient().GetAsync(url);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("category_not_found", json.GetProperty("code").GetString());
        Assert.Equal(404, json.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrEmpty(json.GetProperty("correlationId").GetString()));
        Assert.False(response.Headers.CacheControl?.Public ?? false);
    }

    [Fact]
    public async Task L2_023_AC3_a_category_with_no_live_businesses_is_empty_not_an_error()
    {
        await _factory.Arrange(ListingMother.Public("elsewhere", "media"));

        var json = await _factory.GetJson(Url);

        Assert.Equal(0, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(0, json.GetProperty("matchCount").GetInt32());
        Assert.Equal(0, json.GetProperty("businesses").GetArrayLength());
        Assert.Equal(1, json.GetProperty("page").GetInt32());
        Assert.Equal(1, json.GetProperty("pageCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("fact").ValueKind);
        Assert.Equal(0, json.GetProperty("suggestions").GetArrayLength());
    }

    [Fact]
    public async Task L2_024_AC1_the_emergency_calls_filter_lists_only_businesses_offering_them()
    {
        await _factory.Arrange(
            Home("plumber", OfferFilter.EmergencyCalls | OfferFilter.FreeQuote),
            Home("painter", OfferFilter.FreeQuote),
            Home("cleaner", OfferFilter.OpenSaturdays));

        var json = await _factory.GetJson($"{Url}?offers=emergency-calls");

        Assert.Equal(["plumber"], json.GetProperty("businesses").Slugs());
        Assert.Equal(3, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, json.GetProperty("matchCount").GetInt32());
        Assert.Equal("emergency-calls", json.GetProperty("filters").GetProperty("offers")[0].GetString());
    }

    [Fact]
    public async Task L2_024_AC3_filters_match_any_value_within_a_group_and_every_group()
    {
        await _factory.Arrange(
            Home("quote-east", OfferFilter.FreeQuote, AreaServed.EastYork, 1),
            Home("emergency-scarborough", OfferFilter.EmergencyCalls, AreaServed.Scarborough | AreaServed.Etobicoke, 2),
            Home("quote-downtown", OfferFilter.FreeQuote, AreaServed.Downtown, 3),
            Home("saturdays-east", OfferFilter.OpenSaturdays, AreaServed.EastYork, 4));

        var json = await _factory.GetJson($"{Url}?offers=free-quote,emergency-calls&areas=east-york,scarborough");

        Assert.Equal(["quote-east", "emergency-scarborough"], json.GetProperty("businesses").Slugs());
        Assert.Equal(2, json.GetProperty("matchCount").GetInt32());
    }

    [Fact]
    public async Task L2_024_AC5_the_applied_filters_are_echoed_in_request_order()
    {
        var json = await _factory.GetJson($"{Url}?offers=open-saturdays,free-quote&areas=downtown,east-york&sort=name");

        var filters = json.GetProperty("filters");
        Assert.Equal(["open-saturdays", "free-quote"], filters.GetProperty("offers").EnumerateArray().Select(e => e.GetString()));
        Assert.Equal(["downtown", "east-york"], filters.GetProperty("areas").EnumerateArray().Select(e => e.GetString()));
        Assert.Equal("name", json.GetProperty("sort").GetString());
    }

    [Fact]
    public async Task L2_024_AC6_filter_values_outside_the_allowed_set_are_ignored()
    {
        await _factory.Arrange(Home("a", OfferFilter.FreeQuote), Home("b", OfferFilter.OpenSaturdays));

        var json = await _factory.GetJson($"{Url}?offers=cheapest,%3Cscript%3E,free-quote&areas=mars,%27%20OR%201=1&sort=%00&page=x");

        Assert.Equal(["a"], json.GetProperty("businesses").Slugs());
        Assert.Equal(["free-quote"], json.GetProperty("filters").GetProperty("offers").EnumerateArray().Select(e => e.GetString()));
        Assert.Equal(0, json.GetProperty("filters").GetProperty("areas").GetArrayLength());
        Assert.Equal("recommended", json.GetProperty("sort").GetString());
        Assert.Equal(1, json.GetProperty("page").GetInt32());
    }

    [Fact]
    public async Task L2_024_AC6_only_unknown_filter_values_means_no_filter()
    {
        await _factory.Arrange(Home("a"), Home("b"));

        var json = await _factory.GetJson($"{Url}?offers=nope&areas=nowhere");

        Assert.Equal(2, json.GetProperty("matchCount").GetInt32());
        Assert.Equal(0, json.GetProperty("suggestions").GetArrayLength());
    }

    [Fact]
    public async Task L2_024_AC4_filters_that_match_nothing_come_with_counts_for_each_filter_removed()
    {
        await _factory.Arrange(
            Home("emergency-saturdays-1", OfferFilter.EmergencyCalls | OfferFilter.OpenSaturdays, AreaServed.Downtown),
            Home("emergency-saturdays-2", OfferFilter.EmergencyCalls | OfferFilter.OpenSaturdays, AreaServed.NorthYork),
            Home("emergency-only", OfferFilter.EmergencyCalls, AreaServed.EastYork),
            Home("quote-scarborough", OfferFilter.FreeQuote, AreaServed.Scarborough));

        var json = await _factory.GetJson($"{Url}?offers=emergency-calls,open-saturdays&areas=scarborough");

        Assert.Equal(0, json.GetProperty("matchCount").GetInt32());
        Assert.Equal(4, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(0, json.GetProperty("businesses").GetArrayLength());
        var suggestions = json.GetProperty("suggestions").EnumerateArray()
            .Select(s => (
                s.GetProperty("removed").GetProperty("group").GetString(),
                s.GetProperty("removed").GetProperty("value").GetString(),
                s.GetProperty("count").GetInt32()))
            .ToArray();
        Assert.Equal(
            [("offers", "emergency-calls", 0), ("offers", "open-saturdays", 0), ("areas", "scarborough", 3)],
            suggestions);
    }

    [Fact]
    public async Task L2_024_AC4_filters_that_match_something_come_with_no_suggestions()
    {
        await _factory.Arrange(Home("a", OfferFilter.FreeQuote));

        var json = await _factory.GetJson($"{Url}?offers=free-quote");

        Assert.Equal(0, json.GetProperty("suggestions").GetArrayLength());
    }

    [Fact]
    public async Task L2_025_AC1_name_order_ignores_case_accents_and_a_leading_the()
    {
        await _factory.Arrange(
            Home("the-builders", name: "The Builders"),
            Home("ace", name: "ace Waterproofing"),
            Home("elan", name: "Élan Roofing"),
            Home("delta", name: "DELTA Drains"),
            Home("zion", name: "Zion Painting"));

        var json = await _factory.GetJson($"{Url}?sort=name");

        Assert.Equal(["ace", "the-builders", "delta", "elan", "zion"], json.GetProperty("businesses").Slugs());
    }

    [Fact]
    public async Task L2_025_AC2_newest_orders_by_date_published_newest_first()
    {
        var slow = Home("old-but-complete", approvedDaysAgo: 30);
        var recent = ListingMother.Public(
            "new-but-bare", "home-property", approvedAt: ListingMother.Now.AddDays(-2),
            offers: OfferFilter.None, areas: AreaServed.None, highlight: null);
        await _factory.Arrange(slow, recent, Home("middle", approvedDaysAgo: 10));

        var json = await _factory.GetJson($"{Url}?sort=newest");

        Assert.Equal(["new-but-bare", "middle", "old-but-complete"], json.GetProperty("businesses").Slugs());
    }

    [Fact]
    public async Task L2_025_AC3_recommended_is_the_default_and_orders_by_score_then_name()
    {
        var bare = ListingMother.Public(
            "bare", "home-property", approvedAt: ListingMother.Now.AddDays(-1),
            offers: OfferFilter.None, areas: AreaServed.None, highlight: null);
        var responsive = Home("responsive", approvedDaysAgo: 5);
        responsive.SetMedianResponseMinutes(10);
        responsive.RefreshRecommendedScore(ListingMother.Now);
        await _factory.Arrange(
            bare,
            responsive,
            Home("tie-b", approvedDaysAgo: 5, name: "Beta"),
            Home("tie-a", approvedDaysAgo: 5, name: "The Alpha"));

        var byDefault = await _factory.GetJson(Url);
        var unknownSort = await _factory.GetJson($"{Url}?sort=price");

        Assert.Equal(["responsive", "tie-a", "tie-b", "bare"], byDefault.GetProperty("businesses").Slugs());
        Assert.Equal(byDefault.GetProperty("businesses").Slugs(), unknownSort.GetProperty("businesses").Slugs());
        Assert.Equal("recommended", unknownSort.GetProperty("sort").GetString());
    }

    [Fact]
    public async Task L2_026_AC1_a_long_category_is_served_sixteen_at_a_time()
    {
        await ArrangeForty();

        var json = await _factory.GetJson(Url);

        Assert.Equal(40, json.GetProperty("matchCount").GetInt32());
        Assert.Equal(3, json.GetProperty("pageCount").GetInt32());
        Assert.Equal(16, json.GetProperty("businesses").GetArrayLength());
        Assert.Equal("biz-01", json.GetProperty("businesses")[0].GetProperty("slug").GetString());
    }

    [Fact]
    public async Task L2_026_AC2_page_two_holds_businesses_seventeen_to_thirty_two()
    {
        await ArrangeForty();

        var json = await _factory.GetJson($"{Url}?page=2");

        Assert.Equal(2, json.GetProperty("page").GetInt32());
        var slugs = json.GetProperty("businesses").Slugs();
        Assert.Equal(16, slugs.Length);
        Assert.Equal("biz-17", slugs[0]);
        Assert.Equal("biz-32", slugs[^1]);
    }

    [Theory]
    [InlineData("3", 3, 8)]
    [InlineData("4", 3, 8)]
    [InlineData("999999999999999999999", 3, 8)]
    [InlineData("0", 1, 16)]
    [InlineData("-2", 1, 16)]
    [InlineData("two", 1, 16)]
    [InlineData("", 1, 16)]
    public async Task L2_026_AC3_a_page_out_of_range_is_clamped_to_the_nearest_valid_page(string page, int served, int cards)
    {
        await ArrangeForty();

        var json = await _factory.GetJson($"{Url}?page={page}");

        Assert.Equal(served, json.GetProperty("page").GetInt32());
        Assert.Equal(cards, json.GetProperty("businesses").GetArrayLength());
    }

    [Fact]
    public async Task L2_026_AC3_paging_applies_to_the_filtered_result()
    {
        await ArrangeForty();

        var json = await _factory.GetJson($"{Url}?offers=emergency-calls&page=9");

        // Every second of the forty takes emergency calls: 20 matches, two pages.
        Assert.Equal(20, json.GetProperty("matchCount").GetInt32());
        Assert.Equal(2, json.GetProperty("pageCount").GetInt32());
        Assert.Equal(2, json.GetProperty("page").GetInt32());
        Assert.Equal(4, json.GetProperty("businesses").GetArrayLength());
    }

    [Fact]
    public async Task L2_024_AC2_the_count_endpoint_counts_matches_for_a_filter_set()
    {
        await _factory.Arrange(
            Home("a", OfferFilter.FreeQuote, AreaServed.EastYork),
            Home("b", OfferFilter.FreeQuote, AreaServed.Downtown),
            Home("c", OfferFilter.OpenSaturdays, AreaServed.EastYork),
            ListingMother.Public("elsewhere", "media", offers: OfferFilter.FreeQuote, areas: AreaServed.EastYork));

        var unfiltered = await _factory.GetJson($"{Url}/count");
        var filtered = await _factory.GetJson($"{Url}/count?offers=free-quote&areas=east-york,junk");
        var nothing = await _factory.GetJson($"{Url}/count?offers=emergency-calls");

        Assert.Equal(3, unfiltered.GetProperty("count").GetInt32());
        Assert.Equal(1, filtered.GetProperty("count").GetInt32());
        Assert.Equal(0, nothing.GetProperty("count").GetInt32());
    }

    [Theory]
    [InlineData(NonPublicState.Draft)]
    [InlineData(NonPublicState.Paused)]
    [InlineData(NonPublicState.Deleted)]
    [InlineData(NonPublicState.UnderModerationHold)]
    public async Task L2_028_AC1_a_category_never_lists_or_counts_a_listing_that_is_not_public(NonPublicState state)
    {
        // The hidden listing offers a free quote and emergency calls, so only its state hides it.
        await _factory.Arrange(Home("visible", OfferFilter.FreeQuote), ListingMother.NonPublic(state));

        var page = await _factory.GetJson($"{Url}?offers=free-quote,emergency-calls");
        var count = await _factory.GetJson($"{Url}/count?offers=emergency-calls");
        var suggestions = await _factory.GetJson($"{Url}?offers=open-saturdays,emergency-calls");

        Assert.Equal(1, page.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, page.GetProperty("matchCount").GetInt32());
        Assert.Equal(["visible"], page.GetProperty("businesses").Slugs());
        Assert.Equal(JsonValueKind.Null, page.GetProperty("fact").ValueKind);
        Assert.Equal(0, count.GetProperty("count").GetInt32());
        Assert.All(suggestions.GetProperty("suggestions").EnumerateArray(), s => Assert.Equal(0, s.GetProperty("count").GetInt32()));
    }

    [Theory]
    [InlineData("")]
    [InlineData("/count")]
    public async Task L2_156_AC2_category_reads_may_be_cached_publicly_for_sixty_seconds(string suffix)
    {
        var response = await _factory.CreateClient().GetAsync(Url + suffix);

        Assert.Equal("public, max-age=60", response.Headers.CacheControl?.ToString());
    }

    private Task ArrangeForty() => _factory.Arrange(
    [
        .. Enumerable.Range(1, 40).Select(i => Home(
            $"biz-{i:00}",
            i % 2 == 0 ? OfferFilter.EmergencyCalls : OfferFilter.FreeQuote,
            approvedDaysAgo: i)),
    ]);
}
