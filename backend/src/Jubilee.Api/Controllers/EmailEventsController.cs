using System.Security.Cryptography;
using System.Text;
using Jubilee.Application.Accounts;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

public sealed record EmailEvent(string? Type, string? Address);

/// <summary>
/// The e-mail provider's bounce and complaint webhook (L2-179 AC2). The provider authenticates with a
/// shared secret in <c>X-Webhook-Secret</c> (<c>Email:WebhookSecret</c>); without a configured secret the endpoint is closed.
/// </summary>
[ApiController]
[Route("api/webhooks/email-events")]
[AllowAnonymous]
public sealed class EmailEventsController(ISender sender, IConfiguration configuration) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Receive(EmailEvent body, CancellationToken cancellationToken)
    {
        var secret = configuration["Email:WebhookSecret"];
        var given = Request.Headers["X-Webhook-Secret"].ToString();
        if (string.IsNullOrEmpty(secret)
            || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(given)))
        {
            return Unauthorized();
        }

        if (body.Type is "bounce" or "complaint" && body.Address is not null)
        {
            await sender.Send(new RecordEmailBounceCommand(body.Address), cancellationToken);
        }

        return NoContent();
    }
}
