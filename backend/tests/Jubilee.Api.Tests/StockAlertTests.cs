using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>A sold-out product and the member's back-in-stock alert (L2-036).</summary>
public class StockAlertTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string TeeUrl = "/api/listings/luzandre/products/faith-tee";
    private readonly JubileeApiFactory _factory;

    public StockAlertTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static Listing Shop(string slug = "luzandre") => ListingMother.Public(slug, Category.ShopsSlug, "Luzandre.com");

    private static Product Tee(Listing shop, int? mediumStock = 0)
    {
        var tee = Product.Create(shop.Id, "faith-tee", "Faith heavyweight tee, charcoal", 3400, false, TileTint.Ink, TileIcon.Shirt, ListingMother.Now);
        tee.SetOptions("Size", [new("S", 0), new("M", mediumStock)]);
        tee.SetRestockNote("Naomi prints the next batch on Mon 23 Nov.");
        return tee;
    }

    private static string AlertUrl(Product product) => $"/api/products/{product.Id}/stock-alert";

    private Task<int> AlertCount(Guid productId) =>
        WithCount(db => db.StockAlerts.CountAsync(a => a.ProductId == productId));

    private async Task<int> WithCount(Func<Infrastructure.Persistence.AppDbContext, Task<int>> count)
    {
        var result = 0;
        await _factory.WithDb(async db => result = await count(db));
        return result;
    }

    [Fact]
    public async Task L2_036_AC1_a_product_sold_out_in_every_option_says_so_with_the_restock_note()
    {
        var shop = Shop();
        await _factory.Arrange(shop, Tee(shop));

        var json = await _factory.GetJson(TeeUrl);

        Assert.True(json.GetProperty("soldOut").GetBoolean());
        Assert.Equal("Naomi prints the next batch on Mon 23 Nov.", json.GetProperty("restockNote").GetString());
        Assert.False(json.GetProperty("stockAlertRequested").GetBoolean());
    }

    [Fact]
    public async Task L2_036_AC1_a_product_in_stock_shows_no_restock_note()
    {
        var shop = Shop();
        await _factory.Arrange(shop, Tee(shop, mediumStock: 3));

        var json = await _factory.GetJson(TeeUrl);

        Assert.False(json.GetProperty("soldOut").GetBoolean());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("restockNote").ValueKind);
    }

    [Fact]
    public async Task L2_036_AC2_a_member_asks_once_and_asking_again_changes_nothing()
    {
        var shop = Shop();
        var tee = Tee(shop);
        await _factory.Arrange(shop, tee);
        var member = _factory.CreateMemberClient();

        var first = await member.PutAsync(AlertUrl(tee), null);
        var again = await member.PutAsync(AlertUrl(tee), null);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Equal(1, await AlertCount(tee.Id));
        var page = await _factory.GetJson(TeeUrl, member);
        Assert.True(page.GetProperty("stockAlertRequested").GetBoolean());
    }

    [Fact]
    public async Task L2_036_AC2_each_member_has_their_own_alert_and_sees_only_their_own()
    {
        var shop = Shop();
        var tee = Tee(shop);
        await _factory.Arrange(shop, tee);

        await _factory.CreateMemberClient("Joanna Adeyemi").PutAsync(AlertUrl(tee), null);

        Assert.Equal(1, await AlertCount(tee.Id));
        var other = await _factory.GetJson(TeeUrl, _factory.CreateMemberClient("Miriam Castillo"));
        Assert.False(other.GetProperty("stockAlertRequested").GetBoolean());
        var visitor = await _factory.GetJson(TeeUrl);
        Assert.False(visitor.GetProperty("stockAlertRequested").GetBoolean());
    }

    [Fact]
    public async Task L2_036_AC2_a_visitor_must_sign_in_to_ask()
    {
        var shop = Shop();
        var tee = Tee(shop);
        await _factory.Arrange(shop, tee);

        var response = await _factory.CreateClient().PutAsync(AlertUrl(tee), null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, await AlertCount(tee.Id));
    }

    [Fact]
    public async Task L2_036_AC2_a_product_in_stock_takes_no_alert()
    {
        var shop = Shop();
        var tee = Tee(shop, mediumStock: 3);
        await _factory.Arrange(shop, tee);

        var response = await _factory.CreateMemberClient().PutAsync(AlertUrl(tee), null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("product_in_stock", await Code(response));
        Assert.Equal(0, await AlertCount(tee.Id));
    }

    [Fact]
    public async Task L2_028_AC3_a_product_of_a_shop_that_is_not_public_takes_no_alert()
    {
        var paused = ListingMother.NonPublic(NonPublicState.Paused, "bethel", Category.ShopsSlug);
        var tee = Tee(paused);
        await _factory.Arrange(paused, tee);

        var hidden = await _factory.CreateMemberClient().PutAsync(AlertUrl(tee), null);
        var missing = await _factory.CreateMemberClient().PutAsync($"/api/products/{Guid.NewGuid()}/stock-alert", null);

        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
        Assert.Equal("product_not_found", await Code(hidden));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal(0, await AlertCount(tee.Id));
    }

    private static async Task<string?> Code(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString();
}
