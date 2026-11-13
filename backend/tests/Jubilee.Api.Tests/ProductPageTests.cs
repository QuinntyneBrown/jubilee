using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

/// <summary>The product page at /b/:slug/p/:product (L2-035) and who may see it (L2-028).</summary>
public class ProductPageTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string TeeUrl = "/api/listings/luzandre/products/faith-tee";
    private readonly JubileeApiFactory _factory;

    public ProductPageTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static Listing Shop() => ListingMother.Public("luzandre", Category.ShopsSlug, "Luzandre.com");

    private static Product Item(Listing shop, string slug, int minutesAgo = 1, int priceCents = 2400) =>
        Product.Create(shop.Id, slug, $"Product {slug}", priceCents, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now.AddMinutes(-minutesAgo));

    private static Product Tee(Listing shop)
    {
        var tee = Product.Create(shop.Id, "faith-tee", "Faith heavyweight tee, charcoal", 3400, false, TileTint.Ink, TileIcon.Shirt, ListingMother.Now.AddMinutes(-10));
        tee.Describe(new ProductDescription(
            "A 240 gsm combed-cotton tee.",
            "plus $9 shipping, or free pickup",
            [new("Fit", "Relaxed, true to size"), new("Care", "Cold wash, hang dry"), new("Ready in", "5–7 days, made to order"), new("Returns", "14 days, unworn")]));
        tee.SetOptions("Size", [new("S", 8), new("M", 20), new("L", 140), new("XL", 0), new("2XL", null)]);
        return tee;
    }

    [Fact]
    public async Task L2_035_AC1_a_product_page_carries_name_price_delivery_shop_and_options()
    {
        var shop = Shop();
        await _factory.Arrange(shop, Tee(shop));

        var json = await _factory.GetJson(TeeUrl);

        Assert.Equal("faith-tee", json.GetProperty("slug").GetString());
        Assert.NotEqual(Guid.Empty, json.GetProperty("id").GetGuid());
        Assert.Equal("Faith heavyweight tee, charcoal", json.GetProperty("name").GetString());
        Assert.Equal(3400, json.GetProperty("priceCents").GetInt32());
        Assert.False(json.GetProperty("perUnit").GetBoolean());
        Assert.Equal("plus $9 shipping, or free pickup", json.GetProperty("deliveryLine").GetString());
        Assert.Equal("ink", json.GetProperty("tile").GetProperty("tint").GetString());
        var seller = json.GetProperty("shop");
        Assert.Equal("luzandre", seller.GetProperty("slug").GetString());
        Assert.Equal("Luzandre.com", seller.GetProperty("name").GetString());
        Assert.False(seller.TryGetProperty("verified", out _)); // ADR 0057: no listing is called verified
        Assert.Equal("Size", json.GetProperty("optionName").GetString());
        Assert.Equal(["S", "M", "L", "XL", "2XL"], json.GetProperty("options").EnumerateArray().Select(o => o.GetProperty("label").GetString()));
        Assert.False(json.GetProperty("soldOut").GetBoolean());
    }

    [Fact]
    public async Task L2_035_AC3_each_option_bounds_the_quantity_by_its_stock_or_99_when_untracked_and_never_reveals_more()
    {
        var shop = Shop();
        await _factory.Arrange(shop, Tee(shop));

        var options = (await _factory.GetJson(TeeUrl)).GetProperty("options");

        Assert.Equal([8, 20, 99, 0, 99], options.EnumerateArray().Select(o => o.GetProperty("maxQuantity").GetInt32()));
        Assert.All(options.EnumerateArray(), o => Assert.False(o.TryGetProperty("stock", out _)));
    }

    [Fact]
    public async Task L2_035_AC3_a_product_without_options_has_its_own_bound_and_its_minimum_order_quantity()
    {
        var shop = Shop();
        var team = Product.Create(shop.Id, "team-tee", "Custom church team tee (min. 12)", 2200, true, TileTint.Blue, TileIcon.Shirt, ListingMother.Now);
        team.SetMinimumQuantity(12);
        var mug = Item(shop, "mug");
        mug.SetOptions(null, []);
        mug.SetStock(5);
        await _factory.Arrange(shop, team, mug);

        var teamJson = await _factory.GetJson("/api/listings/luzandre/products/team-tee");
        var mugJson = await _factory.GetJson("/api/listings/luzandre/products/mug");

        Assert.Equal(12, teamJson.GetProperty("minimumQuantity").GetInt32());
        Assert.Equal(99, teamJson.GetProperty("maxQuantity").GetInt32());
        Assert.True(teamJson.GetProperty("perUnit").GetBoolean());
        Assert.Equal(0, teamJson.GetProperty("options").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, teamJson.GetProperty("optionName").ValueKind);
        Assert.Equal(1, mugJson.GetProperty("minimumQuantity").GetInt32());
        Assert.Equal(5, mugJson.GetProperty("maxQuantity").GetInt32());
    }

    [Fact]
    public async Task L2_035_AC4_details_carry_the_description_and_the_attributes_in_the_owners_order()
    {
        var shop = Shop();
        await _factory.Arrange(shop, Tee(shop));

        var json = await _factory.GetJson(TeeUrl);

        Assert.Equal("A 240 gsm combed-cotton tee.", json.GetProperty("description").GetString());
        Assert.Equal(
            [("Fit", "Relaxed, true to size"), ("Care", "Cold wash, hang dry"), ("Ready in", "5–7 days, made to order"), ("Returns", "14 days, unworn")],
            json.GetProperty("attributes").EnumerateArray().Select(a => (a.GetProperty("label").GetString()!, a.GetProperty("value").GetString()!)));
    }

    [Fact]
    public async Task L2_035_AC5_more_from_the_shop_lists_three_other_products_newest_first()
    {
        var shop = Shop();
        var other = ListingMother.Public("christian-bookstores", Category.ShopsSlug);
        var deleted = Item(shop, "deleted", 1);
        deleted.Delete();
        await _factory.Arrange(
            shop,
            other,
            Tee(shop),
            deleted,
            Item(shop, "mug", 2),
            Item(shop, "team-tee", 3),
            Item(shop, "morning-mug", 4),
            Item(shop, "oldest", 50),
            Item(other, "bible", 0));

        var more = (await _factory.GetJson(TeeUrl)).GetProperty("more");

        Assert.Equal(["mug", "team-tee", "morning-mug"], more.Slugs());
        Assert.All(more.EnumerateArray(), card => Assert.Equal("luzandre", card.GetProperty("businessSlug").GetString()));
    }

    [Theory]
    [InlineData("/api/listings/luzandre/products/no-such-product")]
    [InlineData("/api/listings/luzandre/products/deleted")]
    [InlineData("/api/listings/christian-bookstores/products/faith-tee")]
    [InlineData("/api/listings/bethel/products/basket")]
    public async Task L2_028_AC3_a_product_that_is_missing_deleted_elsewhere_or_of_a_shop_that_is_not_public_is_not_found(string url)
    {
        var shop = Shop();
        var other = ListingMother.Public("christian-bookstores", Category.ShopsSlug);
        var paused = ListingMother.NonPublic(NonPublicState.Paused, "bethel", Category.ShopsSlug);
        var deleted = Item(shop, "deleted");
        deleted.Delete();
        await _factory.Arrange(shop, other, paused, Tee(shop), deleted, Item(paused, "basket"));

        var response = await _factory.CreateMemberClient().GetAsync(url);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("product_not_found", JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_156_a_visitors_product_page_may_be_cached_publicly()
    {
        var shop = Shop();
        await _factory.Arrange(shop, Tee(shop));

        var response = await _factory.CreateClient().GetAsync(TeeUrl);

        Assert.True(response.Headers.CacheControl?.Public);
        Assert.Equal(TimeSpan.FromSeconds(60), response.Headers.CacheControl?.MaxAge);
    }
}
