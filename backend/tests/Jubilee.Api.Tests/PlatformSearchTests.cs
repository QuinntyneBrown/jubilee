// Acceptance Test
// Traces to: L2-253
// Description: a software platform is found in search by its name, its line, what it does and who
// it is for, as a business result; its web address and its pricing are not searched.

using Jubilee.Api.Tests.Support;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public sealed class PlatformSearchTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public PlatformSearchTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        await _factory.Arrange(
            ListingMother.Platform(
                "lanternread",
                "Lanternread",
                "https://lanternread.example/bookshelf",
                does: "Families log the books their children read and set a weekly goal.",
                @for: "Households with children aged 4 to 12, and their teachers.",
                tagline: "A reading log families keep together"),
            ListingMother.NonPublic(NonPublicState.Paused, "paused-platform", "software-platforms"),
            ListingMother.Public("plumber"));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_253_AC2_a_platform_is_a_business_result_in_software_platforms()
    {
        var json = await _factory.GetJson("/api/search?q=reading");

        var hit = json.GetProperty("hits")[0];
        Assert.Equal("business", hit.GetProperty("kind").GetString());
        Assert.Equal("lanternread", hit.GetProperty("slug").GetString());
        Assert.Equal("software-platforms", hit.GetProperty("categorySlug").GetString());
        Assert.Equal(1, json.GetProperty("businessCount").GetInt32());
        Assert.EndsWith("in tagline and what it does", hit.GetProperty("explanation").GetProperty("text").GetString());
    }

    [Theory]
    [InlineData("lanternread", "name")]
    [InlineData("weekly", "what it does")]
    [InlineData("teachers", "who it is for")]
    public async Task L2_253_AC2_a_platform_is_found_by_its_name_and_the_founders_words(string query, string field)
    {
        var hit = (await _factory.GetJson($"/api/search?q={query}")).GetProperty("hits")[0];

        Assert.Equal("lanternread", hit.GetProperty("slug").GetString());
        Assert.EndsWith($"in {field}", hit.GetProperty("explanation").GetProperty("text").GetString());
    }

    [Theory]
    [InlineData("bookshelf")]
    [InlineData("example")]
    [InlineData("free")]
    public async Task L2_253_AC2_the_web_address_and_the_pricing_are_not_searched(string query)
    {
        var json = await _factory.GetJson($"/api/search?q={query}");

        Assert.Equal(0, json.GetProperty("businessCount").GetInt32());
    }

    [Fact]
    public async Task L2_248_AC4_a_platform_that_is_not_public_is_never_found()
    {
        var json = await _factory.GetJson("/api/search?q=paused");

        Assert.Equal(0, json.GetProperty("businessCount").GetInt32());
    }
}
