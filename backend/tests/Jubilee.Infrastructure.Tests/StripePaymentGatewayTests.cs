using System.Net;
using System.Text;
using Jubilee.Application.Merch;
using Jubilee.Infrastructure.Merch;

namespace Jubilee.Infrastructure.Tests;

// Acceptance Test
// Traces to: L2-267 AC2, AC6, L2-270 AC1
// Description: the session Jubilee asks Stripe for, answered by a stub handler; no network is reached (ADR 0009).
public sealed class StripePaymentGatewayTests
{
    private static readonly CheckoutSessionRequest Shipped = new(
        "ref123",
        "PT-4F7K2Q",
        [new("Purpose Tee · Black — Men’s L", 2500, 2)],
        900,
        true,
        "https://jubilee.test/purpose-tee/thanks?order=ref123",
        "https://jubilee.test/purpose-tee/thanks?order=ref123&cancelled=1",
        DateTimeOffset.FromUnixTimeSeconds(1_800_000_000));

    private sealed class StubHandler(HttpStatusCode status, string body) : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }

        public string? Form { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Request = request;
            Form = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
        }
    }

    private static StripePaymentGateway Gateway(StubHandler handler, string? key = "sk_test_x") =>
        new(new HttpClient(handler), new MerchSettings(key, "whsec", true, null, "https://jubilee.test"));

    [Fact]
    public async Task L2_267_AC2_the_session_is_asked_for_in_CAD_with_the_server_amounts_and_a_Canadian_address()
    {
        var handler = new StubHandler(HttpStatusCode.OK, """{"id":"cs_test_1","url":"https://checkout.stripe.com/c/pay/cs_test_1"}""");

        var session = await Gateway(handler).CreateCheckoutSessionAsync(Shipped, CancellationToken.None);

        Assert.Equal(new CheckoutSession("cs_test_1", "https://checkout.stripe.com/c/pay/cs_test_1"), session);
        Assert.Equal(StripePaymentGateway.SessionsUrl, handler.Request!.RequestUri!.ToString());
        Assert.Equal("Bearer sk_test_x", handler.Request.Headers.Authorization!.ToString());
        Assert.Equal("merch-ref123", Assert.Single(handler.Request.Headers.GetValues("Idempotency-Key")));
        var form = handler.Form!.Split('&').Select(WebUtility.UrlDecode).ToList();
        Assert.Contains("mode=payment", form);
        Assert.Contains("currency=cad", form);
        Assert.Contains("client_reference_id=ref123", form);
        Assert.Contains("expires_at=1800000000", form);
        Assert.Contains("automatic_tax[enabled]=true", form);
        Assert.Contains("line_items[0][price_data][unit_amount]=2500", form);
        Assert.Contains("line_items[0][quantity]=2", form);
        Assert.Contains("shipping_address_collection[allowed_countries][0]=CA", form);
        Assert.Contains("shipping_options[0][shipping_rate_data][fixed_amount][amount]=900", form);
        Assert.DoesNotContain(form, f => f!.Contains("card", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task L2_267_AC2_a_picked_up_order_collects_no_address()
    {
        var handler = new StubHandler(HttpStatusCode.OK, """{"id":"cs_test_2","url":"https://checkout.stripe.com/x"}""");

        await Gateway(handler).CreateCheckoutSessionAsync(Shipped with { ShippingCents = null }, CancellationToken.None);

        Assert.DoesNotContain("shipping_address_collection", handler.Form);
        Assert.DoesNotContain("shipping_options", handler.Form);
    }

    [Fact]
    public async Task L2_267_AC6_a_refusal_is_a_gateway_failure()
    {
        var handler = new StubHandler(HttpStatusCode.BadRequest, """{"error":{"message":"No such thing"}}""");

        await Assert.ThrowsAsync<PaymentGatewayException>(() => Gateway(handler).CreateCheckoutSessionAsync(Shipped, CancellationToken.None));
    }

    [Fact]
    public void L2_267_AC5_without_a_secret_key_the_gateway_is_not_configured()
    {
        Assert.False(Gateway(new StubHandler(HttpStatusCode.OK, "{}"), key: "").IsConfigured);
        Assert.True(Gateway(new StubHandler(HttpStatusCode.OK, "{}")).IsConfigured);
    }
}
