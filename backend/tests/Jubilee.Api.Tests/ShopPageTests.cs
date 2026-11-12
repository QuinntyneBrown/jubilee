using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

/// <summary>The listing page of a shop (L2-034).</summary>
public class ShopPageTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public ShopPageTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static Listing Shop(string slug = "luzandre") =>
        ListingMother.Public(slug, Category.ShopsSlug, "Luzandre.com", highlight: "Ships across Canada");

    private static Product Product(Listing shop, string slug, int minutesAgo, int priceCents = 3400) =>
        Domain.Product.Create(shop.Id, slug, $"Product {slug}", priceCents, false, TileTint.Ink, TileIcon.Shirt, ListingMother.Now.AddMinutes(-minutesAgo));

    [Fact]
    public async Task L2_034_AC1_a_shop_page_carries_its_products_newest_first_with_the_count_and_its_custom_work()
    {
        var shop = Shop();
        shop.Describe(ListingProfile.Empty with { Delivery = "Canada Post, $9 flat · free over $75", MadeToOrder = "Ready in 5–7 days" });
        var deleted = Product(shop, "gone", 1);
        deleted.Delete();
        await _factory.Arrange(
            shop,
            Product(shop, "older", 20, 2400),
            Product(shop, "newest", 2),
            deleted,
            Service.Create(shop.Id, 1, "Custom design consultation", "30 min · Video", ServicePrice.Free, ServiceAction.Ask));

        var json = await _factory.GetJson("/api/listings/luzandre");

        Assert.Equal("shop", json.GetProperty("kind").GetString());
        Assert.Equal(2, json.GetProperty("productCount").GetInt32());
        var products = json.GetProperty("products");
        Assert.Equal(["newest", "older"], products.Slugs());
        var card = products[1];
        Assert.Equal("luzandre", card.GetProperty("businessSlug").GetString());
        Assert.Equal("Luzandre.com", card.GetProperty("shopName").GetString());
        Assert.Equal(2400, card.GetProperty("priceCents").GetInt32());
        Assert.Equal("ink", card.GetProperty("tile").GetProperty("tint").GetString());
        Assert.Equal("shirt", card.GetProperty("tile").GetProperty("icon").GetString());
        Assert.Equal("ask", Assert.Single(json.GetProperty("services").EnumerateArray()).GetProperty("action").GetString());
        Assert.Equal("Canada Post, $9 flat · free over $75", json.GetProperty("details").GetProperty("delivery").GetString());
        Assert.Equal("Ready in 5–7 days", json.GetProperty("details").GetProperty("madeToOrder").GetString());
    }

    [Fact]
    public async Task L2_034_AC3_a_sold_out_product_says_so_on_its_card_and_a_product_in_stock_does_not()
    {
        var shop = Shop();
        var soldOut = Product(shop, "sold-out", 3);
        soldOut.SetStock(0);
        var everySize = Product(shop, "every-size", 2);
        everySize.SetOptions("Size", [new("S", 0), new("M", 0)]);
        var oneSizeLeft = Product(shop, "one-size-left", 1);
        oneSizeLeft.SetOptions("Size", [new("S", 0), new("M", 2)]);
        await _factory.Arrange(shop, soldOut, everySize, oneSizeLeft, Product(shop, "untracked", 4));

        var json = await _factory.GetJson("/api/listings/luzandre");

        var cards = json.GetProperty("products").EnumerateArray()
            .ToDictionary(c => c.GetProperty("slug").GetString()!, c => c.GetProperty("soldOut").GetBoolean());
        Assert.True(cards["sold-out"]);
        Assert.True(cards["every-size"]);
        Assert.False(cards["one-size-left"]);
        Assert.False(cards["untracked"]);
    }

    [Fact]
    public async Task L2_034_AC2_a_shop_without_products_has_none_and_a_count_of_zero()
    {
        await _factory.Arrange(Shop());

        var json = await _factory.GetJson("/api/listings/luzandre");

        Assert.Equal(0, json.GetProperty("productCount").GetInt32());
        Assert.Equal(0, json.GetProperty("products").GetArrayLength());
    }

    [Fact]
    public async Task L2_153_AC3_a_shop_page_returns_at_most_fifty_products_and_counts_them_all()
    {
        var shop = Shop();
        await _factory.Arrange([shop, .. Enumerable.Range(1, 55).Select(i => Product(shop, $"p{i:00}", i))]);

        var json = await _factory.GetJson("/api/listings/luzandre");

        Assert.Equal(55, json.GetProperty("productCount").GetInt32());
        Assert.Equal(50, json.GetProperty("products").GetArrayLength());
    }

    [Fact]
    public async Task L2_034_AC1_another_shops_products_are_not_listed()
    {
        var shop = Shop();
        var other = Shop("christian-bookstores");
        await _factory.Arrange(shop, other, Product(other, "bible", 1));

        var json = await _factory.GetJson("/api/listings/luzandre");

        Assert.Equal(0, json.GetProperty("products").GetArrayLength());
    }
}
