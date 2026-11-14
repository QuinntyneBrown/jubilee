// Acceptance Test
// Traces to: L2-286, L2-287, L2-288
// Description: a leader lists a non-profit through the listing draft: the draft keeps every
// non-profit field, publishing validates them and both addresses, and a valid non-profit is live at
// once in "Non-profits". Nothing asks for a charity number and nothing requests the addresses.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

public sealed class NonprofitOnboardingTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Mission = "We share meals, beds and friendship with men leaving the shelter system, until each has a home of his own.";
    private const string Serves = "Men aged 18 and over leaving shelters in downtown Toronto.";
    private const string Area = "Moss Park and Regent Park";
    private readonly JubileeApiFactory _factory;

    public NonprofitOnboardingTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Grace() => _factory.CreateMemberClient("Grace Adeyemi", "member|grace");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Dictionary<string, object?> Nonprofit(
        string? website = "https://hopehouse.example",
        string? giveUrl = "https://hopehouse.example/give",
        string? mission = Mission,
        string? serves = Serves,
        string? area = Area) => new()
        {
            ["website"] = website,
            ["giveUrl"] = giveUrl,
            ["mission"] = mission,
            ["serves"] = serves,
            ["area"] = area,
        };

    private static Dictionary<string, object?> Body(
        Dictionary<string, object?>? nonprofit = null,
        bool agreed = true,
        string? name = "Hope House Toronto",
        string? tagline = "Meals, beds and friendship for men leaving the shelter system",
        string? categorySlug = null) => new()
        {
            ["kind"] = "nonprofit",
            ["name"] = name,
            ["tagline"] = tagline,
            ["categorySlug"] = categorySlug,
            ["highlight"] = "Volunteers welcome",
            ["place"] = "Toronto",
            ["agreed"] = agreed,
            ["items"] = new object[] { new { name = "A service a non-profit cannot have", priceKind = "free" } },
            ["nonprofit"] = nonprofit ?? Nonprofit(),
            ["idempotencyKey"] = Guid.NewGuid().ToString(),
        };

    private async Task<Guid> Draft(HttpClient client, Dictionary<string, object?> body)
    {
        var response = await client.PostAsJsonAsync("/api/listing-drafts", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    private async Task<HttpResponseMessage> Publish(Dictionary<string, object?> body)
    {
        var id = await Draft(Grace(), body);
        return await Grace().PostAsJsonAsync($"/api/listing-drafts/{id}/publish", body);
    }

    [Fact]
    public async Task L2_286_AC4_L2_287_AC9_a_non_profit_draft_keeps_its_kind_and_every_field_as_typed()
    {
        await Draft(Grace(), Body(Nonprofit(website: "not yet an address", area: null), agreed: false));

        var draft = await _factory.GetJson("/api/listing-drafts/current", Grace());

        Assert.Equal("nonprofit", draft.GetProperty("kind").GetString());
        Assert.Equal("Hope House Toronto", draft.GetProperty("name").GetString());
        Assert.Equal("Volunteers welcome", draft.GetProperty("highlight").GetString());
        Assert.Equal(0, draft.GetProperty("items").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, draft.GetProperty("platform").ValueKind);
        var nonprofit = draft.GetProperty("nonprofit");
        Assert.Equal("not yet an address", nonprofit.GetProperty("website").GetString());
        Assert.Equal("https://hopehouse.example/give", nonprofit.GetProperty("giveUrl").GetString());
        Assert.Equal(Mission, nonprofit.GetProperty("mission").GetString());
        Assert.Equal(Serves, nonprofit.GetProperty("serves").GetString());
        Assert.Equal(string.Empty, nonprofit.GetProperty("area").GetString());
    }

    [Fact]
    public async Task L2_286_AC4_a_draft_of_another_kind_has_no_nonprofit()
    {
        var body = Body();
        body["kind"] = "services";
        body["categorySlug"] = "community";
        await Draft(Grace(), body);

        var draft = await _factory.GetJson("/api/listing-drafts/current", Grace());

        Assert.Equal(JsonValueKind.Null, draft.GetProperty("nonprofit").ValueKind);
    }

    [Fact]
    public async Task L2_288_AC2_AC3_a_valid_non_profit_is_published_live_into_non_profits()
    {
        var response = await Publish(Body(categorySlug: "community"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var published = await Json(response);
        Assert.Equal("nonprofit", published.GetProperty("kind").GetString());
        Assert.Equal("live", published.GetProperty("stage").GetString());
        Assert.Equal("hope-house-toronto", published.GetProperty("slug").GetString());

        await _factory.WithDb(async db =>
        {
            var listing = await db.Listings.AsNoTracking().SingleAsync(l => l.Slug == "hope-house-toronto");
            Assert.Equal(Category.NonprofitsSlug, listing.CategorySlug);
            Assert.Equal(ListingKind.Nonprofit, listing.Kind);
            Assert.Equal("member|grace", listing.OwnerId);
            Assert.Equal("https://hopehouse.example", listing.Website);
            Assert.Equal(Mission, listing.Nonprofit!.Mission);
            Assert.Equal(Serves, listing.Nonprofit.Serves);
            Assert.Equal(Area, listing.Nonprofit.Area);
            Assert.Equal("https://hopehouse.example/give", listing.Nonprofit.GiveUrl);
            Assert.Null(listing.Platform);
            Assert.True(listing.IsPublic());
            Assert.Equal(0, await db.Services.CountAsync(s => s.ListingId == listing.Id));
            Assert.Equal(0, await db.Products.CountAsync(p => p.ListingId == listing.Id));
        });

        var category = await _factory.GetJson("/api/categories/non-profits/listings");
        Assert.Equal(["hope-house-toronto"], category.GetProperty("businesses").Slugs());
    }

    [Fact]
    public async Task L2_287_AC5_a_non_profit_without_a_page_for_giving_is_published()
    {
        var response = await Publish(Body(Nonprofit(giveUrl: " ")));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await _factory.WithDb(async db => Assert.Null((await db.Listings.AsNoTracking().SingleAsync()).Nonprofit!.GiveUrl));
    }

    [Fact]
    public async Task L2_287_AC3_AC6_AC7_empty_non_profit_fields_are_refused_and_what_was_typed_is_kept()
    {
        var response = await Publish(Body(Nonprofit(website: " ", mission: null, serves: "", area: "  ")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REQUIRED", errors.GetProperty("nonprofit.website").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("nonprofit.mission").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("nonprofit.serves").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("nonprofit.area").GetString());
        Assert.False(errors.TryGetProperty("nonprofit.giveUrl", out _));
        Assert.False(errors.TryGetProperty("categorySlug", out _));

        var draft = await _factory.GetJson("/api/listing-drafts/current", Grace());
        Assert.Equal("nonprofit", draft.GetProperty("kind").GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.Listings.CountAsync()));
    }

    [Fact]
    public async Task L2_285_AC1_no_other_listing_is_published_into_non_profits()
    {
        var body = Body();
        body["kind"] = "services";
        body["categorySlug"] = "non-profits";
        body["nonprofit"] = null;

        var response = await Publish(body);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("categorySlug").GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.Listings.CountAsync()));
    }

    [Theory]
    [InlineData("http://hopehouse.example")]
    [InlineData("hopehouse.example")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://me:secret@hopehouse.example")]
    [InlineData("https://localhost")]
    public async Task L2_287_AC4_a_website_that_is_not_a_plain_https_address_is_refused(string website)
    {
        var response = await Publish(Body(Nonprofit(website: website)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("INVALID", (await Json(response)).GetProperty("errors").GetProperty("nonprofit.website").GetString());
    }

    [Theory]
    [InlineData("http://hopehouse.example/give")]
    [InlineData("hopehouse.example/give")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://me:secret@hopehouse.example/give")]
    public async Task L2_287_AC4_a_page_for_giving_that_is_not_a_plain_https_address_is_refused(string giveUrl)
    {
        var response = await Publish(Body(Nonprofit(giveUrl: giveUrl)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("INVALID", (await Json(response)).GetProperty("errors").GetProperty("nonprofit.giveUrl").GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.Listings.CountAsync()));
    }

    [Fact]
    public async Task L2_287_AC4_a_page_for_giving_longer_than_200_characters_is_refused()
    {
        var response = await Publish(Body(Nonprofit(giveUrl: $"https://hopehouse.example/{new string('g', 180)}")));

        Assert.Equal("INVALID", (await Json(response)).GetProperty("errors").GetProperty("nonprofit.giveUrl").GetString());
    }

    [Fact]
    public async Task L2_287_AC2_longer_words_are_cut_to_their_limits()
    {
        var response = await Publish(Body(Nonprofit(mission: new string('m', 700), serves: new string('s', 400), area: new string('a', 200))));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await _factory.WithDb(async db =>
        {
            var nonprofit = (await db.Listings.AsNoTracking().SingleAsync()).Nonprofit!;
            Assert.Equal(600, nonprofit.Mission.Length);
            Assert.Equal(300, nonprofit.Serves.Length);
            Assert.Equal(120, nonprofit.Area.Length);
        });
    }

    [Fact]
    public async Task L2_288_AC1_without_the_agreement_nothing_is_published()
    {
        var response = await Publish(Body(agreed: false));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("agreed").GetString());
    }

    [Fact]
    public async Task L2_287_AC8_the_addresses_raise_no_flag()
    {
        var plain = await Publish(Body());

        Assert.Equal(HttpStatusCode.Created, plain.StatusCode);
        await _factory.WithDb(async db => Assert.Empty((await db.ListingSubmissions.AsNoTracking().SingleAsync()).Flags));
    }

    [Fact]
    public async Task L2_288_AC4_a_visitor_cannot_start_a_non_profit_draft()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/listing-drafts", Body());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
