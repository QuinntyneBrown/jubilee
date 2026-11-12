using System.Text.Json.Serialization;
using Jubilee.Api.Middleware;
using Jubilee.Application.Onboarding;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>The body of <c>POST /api/statement-of-faith/agreement</c>: the version the owner was shown. Unknown fields are refused.</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record StatementAgreementRequest(string? Version);

/// <summary>An owner's agreement to an updated statement of faith (L2-075 AC4).</summary>
[ApiController]
[Route("api/statement-of-faith")]
public sealed class StatementOfFaithController(ISender sender) : ControllerBase
{
    /// <summary>Records the agreement; another version than the current one is refused with 409 <c>STATEMENT_VERSION</c>.</summary>
    [HttpPost("agreement")]
    public async Task<IActionResult> Agree(StatementAgreementRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new AgreeToStatementCommand(User.ToViewer().Subject!, request.Version), cancellationToken);
        return NoContent();
    }
}
