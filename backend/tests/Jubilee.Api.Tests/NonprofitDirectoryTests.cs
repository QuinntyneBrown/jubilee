// Acceptance Test
// Traces to: L2-285, L2-289, L2-290
// Description: non-profits are the thirteenth category, a listing in it is a non-profit, its category
// page lists business cards with a sort and no filters, and the browse home gives non-profits a shelf
// of their own without counting them among the businesses.

using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public class NonprofitDirectoryTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Url = "/api/categories/non-profits/listings";
    private readonly JubileeApiFactory _factory;

    public NonprofitDirectoryTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_285_AC2_non_profits_is_the_thirteenth_of_thirteen_categories()
    {
        var categories = (await _factory.GetJson("/api/directory/welcome")).GetProperty("categories");

        Assert.Equal(13, categories.GetArrayLength());
        Assert.Equal("software-platforms", categories[11].GetProperty("slug").GetString());
        Assert.Equal("non-profits", categories[12].GetProperty("slug").GetString());
        Assert.Equal("Non-profits", categories[12].GetProperty("name").GetString());
    }

    [Fact]
    public async Task L2_285_AC1_a_listing_in_non_profits_is_a_nonprofit_and_no_other_is()
    {
        await _factory.Arrange(ListingMother.Public("hope-house", "non-profits"), ListingMother.Public("food-hall", "community"));

        var nonprofit = await _factory.GetJson("/api/listings/hope-house");
        var business = await _factory.GetJson("/api/listings/food-hall");

        Assert.Equal("nonprofit", nonprofit.GetProperty("kind").GetString());
        Assert.Equal("services", business.GetProperty("kind").GetString());
    }

    [Fact]
    public async Task L2_289_AC3_the_category_lists_non_profits_as_business_cards_with_the_sort_and_no_fact()
    {
        await _factory.Arrange(
            ListingMother.Public("hope-house", "non-profits", "Hope House Toronto", ListingMother.Now.AddDays(-3), offers: OfferFilter.EmergencyCalls),
            ListingMother.Public("bread-and-bridges", "non-profits", "Bread & Bridges", ListingMother.Now.AddDays(-1)),
            ListingMother.Public("plumber"));

        var json = await _factory.GetJson($"{Url}?sort=name");

        Assert.Equal("Non-profits", json.GetProperty("category").GetProperty("name").GetString());
        Assert.Equal(2, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(["bread-and-bridges", "hope-house"], json.GetProperty("businesses").Slugs());
        Assert.Equal("name", json.GetProperty("sort").GetString());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("fact").ValueKind);
    }

    [Fact]
    public async Task L2_289_AC4_offers_and_areas_are_ignored_for_non_profits()
    {
        await _factory.Arrange(
            ListingMother.Public("hope-house", "non-profits", offers: default, areas: default),
            ListingMother.Public("bread-and-bridges", "non-profits", offers: default, areas: default));

        var json = await _factory.GetJson($"{Url}?offers=emergency-calls&areas=scarborough");

        Assert.Equal(2, json.GetProperty("matchCount").GetInt32());
        Assert.Equal(0, json.GetProperty("filters").GetProperty("offers").GetArrayLength());
        Assert.Equal(0, json.GetProperty("filters").GetProperty("areas").GetArrayLength());
    }

    [Fact]
    public async Task L2_289_AC1_L2_285_AC6_the_browse_home_has_a_non_profit_shelf_and_does_not_count_them_as_businesses()
    {
        await _factory.Arrange(
            ListingMother.Public("hope-house", "non-profits", "Hope House Toronto"),
            ListingMother.Public("bread-and-bridges", "non-profits", "Bread & Bridges"),
            ListingMother.NonPublic(NonPublicState.Paused, "paused-ministry", "non-profits"),
            ListingMother.Public("food-hall", "community"));

        var json = await _factory.GetJson("/api/directory/home");
        var welcome = await _factory.GetJson("/api/directory/welcome");

        Assert.Equal(13, json.GetProperty("categories").GetArrayLength());
        Assert.Equal(1, json.GetProperty("liveBusinessCount").GetInt32());
        Assert.Equal(1, welcome.GetProperty("liveBusinessCount").GetInt32());
        Assert.Equal(["community"], json.GetProperty("groups").EnumerateArray().Select(g => g.GetProperty("slug").GetString()));
        var shelf = json.GetProperty("nonprofits");
        Assert.Equal(2, shelf.GetProperty("count").GetInt32());
        Assert.Equal(2, shelf.GetProperty("listings").GetArrayLength());
        Assert.All(shelf.GetProperty("listings").EnumerateArray(), l => Assert.Equal("non-profits", l.GetProperty("categorySlug").GetString()));
    }

    [Fact]
    public async Task L2_289_AC1_the_shelf_holds_at_most_four()
    {
        await _factory.Arrange([.. Enumerable.Range(1, 5).Select(i => (object)ListingMother.Public($"ministry-{i}", "non-profits", $"Ministry {i}"))]);

        var json = await _factory.GetJson("/api/directory/home");
        Assert.Equal(5, json.GetProperty("nonprofits").GetProperty("count").GetInt32());
        Assert.Equal(4, json.GetProperty("nonprofits").GetProperty("listings").GetArrayLength());
    }

    [Fact]
    public async Task L2_289_AC1_without_a_live_non_profit_the_shelf_is_empty()
    {
        await _factory.Arrange(ListingMother.Public("plumber"));

        var json = await _factory.GetJson("/api/directory/home");

        Assert.Equal(0, json.GetProperty("nonprofits").GetProperty("count").GetInt32());
        Assert.Equal(0, json.GetProperty("nonprofits").GetProperty("listings").GetArrayLength());
    }

    [Fact]
    public async Task L2_290_AC5_the_featured_fallback_never_picks_a_non_profit()
    {
        await _factory.Arrange(
            ListingMother.Public("hope-house", "non-profits", "Hope House Toronto", ListingMother.Now),
            ListingMother.Public("plumber", approvedAt: ListingMother.Now.AddDays(-2)));

        var json = await _factory.GetJson("/api/directory/home");

        Assert.Equal(["plumber"], json.GetProperty("featured").Slugs());
    }
}
