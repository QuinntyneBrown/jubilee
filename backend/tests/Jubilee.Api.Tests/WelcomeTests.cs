using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public class WelcomeTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public WelcomeTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_020_AC1_welcome_counts_the_live_businesses()
    {
        await _factory.Arrange(
            ListingMother.Public("a", "shops"),
            ListingMother.Public("b", "media"),
            ListingMother.Public("c", "media"));

        var json = await _factory.GetJson("/api/directory/welcome");

        Assert.Equal(3, json.GetProperty("liveBusinessCount").GetInt32());
    }

    [Fact]
    public async Task L2_020_AC2_welcome_lists_the_eleven_categories_in_fixed_order()
    {
        var json = await _factory.GetJson("/api/directory/welcome");

        var categories = json.GetProperty("categories").EnumerateArray()
            .Select(c => (c.GetProperty("slug").GetString(), c.GetProperty("name").GetString()))
            .ToArray();
        Assert.Equal(11, categories.Length);
        Assert.Equal(("shops", "Shops"), categories[0]);
        Assert.Equal(("rooms-rentals", "Rooms & rentals"), categories[1]);
        Assert.Equal(("financial-insurance", "Financial & insurance"), categories[2]);
        Assert.Equal(("community", "Community"), categories[10]);
    }

    [Fact]
    public async Task L2_020_AC2_welcome_with_no_businesses_is_empty_not_an_error()
    {
        var json = await _factory.GetJson("/api/directory/welcome");

        Assert.Equal(0, json.GetProperty("liveBusinessCount").GetInt32());
        Assert.Equal(0, json.GetProperty("featured").GetArrayLength());
    }

    [Fact]
    public async Task L2_106_AC1_welcome_shows_up_to_four_featured_businesses_in_slot_order()
    {
        var listings = Enumerable.Range(1, 5).Select(i => ListingMother.Public($"biz-{i}", "shops")).ToArray();
        var today = TorontoClock.Today(ListingMother.Now);
        await _factory.Arrange([.. listings]);
        await _factory.Arrange(
            FeaturedSlot.Create(listings[2].Id, 1, today),
            FeaturedSlot.Create(listings[0].Id, 2, today),
            FeaturedSlot.Create(listings[4].Id, 3, today),
            FeaturedSlot.Create(listings[1].Id, 4, today),
            FeaturedSlot.Create(listings[3].Id, 5, today));

        var json = await _factory.GetJson("/api/directory/welcome");

        Assert.Equal(["biz-3", "biz-1", "biz-5", "biz-2"], json.GetProperty("featured").Slugs());
    }

    [Fact]
    public async Task L2_027_AC1_a_featured_business_card_carries_its_display_fields()
    {
        var listing = ListingMother.Public(
            "legacy-financial", "financial-insurance", "Legacy Financial",
            highlight: "Free first meeting", tagline: "Build a Legacy. Protect a Legacy. Leave a Legacy.");
        var plain = ListingMother.Public("plain", "shops", highlight: null);
        var today = TorontoClock.Today(ListingMother.Now);
        await _factory.Arrange(listing, plain, FeaturedSlot.Create(listing.Id, 1, today), FeaturedSlot.Create(plain.Id, 2, today));

        var featured = (await _factory.GetJson("/api/directory/welcome")).GetProperty("featured");

        var card = featured[0];
        Assert.Equal("legacy-financial", card.GetProperty("slug").GetString());
        Assert.Equal("Legacy Financial", card.GetProperty("name").GetString());
        Assert.Equal("Build a Legacy. Protect a Legacy. Leave a Legacy.", card.GetProperty("tagline").GetString());
        Assert.Equal("Free first meeting", card.GetProperty("highlight").GetString());
        Assert.Equal("financial-insurance", card.GetProperty("categorySlug").GetString());
        Assert.False(card.TryGetProperty("verified", out _)); // ADR 0057: no listing is called verified
        Assert.Equal(JsonValueKind.Null, card.GetProperty("coverPhoto").ValueKind);
        Assert.Equal(JsonValueKind.Null, featured[1].GetProperty("highlight").ValueKind);
    }

    [Theory]
    [InlineData(0, true)]
    [InlineData(6, true)]
    [InlineData(7, false)]
    [InlineData(-1, false)]
    public async Task L2_106_AC1_a_featured_slot_runs_for_seven_days_from_its_start_date(int daysAfterStart, bool featured)
    {
        var chosen = ListingMother.Public("chosen", approvedAt: ListingMother.Now.AddDays(-200));
        var recent = ListingMother.Public("recent", approvedAt: ListingMother.Now.AddDays(-1));
        var startsOn = TorontoClock.Today(ListingMother.Now).AddDays(-daysAfterStart);
        await _factory.Arrange(chosen, recent, FeaturedSlot.Create(chosen.Id, 1, startsOn));

        var json = await _factory.GetJson("/api/directory/welcome");

        // With a current slot only the chosen listing is featured; otherwise the fallback leads
        // with the most recently published listing.
        Assert.Equal(featured ? ["chosen"] : ["recent", "chosen"], json.GetProperty("featured").Slugs());
    }

    [Fact]
    public async Task L2_106_AC1_the_featured_week_follows_the_toronto_calendar()
    {
        // 03:30 UTC on 11 November is still 10 November in Toronto.
        _factory.Clock.SetUtcNow(new DateTimeOffset(2026, 11, 11, 3, 30, 0, TimeSpan.Zero));
        var chosen = ListingMother.Public("chosen", approvedAt: ListingMother.Now.AddDays(-200));
        var recent = ListingMother.Public("recent", approvedAt: ListingMother.Now.AddDays(-1));
        await _factory.Arrange(chosen, recent, FeaturedSlot.Create(chosen.Id, 1, new DateOnly(2026, 11, 4)));

        var json = await _factory.GetJson("/api/directory/welcome");

        Assert.Equal(["chosen"], json.GetProperty("featured").Slugs());
    }

    [Theory]
    [InlineData(NonPublicState.Paused)]
    [InlineData(NonPublicState.Deleted)]
    [InlineData(NonPublicState.UnderModerationHold)]
    public async Task L2_106_AC2_a_featured_listing_that_is_no_longer_public_is_skipped(NonPublicState state)
    {
        var first = ListingMother.Public("first");
        var hidden = ListingMother.NonPublic(state, "hidden");
        var third = ListingMother.Public("third");
        var today = TorontoClock.Today(ListingMother.Now);
        await _factory.Arrange(
            first, hidden, third,
            FeaturedSlot.Create(first.Id, 1, today),
            FeaturedSlot.Create(hidden.Id, 2, today),
            FeaturedSlot.Create(third.Id, 3, today));

        var json = await _factory.GetJson("/api/directory/welcome");

        Assert.Equal(["first", "third"], json.GetProperty("featured").Slugs());
    }

    [Fact]
    public async Task L2_021_AC7_with_no_featured_slot_the_most_recently_published_businesses_are_shown()
    {
        await _factory.Arrange(
            ListingMother.Public("oldest", approvedAt: ListingMother.Now.AddDays(-50)),
            ListingMother.Public("newest", approvedAt: ListingMother.Now.AddDays(-1)),
            ListingMother.Public("middle-a", approvedAt: ListingMother.Now.AddDays(-10)),
            ListingMother.Public("middle-b", approvedAt: ListingMother.Now.AddDays(-20)),
            ListingMother.Public("middle-c", approvedAt: ListingMother.Now.AddDays(-30)),
            ListingMother.NonPublic(NonPublicState.Paused, "paused-recent"));

        var json = await _factory.GetJson("/api/directory/welcome");

        Assert.Equal(["newest", "middle-a", "middle-b", "middle-c"], json.GetProperty("featured").Slugs());
    }

    [Theory]
    [InlineData(NonPublicState.Draft)]
    [InlineData(NonPublicState.Paused)]
    [InlineData(NonPublicState.Deleted)]
    [InlineData(NonPublicState.UnderModerationHold)]
    public async Task L2_028_AC1_welcome_never_counts_or_features_a_listing_that_is_not_public(NonPublicState state)
    {
        await _factory.Arrange(ListingMother.Public("visible"), ListingMother.NonPublic(state));

        var json = await _factory.GetJson("/api/directory/welcome");

        Assert.Equal(1, json.GetProperty("liveBusinessCount").GetInt32());
        Assert.Equal(["visible"], json.GetProperty("featured").Slugs());
    }

    [Fact]
    public async Task L2_156_AC2_welcome_may_be_cached_publicly_for_sixty_seconds()
    {
        var response = await _factory.CreateClient().GetAsync("/api/directory/welcome");

        Assert.Equal("public, max-age=60", response.Headers.CacheControl?.ToString());
    }
}
