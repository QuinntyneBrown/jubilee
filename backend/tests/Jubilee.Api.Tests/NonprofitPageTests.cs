// Acceptance Test
// Traces to: L2-291, L2-292, L2-293, L2-290
// Description: the page of a non-profit carries its own words, its website and its page for
// giving for the links out, never links an address the rules refuse, and takes no requests and
// no reviews.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

public class NonprofitPageTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Leader = "member|grace";
    private readonly JubileeApiFactory _factory;

    public NonprofitPageTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static string Url(string slug) => $"/api/listings/{slug}";

    private static Listing HopeHouse(string website = "https://www.hopehouse.example", string? giveUrl = "https://hopehouse.example/give")
    {
        var nonprofit = ListingMother.Nonprofit("hope-house", "Hope House Toronto", website, giveUrl);
        nonprofit.Describe(new ListingProfile("Grace Adeyemi", [], null, null, null, null, null, null));
        nonprofit.AssignOwner(Leader);
        return nonprofit;
    }

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static async Task<string?> Code(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString();

    [Fact]
    public async Task L2_291_AC10_a_non_profit_page_has_its_addresses_hosts_and_its_own_words()
    {
        await _factory.Arrange(HopeHouse());

        var json = await _factory.GetJson(Url("hope-house"));

        Assert.Equal("nonprofit", json.GetProperty("kind").GetString());
        Assert.Equal("Grace Adeyemi", json.GetProperty("ownerName").GetString());
        Assert.Equal("Non-profits", json.GetProperty("category").GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("platform").ValueKind);
        var nonprofit = json.GetProperty("nonprofit");
        Assert.Equal("https://www.hopehouse.example", nonprofit.GetProperty("website").GetString());
        Assert.Equal("hopehouse.example", nonprofit.GetProperty("host").GetString());
        Assert.Equal("https://hopehouse.example/give", nonprofit.GetProperty("giveUrl").GetString());
        Assert.Equal("hopehouse.example", nonprofit.GetProperty("giveHost").GetString());
        Assert.Equal(ListingMother.NonprofitMission, nonprofit.GetProperty("mission").GetString());
        Assert.Equal(ListingMother.NonprofitServes, nonprofit.GetProperty("serves").GetString());
        Assert.Equal(ListingMother.NonprofitArea, nonprofit.GetProperty("area").GetString());
    }

    [Fact]
    public async Task L2_291_AC10_every_other_kind_has_no_nonprofit()
    {
        await _factory.Arrange(ListingMother.Public("plumber"), ListingMother.Platform("lanternread"));

        Assert.Equal(JsonValueKind.Null, (await _factory.GetJson(Url("plumber"))).GetProperty("nonprofit").ValueKind);
        Assert.Equal(JsonValueKind.Null, (await _factory.GetJson(Url("lanternread"))).GetProperty("nonprofit").ValueKind);
    }

    [Fact]
    public async Task L2_291_AC2_without_a_page_for_giving_there_is_no_give_link()
    {
        await _factory.Arrange(HopeHouse(giveUrl: null));

        var nonprofit = (await _factory.GetJson(Url("hope-house"))).GetProperty("nonprofit");

        Assert.Equal(JsonValueKind.Null, nonprofit.GetProperty("giveUrl").ValueKind);
        Assert.Equal(JsonValueKind.Null, nonprofit.GetProperty("giveHost").ValueKind);
        Assert.Equal("hopehouse.example", nonprofit.GetProperty("host").GetString());
    }

    [Theory]
    [InlineData("http://hopehouse.example")]
    [InlineData("https://user:secret@hopehouse.example")]
    [InlineData("javascript:alert(1)")]
    [InlineData("hopehouse.example")]
    public async Task L2_292_AC5_an_address_the_rules_refuse_is_left_out_of_the_answer(string stored)
    {
        await _factory.Arrange(HopeHouse(website: stored, giveUrl: stored));

        var nonprofit = (await _factory.GetJson(Url("hope-house"))).GetProperty("nonprofit");

        Assert.Equal(JsonValueKind.Null, nonprofit.GetProperty("website").ValueKind);
        Assert.Equal(JsonValueKind.Null, nonprofit.GetProperty("host").ValueKind);
        Assert.Equal(JsonValueKind.Null, nonprofit.GetProperty("giveUrl").ValueKind);
        Assert.Equal(JsonValueKind.Null, nonprofit.GetProperty("giveHost").ValueKind);
        Assert.Equal(ListingMother.NonprofitMission, nonprofit.GetProperty("mission").GetString());
    }

    [Fact]
    public async Task L2_285_AC3_a_non_profit_page_has_no_services_products_or_space()
    {
        await _factory.Arrange(HopeHouse());

        var json = await _factory.GetJson(Url("hope-house"));

        Assert.Equal(0, json.GetProperty("services").GetArrayLength());
        Assert.Equal(0, json.GetProperty("products").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("space").ValueKind);
    }

    [Fact]
    public async Task L2_290_AC6_more_in_non_profits_lists_other_live_non_profits_never_itself()
    {
        await _factory.Arrange(
            HopeHouse(),
            ListingMother.Nonprofit("bread-and-bridges", "Bread & Bridges"),
            ListingMother.Nonprofit("lakeshore-youth", "Lakeshore Youth Collective"),
            ListingMother.Nonprofit("fourth", "Fourth"),
            ListingMother.NonPublic(NonPublicState.Paused, "paused-ministry", "non-profits"),
            ListingMother.Public("food-hall", "community"));

        var related = (await _factory.GetJson(Url("hope-house"))).GetProperty("related");

        Assert.Equal(2, related.GetArrayLength());
        Assert.All(related.EnumerateArray(), card =>
        {
            Assert.Equal("non-profits", card.GetProperty("categorySlug").GetString());
            Assert.NotEqual("hope-house", card.GetProperty("slug").GetString());
            Assert.NotEqual("paused-ministry", card.GetProperty("slug").GetString());
        });
    }

    [Fact]
    public async Task L2_291_AC7_AC8_the_leader_sees_their_own_non_profit_and_its_preview_when_paused()
    {
        var paused = HopeHouse();
        paused.Pause();
        await _factory.Arrange(paused);
        var leader = _factory.CreateMemberClient("Grace Adeyemi", Leader);

        var mine = await _factory.GetJson(Url("hope-house"), leader);
        var theirs = await Joanna().GetAsync(Url("hope-house"));

        Assert.Equal("owner", mine.GetProperty("viewerRelation").GetString());
        Assert.Equal("paused", mine.GetProperty("status").GetString());
        Assert.Equal("hopehouse.example", mine.GetProperty("nonprofit").GetProperty("host").GetString());
        Assert.Equal(HttpStatusCode.NotFound, theirs.StatusCode);
    }

    [Fact]
    public async Task L2_293_AC1_a_quote_request_to_a_non_profit_is_refused_as_not_offered()
    {
        await _factory.Arrange(HopeHouse());

        var response = await Joanna().PostAsJsonAsync("/api/requests/quotes", new
        {
            listingSlug = "hope-house",
            description = "Could our church team serve a meal one Saturday?",
            idempotencyKey = Guid.NewGuid().ToString(),
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("NOT_OFFERED", await Code(response));
        await _factory.WithDb(async db => Assert.Equal(0, await db.Requests.CountAsync()));
    }

    [Fact]
    public async Task L2_293_AC2_a_non_profits_reviews_list_none_and_offer_no_writing()
    {
        await _factory.Arrange(HopeHouse());

        var signedIn = await _factory.GetJson($"{Url("hope-house")}/reviews", Joanna());
        var visitor = await _factory.GetJson($"{Url("hope-house")}/reviews");

        Assert.Equal("not-offered", signedIn.GetProperty("writing").GetString());
        Assert.Equal("not-offered", visitor.GetProperty("writing").GetString());
        Assert.Equal(0, signedIn.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task L2_293_AC3_starting_or_posting_a_review_of_a_non_profit_is_refused_as_not_offered()
    {
        await _factory.Arrange(HopeHouse());

        var form = await Joanna().GetAsync($"{Url("hope-house")}/reviews/new");
        var post = await Joanna().PostAsJsonAsync($"{Url("hope-house")}/reviews", new
        {
            rating = 5,
            text = "A warm welcome every Saturday, and the meals are wonderful.",
            usedIt = true,
        });

        Assert.Equal(HttpStatusCode.Conflict, form.StatusCode);
        Assert.Equal("NOT_OFFERED", await Code(form));
        Assert.Equal(HttpStatusCode.Conflict, post.StatusCode);
        Assert.Equal("NOT_OFFERED", await Code(post));
        await _factory.WithDb(async db => Assert.Equal(0, await db.Reviews.CountAsync()));
    }

    [Fact]
    public async Task L2_290_AC7_a_member_saves_a_non_profit()
    {
        await _factory.Arrange(HopeHouse());

        var saved = await Joanna().PutAsync("/api/saved/businesses/hope-house", null);

        Assert.True(saved.IsSuccessStatusCode, saved.StatusCode.ToString());
    }
}
