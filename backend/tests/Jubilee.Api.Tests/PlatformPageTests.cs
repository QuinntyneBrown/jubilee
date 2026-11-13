// Acceptance Test
// Traces to: L2-254, L2-255, L2-253
// Description: the page of a software platform carries the founder's words and the web address the
// link out goes to, takes no requests, and never links an address the rules refuse.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public class PlatformPageTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Founder = "member|abigail";
    private readonly JubileeApiFactory _factory;

    public PlatformPageTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static string Url(string slug) => $"/api/listings/{slug}";

    private static Listing Lanternread(string website = "https://www.lanternread.example/start")
    {
        var platform = ListingMother.Platform("lanternread", "Lanternread", website);
        platform.Describe(new ListingProfile("Abigail Thornton", [], null, null, null, null, null, null));
        platform.AssignOwner(Founder);
        return platform;
    }

    [Fact]
    public async Task L2_254_AC9_a_platform_page_has_its_address_host_and_the_founders_words()
    {
        await _factory.Arrange(Lanternread());

        var json = await _factory.GetJson(Url("lanternread"));

        Assert.Equal("platform", json.GetProperty("kind").GetString());
        Assert.Equal("Lanternread", json.GetProperty("name").GetString());
        Assert.Equal("Abigail Thornton", json.GetProperty("ownerName").GetString());
        Assert.Equal("Software platforms", json.GetProperty("category").GetProperty("name").GetString());

        var platform = json.GetProperty("platform");
        Assert.Equal("https://www.lanternread.example/start", platform.GetProperty("website").GetString());
        Assert.Equal("lanternread.example", platform.GetProperty("host").GetString());
        Assert.Equal("Families log the books their children read.", platform.GetProperty("does").GetString());
        Assert.Equal("Families with children aged 4 to 12.", platform.GetProperty("for").GetString());
        Assert.Equal("Free for families.", platform.GetProperty("pricing").GetString());
    }

    [Fact]
    public async Task L2_254_AC9_every_other_kind_has_no_platform()
    {
        await _factory.Arrange(ListingMother.Public("plumber"), ListingMother.Space("a-space"));

        Assert.Equal(JsonValueKind.Null, (await _factory.GetJson(Url("plumber"))).GetProperty("platform").ValueKind);
        Assert.Equal(JsonValueKind.Null, (await _factory.GetJson(Url("a-space"))).GetProperty("platform").ValueKind);
    }

    [Fact]
    public async Task L2_254_AC3_a_platform_page_has_no_services_products_or_space()
    {
        await _factory.Arrange(Lanternread());

        var json = await _factory.GetJson(Url("lanternread"));

        Assert.Equal(0, json.GetProperty("services").GetArrayLength());
        Assert.Equal(0, json.GetProperty("products").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("space").ValueKind);
        Assert.Equal(0, json.GetProperty("relatedSpaces").GetArrayLength());
    }

    [Theory]
    [InlineData("http://lanternread.example")]
    [InlineData("https://user:secret@lanternread.example")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://localhost")]
    [InlineData("lanternread.example")]
    public async Task L2_255_AC5_an_address_the_rules_refuse_is_left_out_of_the_answer(string stored)
    {
        await _factory.Arrange(Lanternread(stored));

        var platform = (await _factory.GetJson(Url("lanternread"))).GetProperty("platform");

        Assert.Equal(JsonValueKind.Null, platform.GetProperty("website").ValueKind);
        Assert.Equal(JsonValueKind.Null, platform.GetProperty("host").ValueKind);
        Assert.Equal("Families log the books their children read.", platform.GetProperty("does").GetString());
    }

    [Fact]
    public async Task L2_253_AC5_more_in_software_platforms_lists_other_live_platforms_never_itself()
    {
        await _factory.Arrange(
            Lanternread(),
            ListingMother.Platform("gatherboard", "Gatherboard"),
            ListingMother.Platform("ledgerleaf", "Ledgerleaf"),
            ListingMother.Platform("fourth", "Fourth"),
            ListingMother.NonPublic(NonPublicState.Paused, "paused-platform", "software-platforms"),
            ListingMother.Public("it-shop", "business-tech"));

        var related = (await _factory.GetJson(Url("lanternread"))).GetProperty("related");

        Assert.Equal(2, related.GetArrayLength());
        Assert.All(related.EnumerateArray(), card =>
        {
            Assert.Equal("software-platforms", card.GetProperty("categorySlug").GetString());
            Assert.NotEqual("lanternread", card.GetProperty("slug").GetString());
            Assert.NotEqual("paused-platform", card.GetProperty("slug").GetString());
        });
    }

    [Fact]
    public async Task L2_254_AC6_AC7_the_founder_sees_their_own_platform_and_its_preview_when_paused()
    {
        var paused = Lanternread();
        paused.Pause();
        await _factory.Arrange(paused);
        var founder = _factory.CreateMemberClient("Abigail Thornton", Founder);
        var other = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

        var mine = await _factory.GetJson(Url("lanternread"), founder);
        var theirs = await other.GetAsync(Url("lanternread"));

        Assert.Equal("owner", mine.GetProperty("viewerRelation").GetString());
        Assert.Equal("paused", mine.GetProperty("status").GetString());
        Assert.Equal("lanternread.example", mine.GetProperty("platform").GetProperty("host").GetString());
        Assert.Equal(HttpStatusCode.NotFound, theirs.StatusCode);
    }

    [Fact]
    public async Task L2_254_AC3_a_quote_request_to_a_platform_is_refused_as_not_offered()
    {
        await _factory.Arrange(Lanternread());
        var joanna = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

        var response = await joanna.PostAsJsonAsync("/api/requests/quotes", new
        {
            listingSlug = "lanternread",
            description = "Could you build us a reading log for our school?",
            idempotencyKey = Guid.NewGuid().ToString(),
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("NOT_OFFERED", problem.GetProperty("code").GetString());
        var requests = 0;
        await _factory.WithDb(async db => requests = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(db.Requests));
        Assert.Equal(0, requests);
    }
}
