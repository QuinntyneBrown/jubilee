// Acceptance Test
// Traces to: L2-249, L2-250, L2-251, L2-253
// Description: a founder lists a software platform through the listing draft: the draft keeps
// every platform field, publishing validates them and the web address, and a valid platform is
// live at once in "Software platforms". Nothing requests the address.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

public sealed class PlatformOnboardingTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Does = "Families log the books their children read, set a weekly reading goal together and see the streak grow.";
    private const string For = "Families with children aged 4 to 12, and the teachers who cheer them on.";
    private const string Pricing = "Free for families. Schools pay per classroom.";
    private readonly JubileeApiFactory _factory;

    public PlatformOnboardingTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Abigail() => _factory.CreateMemberClient("Abigail Thornton", "member|abigail");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Dictionary<string, object?> Platform(
        string? website = "https://lanternread.example", string? does = Does, string? @for = For, string? pricing = Pricing) => new()
        {
            ["website"] = website,
            ["does"] = does,
            ["for"] = @for,
            ["pricing"] = pricing,
        };

    private static Dictionary<string, object?> Body(
        Dictionary<string, object?>? platform = null,
        bool agreed = true,
        string? name = "Lanternread",
        string? tagline = "A reading log families keep together",
        string? categorySlug = null) => new()
        {
            ["kind"] = "platform",
            ["name"] = name,
            ["tagline"] = tagline,
            ["categorySlug"] = categorySlug,
            ["highlight"] = "Free for families",
            ["place"] = "Toronto",
            ["agreed"] = agreed,
            ["items"] = new object[] { new { name = "A service a platform cannot have", priceKind = "free" } },
            ["platform"] = platform ?? Platform(),
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
        var id = await Draft(Abigail(), body);
        return await Abigail().PostAsJsonAsync($"/api/listing-drafts/{id}/publish", body);
    }

    [Fact]
    public async Task L2_249_AC4_L2_250_AC8_a_platform_draft_keeps_its_kind_and_every_field_as_typed()
    {
        await Draft(Abigail(), Body(Platform(website: "not yet an address", pricing: null), agreed: false));

        var draft = await _factory.GetJson("/api/listing-drafts/current", Abigail());

        Assert.Equal("platform", draft.GetProperty("kind").GetString());
        Assert.Equal("Lanternread", draft.GetProperty("name").GetString());
        Assert.Equal("Free for families", draft.GetProperty("highlight").GetString());
        Assert.Equal(0, draft.GetProperty("items").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, draft.GetProperty("space").ValueKind);
        var platform = draft.GetProperty("platform");
        Assert.Equal("not yet an address", platform.GetProperty("website").GetString());
        Assert.Equal(Does, platform.GetProperty("does").GetString());
        Assert.Equal(For, platform.GetProperty("for").GetString());
        Assert.Equal(string.Empty, platform.GetProperty("pricing").GetString());
    }

    [Fact]
    public async Task L2_249_AC4_a_draft_of_another_kind_has_no_platform()
    {
        var body = Body();
        body["kind"] = "services";
        body["categorySlug"] = "learning";
        await Draft(Abigail(), body);

        var draft = await _factory.GetJson("/api/listing-drafts/current", Abigail());

        Assert.Equal("services", draft.GetProperty("kind").GetString());
        Assert.Equal(JsonValueKind.Null, draft.GetProperty("platform").ValueKind);
    }

    [Fact]
    public async Task L2_251_AC2_AC3_a_valid_platform_is_published_live_into_software_platforms()
    {
        var response = await Publish(Body(categorySlug: "learning"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var published = await Json(response);
        Assert.Equal("platform", published.GetProperty("kind").GetString());
        Assert.Equal("live", published.GetProperty("stage").GetString());
        Assert.Equal("lanternread", published.GetProperty("slug").GetString());

        await _factory.WithDb(async db =>
        {
            var listing = await db.Listings.AsNoTracking().SingleAsync(l => l.Slug == "lanternread");
            Assert.Equal(Category.PlatformsSlug, listing.CategorySlug);
            Assert.Equal(ListingKind.Platform, listing.Kind);
            Assert.Equal("member|abigail", listing.OwnerId);
            Assert.Equal("Abigail Thornton", listing.OwnerName);
            Assert.Equal("https://lanternread.example", listing.Website);
            Assert.Equal(Does, listing.Platform!.Does);
            Assert.Equal(For, listing.Platform.For);
            Assert.Equal(Pricing, listing.Platform.Pricing);
            Assert.Equal("Free for families", listing.Highlight);
            Assert.Null(listing.Where);
            Assert.True(listing.IsPublic());
            Assert.Equal(0, await db.Services.CountAsync(s => s.ListingId == listing.Id));
            Assert.Equal(0, await db.Products.CountAsync(p => p.ListingId == listing.Id));
            Assert.Equal(0, await db.ListingDrafts.CountAsync());
        });

        var category = await _factory.GetJson("/api/categories/software-platforms/listings");
        var page = await _factory.GetJson("/api/listings/lanternread");
        var search = await _factory.GetJson("/api/search?q=lanternread");
        Assert.Equal(["lanternread"], category.GetProperty("businesses").Slugs());
        Assert.Equal("lanternread.example", page.GetProperty("platform").GetProperty("host").GetString());
        Assert.Equal(1, search.GetProperty("businessCount").GetInt32());
    }

    [Fact]
    public async Task L2_250_AC3_AC5_AC6_empty_platform_fields_are_refused_and_what_was_typed_is_kept()
    {
        var response = await Publish(Body(Platform(website: " ", does: null, @for: "", pricing: "  "), name: "Lanternread"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REQUIRED", errors.GetProperty("platform.website").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("platform.does").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("platform.for").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("platform.pricing").GetString());
        Assert.False(errors.TryGetProperty("categorySlug", out _));

        var draft = await _factory.GetJson("/api/listing-drafts/current", Abigail());
        Assert.Equal("platform", draft.GetProperty("kind").GetString());
        Assert.Equal("Lanternread", draft.GetProperty("name").GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.Listings.CountAsync()));
    }

    [Fact]
    public async Task L2_248_AC1_a_business_is_never_published_into_software_platforms()
    {
        var body = Body();
        body["kind"] = "services";
        body["categorySlug"] = "software-platforms";
        body["platform"] = null;

        var response = await Publish(body);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("categorySlug").GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.Listings.CountAsync()));
    }

    [Theory]
    [InlineData("http://lanternread.example")]
    [InlineData("lanternread.example")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://me:secret@lanternread.example")]
    [InlineData("https://localhost")]
    [InlineData("https://lantern read.example")]
    [InlineData("ftp://lanternread.example")]
    public async Task L2_250_AC4_a_web_address_that_is_not_a_plain_https_address_is_refused(string website)
    {
        var response = await Publish(Body(Platform(website: website)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("INVALID", (await Json(response)).GetProperty("errors").GetProperty("platform.website").GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.Listings.CountAsync()));
    }

    [Fact]
    public async Task L2_250_AC4_a_web_address_longer_than_200_characters_is_refused()
    {
        var response = await Publish(Body(Platform(website: $"https://lanternread.example/{new string('a', 180)}")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("INVALID", (await Json(response)).GetProperty("errors").GetProperty("platform.website").GetString());
    }

    [Fact]
    public async Task L2_250_AC2_longer_words_are_cut_to_their_limits()
    {
        var response = await Publish(Body(Platform(does: new string('d', 700), @for: new string('f', 400), pricing: new string('p', 200))));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await _factory.WithDb(async db =>
        {
            var platform = (await db.Listings.AsNoTracking().SingleAsync()).Platform!;
            Assert.Equal(600, platform.Does.Length);
            Assert.Equal(300, platform.For.Length);
            Assert.Equal(120, platform.Pricing.Length);
        });
    }

    [Fact]
    public async Task L2_251_AC1_without_the_agreement_nothing_is_published()
    {
        var response = await Publish(Body(agreed: false));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("agreed").GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.Listings.CountAsync()));
    }

    [Fact]
    public async Task L2_250_AC7_the_web_address_raises_no_flag_but_an_address_in_the_line_does()
    {
        var plain = await Publish(Body());
        var inLine = await Publish(Body(name: "Gatherboard", tagline: "Rosters at gatherboard.com for small churches"));

        Assert.Equal(HttpStatusCode.Created, plain.StatusCode);
        Assert.Equal(HttpStatusCode.Created, inLine.StatusCode);
        await _factory.WithDb(async db =>
        {
            var flags = await db.ListingSubmissions.AsNoTracking().ToListAsync();
            var listings = await db.Listings.AsNoTracking().ToDictionaryAsync(l => l.Id, l => l.Slug);
            Assert.Empty(flags.Single(f => listings[f.ListingId] == "lanternread").Flags);
            Assert.Contains("CONTACT_IN_TEXT", flags.Single(f => listings[f.ListingId] == "gatherboard").Flags);
        });
    }

    [Fact]
    public async Task L2_251_AC4_a_visitor_cannot_start_a_platform_draft()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/listing-drafts", Body());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task L2_253_AC3_members_who_browsed_software_platforms_are_told_of_a_new_platform()
    {
        var joanna = Member.Join(EmailAddress.TryParse("joanna@example.com")!, "Joanna", "Adeyemi", null, "hash", ListingMother.Now);
        joanna.ConfirmEmail();
        await _factory.Arrange(joanna, ListingMother.Platform("gatherboard", "Gatherboard", "https://gatherboard.example"));
        var asJoanna = _factory.CreateMemberClient("Joanna Adeyemi", joanna.Id.ToString());
        Assert.True((await asJoanna.PatchAsJsonAsync("/api/account/notification-preferences", new { setting = "new-businesses", enabled = true })).IsSuccessStatusCode);
        Assert.True((await asJoanna.PostAsync("/api/listings/gatherboard/views", null)).IsSuccessStatusCode);

        var published = await Publish(Body());

        Assert.Equal(HttpStatusCode.Created, published.StatusCode);
        var notifications = (await _factory.GetJson("/api/notifications", asJoanna)).GetProperty("items").EnumerateArray()
            .Where(i => i.GetProperty("kind").GetString() == "business").ToList();
        var item = Assert.Single(notifications);
        Assert.Equal("New in Software platforms: Lanternread", item.GetProperty("title").GetString());
        Assert.Equal("/b/lanternread", item.GetProperty("target").GetString());
    }
}
