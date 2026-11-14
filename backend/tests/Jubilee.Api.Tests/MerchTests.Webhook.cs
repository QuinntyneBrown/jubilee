using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-268, L2-270
// Description: an order is paid only on the provider's signed event, once, lowering the stock and
// e-mailing the buyer and the team. Events are signed here with a test secret; nothing reaches Stripe.
public partial class MerchTests
{
    private const string Webhook = "/api/merch/webhooks/stripe";

    private static string Event(string type, string sessionId, string paymentStatus = "paid", int total = 6667, int tax = 767, bool shipped = true) =>
        JsonSerializer.Serialize(new
        {
            id = "evt_test_1",
            type,
            data = new
            {
                @object = new
                {
                    id = sessionId,
                    @object = "checkout.session",
                    payment_status = paymentStatus,
                    amount_total = total,
                    total_details = new { amount_tax = tax },
                    customer_details = new { email = "joanna.adeyemi@example.com", name = "Joanna Adeyemi" },
                    collected_information = shipped
                        ? new
                        {
                            shipping_details = new
                            {
                                name = "Joanna Adeyemi",
                                address = new { line1 = "48 Woodmount Ave", line2 = (string?)null, city = "East York", state = "ON", postal_code = "M4C 3X8", country = "CA" },
                            },
                        }
                        : null,
                },
            },
        });

    private static string Sign(string body, DateTimeOffset at, string secret = MerchApiFactory.WebhookSecret)
    {
        var t = at.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        var mac = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes($"{t}.{body}"));
        return $"t={t},v1={Convert.ToHexStringLower(mac)}";
    }

    private Task<HttpResponseMessage> Deliver(string body, string? signature = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, Webhook) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
        request.Headers.TryAddWithoutValidation("Stripe-Signature", signature ?? Sign(body, factory.Clock.GetUtcNow()));
        return factory.CreateClient().SendAsync(request);
    }

    private Task<MerchOrder> Order(Guid id) =>
        factory.Query(db => db.MerchOrders.AsNoTracking().Include(o => o.Lines).SingleAsync(o => o.Id == id));

    private Task<int?> Stock(string sku) => factory.Query(db => db.MerchVariants.Where(v => v.Sku == sku).Select(v => v.Stock).SingleAsync());

    private Task<List<OutboxMessage>> Outbox() => factory.Query(db => db.OutboxMessages.AsNoTracking().OrderBy(m => m.ToAddress).ToListAsync());

    // L2-268 AC1
    // Given a pending order of Youth L × 2 and Men's L, shipped, when the provider's signed
    // checkout.session.completed with payment_status paid arrives, then the order is paid with the buyer,
    // the address, the tax and the total, Youth L's stock falls from 3 to 1, and two e-mails are queued.
    [Fact]
    public async Task L2_268_AC1_a_signed_paid_event_pays_the_order_lowers_the_stock_and_queues_two_emails()
    {
        var order = await factory.ArrangePendingOrder(("youth-L", 2), more: ("mens-L", 1));

        var response = await Deliver(Event("checkout.session.completed", order.CheckoutSessionId!, total: 8300, tax: 900));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var paid = await Order(order.Id);
        Assert.Equal(MerchOrderStatus.Paid, paid.Status);
        Assert.Equal(factory.Clock.GetUtcNow(), paid.PaidAt);
        Assert.Equal("joanna.adeyemi@example.com", paid.BuyerEmail);
        Assert.Equal("Joanna Adeyemi", paid.BuyerName);
        Assert.Equal("Joanna Adeyemi, 48 Woodmount Ave, East York, ON M4C 3X8", paid.ShippingAddress);
        Assert.Equal(900, paid.TaxCents);
        Assert.Equal(8300, paid.TotalCents);
        Assert.Equal(1, await Stock("youth-L"));
        Assert.Null(await Stock("mens-L"));

        var mails = await Outbox();
        Assert.Equal(2, mails.Count);
        var buyer = mails.Single(m => m.ToAddress == "joanna.adeyemi@example.com");
        Assert.Equal($"Your Jubilee order {order.Number}", buyer.Subject);
        Assert.Null(buyer.MemberId);
        Assert.Null(buyer.Category);
        Assert.Contains("Thank you. Your order is paid.", buyer.TextBody);
        Assert.Contains("Purpose Tee, Black, Youth L × 2: $50.00", buyer.TextBody);
        Assert.Contains("Purpose Tee, Black, Men’s L × 1: $25.00", buyer.TextBody);
        Assert.Contains("Shipping: free", buyer.TextBody);
        Assert.Contains("Tax: $9.00", buyer.TextBody);
        Assert.Contains("Total: $83.00 CAD", buyer.TextBody);
        Assert.Contains("We ship it to Joanna Adeyemi, 48 Woodmount Ave, East York, ON M4C 3X8, in 3 to 5 business days.", buyer.TextBody);
        Assert.Contains("Wrong size? Swap it free within 30 days, unworn.", buyer.TextBody);
        Assert.Contains($"https://jubilee.test/purpose-tee/thanks?order={order.Reference}", buyer.TextBody);
        var team = mails.Single(m => m.ToAddress == "orders@jubilee.test");
        Assert.Equal($"New Purpose Tee order {order.Number}: ship", team.Subject);
        Assert.Contains("Buyer: Joanna Adeyemi (joanna.adeyemi@example.com)", team.TextBody);
        Assert.Contains("Delivery: ship to Joanna Adeyemi, 48 Woodmount Ave, East York, ON M4C 3X8", team.TextBody);
        Assert.Contains("Youth L × 2", team.TextBody);
        Assert.Contains("Shirts $75.00 · shipping free · tax $9.00 · total $83.00 CAD", team.TextBody);
        Assert.DoesNotContain("Stock was short", team.TextBody);
    }

    // L2-268 AC1: async payments succeed later; a picked-up order says so and keeps no address
    [Fact]
    public async Task L2_268_AC1_an_async_payment_pays_a_picked_up_order()
    {
        var order = await factory.ArrangePendingOrder(("mens-L", 1), delivery: MerchDelivery.Pickup);

        await Deliver(Event("checkout.session.async_payment_succeeded", order.CheckoutSessionId!, total: 2825, tax: 325, shipped: false));

        var paid = await Order(order.Id);
        Assert.Equal(MerchOrderStatus.Paid, paid.Status);
        Assert.Null(paid.ShippingAddress);
        var mails = await Outbox();
        Assert.Contains(mails, m => m.Subject == $"New Purpose Tee order {order.Number}: pick up");
        Assert.Contains("Pick it up at the next Jubilee gathering in Toronto", mails.Single(m => m.ToAddress == "joanna.adeyemi@example.com").TextBody);
    }

    // L2-268 AC2
    [Fact]
    public async Task L2_268_AC2_a_replayed_event_changes_nothing()
    {
        var order = await factory.ArrangePendingOrder(("youth-L", 2));
        var body = Event("checkout.session.completed", order.CheckoutSessionId!);

        await Deliver(body);
        var again = await Deliver(body);

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(1, await Stock("youth-L"));
        Assert.Equal(2, (await Outbox()).Count);
    }

    // L2-268 AC3
    [Fact]
    public async Task L2_268_AC3_an_unsigned_wrongly_signed_or_stale_event_is_refused()
    {
        var order = await factory.ArrangePendingOrder(("youth-L", 2));
        var body = Event("checkout.session.completed", order.CheckoutSessionId!);

        foreach (var signature in new[]
        {
            string.Empty,
            Sign(body, factory.Clock.GetUtcNow(), "whsec_someone_else"),
            Sign(body, factory.Clock.GetUtcNow().AddMinutes(-6)),
            "t=abc,v1=00",
        })
        {
            var response = await Deliver(body, signature);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
            Assert.Equal("signature_invalid", json.GetProperty("code").GetString());
        }

        Assert.Equal(MerchOrderStatus.Pending, (await Order(order.Id)).Status);
        Assert.Equal(3, await Stock("youth-L"));
        Assert.Empty(await Outbox());
    }

    // L2-268 AC4
    [Fact]
    public async Task L2_268_AC4_an_unpaid_completion_stays_pending_and_an_expiry_frees_the_hold()
    {
        var order = await factory.ArrangePendingOrder(("youth-L", 3));

        await Deliver(Event("checkout.session.completed", order.CheckoutSessionId!, paymentStatus: "unpaid"));
        Assert.Equal(MerchOrderStatus.Pending, (await Order(order.Id)).Status);

        await Deliver(Event("checkout.session.expired", order.CheckoutSessionId!, paymentStatus: "unpaid"));
        Assert.Equal(MerchOrderStatus.Expired, (await Order(order.Id)).Status);
        Assert.Equal(3, Size(await factory.GetJson(Product), "youth-L").GetProperty("left").GetInt32());
    }

    // L2-268 AC4: an expiry never undoes a payment
    [Fact]
    public async Task L2_268_AC4_an_expiry_after_payment_changes_nothing()
    {
        var order = await factory.ArrangePendingOrder(("youth-L", 1));

        await Deliver(Event("checkout.session.completed", order.CheckoutSessionId!));
        await Deliver(Event("checkout.session.expired", order.CheckoutSessionId!));

        Assert.Equal(MerchOrderStatus.Paid, (await Order(order.Id)).Status);
    }

    // L2-268 AC5
    [Fact]
    public async Task L2_268_AC5_another_event_or_an_unknown_session_changes_nothing()
    {
        var order = await factory.ArrangePendingOrder(("youth-L", 1));

        Assert.Equal(HttpStatusCode.OK, (await Deliver(Event("payment_intent.succeeded", order.CheckoutSessionId!))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Deliver(Event("checkout.session.completed", "cs_test_unknown"))).StatusCode);

        Assert.Equal(MerchOrderStatus.Pending, (await Order(order.Id)).Status);
        Assert.Empty(await Outbox());
    }

    // L2-268 AC6
    [Fact]
    public async Task L2_268_AC6_a_payment_after_the_stock_ran_out_is_still_paid_and_the_team_is_told()
    {
        var order = await factory.ArrangePendingOrder(("mens-3XL", 2));
        await factory.WithDb(async db =>
        {
            (await db.MerchVariants.SingleAsync(v => v.Sku == "mens-3XL")).SetStock(1);
            await db.SaveChangesAsync();
        });

        await Deliver(Event("checkout.session.completed", order.CheckoutSessionId!));

        Assert.Equal(MerchOrderStatus.Paid, (await Order(order.Id)).Status);
        Assert.Equal(0, await Stock("mens-3XL"));
        Assert.Contains("Stock was short for Men’s 3XL: check before shipping.", (await Outbox()).Single(m => m.ToAddress == "orders@jubilee.test").TextBody);
    }

    // L2-268 AC7: no session, no anti-CSRF token, and nothing of the buyer in the logs
    [Fact]
    public async Task L2_268_AC7_the_webhook_logs_nothing_of_the_buyer()
    {
        var order = await factory.ArrangePendingOrder(("mens-L", 1));

        await Deliver(Event("checkout.session.completed", order.CheckoutSessionId!));

        Assert.DoesNotContain(factory.Logs.Entries, e => e.Message.Contains("joanna.adeyemi", StringComparison.OrdinalIgnoreCase)
            || e.Message.Contains("Woodmount", StringComparison.Ordinal) || e.Message.Contains("v1=", StringComparison.Ordinal));
    }
}
