using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Jubilee.Application.Merch;

namespace Jubilee.Infrastructure.Merch;

/// <summary>
/// Creates a Stripe Checkout session with one form-encoded call (ADR 0073); there is no Stripe SDK and
/// no Stripe script in any page. The card is entered on Stripe's hosted page only (L2-270 AC1). The
/// secret key is sent as the bearer token and never logged.
/// </summary>
public sealed class StripePaymentGateway(HttpClient http, MerchSettings settings) : IPaymentGateway
{
    public const string SessionsUrl = "https://api.stripe.com/v1/checkout/sessions";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(settings.SecretKey);

    public async Task<CheckoutSession> CreateCheckoutSessionAsync(CheckoutSessionRequest request, CancellationToken cancellationToken)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, SessionsUrl) { Content = new FormUrlEncodedContent(Form(request)) };
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.SecretKey);
        // A retry of the same order never creates a second session.
        message.Headers.Add("Idempotency-Key", $"merch-{request.Reference}");
        try
        {
            using var response = await http.SendAsync(message, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                throw new PaymentGatewayException($"Stripe answered {(int)response.StatusCode}.");
            }

            var session = await response.Content.ReadFromJsonAsync<StripeSession>(cancellationToken);
            return session is { Id: { Length: > 0 } id, Url: { Length: > 0 } url }
                ? new CheckoutSession(id, url)
                : throw new PaymentGatewayException("Stripe answered no session.");
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            throw new PaymentGatewayException("Stripe could not be reached.", exception);
        }
    }

    /// <summary>The form Stripe's <c>POST /v1/checkout/sessions</c> takes, in Canadian dollars.</summary>
    public static List<KeyValuePair<string, string>> Form(CheckoutSessionRequest request)
    {
        var form = new List<KeyValuePair<string, string>>
        {
            new("mode", "payment"),
            new("currency", "cad"),
            new("client_reference_id", request.Reference),
            new("metadata[order_number]", request.OrderNumber),
            new("success_url", request.SuccessUrl),
            new("cancel_url", request.CancelUrl),
            new("expires_at", request.ExpiresAt.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture)),
            new("automatic_tax[enabled]", request.AutomaticTax ? "true" : "false"),
        };
        for (var i = 0; i < request.Lines.Count; i++)
        {
            var line = request.Lines[i];
            form.Add(new($"line_items[{i}][quantity]", line.Quantity.ToString(CultureInfo.InvariantCulture)));
            form.Add(new($"line_items[{i}][price_data][currency]", "cad"));
            form.Add(new($"line_items[{i}][price_data][unit_amount]", line.UnitAmountCents.ToString(CultureInfo.InvariantCulture)));
            form.Add(new($"line_items[{i}][price_data][tax_behavior]", "exclusive"));
            form.Add(new($"line_items[{i}][price_data][product_data][name]", line.Name));
        }

        if (request.ShippingCents is { } shipping)
        {
            // Shipped orders only: Stripe collects an address in Canada (L2-267 AC2).
            form.Add(new("shipping_address_collection[allowed_countries][0]", "CA"));
            form.Add(new("shipping_options[0][shipping_rate_data][type]", "fixed_amount"));
            form.Add(new("shipping_options[0][shipping_rate_data][display_name]", shipping == 0 ? "Canada Post, free" : "Canada Post"));
            form.Add(new("shipping_options[0][shipping_rate_data][fixed_amount][amount]", shipping.ToString(CultureInfo.InvariantCulture)));
            form.Add(new("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "cad"));
            form.Add(new("shipping_options[0][shipping_rate_data][tax_behavior]", "exclusive"));
            form.Add(new("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]", "business_day"));
            form.Add(new("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]", "3"));
            form.Add(new("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]", "business_day"));
            form.Add(new("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]", "5"));
        }

        return form;
    }

    private sealed record StripeSession([property: JsonPropertyName("id")] string? Id, [property: JsonPropertyName("url")] string? Url);
}
