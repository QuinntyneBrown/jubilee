using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Merch;

/// <summary>
/// Verifies Stripe's <c>Stripe-Signature</c> header (<c>t=…,v1=…</c>): the HMAC-SHA256 of
/// <c>{t}.{body}</c> with the webhook secret, compared in fixed time, with <c>t</c> within 5 minutes
/// of now (L2-268 AC3). Without a secret nothing verifies.
/// </summary>
public static class StripeSignature
{
    public static readonly TimeSpan Tolerance = TimeSpan.FromMinutes(5);

    public static bool Verify(string body, string? header, string? secret, DateTimeOffset now)
    {
        if (string.IsNullOrEmpty(secret) || string.IsNullOrWhiteSpace(header))
        {
            return false;
        }

        long? timestamp = null;
        var signatures = new List<string>();
        foreach (var part in header.Split(','))
        {
            var pair = part.Split('=', 2);
            if (pair.Length != 2)
            {
                continue;
            }

            if (pair[0].Trim() == "t" && long.TryParse(pair[1], NumberStyles.None, CultureInfo.InvariantCulture, out var t))
            {
                timestamp = t;
            }
            else if (pair[0].Trim() == "v1")
            {
                signatures.Add(pair[1].Trim());
            }
        }

        if (timestamp is not { } at || (now - DateTimeOffset.FromUnixTimeSeconds(at)).Duration() > Tolerance)
        {
            return false;
        }

        var expected = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes($"{at.ToString(CultureInfo.InvariantCulture)}.{body}"));
        return signatures.Any(given =>
            given.Length == expected.Length * 2
            && given.All(Uri.IsHexDigit)
            && CryptographicOperations.FixedTimeEquals(Convert.FromHexString(given), expected));
    }
}

/// <summary>The provider's event, with the raw body its signature covers (L2-268).</summary>
public sealed record CompleteCheckoutCommand(string Body, string? Signature) : IRequest;

public sealed class CompleteCheckoutCommandHandler(IAppDbContext db, MerchSettings settings, TimeProvider clock)
    : IRequestHandler<CompleteCheckoutCommand>
{
    public async Task Handle(CompleteCheckoutCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        if (!StripeSignature.Verify(request.Body, request.Signature, settings.WebhookSecret, now))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["signature"] = "INVALID" });
        }

        using var json = JsonDocument.Parse(request.Body);
        var root = json.RootElement;
        var type = Text(root, "type");
        if (!root.TryGetProperty("data", out var data) || !data.TryGetProperty("object", out var session)
            || Text(session, "id") is not { } sessionId)
        {
            return;
        }

        var paid = type switch
        {
            "checkout.session.completed" => Text(session, "payment_status") == "paid",
            "checkout.session.async_payment_succeeded" => true,
            _ => false,
        };
        if (!paid && type != "checkout.session.expired")
        {
            return;
        }

        var order = await db.MerchOrders.Include(o => o.Lines).SingleOrDefaultAsync(o => o.CheckoutSessionId == sessionId, cancellationToken);
        if (order is null)
        {
            return;
        }

        if (!paid)
        {
            order.Expire(now);
            await db.SaveChangesAsync(cancellationToken);
            return;
        }

        var email = Text(session, "customer_details", "email");
        var shipping = Address(session);
        if (!order.MarkPaid(
            email,
            Text(session, "customer_details", "name") ?? Text(shipping, "name"),
            AddressLine(shipping),
            Number(session, "total_details", "amount_tax") ?? 0,
            Number(session, "amount_total") ?? order.TotalCents,
            now))
        {
            return;
        }

        var variantIds = order.OrderedLines.Select(l => l.VariantId).ToList();
        var variants = await db.MerchVariants.Where(v => variantIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, cancellationToken);
        var short_ = order.Lines.Where(l => variants[l.VariantId].TakeStock(l.Quantity)).ToList();

        if (!string.IsNullOrWhiteSpace(email))
        {
            db.OutboxMessages.Add(OutboxMessage.Email(
                null, email, $"Your Jubilee order {order.Number}", MerchEmails.Receipt(order, settings.PublicBaseUrl), now));
        }

        if (!string.IsNullOrWhiteSpace(settings.TeamEmail))
        {
            db.OutboxMessages.Add(OutboxMessage.Email(
                null,
                settings.TeamEmail.Trim(),
                $"New Purpose Tee order {order.Number}: {(order.Delivery == MerchDelivery.Ship ? "ship" : "pick up")}",
                MerchEmails.TeamNotice(order, short_),
                now));
        }

        // Paid, stock and e-mails in one save (L2-268 AC1, ADR 0038).
        await db.SaveChangesAsync(cancellationToken);
    }

    private static JsonElement Address(JsonElement session)
    {
        if (session.TryGetProperty("collected_information", out var collected) && collected.ValueKind == JsonValueKind.Object
            && collected.TryGetProperty("shipping_details", out var details) && details.ValueKind == JsonValueKind.Object)
        {
            return details;
        }

        return session.TryGetProperty("shipping_details", out var legacy) && legacy.ValueKind == JsonValueKind.Object ? legacy : default;
    }

    private static string? AddressLine(JsonElement shipping)
    {
        if (shipping.ValueKind != JsonValueKind.Object || !shipping.TryGetProperty("address", out var address))
        {
            return null;
        }

        var region = string.Join(' ', new[] { Text(address, "state"), Text(address, "postal_code") }.Where(p => !string.IsNullOrWhiteSpace(p)));
        var parts = new[] { Text(shipping, "name"), Text(address, "line1"), Text(address, "line2"), Text(address, "city"), region }
            .Where(p => !string.IsNullOrWhiteSpace(p));
        return string.Join(", ", parts);
    }

    private static string? Text(JsonElement element, params string[] path)
    {
        foreach (var name in path)
        {
            if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out element))
            {
                return null;
            }
        }

        return element.ValueKind == JsonValueKind.String ? element.GetString() : null;
    }

    private static int? Number(JsonElement element, params string[] path)
    {
        foreach (var name in path)
        {
            if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out element))
            {
                return null;
            }
        }

        return element.ValueKind == JsonValueKind.Number && element.TryGetInt32(out var value) ? value : null;
    }
}

/// <summary>The plain-text bodies of the order e-mails, as <c>docs/mocks/emails/merch-*</c> read.</summary>
public static class MerchEmails
{
    private static readonly TimeZoneInfo Toronto = TimeZoneInfo.FindSystemTimeZoneById("America/Toronto");

    public static string Money(int cents) => "$" + (cents / 100m).ToString("0.00", CultureInfo.InvariantCulture);

    public static string Size(MerchOrderLine line) => $"{MerchFits.Of(line.Fit).Name} {line.Size}";

    public static string Receipt(MerchOrder order, string publicBaseUrl)
    {
        var text = new StringBuilder();
        text.Append(order.BuyerName is { Length: > 0 } name ? $"Hi {name.Split(' ')[0]},\n\n" : "Hello,\n\n");
        text.Append("Thank you. Your order is paid.\n\n");
        foreach (var line in order.OrderedLines)
        {
            text.Append($"Purpose Tee, Black, {Size(line)} × {line.Quantity}: {Money(line.UnitPriceCents * line.Quantity)}\n");
        }

        text.Append($"Shipping: {(order.Delivery == MerchDelivery.Pickup ? "none, picked up" : order.ShippingCents == 0 ? "free" : Money(order.ShippingCents))}\n");
        text.Append($"Tax: {Money(order.TaxCents)}\n");
        text.Append($"Total: {Money(order.TotalCents)} CAD\n\n");
        text.Append(order.Delivery == MerchDelivery.Ship
            ? $"We ship it to {order.ShippingAddress}, in 3 to 5 business days.\n\n"
            : "Pick it up at the next Jubilee gathering in Toronto; we’ll e-mail you the date and place.\n\n");
        text.Append($"Wrong size? Swap it free within 30 days, unworn. Reply to this e-mail with your order number, {order.Number}.\n\n");
        text.Append("Every shirt helps keep Jubilee free for the Christian business people of Toronto. Thank you for wearing it.\n\n");
        text.Append($"{publicBaseUrl.TrimEnd('/')}/purpose-tee/thanks?order={order.Reference}\n\n");
        text.Append("Jubilee · Toronto's Christian marketplace\n");
        return text.ToString();
    }

    public static string TeamNotice(MerchOrder order, IReadOnlyList<MerchOrderLine> shortLines)
    {
        var paid = TimeZoneInfo.ConvertTime(order.PaidAt!.Value, Toronto);
        var text = new StringBuilder("A Purpose Tee order was paid.\n\n");
        text.Append($"Order: {order.Number}\n");
        text.Append($"Paid: {paid.ToString("d MMM yyyy, h:mm", CultureInfo.InvariantCulture)} {(paid.Hour < 12 ? "a.m." : "p.m.")} Eastern\n");
        text.Append($"Buyer: {order.BuyerName ?? "no name given"} ({order.BuyerEmail ?? "no e-mail given"})\n");
        text.Append(order.Delivery == MerchDelivery.Ship
            ? $"Delivery: ship to {order.ShippingAddress}\n\n"
            : "Delivery: pick up at the Jubilee gathering in Toronto\n\n");
        foreach (var line in order.OrderedLines)
        {
            text.Append($"{Size(line)} × {line.Quantity}\n");
        }

        var shipping = order.Delivery == MerchDelivery.Pickup ? "none" : order.ShippingCents == 0 ? "free" : Money(order.ShippingCents);
        text.Append($"\nShirts {Money(order.SubtotalCents)} · shipping {shipping} · tax {Money(order.TaxCents)} · total {Money(order.TotalCents)} CAD\n\n");
        foreach (var line in shortLines)
        {
            text.Append($"Stock was short for {Size(line)}: check before shipping.\n");
        }

        text.Append("The stock is already lowered. Refunds and exchanges are made in the Stripe dashboard.\n\n");
        text.Append("Jubilee · Toronto's Christian marketplace\n");
        return text.ToString();
    }
}
