// Acceptance Test
// Traces to: L2-290
// Description: search finds a non-profit by its name, its line, its mission, who it serves and
// where it works, in a group of its own that is not counted among the businesses; the addresses are
// never searched.

using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public class NonprofitSearchTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public NonprofitSearchTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        await _factory.Arrange(
            ListingMother.Nonprofit(
                "lakeshore-youth",
                "Lakeshore Youth Collective",
                "https://lakeshoreyouth.example/about",
                "https://lakeshoreyouth.example/donate",
                mission: "Mentors walk with teenagers through school, faith and their first job.",
                serves: "Young people aged 12 to 18 and their families.",
                area: "Mimico and Long Branch",
                tagline: "A youth ministry on the lakeshore"),
            ListingMother.NonPublic(NonPublicState.Paused, "paused-ministry", "non-profits"),
            ListingMother.Public("plumber"));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_290_AC2_a_non_profit_is_a_non_profit_result_not_a_business()
    {
        var json = await _factory.GetJson("/api/search?q=youth");

        var hit = json.GetProperty("hits")[0];
        Assert.Equal("nonprofit", hit.GetProperty("kind").GetString());
        Assert.Equal("lakeshore-youth", hit.GetProperty("slug").GetString());
        Assert.Equal("non-profits", hit.GetProperty("categorySlug").GetString());
        Assert.Equal(1, json.GetProperty("nonprofitCount").GetInt32());
        Assert.Equal(0, json.GetProperty("businessCount").GetInt32());
        Assert.EndsWith("in name and tagline", hit.GetProperty("explanation").GetProperty("text").GetString());
    }

    [Theory]
    [InlineData("lakeshore", "name and tagline")]
    [InlineData("mentors", "its mission")]
    [InlineData("families", "who it serves")]
    [InlineData("mimico", "where it works")]
    public async Task L2_290_AC2_a_non_profit_is_found_by_its_own_words(string query, string field)
    {
        var hit = (await _factory.GetJson($"/api/search?q={query}")).GetProperty("hits")[0];

        Assert.Equal("lakeshore-youth", hit.GetProperty("slug").GetString());
        Assert.EndsWith($"in {field}", hit.GetProperty("explanation").GetProperty("text").GetString());
    }

    [Theory]
    [InlineData("donate")]
    [InlineData("example")]
    public async Task L2_290_AC2_the_addresses_are_not_searched(string query)
    {
        var json = await _factory.GetJson($"/api/search?q={query}");

        Assert.Equal(0, json.GetProperty("nonprofitCount").GetInt32());
    }

    [Fact]
    public async Task L2_290_AC3_a_search_without_a_non_profit_counts_none()
    {
        var json = await _factory.GetJson("/api/search?q=plumber");

        Assert.Equal(0, json.GetProperty("nonprofitCount").GetInt32());
        Assert.Equal(1, json.GetProperty("businessCount").GetInt32());
    }

    [Fact]
    public async Task L2_285_AC4_a_non_profit_that_is_not_public_is_never_found()
    {
        var json = await _factory.GetJson("/api/search?q=paused");

        Assert.Equal(0, json.GetProperty("nonprofitCount").GetInt32());
    }

    [Fact]
    public async Task L2_290_AC2_when_the_index_is_down_the_name_search_still_keeps_non_profits_apart()
    {
        await using var broken = new BrokenIndexFactory();
        await broken.Reset();
        await broken.Arrange(ListingMother.Nonprofit("hope-house", "Hope House Toronto"), ListingMother.Public("hope-plumbing", name: "Hope Plumbing"));

        var json = await broken.GetJson("/api/search?q=hope");

        Assert.Equal(1, json.GetProperty("businessCount").GetInt32());
        Assert.Equal(1, json.GetProperty("nonprofitCount").GetInt32());
        Assert.Contains(json.GetProperty("hits").EnumerateArray(), h => h.GetProperty("kind").GetString() == "nonprofit");
    }
}
