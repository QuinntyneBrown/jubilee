// Acceptance Test
// Traces to: L2-253
// Description: a software platform joins the lists of businesses without a card of its own: it can
// be featured and saved, and its card carries no web address.

using System.Net;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public sealed class PlatformListsTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public PlatformListsTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_253_AC4_a_featured_platform_shows_in_featured_this_week_like_any_business()
    {
        var platform = ListingMother.Platform("lanternread", "Lanternread");
        var plumber = ListingMother.Public("plumber");
        var today = TorontoClock.Today(ListingMother.Now);
        await _factory.Arrange(platform, plumber, FeaturedSlot.Create(platform.Id, 1, today), FeaturedSlot.Create(plumber.Id, 2, today));

        var featured = (await _factory.GetJson("/api/directory/home")).GetProperty("featured");

        Assert.Equal(["lanternread", "plumber"], featured.Slugs());
        Assert.Equal("software-platforms", featured[0].GetProperty("categorySlug").GetString());
    }

    [Fact]
    public async Task L2_253_AC1_a_platform_card_carries_no_web_address()
    {
        await _factory.Arrange(ListingMother.Platform("lanternread", "Lanternread", "https://lanternread.example"));

        var category = await _factory.CreateClient().GetStringAsync("/api/categories/software-platforms/listings");
        var home = await _factory.CreateClient().GetStringAsync("/api/directory/home");

        Assert.Contains("Lanternread", category, StringComparison.Ordinal);
        Assert.DoesNotContain("lanternread.example", category, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("lanternread.example", home, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task L2_253_AC6_a_saved_platform_is_among_the_saved_businesses()
    {
        await _factory.Arrange(ListingMother.Platform("lanternread", "Lanternread"));
        var joanna = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

        var saved = await joanna.PutAsync("/api/saved/businesses/lanternread", null);
        var list = await _factory.GetJson("/api/saved", joanna);

        Assert.Equal(HttpStatusCode.NoContent, saved.StatusCode);
        var item = Assert.Single(list.GetProperty("items").EnumerateArray());
        Assert.Equal("business", item.GetProperty("kind").GetString());
        Assert.Equal("Lanternread", item.GetProperty("business").GetProperty("name").GetString());
        Assert.Equal("software-platforms", item.GetProperty("business").GetProperty("categorySlug").GetString());
    }
}
