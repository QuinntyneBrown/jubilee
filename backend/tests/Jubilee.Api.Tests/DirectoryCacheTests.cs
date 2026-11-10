using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

public class DirectoryCacheTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private static readonly string[] Reads =
    [
        "/api/directory/welcome",
        "/api/directory/home",
        "/api/categories/home-property/listings",
        "/api/categories/home-property/listings?offers=free-quote&sort=name",
    ];

    private readonly JubileeApiFactory _factory;

    public DirectoryCacheTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    // L2-156 AC2 / L2-028 AC2: a change the API is not told about (here a bulk update that
    // bypasses SaveChanges) is served from the read cache for at most 60 seconds.
    [Fact]
    public async Task L2_028_AC2_a_paused_listing_is_gone_from_every_read_within_sixty_seconds()
    {
        await _factory.Arrange(ListingMother.Public("stays"), ListingMother.Public("pauses"));
        var before = await ReadAll();

        await _factory.WithDb(db => db.Listings
            .Where(l => l.Slug == "pauses")
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.IsPaused, true)));

        _factory.Clock.Advance(TimeSpan.FromSeconds(59));
        var cached = await ReadAll();
        Assert.Equal(before, cached);
        Assert.All(cached, body => Assert.Contains("pauses", body));

        _factory.Clock.Advance(TimeSpan.FromSeconds(2));
        var after = await ReadAll();
        Assert.All(after, body => Assert.DoesNotContain("pauses", body));
        Assert.All(after, body => Assert.Contains("stays", body));
    }

    [Fact]
    public async Task L2_156_AC2_a_listing_paused_through_the_application_is_gone_on_the_next_request()
    {
        await _factory.Arrange(ListingMother.Public("stays"), ListingMother.Public("pauses"));
        Assert.All(await ReadAll(), body => Assert.Contains("pauses", body));

        await _factory.WithDb(async db =>
        {
            var listing = await db.Listings.SingleAsync(l => l.Slug == "pauses");
            listing.Pause();
            await db.SaveChangesAsync();
        });

        Assert.All(await ReadAll(), body => Assert.DoesNotContain("pauses", body));
    }

    [Fact]
    public async Task L2_156_AC2_an_approved_listing_appears_on_the_next_request()
    {
        await _factory.Arrange(ListingMother.Public("first"));
        Assert.All(await ReadAll(), body => Assert.DoesNotContain("second", body));

        await _factory.Arrange(ListingMother.Public("second"));

        Assert.All(await ReadAll(), body => Assert.Contains("second", body));
    }

    [Fact]
    public async Task L2_156_AC2_a_new_featured_slot_shows_on_the_next_request()
    {
        var old = ListingMother.Public("old", approvedAt: ListingMother.Now.AddDays(-90));
        await _factory.Arrange(old, ListingMother.Public("recent"));
        var before = await _factory.GetJson("/api/directory/welcome");
        Assert.Equal(["recent", "old"], before.GetProperty("featured").Slugs());

        await _factory.Arrange(FeaturedSlot.Create(old.Id, 1, TorontoClock.Today(ListingMother.Now)));

        var after = await _factory.GetJson("/api/directory/welcome");
        Assert.Equal(["old"], after.GetProperty("featured").Slugs());
    }

    [Fact]
    public async Task L2_156_AC2_a_new_or_deleted_product_shows_on_the_next_request()
    {
        var shop = ListingMother.Public("shop", "shops");
        await _factory.Arrange(shop);
        Assert.Empty((await _factory.GetJson("/api/directory/home")).GetProperty("products").Slugs());

        await _factory.Arrange(Product.Create(shop.Id, "mug", "Mug", 2400, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now));
        Assert.Equal(["mug"], (await _factory.GetJson("/api/directory/home")).GetProperty("products").Slugs());

        await _factory.WithDb(async db =>
        {
            (await db.Products.SingleAsync()).Delete();
            await db.SaveChangesAsync();
        });
        Assert.Empty((await _factory.GetJson("/api/directory/home")).GetProperty("products").Slugs());
    }

    [Fact]
    public async Task L2_156_AC2_each_category_query_is_cached_on_its_own()
    {
        await _factory.Arrange(
            ListingMother.Public("quote", offers: OfferFilter.FreeQuote),
            ListingMother.Public("saturday", offers: OfferFilter.OpenSaturdays),
            ListingMother.Public("radio", "media"));

        var all = await _factory.GetJson("/api/categories/home-property/listings");
        var quotes = await _factory.GetJson("/api/categories/home-property/listings?offers=free-quote");
        var saturdays = await _factory.GetJson("/api/categories/home-property/listings?offers=open-saturdays");
        var byName = await _factory.GetJson("/api/categories/home-property/listings?sort=name");
        var media = await _factory.GetJson("/api/categories/media/listings");

        Assert.Equal(2, all.GetProperty("matchCount").GetInt32());
        Assert.Equal(["quote"], quotes.GetProperty("businesses").Slugs());
        Assert.Equal(["saturday"], saturdays.GetProperty("businesses").Slugs());
        Assert.Equal("name", byName.GetProperty("sort").GetString());
        Assert.Equal(["radio"], media.GetProperty("businesses").Slugs());
    }

    private async Task<string[]> ReadAll()
    {
        var client = _factory.CreateClient();
        var bodies = new List<string>();
        foreach (var url in Reads)
        {
            bodies.Add(await client.GetStringAsync(url));
        }

        return [.. bodies];
    }
}
