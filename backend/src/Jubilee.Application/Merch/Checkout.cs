using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Merch;

/// <summary>
/// The merchandise settings, read once by the composition root (ADR 0073). <see cref="TeamEmail"/> is
/// <c>Merch:TeamEmail</c>, or <c>Launch:TeamEmail</c> when it is empty.
/// </summary>
public sealed record MerchSettings(string? SecretKey, string? WebhookSecret, bool AutomaticTax, string? TeamEmail, string PublicBaseUrl);

public sealed record CheckoutLineInput(string? Sku, int Quantity, int UnitPriceCents);

/// <summary>"Check out" (L2-267). The lines carry the price the buyer saw, only to refuse it when it changed.</summary>
public sealed record StartCheckoutCommand(IReadOnlyList<CheckoutLineInput>? Lines, string? Delivery) : IRequest<string>;

public sealed class StartCheckoutCommandHandler(IAppDbContext db, IPaymentGateway gateway, MerchSettings settings, TimeProvider clock)
    : IRequestHandler<StartCheckoutCommand, string>
{
    public const int MaxQuantity = 10;

    public async Task<string> Handle(StartCheckoutCommand request, CancellationToken cancellationToken)
    {
        if (!gateway.IsConfigured)
        {
            throw new UnavailableException(
                "checkout_unavailable", "Checkout isn't open yet. The shirts are ready, and we're still setting up payment.");
        }

        var now = clock.GetUtcNow();
        var product = await db.MerchProducts.Include(p => p.Variants)
            .SingleAsync(p => p.Slug == MerchProduct.PurposeTeeSlug, cancellationToken);
        var held = await MerchStock.HeldAsync(db, now, cancellationToken);
        var errors = new Dictionary<string, string>();
        var delivery = request.Delivery switch
        {
            "ship" => MerchDelivery.Ship,
            "pickup" => MerchDelivery.Pickup,
            _ => (MerchDelivery?)null,
        };
        if (delivery is null)
        {
            errors["delivery"] = "INVALID";
        }

        var lines = new List<(MerchVariant Variant, int Quantity)>();
        var input = request.Lines ?? [];
        if (input.Count == 0)
        {
            errors["lines"] = "REQUIRED";
        }

        for (var i = 0; i < input.Count; i++)
        {
            var line = input[i];
            var variant = product.Variants.SingleOrDefault(v => v.Sku == line.Sku);
            if (variant is null)
            {
                errors[$"lines[{i}].sku"] = "UNKNOWN";
                continue;
            }

            if (lines.Any(l => l.Variant.Id == variant.Id))
            {
                errors[$"lines[{i}].sku"] = "DUPLICATE";
                continue;
            }

            if (line.UnitPriceCents != product.UnitPriceCents)
            {
                errors[$"lines[{i}].unitPriceCents"] = "PRICE_CHANGED";
            }

            var left = MerchStock.Left(variant, held);
            if (left == 0)
            {
                errors[$"lines[{i}].quantity"] = "SOLD_OUT";
            }
            else if (line.Quantity is < 1 or > MaxQuantity)
            {
                errors[$"lines[{i}].quantity"] = "OUT_OF_RANGE";
            }
            else if (line.Quantity > left)
            {
                errors[$"lines[{i}].quantity"] = $"ONLY_LEFT:{left}";
            }

            lines.Add((variant, line.Quantity));
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var order = MerchOrder.Start(product, lines, delivery!.Value, now);
        var thanks = $"{settings.PublicBaseUrl.TrimEnd('/')}/purpose-tee/thanks?order={order.Reference}";
        CheckoutSession session;
        try
        {
            session = await gateway.CreateCheckoutSessionAsync(
                new CheckoutSessionRequest(
                    order.Reference,
                    order.Number,
                    [.. order.Lines.Select(l => new CheckoutSessionLine(
                        $"{product.Name} · {product.Colour} — {MerchFits.Of(l.Fit).Name} {l.Size}", l.UnitPriceCents, l.Quantity))],
                    order.Delivery == MerchDelivery.Ship ? order.ShippingCents : null,
                    settings.AutomaticTax,
                    thanks,
                    thanks + "&cancelled=1",
                    order.ExpiresAt),
                cancellationToken);
        }
        catch (PaymentGatewayException exception)
        {
            // Nothing is stored, so nothing is held (L2-267 AC6).
            throw new UnavailableException("checkout_failed", "We couldn't open checkout. Nothing was charged.", exception);
        }

        order.AttachCheckoutSession(session.Id);
        db.MerchOrders.Add(order);
        await db.SaveChangesAsync(cancellationToken);
        return session.Url;
    }
}
