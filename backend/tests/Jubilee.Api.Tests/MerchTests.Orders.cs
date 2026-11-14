using System.Net;
using System.Text.Json;
using Jubilee.Application.Merch;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-269 AC7, L2-270 AC3, AC5, AC6
// Description: the return page reads an order by its reference; the worker expires holds and erases old orders.
public partial class MerchTests
{
    private async Task<T> Send<T>(IRequest<T> command)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(command);
    }

    // L2-269 AC7
    [Fact]
    public async Task L2_269_AC7_an_order_is_read_by_its_reference_without_the_buyer()
    {
        var order = await factory.ArrangePendingOrder(("mens-L", 1), more: ("womens-M", 2));
        await Deliver(Event("checkout.session.completed", order.CheckoutSessionId!, total: 8475, tax: 975));

        var json = await factory.GetJson($"/api/merch/orders/{order.Reference}");

        Assert.Equal(["number", "status", "delivery", "lines", "totalCents"], json.EnumerateObject().Select(p => p.Name));
        Assert.Equal(order.Number, json.GetProperty("number").GetString());
        Assert.Equal("paid", json.GetProperty("status").GetString());
        Assert.Equal("ship", json.GetProperty("delivery").GetString());
        Assert.Equal(8475, json.GetProperty("totalCents").GetInt32());
        Assert.Equal(
            [("Men’s", "L", 1), ("Women’s", "M", 2)],
            json.GetProperty("lines").EnumerateArray().Select(l => (l.GetProperty("fit").GetString(), l.GetProperty("size").GetString(), l.GetProperty("quantity").GetInt32())));
        Assert.DoesNotContain("joanna", json.GetRawText(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task L2_269_AC7_a_pending_order_reads_pending_and_an_unknown_reference_is_404()
    {
        var order = await factory.ArrangePendingOrder(("mens-L", 1), delivery: MerchDelivery.Pickup);
        var json = await factory.GetJson($"/api/merch/orders/{order.Reference}");
        Assert.Equal("pending", json.GetProperty("status").GetString());
        Assert.Equal("pickup", json.GetProperty("delivery").GetString());

        var missing = await factory.CreateClient().GetAsync("/api/merch/orders/not-a-reference");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal("order_not_found", JsonDocument.Parse(await missing.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString());
    }

    // L2-270 AC6
    [Fact]
    public async Task L2_270_AC6_a_pending_order_expired_over_5_minutes_ago_becomes_expired()
    {
        var late = await factory.ArrangePendingOrder(("youth-L", 1), expiresIn: TimeSpan.FromMinutes(-6));
        var recent = await factory.ArrangePendingOrder(("youth-L", 1), expiresIn: TimeSpan.FromMinutes(-4));

        Assert.Equal(1, await Send(new ExpireMerchOrdersCommand()));

        Assert.Equal(MerchOrderStatus.Expired, (await Order(late.Id)).Status);
        Assert.Equal(MerchOrderStatus.Pending, (await Order(recent.Id)).Status);
        Assert.Equal("expired", (await factory.GetJson($"/api/merch/orders/{late.Reference}")).GetProperty("status").GetString());
    }

    // L2-270 AC5, L2-148 AC7
    [Fact]
    public async Task L2_270_AC5_unpaid_orders_go_after_30_days_and_paid_orders_lose_the_buyer_after_6_years()
    {
        var unpaid = await factory.ArrangePendingOrder(("mens-L", 1));
        var paid = await factory.ArrangePendingOrder(("mens-M", 1));
        await Deliver(Event("checkout.session.completed", paid.CheckoutSessionId!));

        factory.Clock.Advance(TimeSpan.FromDays(31));
        var first = await Send(new PurgeMerchOrdersCommand());
        Assert.Equal((1, 0), (first.Deleted, first.Erased));
        Assert.False(await factory.Query(db => db.MerchOrders.AnyAsync(o => o.Id == unpaid.Id)));
        Assert.Equal("joanna.adeyemi@example.com", (await Order(paid.Id)).BuyerEmail);

        factory.Clock.Advance(TimeSpan.FromDays(6 * 366));
        var second = await Send(new PurgeMerchOrdersCommand());
        Assert.Equal((0, 1), (second.Deleted, second.Erased));
        var kept = await Order(paid.Id);
        Assert.Null(kept.BuyerEmail);
        Assert.Null(kept.BuyerName);
        Assert.Null(kept.ShippingAddress);
        Assert.Equal(MerchOrderStatus.Paid, kept.Status);
        var third = await Send(new PurgeMerchOrdersCommand());
        Assert.Equal((0, 0), (third.Deleted, third.Erased));
    }
}
