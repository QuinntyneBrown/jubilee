using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public class BrowseHomeTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public BrowseHomeTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_021_AC2_home_has_the_count_the_eleven_categories_and_up_to_five_featured()
    {
        var listings = Enumerable.Range(1, 7)
            .Select(i => ListingMother.Public($"biz-{i}", "media", approvedAt: ListingMother.Now.AddDays(-i)))
            .ToArray();
        await _factory.Arrange([.. listings]);

        var json = await _factory.GetJson("/api/directory/home");

        Assert.Equal(7, json.GetProperty("liveBusinessCount").GetInt32());
        Assert.Equal(11, json.GetProperty("categories").GetArrayLength());
        Assert.Equal(["biz-1", "biz-2", "biz-3", "biz-4", "biz-5"], json.GetProperty("featured").Slugs());
    }

    [Fact]
    public async Task L2_106_AC1_home_shows_the_featured_slots_in_order()
    {
        var a = ListingMother.Public("a");
        var b = ListingMother.Public("b");
        var today = TorontoClock.Today(ListingMother.Now);
        await _factory.Arrange(a, b, FeaturedSlot.Create(b.Id, 1, today), FeaturedSlot.Create(a.Id, 2, today));

        var json = await _factory.GetJson("/api/directory/home");

        Assert.Equal(["b", "a"], json.GetProperty("featured").Slugs());
    }

    [Fact]
    public async Task L2_021_AC2_from_the_shops_shows_the_five_newest_products_newest_first()
    {
        var shop = ListingMother.Public("luzandre", "shops", "Luzandre.com");
        var products = Enumerable.Range(1, 6)
            .Select(i => Product.Create(
                shop.Id, $"product-{i}", $"Product {i}", 1000 * i, false, TileTint.Ink, TileIcon.Shirt,
                ListingMother.Now.AddMinutes(-i)))
            .ToArray();
        await _factory.Arrange(shop);
        await _factory.Arrange([.. products]);

        var json = await _factory.GetJson("/api/directory/home");

        Assert.Equal(
            ["product-1", "product-2", "product-3", "product-4", "product-5"],
            json.GetProperty("products").Slugs());
    }

    [Fact]
    public async Task L2_027_AC5_a_product_card_carries_name_shop_price_and_tile()
    {
        var shop = ListingMother.Public("luzandre", "shops", "Luzandre.com");
        await _factory.Arrange(shop);
        await _factory.Arrange(
            Product.Create(shop.Id, "team-tee", "Custom church team tee (min. 12)", 2200, true, TileTint.Blue, TileIcon.Shirt, ListingMother.Now),
            Product.Create(shop.Id, "mug", "Gold cross stoneware mug", 2400, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now.AddMinutes(-1)));

        var products = (await _factory.GetJson("/api/directory/home")).GetProperty("products");

        var tee = products[0];
        Assert.Equal("team-tee", tee.GetProperty("slug").GetString());
        Assert.Equal("luzandre", tee.GetProperty("businessSlug").GetString());
        Assert.Equal("Custom church team tee (min. 12)", tee.GetProperty("name").GetString());
        Assert.Equal("Luzandre.com", tee.GetProperty("shopName").GetString());
        Assert.Equal(2200, tee.GetProperty("priceCents").GetInt32());
        Assert.True(tee.GetProperty("perUnit").GetBoolean());
        Assert.Equal("blue", tee.GetProperty("tile").GetProperty("tint").GetString());
        Assert.Equal("shirt", tee.GetProperty("tile").GetProperty("icon").GetString());
        Assert.False(products[1].GetProperty("perUnit").GetBoolean());
        Assert.Equal("gold", products[1].GetProperty("tile").GetProperty("tint").GetString());
        Assert.Equal("mug", products[1].GetProperty("tile").GetProperty("icon").GetString());
    }

    [Fact]
    public async Task L2_021_AC2_from_the_shops_leaves_out_deleted_products_and_other_categories()
    {
        var shop = ListingMother.Public("shop", "shops");
        var plumber = ListingMother.Public("plumber", "home-property");
        var deleted = Product.Create(shop.Id, "gone", "Gone", 100, false, TileTint.Ink, TileIcon.Bag, ListingMother.Now);
        deleted.Delete();
        await _factory.Arrange(shop, plumber);
        await _factory.Arrange(
            deleted,
            Product.Create(shop.Id, "kept", "Kept", 100, false, TileTint.Ink, TileIcon.Bag, ListingMother.Now),
            Product.Create(plumber.Id, "wrench", "Wrench", 100, false, TileTint.Ink, TileIcon.Bag, ListingMother.Now));

        var json = await _factory.GetJson("/api/directory/home");

        Assert.Equal(["kept"], json.GetProperty("products").Slugs());
    }

    [Fact]
    public async Task L2_021_AC3_a_group_of_more_than_four_lists_four_and_has_more()
    {
        var listings = Enumerable.Range(1, 6)
            .Select(i => ListingMother.Public($"home-{i}", "home-property", approvedAt: ListingMother.Now.AddDays(-i)))
            .ToArray();
        await _factory.Arrange([.. listings]);

        var group = (await _factory.GetJson("/api/directory/home")).GetProperty("groups")[0];

        Assert.Equal("home-property", group.GetProperty("slug").GetString());
        Assert.Equal("Home & property", group.GetProperty("name").GetString());
        Assert.Equal(6, group.GetProperty("count").GetInt32());
        Assert.True(group.GetProperty("hasMore").GetBoolean());
        // The four are the first of the Recommended order: all else equal, most recently approved.
        Assert.Equal(["home-1", "home-2", "home-3", "home-4"], group.GetProperty("businesses").Slugs());
    }

    [Fact]
    public async Task L2_021_AC3_a_group_of_four_or_fewer_lists_all_and_has_no_more()
    {
        var listings = Enumerable.Range(1, 4).Select(i => ListingMother.Public($"m-{i}", "media")).ToArray();
        await _factory.Arrange([.. listings]);

        var group = (await _factory.GetJson("/api/directory/home")).GetProperty("groups")[0];

        Assert.Equal(4, group.GetProperty("count").GetInt32());
        Assert.False(group.GetProperty("hasMore").GetBoolean());
        Assert.Equal(4, group.GetProperty("businesses").GetArrayLength());
    }

    [Fact]
    public async Task L2_021_AC4_groups_follow_the_fixed_category_order_and_empty_categories_are_omitted()
    {
        await _factory.Arrange(
            ListingMother.Public("c", "community"),
            ListingMother.Public("s", "shops"),
            ListingMother.Public("l", "learning"));

        var groups = (await _factory.GetJson("/api/directory/home")).GetProperty("groups");

        Assert.Equal(["shops", "learning", "community"], groups.Slugs());
    }

    [Fact]
    public async Task L2_027_AC3_a_directory_row_carries_the_full_name_tagline_and_verified_mark()
    {
        await _factory.Arrange(ListingMother.Public(
            "scott-mission", "community", "The Scott Mission", tagline: "A Christian Ministry of Mercy and Love."));

        var row = (await _factory.GetJson("/api/directory/home")).GetProperty("groups")[0].GetProperty("businesses")[0];

        Assert.Equal("scott-mission", row.GetProperty("slug").GetString());
        Assert.Equal("The Scott Mission", row.GetProperty("name").GetString());
        Assert.Equal("A Christian Ministry of Mercy and Love.", row.GetProperty("tagline").GetString());
        Assert.True(row.GetProperty("verified").GetBoolean());
    }

    [Fact]
    public async Task L2_021_AC5_home_with_no_businesses_is_empty_not_an_error()
    {
        var json = await _factory.GetJson("/api/directory/home");

        Assert.Equal(0, json.GetProperty("liveBusinessCount").GetInt32());
        Assert.Equal(0, json.GetProperty("featured").GetArrayLength());
        Assert.Equal(0, json.GetProperty("products").GetArrayLength());
        Assert.Equal(0, json.GetProperty("groups").GetArrayLength());
    }

    [Theory]
    [InlineData(NonPublicState.Draft)]
    [InlineData(NonPublicState.ReadyToReview)]
    [InlineData(NonPublicState.ChangesRequested)]
    [InlineData(NonPublicState.Paused)]
    [InlineData(NonPublicState.Deleted)]
    [InlineData(NonPublicState.UnderModerationHold)]
    public async Task L2_028_AC1_home_never_shows_or_counts_a_listing_that_is_not_public_or_its_products(NonPublicState state)
    {
        var visible = ListingMother.Public("visible", "shops");
        var hidden = ListingMother.NonPublic(state, "hidden", "shops");
        var hiddenElsewhere = ListingMother.NonPublic(state, "hidden-elsewhere", "media");
        await _factory.Arrange(visible, hidden, hiddenElsewhere);
        await _factory.Arrange(
            Product.Create(visible.Id, "seen", "Seen", 100, false, TileTint.Ink, TileIcon.Bag, ListingMother.Now.AddMinutes(-5)),
            Product.Create(hidden.Id, "unseen", "Unseen", 100, false, TileTint.Ink, TileIcon.Bag, ListingMother.Now));

        var json = await _factory.GetJson("/api/directory/home");

        Assert.Equal(1, json.GetProperty("liveBusinessCount").GetInt32());
        Assert.Equal(["visible"], json.GetProperty("featured").Slugs());
        Assert.Equal(["seen"], json.GetProperty("products").Slugs());
        var group = Assert.Single(json.GetProperty("groups").EnumerateArray());
        Assert.Equal("shops", group.GetProperty("slug").GetString());
        Assert.Equal(1, group.GetProperty("count").GetInt32());
        Assert.Equal(["visible"], group.GetProperty("businesses").Slugs());
    }

    [Fact]
    public async Task L2_022_AC1_a_visitor_and_a_member_get_the_same_directory()
    {
        await _factory.Arrange(ListingMother.Public("a"));

        var visitor = await _factory.CreateClient().GetStringAsync("/api/directory/home");
        var member = await _factory.CreateMemberClient().GetStringAsync("/api/directory/home");

        Assert.Equal(visitor, member);
    }

    [Fact]
    public async Task L2_156_AC2_home_may_be_cached_publicly_for_sixty_seconds()
    {
        var response = await _factory.CreateClient().GetAsync("/api/directory/home");

        Assert.Equal("public, max-age=60", response.Headers.CacheControl?.ToString());
    }
}
