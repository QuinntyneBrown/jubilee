namespace Jubilee.Application.Merch;

/// <summary>One line of a checkout session: its name, the unit amount in cents and the quantity.</summary>
public sealed record CheckoutSessionLine(string Name, int UnitAmountCents, int Quantity);

/// <summary>
/// What Jubilee asks the payment provider for: a hosted checkout session in Canadian dollars priced
/// from the server's rows (L2-267 AC2). <paramref name="ShippingCents"/> is null for a picked-up order,
/// and only then is no address collected.
/// </summary>
public sealed record CheckoutSessionRequest(
    string Reference,
    string OrderNumber,
    IReadOnlyList<CheckoutSessionLine> Lines,
    int? ShippingCents,
    bool AutomaticTax,
    string SuccessUrl,
    string CancelUrl,
    DateTimeOffset ExpiresAt);

/// <summary>The provider's session: its id, which its events name, and the address of its hosted page.</summary>
public sealed record CheckoutSession(string Id, string Url);

/// <summary>The provider refused the session or could not be reached (L2-267 AC6).</summary>
public sealed class PaymentGatewayException(string message, Exception? inner = null) : Exception(message, inner);

/// <summary>
/// The payment provider: Stripe's hosted Checkout (ADR 0073). Jubilee never sees a card; tests replace
/// it with a fake and never reach the provider or any network (ADR 0009).
/// </summary>
public interface IPaymentGateway
{
    /// <summary>False while no secret key is configured: checkout is not open yet (L2-267 AC5).</summary>
    bool IsConfigured { get; }

    Task<CheckoutSession> CreateCheckoutSessionAsync(CheckoutSessionRequest request, CancellationToken cancellationToken);
}
