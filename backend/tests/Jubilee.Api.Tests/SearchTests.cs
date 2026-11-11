using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Search;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

/// <summary>Search fails as its index is unavailable (L2-181 AC3).</summary>
public sealed class BrokenIndexFactory : JubileeApiFactory
{
    protected override void ConfigureTestServices(IServiceCollection services) =>
        services.AddScoped<ISearchIndex, UnavailableSearchIndex>();

    private sealed class UnavailableSearchIndex : ISearchIndex
    {
        public Task<SearchResults> SearchAsync(string query, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("The search index is down.");
    }
}

public class SearchTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public SearchTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static Service Offer(Listing listing, string name) =>
        Service.Create(listing.Id, 1, name, "30 min", ServicePrice.Free, ServiceAction.Book);

    private static Product Sells(Listing shop, string slug, string name) =>
        Product.Create(shop.Id, slug, name, 1000, false, TileTint.Ink, TileIcon.Bag, ListingMother.Now);

    private async Task<Listing> ArrangePlumber()
    {
        var plumber = ListingMother.Public("waterworks", "home-property", "Waterworks Plumbing");
        await _factory.Arrange(
            plumber,
            Offer(plumber, "Emergency plumbing"),
            Offer(plumber, "Drain cleaning"),
            ListingMother.Public("ace", "home-property", "Ace Roofing"));
        return plumber;
    }

    // L2-029 AC1
    [Fact]
    public async Task L2_029_AC1_results_are_grouped_and_counted()
    {
        var plumber = await ArrangePlumber();
        var shop = ListingMother.Public("pipes-and-more", "shops", "Pipes and More");
        await _factory.Arrange(shop, Sells(shop, "plumber-tee", "Plumber appreciation tee"));

        var json = await _factory.GetJson("/api/search?q=plumber");

        Assert.Equal("plumber", json.GetProperty("query").GetString());
        // The shop is a business hit too: its product matches.
        Assert.Equal(2, json.GetProperty("businessCount").GetInt32());
        Assert.Equal(1, json.GetProperty("serviceCount").GetInt32());
        Assert.Equal(1, json.GetProperty("productCount").GetInt32());
        Assert.True(json.GetProperty("hasMatchExplanations").GetBoolean());
        var kinds = json.GetProperty("hits").EnumerateArray().Select(h => h.GetProperty("kind").GetString()!).ToArray();
        Assert.Equal(["business", "service", "product"], kinds.Distinct().ToArray());
        Assert.Contains(plumber.Slug, json.GetProperty("hits").EnumerateArray().Select(h => h.GetProperty("slug").GetString()));
    }

    // L2-029 AC2
    [Fact]
    public async Task L2_029_AC2_a_result_explains_its_match_with_a_highlight_range()
    {
        await ArrangePlumber();

        var hit = (await _factory.GetJson("/api/search?q=plumbing")).GetProperty("hits")[0];

        var explanation = hit.GetProperty("explanation");
        Assert.Equal("Matches plumbing in name and 1 service", explanation.GetProperty("text").GetString());
        var range = explanation.GetProperty("highlights")[0];
        var start = range.GetProperty("start").GetInt32();
        var length = range.GetProperty("length").GetInt32();
        Assert.Equal("plumbing", explanation.GetProperty("text").GetString()!.Substring(start, length));
    }

    // L2-029 AC3
    [Theory]
    [InlineData("plumber")]
    [InlineData("plumbing")]
    [InlineData("Plumbers")]
    public async Task L2_029_AC3_stemming_and_case_folding_return_the_same_businesses(string query)
    {
        await ArrangePlumber();

        var json = await _factory.GetJson($"/api/search?q={query}");

        var businesses = json.GetProperty("hits").EnumerateArray()
            .Where(h => h.GetProperty("kind").GetString() == "business")
            .Select(h => h.GetProperty("slug").GetString()!)
            .ToArray();
        Assert.Equal(["waterworks"], businesses);
    }

    // L2-029 AC4
    [Theory]
    [InlineData("cafe")]
    [InlineData("café")]
    public async Task L2_029_AC4_accents_are_folded(string query)
    {
        await _factory.Arrange(ListingMother.Public("grace", "community", "Grace Café"));

        var json = await _factory.GetJson($"/api/search?q={Uri.EscapeDataString(query)}");

        Assert.Equal(1, json.GetProperty("businessCount").GetInt32());
    }

    // L2-029 AC1: only the directory's live listings are searched (L2-028)
    [Fact]
    public async Task L2_028_only_public_listings_and_their_services_and_products_are_found()
    {
        var hidden = ListingMother.NonPublic(NonPublicState.Paused, "hidden-plumber", "home-property");
        await _factory.Arrange(hidden, Offer(hidden, "Plumbing repair"));

        var json = await _factory.GetJson("/api/search?q=plumbing");

        Assert.Equal(0, json.GetProperty("businessCount").GetInt32());
        Assert.Equal(0, json.GetProperty("serviceCount").GetInt32());
    }

    // L2-030 AC1
    [Fact]
    public async Task L2_030_AC1_a_search_that_matches_nothing_offers_a_close_term_and_a_category()
    {
        await _factory.Arrange(ListingMother.Public("joe", "home-property", "Joe the Plumber"));

        var json = await _factory.GetJson("/api/search?q=plumbre");

        Assert.Equal(0, json.GetProperty("hits").GetArrayLength());
        var suggestion = json.GetProperty("suggestion");
        Assert.Equal("plumber", suggestion.GetProperty("closeTerm").GetString());
        Assert.Equal("home-property", suggestion.GetProperty("categorySlug").GetString());
    }

    // L2-030 AC2
    [Fact]
    public async Task L2_030_AC2_without_a_close_term_there_is_no_suggestion()
    {
        await ArrangePlumber();

        var json = await _factory.GetJson("/api/search?q=zzzzzzzz");

        Assert.Equal(0, json.GetProperty("hits").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("suggestion").ValueKind);
    }

    // L2-031 AC1, AC2
    [Fact]
    public async Task L2_031_AC1_the_empty_search_page_lists_popular_categories_and_a_members_recent_searches_newest_first()
    {
        await ArrangePlumber();
        var member = _factory.CreateMemberClient();
        foreach (var q in new[] { "one", "two", "three", "four", "five", "six" })
        {
            _factory.Clock.Advance(TimeSpan.FromMinutes(1));
            Assert.Equal(HttpStatusCode.OK, (await member.GetAsync($"/api/search?q={q}")).StatusCode);
        }

        var json = await _factory.GetJson("/api/search/start", member);

        Assert.Equal(["six", "five", "four", "three", "two"],
            json.GetProperty("recent").EnumerateArray().Select(r => r.GetProperty("query").GetString()!).ToArray());
        Assert.Equal("home-property", json.GetProperty("popularCategories")[0].GetProperty("slug").GetString());
    }

    [Fact]
    public async Task L2_031_AC2_a_visitor_has_no_recent_searches()
    {
        await ArrangePlumber();
        await _factory.CreateClient().GetAsync("/api/search?q=plumber");

        var json = await _factory.GetJson("/api/search/start");

        Assert.Equal(0, json.GetProperty("recent").GetArrayLength());
    }

    [Fact]
    public async Task L2_031_AC1_an_empty_query_answers_with_the_start_payload()
    {
        var json = await _factory.GetJson("/api/search?q=%20%20");

        Assert.True(json.TryGetProperty("recent", out _));
        Assert.True(json.TryGetProperty("popularCategories", out _));
    }

    // L2-031 AC3, L2-133
    [Fact]
    public async Task L2_031_AC3_a_member_removes_one_recent_search_and_clears_the_rest()
    {
        var member = _factory.CreateMemberClient();
        await member.GetAsync("/api/search?q=alpha");
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await member.GetAsync("/api/search?q=beta");
        var recent = (await _factory.GetJson("/api/search/start", member)).GetProperty("recent");
        var id = recent[0].GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync($"/api/search/recent/{id}")).StatusCode);
        var left = (await _factory.GetJson("/api/search/start", member)).GetProperty("recent");
        Assert.Equal(["alpha"], left.EnumerateArray().Select(r => r.GetProperty("query").GetString()!).ToArray());

        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync("/api/search/recent")).StatusCode);
        Assert.Equal(0, (await _factory.GetJson("/api/search/start", member)).GetProperty("recent").GetArrayLength());
    }

    [Fact]
    public async Task L2_133_removing_another_members_recent_search_is_not_found_and_changes_nothing()
    {
        var owner = _factory.CreateMemberClient("Joanna Adeyemi");
        await owner.GetAsync("/api/search?q=alpha");
        var id = (await _factory.GetJson("/api/search/start", owner)).GetProperty("recent")[0].GetProperty("id").GetGuid();

        var other = _factory.CreateMemberClient("Daniel Okafor");
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"/api/search/recent/{id}")).StatusCode);

        Assert.Equal(1, (await _factory.GetJson("/api/search/start", owner)).GetProperty("recent").GetArrayLength());
    }

    [Fact]
    public async Task L2_133_removing_recent_searches_needs_a_session()
    {
        var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.DeleteAsync("/api/search/recent")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.DeleteAsync($"/api/search/recent/{Guid.NewGuid()}")).StatusCode);
    }

    // L2-032 AC1
    [Fact]
    public async Task L2_032_AC1_a_long_query_is_cut_to_100_characters()
    {
        var json = await _factory.GetJson($"/api/search?q={new string('a', 150)}");

        Assert.Equal(100, json.GetProperty("query").GetString()!.Length);
    }

    // L2-032 AC3
    [Fact]
    public async Task L2_032_AC3_markup_in_a_query_is_returned_as_plain_text()
    {
        var json = await _factory.GetJson($"/api/search?q={Uri.EscapeDataString("<script>alert(1)</script>")}");

        Assert.Equal("<script>alert(1)</script>", json.GetProperty("query").GetString());
    }

    // L2-181 AC3
    [Fact]
    public async Task L2_181_AC3_when_the_index_is_down_a_name_search_answers_without_explanations()
    {
        await using var broken = new BrokenIndexFactory();
        await broken.Reset();
        await broken.Arrange(ListingMother.Public("waterworks", "home-property", "Waterworks Plumbing"));

        var json = await broken.GetJson("/api/search?q=plumbing");

        Assert.False(json.GetProperty("hasMatchExplanations").GetBoolean());
        Assert.Equal(1, json.GetProperty("businessCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("hits")[0].GetProperty("explanation").ValueKind);
    }

    // L2-029 AC6, L2-118
    [Fact]
    public async Task L2_029_AC6_a_failing_search_is_503_with_a_reference()
    {
        _factory.Database.Unavailable = true;

        var response = await _factory.CreateClient().GetAsync("/api/search?q=plumber");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("JB-SRCH-503", json.GetProperty("reference").GetString());
    }
}

public sealed class SixtySearchesFactory : JubileeApiFactory
{
}

public class SearchRateLimitTests(SixtySearchesFactory factory) : IClassFixture<SixtySearchesFactory>
{
    // L2-032 AC4
    [Fact]
    public async Task L2_032_AC4_more_than_60_searches_a_minute_from_one_address_get_429()
    {
        var client = factory.CreateClient();
        for (var i = 0; i < 60; i++)
        {
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/search?q=plumber")).StatusCode);
        }

        var refused = await client.GetAsync("/api/search?q=plumber");

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
    }
}
