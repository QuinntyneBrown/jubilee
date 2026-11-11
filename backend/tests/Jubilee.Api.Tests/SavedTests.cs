using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Save listings for later: L2-005 AC3, L2-012, L2-041, L2-042, L2-118 and L2-133.
public sealed class SavedTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Joanna = "member|joanna";
    private const string David = "member|david";

    private readonly JubileeApiFactory _factory;

    public SavedTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient AsJoanna() => _factory.CreateMemberClient("Joanna Adeyemi", Joanna);

    private HttpClient AsDavid() => _factory.CreateMemberClient("David Chen", David);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Listing Live(string slug, string name, string category = "financial-insurance") =>
        ListingMother.Public(slug, category, name);

    private static Product Bible(Listing shop) =>
        Product.Create(shop.Id, "journaling-bible", "Leather journaling Bible, ESV", 6400, false, TileTint.Gold, TileIcon.Book, ListingMother.Now);

    private async Task<int> RowCount() => await Read(db => db.SavedItems.CountAsync());

    private async Task<T> Read<T>(Func<Infrastructure.Persistence.AppDbContext, Task<T>> work)
    {
        T result = default!;
        await _factory.WithDb(async db => result = await work(db));
        return result;
    }

    private Task<HttpResponseMessage> Save(HttpClient client, string slug) => client.PutAsync($"/api/saved/businesses/{slug}", null);

    private Task<HttpResponseMessage> Unsave(HttpClient client, string slug) => client.DeleteAsync($"/api/saved/businesses/{slug}");

    private async Task<JsonElement> List(HttpClient client)
    {
        var response = await client.GetAsync("/api/saved");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await Json(response);
    }

    // L2-041 AC1
    [Fact]
    public async Task L2_041_AC1_a_member_saves_a_business_and_finds_it_in_the_list()
    {
        await _factory.Arrange(Live("legacy-financial", "Legacy Financial"));

        var response = await Save(AsJoanna(), "legacy-financial");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var item = Assert.Single((await List(AsJoanna())).GetProperty("items").EnumerateArray());
        Assert.Equal("business", item.GetProperty("kind").GetString());
        Assert.True(item.GetProperty("available").GetBoolean());
        Assert.Equal("Legacy Financial", item.GetProperty("business").GetProperty("name").GetString());
    }

    // L2-041 AC1: pressing twice, or a retry after a lost answer, leaves one row
    [Fact]
    public async Task L2_041_saving_again_succeeds_and_leaves_one_row()
    {
        await _factory.Arrange(Live("legacy-financial", "Legacy Financial"));

        Assert.Equal(HttpStatusCode.NoContent, (await Save(AsJoanna(), "legacy-financial")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Save(AsJoanna(), "legacy-financial")).StatusCode);

        Assert.Equal(1, await RowCount());
    }

    // L2-041 AC2, AC3
    [Fact]
    public async Task L2_041_AC3_removing_takes_it_off_the_list_and_removing_what_is_not_saved_succeeds()
    {
        await _factory.Arrange(Live("legacy-financial", "Legacy Financial"));
        await Save(AsJoanna(), "legacy-financial");

        Assert.Equal(HttpStatusCode.NoContent, (await Unsave(AsJoanna(), "legacy-financial")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Unsave(AsJoanna(), "legacy-financial")).StatusCode);

        Assert.Empty((await List(AsJoanna())).GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task L2_041_a_member_saves_a_product_of_a_live_shop()
    {
        var shop = Live("christian-bookstores", "Christian Bookstores", "shops");
        await _factory.Arrange(shop, Bible(shop));

        var response = await AsJoanna().PutAsync("/api/saved/products/christian-bookstores/journaling-bible", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var item = Assert.Single((await List(AsJoanna())).GetProperty("items").EnumerateArray());
        Assert.Equal("product", item.GetProperty("kind").GetString());
        Assert.Equal("Leather journaling Bible, ESV", item.GetProperty("product").GetProperty("name").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await AsJoanna().DeleteAsync("/api/saved/products/christian-bookstores/journaling-bible")).StatusCode);
        Assert.Equal(0, await RowCount());
    }

    // L2-041, L2-133: only what the public can see can be saved
    [Theory]
    [InlineData(NonPublicState.Paused)]
    [InlineData(NonPublicState.Deleted)]
    [InlineData(NonPublicState.Draft)]
    public async Task L2_041_a_business_the_public_cannot_see_is_not_found(NonPublicState state)
    {
        await _factory.Arrange(ListingMother.NonPublic(state, "hidden"));

        Assert.Equal(HttpStatusCode.NotFound, (await Save(AsJoanna(), "hidden")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Save(AsJoanna(), "no-such-business")).StatusCode);
        Assert.Equal(0, await RowCount());
    }

    [Fact]
    public async Task L2_041_a_product_of_a_hidden_shop_or_a_deleted_product_is_not_found()
    {
        var hidden = ListingMother.NonPublic(NonPublicState.Paused, "paused-shop", "shops");
        var live = Live("christian-bookstores", "Christian Bookstores", "shops");
        var gone = Bible(live);
        gone.Delete(ListingMother.Now);
        await _factory.Arrange(hidden, Bible(hidden), live, gone);

        Assert.Equal(HttpStatusCode.NotFound, (await AsJoanna().PutAsync("/api/saved/products/paused-shop/journaling-bible", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await AsJoanna().PutAsync("/api/saved/products/christian-bookstores/journaling-bible", null)).StatusCode);
    }

    // L2-012, L2-133
    [Fact]
    public async Task L2_012_a_visitor_is_refused_with_401_so_the_page_can_ask_for_sign_in()
    {
        await _factory.Arrange(Live("legacy-financial", "Legacy Financial"));
        var visitor = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await Save(visitor, "legacy-financial")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync("/api/saved")).StatusCode);
    }

    // L2-005 AC3: an unconfirmed member may save; the test members are session-only, like one who has not confirmed yet
    [Fact]
    public async Task L2_005_AC3_a_member_whose_e_mail_is_not_confirmed_can_save()
    {
        await _factory.Arrange(Live("legacy-financial", "Legacy Financial"));
        var client = _factory.CreateClient();
        var join = await client.PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Joanna",
            lastName = "Adeyemi",
            email = "joanna.adeyemi@example.com",
            password = "correct horse 13",
            homeChurch = (string?)null,
            agreementAccepted = true,
        });
        Assert.Equal(HttpStatusCode.Created, join.StatusCode);
        var member = await Read(db => db.Members.SingleAsync());
        Assert.Equal(EmailStatus.Unconfirmed, member.EmailStatus);

        var response = await Save(_factory.CreateMemberClient(member.DisplayName, member.Id.ToString()), "legacy-financial");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // L2-041 AC5
    [Fact]
    public async Task L2_041_AC5_the_501st_item_is_refused()
    {
        var listings = Enumerable.Range(0, 501).Select(i => Live($"business-{i}", $"Business {i}")).ToList();
        await _factory.Arrange(listings.Cast<object>().ToArray());
        await _factory.Arrange(listings.Take(500).Select(l => (object)SavedItem.Business(Joanna, l.Id, ListingMother.Now)).ToArray());

        var refused = await Save(AsJoanna(), "business-500");

        Assert.Equal(HttpStatusCode.Conflict, refused.StatusCode);
        Assert.Equal("SAVED_LIMIT_REACHED", (await Json(refused)).GetProperty("code").GetString());
        Assert.Equal(500, await RowCount());
        // Saving one that is already on the list is still fine at the limit.
        Assert.Equal(HttpStatusCode.NoContent, (await Save(AsJoanna(), "business-0")).StatusCode);
    }

    // L2-042 AC1
    [Fact]
    public async Task L2_042_AC1_the_list_counts_businesses_and_products_and_shows_the_newest_first()
    {
        var shop = Live("christian-bookstores", "Christian Bookstores", "shops");
        await _factory.Arrange(
            Live("legacy-financial", "Legacy Financial"),
            Live("waterworks", "WaterWorks Plumbing & Drains", "home-property"),
            Live("flower-creations", "Flower Creations", "shops"),
            shop,
            Bible(shop));
        var joanna = AsJoanna();
        await Save(joanna, "legacy-financial");
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await Save(joanna, "waterworks");
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await Save(joanna, "flower-creations");
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await joanna.PutAsync("/api/saved/products/christian-bookstores/journaling-bible", null);

        var list = await List(joanna);

        Assert.Equal(3, list.GetProperty("businessCount").GetInt32());
        Assert.Equal(1, list.GetProperty("productCount").GetInt32());
        var names = list.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("name").GetString()).ToList();
        Assert.Equal(["Leather journaling Bible, ESV", "Flower Creations", "WaterWorks Plumbing & Drains", "Legacy Financial"], names);
    }

    // L2-042 AC2
    [Fact]
    public async Task L2_042_AC2_nothing_saved_is_an_empty_list()
    {
        var list = await List(AsJoanna());

        Assert.Empty(list.GetProperty("items").EnumerateArray());
        Assert.Equal(0, list.GetProperty("businessCount").GetInt32());
    }

    // L2-042 AC3
    [Fact]
    public async Task L2_042_AC3_a_listing_paused_after_it_was_saved_shows_as_unavailable_and_can_be_removed()
    {
        var listing = Live("legacy-financial", "Legacy Financial");
        await _factory.Arrange(listing);
        await Save(AsJoanna(), "legacy-financial");
        await _factory.WithDb(async db =>
        {
            (await db.Listings.SingleAsync()).Pause();
            await db.SaveChangesAsync();
        });

        var list = await List(AsJoanna());

        var item = Assert.Single(list.GetProperty("items").EnumerateArray());
        Assert.False(item.GetProperty("available").GetBoolean());
        Assert.Equal(JsonValueKind.Null, item.GetProperty("business").ValueKind);
        Assert.Equal("Legacy Financial", item.GetProperty("name").GetString());
        Assert.Equal(0, list.GetProperty("businessCount").GetInt32());
        var removed = await AsJoanna().DeleteAsync($"/api/saved/items/{item.GetProperty("id").GetGuid()}");
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(0, await RowCount());
    }

    // L2-042 AC4, L2-133
    [Fact]
    public async Task L2_042_AC4_the_list_is_the_callers_own_and_another_members_list_is_not_addressable()
    {
        await _factory.Arrange(Live("legacy-financial", "Legacy Financial"));
        await Save(AsJoanna(), "legacy-financial");

        Assert.Empty((await List(AsDavid())).GetProperty("items").EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await AsDavid().GetAsync($"/api/members/{Joanna}/saved")).StatusCode);
    }

    [Fact]
    public async Task L2_133_a_member_cannot_remove_another_members_item()
    {
        await _factory.Arrange(Live("legacy-financial", "Legacy Financial"));
        await Save(AsJoanna(), "legacy-financial");
        var id = (await List(AsJoanna())).GetProperty("items")[0].GetProperty("id").GetGuid();

        var response = await AsDavid().DeleteAsync($"/api/saved/items/{id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode); // nothing of David's to remove, and nothing revealed
        Assert.Equal(1, await RowCount());
    }

    // L2-042 AC5, L2-118
    [Fact]
    public async Task L2_042_AC5_a_list_that_cannot_load_carries_the_reference_JB_SAV_503()
    {
        _factory.Database.Unavailable = true;

        var response = await AsJoanna().GetAsync("/api/saved");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-SAV-503", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-041 AC6
    [Fact]
    public async Task L2_041_AC6_the_owner_sees_how_many_members_saved_without_who()
    {
        var shop = Live("luzandre-com", "Luzandre.com", "shops");
        shop.AssignOwner("member|naomi");
        var mug = Product.Create(shop.Id, "mug", "Gold cross mug", 2800, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now);
        await _factory.Arrange(shop, mug);
        // Joanna saves the shop and a product, David saves the shop: two members, not three saves.
        await Save(AsJoanna(), "luzandre-com");
        await AsJoanna().PutAsync("/api/saved/products/luzandre-com/mug", null);
        await Save(AsDavid(), "luzandre-com");

        var overview = await Json(await _factory.CreateMemberClient("Naomi Laurent", "member|naomi").GetAsync("/api/my-business"));

        var stats = overview.GetProperty("stats");
        Assert.Equal(2, stats.GetProperty("saved").GetInt32());
        Assert.DoesNotContain("Joanna", overview.ToString());
    }
}
