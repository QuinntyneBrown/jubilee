using Jubilee.Application.Notifications;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>
/// The one-click unsubscribe of a notification e-mail (RFC 8058, L2-068 AC3). The signed token in the link says whose
/// preference to turn off, so it needs no sign-in; a token that does not verify is a 404.
/// </summary>
[ApiController]
[Route("api/email/unsubscribe")]
[AllowAnonymous]
public sealed class UnsubscribeController(ISender sender) : ControllerBase
{
    [HttpPost("{token}")]
    public async Task<IActionResult> Unsubscribe(string token, CancellationToken cancellationToken)
    {
        var category = await sender.Send(new UnsubscribeCommand(token), cancellationToken);
        return Ok(new { unsubscribed = true, category });
    }
}
