// Acceptance Test
// Traces to: L2-248, L2-252, L2-253
// Description: software platforms have their own twelfth category, a group on the browse home and a
// category page of business cards with a sort and no filters.

using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public class PlatformDirectoryTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Url = "/api/categories/software-platforms/listings";
    private readonly JubileeApiFactory _factory;

    public PlatformDirectoryTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_248_AC2_software_platforms_is_the_twelfth_of_twelve_categories()
    {
        var categories = (await _factory.GetJson("/api/directory/welcome")).GetProperty("categories");

        Assert.Equal(12, categories.GetArrayLength());
        Assert.Equal("community", categories[10].GetProperty("slug").GetString());
        Assert.Equal("software-platforms", categories[11].GetProperty("slug").GetString());
        Assert.Equal("Software platforms", categories[11].GetProperty("name").GetString());
    }

    [Fact]
    public async Task L2_248_AC1_a_listing_in_software_platforms_is_a_platform_and_no_other_is()
    {
        await _factory.Arrange(ListingMother.Public("lanternread", "software-platforms"), ListingMother.Public("it-shop", "business-tech"));

        var platform = await _factory.GetJson("/api/listings/lanternread");
        var business = await _factory.GetJson("/api/listings/it-shop");

        Assert.Equal("platform", platform.GetProperty("kind").GetString());
        Assert.Equal("services", business.GetProperty("kind").GetString());
    }

    [Fact]
    public async Task L2_252_AC2_the_category_lists_platforms_as_business_cards_with_the_sort_and_no_fact()
    {
        await _factory.Arrange(
            ListingMother.Public("lanternread", "software-platforms", "Lanternread", ListingMother.Now.AddDays(-3), offers: OfferFilter.EmergencyCalls),
            ListingMother.Public("gatherboard", "software-platforms", "Gatherboard", ListingMother.Now.AddDays(-1)),
            ListingMother.Public("plumber"));

        var json = await _factory.GetJson($"{Url}?sort=name");
        var newest = await _factory.GetJson($"{Url}?sort=newest");

        Assert.Equal("Software platforms", json.GetProperty("category").GetProperty("name").GetString());
        Assert.Equal(2, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(["gatherboard", "lanternread"], json.GetProperty("businesses").Slugs());
        Assert.Equal(["gatherboard", "lanternread"], newest.GetProperty("businesses").Slugs());
        Assert.Equal("name", json.GetProperty("sort").GetString());
        Assert.Equal(0, json.GetProperty("spaces").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("fact").ValueKind);
        Assert.Equal("software-platforms", json.GetProperty("businesses")[0].GetProperty("categorySlug").GetString());
    }

    [Fact]
    public async Task L2_252_AC3_offers_and_areas_are_ignored_for_platforms()
    {
        await _factory.Arrange(
            ListingMother.Public("lanternread", "software-platforms", offers: default, areas: default),
            ListingMother.Public("gatherboard", "software-platforms", offers: default, areas: default));

        var json = await _factory.GetJson($"{Url}?offers=emergency-calls&areas=scarborough");

        Assert.Equal(2, json.GetProperty("matchCount").GetInt32());
        Assert.Equal(2, json.GetProperty("businesses").GetArrayLength());
        Assert.Equal(0, json.GetProperty("filters").GetProperty("offers").GetArrayLength());
        Assert.Equal(0, json.GetProperty("filters").GetProperty("areas").GetArrayLength());
    }

    [Fact]
    public async Task L2_252_AC1_the_browse_home_groups_platforms_after_community_and_counts_them()
    {
        await _factory.Arrange(
            ListingMother.Public("lanternread", "software-platforms", "Lanternread"),
            ListingMother.Public("food-bank", "community"));

        var json = await _factory.GetJson("/api/directory/home");
        var groups = json.GetProperty("groups");

        Assert.Equal(12, json.GetProperty("categories").GetArrayLength());
        Assert.Equal(2, json.GetProperty("liveBusinessCount").GetInt32());
        Assert.Equal(["community", "software-platforms"], groups.EnumerateArray().Select(g => g.GetProperty("slug").GetString()));
        Assert.Equal("Software platforms", groups[1].GetProperty("name").GetString());
        Assert.Equal(1, groups[1].GetProperty("count").GetInt32());
    }

    [Fact]
    public async Task L2_248_AC4_only_public_platforms_are_listed()
    {
        await _factory.Arrange(
            ListingMother.Public("lanternread", "software-platforms"),
            ListingMother.NonPublic(NonPublicState.Paused, "paused-platform", "software-platforms"));

        var json = await _factory.GetJson(Url);

        Assert.Equal(["lanternread"], json.GetProperty("businesses").Slugs());
    }
}
