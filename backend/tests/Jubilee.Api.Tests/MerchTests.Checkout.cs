using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

public sealed class TenCheckoutsFactory : MerchApiFactory
{
    protected override void ConfigureMerchSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder) =>
        builder.UseSetting("RateLimits:MerchCheckoutsPerHour", "10");
}

// Acceptance Test
// Traces to: L2-267, L2-270
// Description: a buyer checks out the bag; the server prices it and hands it to the provider's hosted page.
public partial class MerchTests
{
    private const string Checkout = "/api/merch/checkout";

    private static object Line(string sku, int quantity = 1, int unitPriceCents = 2500) => new { sku, quantity, unitPriceCents };

    private static object Body(string delivery = "ship", params object[] lines) => new { lines, delivery };

    private static async Task<Dictionary<string, string>> Errors(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("validation_failed", json.GetProperty("code").GetString());
        return json.GetProperty("errors").EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString()!);
    }

    private Task<List<MerchOrder>> Orders() =>
        factory.Query(db => db.MerchOrders.AsNoTracking().Include(o => o.Lines).ToListAsync());

    // L2-267 AC1, AC2, AC8
    // Given a visitor with no session and a bag of Men's L × 2 and Women's M, shipped,
    // when they check out, then the answer is 201 with the provider's address, a pending order is
    // priced from the rows and the session is asked for in CAD with the return addresses.
    [Fact]
    public async Task L2_267_AC2_a_checkout_is_priced_by_the_server_and_answers_the_hosted_page()
    {
        var response = await factory.CreateClient().PostAsJsonAsync(Checkout, Body("ship", Line("mens-L", 2), Line("womens-M")));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal(["url"], json.EnumerateObject().Select(p => p.Name));
        var order = Assert.Single(await Orders());
        Assert.Equal(json.GetProperty("url").GetString(), $"http://localhost/stripe-checkout/{order.CheckoutSessionId}");
        Assert.Equal(MerchOrderStatus.Pending, order.Status);
        Assert.Equal(MerchDelivery.Ship, order.Delivery);
        Assert.Matches("^PT-[2-9A-Z]{6}$", order.Number);
        Assert.Equal(22, order.Reference.Length);
        Assert.Equal(7500, order.SubtotalCents);
        Assert.Equal(0, order.ShippingCents);
        Assert.Equal(factory.Clock.GetUtcNow().AddMinutes(30), order.ExpiresAt);
        Assert.Null(order.BuyerEmail);

        var session = Assert.Single(factory.Gateway.Requests);
        Assert.Equal(order.Reference, session.Reference);
        Assert.Equal(
            [("Purpose Tee · Black — Men’s L", 2500, 2), ("Purpose Tee · Black — Women’s M", 2500, 1)],
            session.Lines.Select(l => (l.Name, l.UnitAmountCents, l.Quantity)));
        Assert.Equal(0, session.ShippingCents);
        Assert.True(session.AutomaticTax);
        Assert.Equal($"https://jubilee.test/purpose-tee/thanks?order={order.Reference}", session.SuccessUrl);
        Assert.Equal($"https://jubilee.test/purpose-tee/thanks?order={order.Reference}&cancelled=1", session.CancelUrl);
        Assert.Equal(order.ExpiresAt, session.ExpiresAt);
    }

    // L2-266 AC3, L2-267 AC2: shipping is $9 under $60 and none when picked up, which collects no address
    [Fact]
    public async Task L2_267_AC2_shipping_is_9_dollars_under_60_and_free_when_picked_up()
    {
        await factory.CreateClient().PostAsJsonAsync(Checkout, Body("ship", Line("mens-L")));
        await factory.CreateClient().PostAsJsonAsync(Checkout, Body("pickup", Line("mens-L")));

        Assert.Equal([900, null], factory.Gateway.Requests.Select(r => r.ShippingCents));
        Assert.Equal([3400, 2500], (await Orders()).OrderBy(o => o.Delivery).Select(o => o.TotalCents));
    }

    // L2-267 AC2: the order holds what it bought until it expires
    [Fact]
    public async Task L2_267_AC2_a_pending_order_holds_its_quantity()
    {
        await factory.CreateClient().PostAsJsonAsync(Checkout, Body("ship", Line("mens-3XL", 2)));

        var response = await factory.CreateClient().PostAsJsonAsync(Checkout, Body("ship", Line("mens-3XL")));

        Assert.Equal("SOLD_OUT", (await Errors(response))["lines[0].quantity"]);
    }

    // L2-267 AC3: a code per line, nothing stored and the provider not called
    [Theory]
    [InlineData("nope-L", 1, 2500, "lines[0].sku", "UNKNOWN")]
    [InlineData("mens-L", 0, 2500, "lines[0].quantity", "OUT_OF_RANGE")]
    [InlineData("mens-L", 11, 2500, "lines[0].quantity", "OUT_OF_RANGE")]
    [InlineData("youth-L", 4, 2500, "lines[0].quantity", "ONLY_LEFT:3")]
    [InlineData("youth-XL", 1, 2500, "lines[0].quantity", "SOLD_OUT")]
    [InlineData("mens-L", 1, 2000, "lines[0].unitPriceCents", "PRICE_CHANGED")]
    public async Task L2_267_AC3_an_unacceptable_line_is_refused_with_its_code(string sku, int quantity, int price, string field, string code)
    {
        var response = await factory.CreateClient().PostAsJsonAsync(Checkout, Body("ship", Line(sku, quantity, price)));

        Assert.Equal(code, (await Errors(response))[field]);
        Assert.Empty(await Orders());
        Assert.Empty(factory.Gateway.Requests);
    }

    [Fact]
    public async Task L2_267_AC3_no_line_a_duplicate_and_an_unknown_delivery_are_refused()
    {
        Assert.Equal("REQUIRED", (await Errors(await factory.CreateClient().PostAsJsonAsync(Checkout, Body("ship"))))["lines"]);
        Assert.Equal(
            "DUPLICATE",
            (await Errors(await factory.CreateClient().PostAsJsonAsync(Checkout, Body("ship", Line("mens-L"), Line("mens-L")))))["lines[1].sku"]);
        Assert.Equal("INVALID", (await Errors(await factory.CreateClient().PostAsJsonAsync(Checkout, Body("drone", Line("mens-L")))))["delivery"]);
        Assert.Empty(await Orders());
    }

    // L2-267 AC3, L2-270 AC2: a body naming its own total or shipping is refused
    [Fact]
    public async Task L2_267_AC3_a_body_with_a_total_is_refused_with_400()
    {
        var response = await factory.CreateClient().PostAsJsonAsync(
            Checkout, new { lines = new[] { Line("mens-L") }, delivery = "ship", totalCents = 1 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await Orders());
    }

    // L2-267 AC5
    [Fact]
    public async Task L2_267_AC5_without_a_provider_checkout_is_unavailable()
    {
        factory.Gateway.IsConfigured = false;

        var response = await factory.CreateClient().PostAsJsonAsync(Checkout, Body("ship", Line("mens-L")));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("checkout_unavailable", json.GetProperty("code").GetString());
        Assert.Empty(await Orders());
    }

    // L2-267 AC6
    [Fact]
    public async Task L2_267_AC6_when_the_provider_fails_nothing_is_kept()
    {
        factory.Gateway.Failing = true;

        var response = await factory.CreateClient().PostAsJsonAsync(Checkout, Body("ship", Line("youth-L", 3)));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("checkout_failed", json.GetProperty("code").GetString());
        Assert.Equal("JB-MERCH-503", json.GetProperty("reference").GetString());
        Assert.Empty(await Orders());
        Assert.Equal(3, Size(await factory.GetJson(Product), "youth-L").GetProperty("left").GetInt32());
    }
}

// L2-267 AC7, L2-270 AC7
public sealed class MerchCheckoutLimitTests(TenCheckoutsFactory factory) : IClassFixture<TenCheckoutsFactory>, IAsyncLifetime
{
    public async Task InitializeAsync()
    {
        await factory.Reset();
        await factory.WithDb(db => Infrastructure.Seed.MerchCatalogue.SeedAsync(db, factory.Clock.GetUtcNow(), CancellationToken.None));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_267_AC7_the_eleventh_checkout_from_an_address_in_an_hour_is_refused()
    {
        HttpResponseMessage Send(string address)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/merch/checkout")
            {
                Content = JsonContent.Create(new { lines = new[] { new { sku = "mens-L", quantity = 1, unitPriceCents = 2500 } }, delivery = "ship" }),
            };
            request.Headers.Add(JubileeApiFactory.RemoteAddressHeader, address);
            return factory.CreateClient().SendAsync(request).GetAwaiter().GetResult();
        }

        for (var i = 0; i < 10; i++)
        {
            Assert.Equal(HttpStatusCode.Created, Send("203.0.113.7").StatusCode);
        }

        var limited = Send("203.0.113.7");
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.True(limited.Headers.Contains("Retry-After"));
        Assert.Equal(HttpStatusCode.Created, Send("203.0.113.8").StatusCode);
    }
}
