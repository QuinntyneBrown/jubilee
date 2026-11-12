using System.Net;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// L2-096 AC2 and AC3, L2-028 AC2 (ADR 0003, ADR 0051): a pause reaches every public page within
// 60 seconds, and so does a resume. Naomi owns "pauses"; "stays" is another live business in the
// same category, so each is on the other's page under the related businesses.
public sealed class PauseBoundTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string NaomiId = "member|naomi";
    private const string Page = "/api/listings/pauses";

    /// <summary>
    /// Every public list a live listing is on: welcome, browse, category, search (by a word of both
    /// taglines, so the query does not name the listing) and a related list.
    /// </summary>
    private static readonly string[] Lists =
    [
        "/api/directory/welcome",
        "/api/directory/home",
        "/api/categories/home-property/listings",
        "/api/categories/home-property/listings?offers=free-quote&sort=name",
        "/api/search?q=tagline",
        "/api/listings/stays",
    ];

    /// <summary>The reads a browser or a shared cache may keep.</summary>
    private static readonly string[] Stored =
    [
        "/api/directory/welcome",
        "/api/directory/home",
        "/api/categories/home-property/listings",
        "/api/categories/home-property/listings/count",
        "/api/listings/stays",
        Page,
    ];

    private readonly JubileeApiFactory _factory;
    private readonly HttpClient _visitor;

    public PauseBoundTests(JubileeApiFactory factory)
    {
        _factory = factory;
        _visitor = Searcher.At(factory);
    }

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var listing = ListingMother.Public("pauses");
        listing.AssignOwner(NaomiId);
        await _factory.Arrange(ListingMother.Public("stays"), listing);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", NaomiId);

    [Fact]
    public async Task L2_096_AC2_a_listing_its_owner_pauses_is_gone_from_every_public_page_on_the_next_request()
    {
        Assert.All(await ReadLists(), body => Assert.Contains("pauses", body));
        Assert.Equal(2, await Count());
        Assert.Equal(HttpStatusCode.OK, (await _visitor.GetAsync(Page)).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await Naomi().PostAsync("/api/my-business/pause", null)).StatusCode);

        var paused = await ReadLists();
        Assert.All(paused, body => Assert.DoesNotContain("pauses", body));
        Assert.All(paused, body => Assert.Contains("stays", body));
        Assert.Equal(1, await Count());
        Assert.Equal(HttpStatusCode.NotFound, (await _visitor.GetAsync(Page)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Naomi().GetAsync(Page)).StatusCode);
    }

    [Fact]
    public async Task L2_096_AC3_a_listing_its_owner_resumes_is_back_on_every_public_page_on_the_next_request()
    {
        var naomi = Naomi();
        Assert.Equal(HttpStatusCode.OK, (await naomi.PostAsync("/api/my-business/pause", null)).StatusCode);
        Assert.All(await ReadLists(), body => Assert.DoesNotContain("pauses", body));

        Assert.Equal(HttpStatusCode.OK, (await naomi.PostAsync("/api/my-business/resume", null)).StatusCode);

        Assert.All(await ReadLists(), body => Assert.Contains("pauses", body));
        Assert.Equal(2, await Count());
        Assert.Equal(HttpStatusCode.OK, (await _visitor.GetAsync(Page)).StatusCode);
    }

    // The API's own read cache: a pause it is not told of (written behind the application) is
    // served for at most 60 seconds, on the lists, the count and the listing's own URL.
    [Fact]
    public async Task L2_028_AC2_a_pause_the_api_is_not_told_of_reaches_every_public_page_within_sixty_seconds()
    {
        Assert.All(await ReadLists(), body => Assert.Contains("pauses", body));
        Assert.Equal(2, await Count());
        Assert.Equal(HttpStatusCode.OK, (await _visitor.GetAsync(Page)).StatusCode);

        await _factory.WithDbBehindTheApp(async db =>
        {
            (await db.Listings.SingleAsync(l => l.Slug == "pauses")).Pause();
            await db.SaveChangesAsync();
        });
        _factory.Clock.Advance(TimeSpan.FromSeconds(61));

        Assert.All(await ReadLists(), body => Assert.DoesNotContain("pauses", body));
        Assert.Equal(1, await Count());
        Assert.Equal(HttpStatusCode.NotFound, (await _visitor.GetAsync(Page)).StatusCode);
    }

    // What a browser or a shared cache keeps: no public read may be stored for more than 60
    // seconds, and search is never stored.
    [Fact]
    public async Task L2_096_AC2_no_public_read_may_be_kept_by_a_cache_for_more_than_sixty_seconds()
    {
        foreach (var url in Stored)
        {
            var response = await _visitor.GetAsync(url);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var cache = response.Headers.CacheControl;
            Assert.True(cache is not null, url);
            Assert.True(cache!.NoStore || cache.MaxAge <= TimeSpan.FromSeconds(60), $"{url}: {cache}");
        }

        var search = await _visitor.GetAsync("/api/search?q=pauses");
        Assert.True(search.Headers.CacheControl?.NoStore, "search is stored");
    }

    private async Task<string[]> ReadLists()
    {
        var bodies = new List<string>();
        foreach (var url in Lists)
        {
            bodies.Add(await _visitor.GetStringAsync(url));
        }

        return [.. bodies];
    }

    private async Task<int> Count() =>
        (await _factory.GetJson("/api/categories/home-property/listings/count", _visitor)).GetProperty("count").GetInt32();
}
