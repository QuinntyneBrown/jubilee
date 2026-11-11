using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.Maintenance;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record AccessRequestBody(string? Url);

/// <summary>"Ask for access" (L2-114 AC2): records the address and the member, and grants nothing.</summary>
[ApiController]
[Route("api/help/access-requests")]
public sealed class HelpController(ISender sender) : ControllerBase
{
    [HttpPost]
    [ErrorReference("JB-HELP-503")]
    public async Task<IActionResult> Ask(AccessRequestBody request, CancellationToken cancellationToken)
    {
        var key = Request.Headers["Idempotency-Key"].ToString();
        var created = await sender.Send(new CreateAccessRequestCommand(User.ToViewer().Subject!, request.Url, key), cancellationToken);
        return StatusCode(StatusCodes.Status201Created, created);
    }
}
