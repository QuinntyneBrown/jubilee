using Jubilee.Application.Merch;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Jubilee.Api.Tests.Support;

/// <summary>
/// The API with the fake payment gateway and a test webhook secret (ADR 0009): no test reaches
/// Stripe or any network. Events are signed in the test with <see cref="WebhookSecret"/>.
/// </summary>
public class MerchApiFactory : JubileeApiFactory
{
    public const string WebhookSecret = "whsec_test_secret";

    public FakePaymentGateway Gateway { get; } = new();

    protected override void ConfigureSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("Stripe:WebhookSecret", WebhookSecret);
        builder.UseSetting("Merch:TeamEmail", "orders@jubilee.test");
        builder.UseSetting("RateLimits:MerchCheckoutsPerHour", "100000");
        builder.UseSetting("RateLimits:MerchOrderReadsPerMinute", "100000");
        builder.UseSetting("RateLimits:MerchWebhooksPerMinute", "100000");
        ConfigureMerchSettings(builder);
    }

    protected virtual void ConfigureMerchSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.RemoveAll<IPaymentGateway>();
        services.AddSingleton<IPaymentGateway>(Gateway);
    }

    /// <summary>A pending order holding the given quantities, as a checkout would leave it.</summary>
    public async Task<MerchOrder> ArrangePendingOrder(
        (string Sku, int Quantity) line, TimeSpan? expiresIn = null, MerchDelivery delivery = MerchDelivery.Ship, string? sessionId = null,
        params (string Sku, int Quantity)[] more)
    {
        MerchOrder order = null!;
        await WithDb(async db =>
        {
            var product = await db.MerchProducts.Include(p => p.Variants).SingleAsync();
            var lines = new[] { line }.Concat(more).Select(l => (product.Variants.Single(v => v.Sku == l.Sku), l.Quantity));
            var now = Clock.GetUtcNow();
            order = MerchOrder.Start(product, lines, delivery, now - (MerchOrder.HoldFor - (expiresIn ?? MerchOrder.HoldFor)));
            order.AttachCheckoutSession(sessionId ?? $"cs_test_{Guid.NewGuid():N}");
            db.MerchOrders.Add(order);
            await db.SaveChangesAsync();
        });
        return order;
    }
}

/// <summary>Stands in for Stripe: records each session asked for and answers a hosted page on localhost.</summary>
public sealed class FakePaymentGateway : IPaymentGateway
{
    public bool IsConfigured { get; set; } = true;

    public bool Failing { get; set; }

    public List<CheckoutSessionRequest> Requests { get; } = [];

    public void Reset()
    {
        IsConfigured = true;
        Failing = false;
        Requests.Clear();
    }

    public Task<CheckoutSession> CreateCheckoutSessionAsync(CheckoutSessionRequest request, CancellationToken cancellationToken)
    {
        if (Failing)
        {
            throw new PaymentGatewayException("The provider refused the session.");
        }

        Requests.Add(request);
        var id = $"cs_test_{Requests.Count}_{request.Reference}";
        return Task.FromResult(new CheckoutSession(id, $"http://localhost/stripe-checkout/{id}"));
    }
}
