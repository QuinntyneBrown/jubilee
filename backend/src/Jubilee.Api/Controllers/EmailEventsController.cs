using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Jubilee.Application.Accounts;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>
/// The e-mail provider's bounce and complaint webhook (L2-179 AC2). The caller authenticates with a
/// shared secret in <c>X-Webhook-Secret</c> (<c>Email:WebhookSecret</c>); without a configured secret the
/// endpoint is closed. It takes Event Grid's delivery reports of Azure Communication Services Email
/// (an array of events, ADR 0038), answers Event Grid's validation handshake, and still takes the
/// provider-neutral <c>{ "type": "bounce" | "complaint", "address": … }</c>.
/// </summary>
[ApiController]
[Route("api/webhooks/email-events")]
[AllowAnonymous]
public sealed class EmailEventsController(ISender sender, IConfiguration configuration) : ControllerBase
{
    private const string ValidationEvent = "Microsoft.EventGrid.SubscriptionValidationEvent";
    private const string DeliveryReport = "Microsoft.Communication.EmailDeliveryReportReceived";

    [HttpPost]
    public async Task<IActionResult> Receive([FromBody] JsonElement body, CancellationToken cancellationToken)
    {
        var secret = configuration["Email:WebhookSecret"];
        var given = Request.Headers["X-Webhook-Secret"].ToString();
        if (string.IsNullOrEmpty(secret)
            || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(given)))
        {
            return Unauthorized();
        }

        if (body.ValueKind == JsonValueKind.Object)
        {
            if (Text(body, "type") is "bounce" or "complaint" && Text(body, "address") is { } address)
            {
                await sender.Send(new RecordEmailBounceCommand(address), cancellationToken);
            }

            return NoContent();
        }

        if (body.ValueKind != JsonValueKind.Array)
        {
            return NoContent();
        }

        foreach (var item in body.EnumerateArray())
        {
            var type = Text(item, "eventType");
            var data = item.ValueKind == JsonValueKind.Object && item.TryGetProperty("data", out var value) ? value : default;
            if (type == ValidationEvent)
            {
                // Event Grid proves it may post here by asking for its code back.
                return Ok(new { validationResponse = Text(data, "validationCode") });
            }

            // "Bounced" is a hard bounce; "Suppressed" is an address the provider no longer sends to
            // (an earlier hard bounce or a spam complaint).
            if (type == DeliveryReport && Text(data, "status") is "Bounced" or "Suppressed" && Text(data, "recipient") is { } recipient)
            {
                await sender.Send(new RecordEmailBounceCommand(recipient), cancellationToken);
            }
        }

        return NoContent();
    }

    private static string? Text(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
