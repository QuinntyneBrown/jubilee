using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>
/// A visitor at an address of their own, so that the searches of one test do not count towards
/// the limit of 60 a minute for each address (L2-032 AC4) in another.
/// </summary>
internal static class Searcher
{
    private static int _next;

    public static HttpClient At(JubileeApiFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(JubileeApiFactory.RemoteAddressHeader, $"203.0.113.{Interlocked.Increment(ref _next)}");
        return client;
    }
}

// Search shows the listings as they are now: L2-029 AC7, L2-028 AC1 and AC2, L2-181 AC3 (ADR 0011).
// Naomi owns Luzandre.com, a live shop; Miriam is on the Jubilee team. No time passes between
// a change and the search after it: there is no index to bring up to date and no indexing job.
public sealed class SearchCurrencyTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string NaomiId = "member|naomi";

    private readonly JubileeApiFactory _factory;
    private readonly HttpClient _visitor;
    private Listing _listing = null!;

    public SearchCurrencyTests(JubileeApiFactory factory)
    {
        _factory = factory;
        _visitor = Searcher.At(factory);
    }

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", tagline: "Custom church team tees");
        _listing.AssignOwner(NaomiId);
        await _factory.Arrange(_listing);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", NaomiId);

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "member|miriam", "moderator");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    /// <summary>The names found for a query, under one kind: "business", "service" or "product".</summary>
    private async Task<string[]> Found(string query, string kind = "business")
    {
        var json = await _factory.GetJson($"/api/search?q={Uri.EscapeDataString(query)}", _visitor);
        var names = json.GetProperty("hits").EnumerateArray()
            .Where(h => h.GetProperty("kind").GetString() == kind)
            .Select(h => h.GetProperty("name").GetString()!)
            .ToArray();
        Assert.Equal(names.Length, json.GetProperty($"{kind}Count").GetInt32());
        return names;
    }

    private static object Edit(int version, string name = "Luzandre.com", string tagline = "Custom church team tees", string about = "We print.") =>
        new { version, name, tagline, category = "shops", about, where = "Leslieville", hours = "Mon to Fri, 10 to 6", website = "https://luzandre.com", highlight = "Ships in 5 days" };

    // L2-029 AC7, L2-028 AC2: paused by its owner, a listing is gone from the next search; resumed, it is back.
    [Fact]
    public async Task L2_029_AC7_a_listing_its_owner_pauses_leaves_the_next_search_and_returns_when_resumed()
    {
        var naomi = Naomi();
        Assert.Equal(["Luzandre.com"], await Found("luzandre"));

        Assert.Equal(HttpStatusCode.OK, (await naomi.PostAsync("/api/my-business/pause", null)).StatusCode);
        Assert.Empty(await Found("luzandre"));

        Assert.Equal(HttpStatusCode.OK, (await naomi.PostAsync("/api/my-business/resume", null)).StatusCode);
        Assert.Equal(["Luzandre.com"], await Found("luzandre"));
    }

    // L2-029 AC7: the words the owner saves are the words the next search matches.
    [Fact]
    public async Task L2_029_AC7_an_edit_of_the_name_the_tagline_and_the_description_reaches_the_next_search()
    {
        Assert.Empty(await Found("embroidery"));
        Assert.Equal(["Luzandre.com"], await Found("tees"));

        var saved = await Naomi().PutAsJsonAsync(
            "/api/my-business/listing", Edit(0, name: "Luzandre Print Co.", tagline: "Hoodies for church teams", about: "Embroidery on request."));

        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        Assert.Equal(["Luzandre Print Co."], await Found("embroidery"));
        Assert.Equal(["Luzandre Print Co."], await Found("hoodies"));
        Assert.Equal(["Luzandre Print Co."], await Found("print"));
        Assert.Empty(await Found("tees"));
    }

    // L2-029 AC7: a service the owner adds, renames or deletes.
    [Fact]
    public async Task L2_029_AC7_a_service_added_changed_or_deleted_reaches_the_next_search()
    {
        var naomi = Naomi();
        object Body(string name) => new
        {
            name, detail = "30 min", pricing = "free", price = (string?)null, action = "ask",
            durationMinutes = (int?)null, offersVideo = true, offersInPerson = false, place = (string?)null, idempotencyKey = (string?)null,
        };
        Assert.Empty(await Found("consultation", "service"));

        var added = await naomi.PostAsJsonAsync("/api/my-business/services", Body("Design consultation"));
        Assert.True(added.IsSuccessStatusCode);
        var id = (await Json(added)).GetProperty("id").GetGuid();
        Assert.Equal(["Design consultation"], await Found("consultation", "service"));
        Assert.Equal(["Luzandre.com"], await Found("consultation"));

        Assert.True((await naomi.PutAsJsonAsync($"/api/my-business/services/{id}", Body("Screen printing workshop"))).IsSuccessStatusCode);
        Assert.Empty(await Found("consultation", "service"));
        Assert.Equal(["Screen printing workshop"], await Found("workshop", "service"));

        Assert.True((await naomi.DeleteAsync($"/api/my-business/services/{id}")).IsSuccessStatusCode);
        Assert.Empty(await Found("workshop", "service"));
        Assert.Empty(await Found("workshop"));
    }

    // L2-029 AC7: a product the owner adds, renames or deletes.
    [Fact]
    public async Task L2_029_AC7_a_product_added_changed_or_deleted_reaches_the_next_search()
    {
        var naomi = Naomi();
        object Body(string name) => new { name, price = "185.00", stock = 3, description = "Solid walnut.", idempotencyKey = (string?)null };
        Assert.Empty(await Found("bench", "product"));

        var added = await naomi.PostAsJsonAsync("/api/my-business/products", Body("Walnut prayer bench"));
        Assert.True(added.IsSuccessStatusCode);
        var id = (await Json(added)).GetProperty("id").GetGuid();
        Assert.Equal(["Walnut prayer bench"], await Found("bench", "product"));

        Assert.True((await naomi.PutAsJsonAsync($"/api/my-business/products/{id}", Body("Walnut kneeler"))).IsSuccessStatusCode);
        Assert.Empty(await Found("bench", "product"));
        Assert.Equal(["Walnut kneeler"], await Found("kneeler", "product"));

        Assert.True((await naomi.DeleteAsync($"/api/my-business/products/{id}")).IsSuccessStatusCode);
        Assert.Empty(await Found("kneeler", "product"));
        Assert.Empty(await Found("walnut"));
    }

    // L2-029 AC7, L2-028 AC1 and AC4: a listing is found from the moment its owner publishes it, not as a draft (ADR 0057).
    [Fact]
    public async Task L2_029_AC7_a_listing_its_owner_publishes_is_found_by_the_next_search_and_not_before()
    {
        var owner = Member.Join(EmailAddress.TryParse("ruth@example.com")!, "Ruth", "Boateng", null, "hash", ListingMother.Now);
        owner.ConfirmEmail();
        await _factory.Arrange(owner);
        var ruth = _factory.CreateMemberClient("Ruth Boateng", owner.Id.ToString());
        var draft = new Dictionary<string, object?>
        {
            ["kind"] = "products",
            ["name"] = "Olive Branch Candles",
            ["tagline"] = "Hand-poured candles",
            ["categorySlug"] = "shops",
            ["highlight"] = null,
            ["place"] = "Toronto",
            ["agreed"] = true,
            ["items"] = Array.Empty<object>(),
            ["idempotencyKey"] = Guid.NewGuid().ToString(),
        };
        var draftId = (await Json(await ruth.PostAsJsonAsync("/api/listing-drafts", draft))).GetProperty("id").GetGuid();
        Assert.Empty(await Found("candles"));

        var published = await ruth.PostAsJsonAsync($"/api/listing-drafts/{draftId}/publish", draft);

        Assert.Equal(HttpStatusCode.Created, published.StatusCode);
        Assert.Equal(["Olive Branch Candles"], await Found("candles"));
    }

    // L2-029 AC7, L2-028: a moderation hold takes the listing out of the next search; lifting it puts it back.
    [Fact]
    public async Task L2_029_AC7_a_listing_placed_under_a_moderation_hold_leaves_the_next_search_until_the_hold_is_lifted()
    {
        var reported = await _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna").PostAsJsonAsync(
            "/api/listings/luzandre-com/reports", new { reason = "misleading", description = "The shop address on the listing is closed." });
        var report = (await Json(reported)).GetProperty("id").GetGuid();
        var miriam = Miriam();
        Task<HttpResponseMessage> Act(string kind) => miriam.PostAsJsonAsync(
            $"/api/admin/reports/{report}/actions", new { kind, resolutionNote = "Checked the listing against the report.", messageText = (string?)null });
        Assert.Equal(["Luzandre.com"], await Found("luzandre"));

        Assert.True((await Act("hold")).IsSuccessStatusCode);
        Assert.Empty(await Found("luzandre"));

        Assert.True((await Act("lift-hold")).IsSuccessStatusCode);
        Assert.Equal(["Luzandre.com"], await Found("luzandre"));
    }

    // L2-029 AC7: a deleted listing is gone, with its services and products.
    [Fact]
    public async Task L2_029_AC7_a_deleted_listing_leaves_the_next_search_with_its_services_and_products()
    {
        await _factory.Arrange(
            Service.Create(_listing.Id, 1, "Design consultation", "30 min", ServicePrice.Free, ServiceAction.Ask),
            Product.Create(_listing.Id, "team-tee", "Team tee", 2200, false, TileTint.Gold, TileIcon.Bag, ListingMother.Now));
        Assert.Equal(["Design consultation"], await Found("consultation", "service"));
        Assert.Equal(["Team tee"], await Found("tee", "product"));

        await _factory.WithDb(async db =>
        {
            (await db.Listings.SingleAsync(l => l.Slug == "luzandre-com")).Delete(_factory.Clock.GetUtcNow());
            await db.SaveChangesAsync();
        });

        Assert.Empty(await Found("luzandre"));
        Assert.Empty(await Found("consultation", "service"));
        Assert.Empty(await Found("tee", "product"));
    }

    // L2-028 AC1: no state but live is searchable, by the listing's own words or by its services and products.
    [Theory]
    [InlineData(NonPublicState.Draft)]
    [InlineData(NonPublicState.Paused)]
    [InlineData(NonPublicState.Deleted)]
    [InlineData(NonPublicState.UnderModerationHold)]
    public async Task L2_028_AC1_a_listing_that_is_not_public_is_never_found_nor_its_services_and_products(NonPublicState state)
    {
        var hidden = ListingMother.NonPublic(state, "harbour-plumbing");
        await _factory.Arrange(
            hidden,
            Service.Create(hidden.Id, 1, "Drain cleaning", "1 hr", ServicePrice.Ask, ServiceAction.Ask),
            Product.Create(hidden.Id, "drain-kit", "Drain kit", 1500, false, TileTint.Ink, TileIcon.Bag, ListingMother.Now));

        var json = await _factory.GetJson("/api/search?q=harbour", _visitor);
        Assert.Equal(0, json.GetProperty("hits").GetArrayLength());
        // A hidden listing's words are not offered as a close term either.
        Assert.Equal(JsonValueKind.Null, (await _factory.GetJson("/api/search?q=harbuor", _visitor)).GetProperty("suggestion").ValueKind);
        Assert.Empty(await Found("drain"));
        Assert.Empty(await Found("drain", "service"));
        Assert.Empty(await Found("drain", "product"));
    }

    // L2-028: a listing that is not public is not counted among the popular categories of the empty search page.
    [Fact]
    public async Task L2_028_a_listing_that_is_not_public_is_not_counted_in_the_popular_categories()
    {
        await _factory.Arrange(ListingMother.NonPublic(NonPublicState.Paused, "quiet-roofing", "home-property"));

        var popular = (await _factory.GetJson("/api/search/start", _visitor)).GetProperty("popularCategories");

        Assert.Equal(["shops"], popular.EnumerateArray().Select(c => c.GetProperty("slug").GetString()!).ToArray());
    }
}

// L2-181 AC3: the name search that answers when the index is down follows the same rule.
public sealed class SearchFallbackCurrencyTests : IClassFixture<BrokenIndexFactory>, IAsyncLifetime
{
    private readonly BrokenIndexFactory _factory;
    private readonly HttpClient _visitor;

    public SearchFallbackCurrencyTests(BrokenIndexFactory factory)
    {
        _factory = factory;
        _visitor = Searcher.At(factory);
    }

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Theory]
    [InlineData(NonPublicState.Draft)]
    [InlineData(NonPublicState.Paused)]
    [InlineData(NonPublicState.Deleted)]
    [InlineData(NonPublicState.UnderModerationHold)]
    public async Task L2_181_AC3_the_name_search_returns_only_public_listings(NonPublicState state)
    {
        await _factory.Arrange(
            ListingMother.Public("waterworks", "home-property", "Waterworks Plumbing"),
            ListingMother.NonPublic(state, "harbour-plumbing"));

        var json = await _factory.GetJson("/api/search?q=plumbing", _visitor);

        Assert.False(json.GetProperty("hasMatchExplanations").GetBoolean());
        Assert.Equal(["waterworks"], json.GetProperty("hits").Slugs());
    }

    [Fact]
    public async Task L2_181_AC3_a_listing_its_owner_pauses_leaves_the_next_name_search()
    {
        var listing = ListingMother.Public("waterworks", "home-property", "Waterworks Plumbing");
        listing.AssignOwner("member|daniel");
        await _factory.Arrange(listing);
        var daniel = _factory.CreateMemberClient("Daniel Okafor", "member|daniel");
        Assert.Equal(1, (await _factory.GetJson("/api/search?q=plumbing", _visitor)).GetProperty("businessCount").GetInt32());

        Assert.Equal(HttpStatusCode.OK, (await daniel.PostAsync("/api/my-business/pause", null)).StatusCode);

        Assert.Equal(0, (await _factory.GetJson("/api/search?q=plumbing", _visitor)).GetProperty("businessCount").GetInt32());
    }
}
