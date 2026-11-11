using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ReportListingBody(string? Reason, string? Description);

/// <summary>
/// A member reports a listing privately (L2-039). The member comes from the session, the listing from the address;
/// the owner of the listing cannot report it (L2-133). A repeated <c>Idempotency-Key</c> returns the first answer (L2-132).
/// </summary>
[ApiController]
[Route("api/listings/{slug}/reports")]
public sealed class ListingReportsController(ISender sender) : ControllerBase
{
    [HttpPost]
    [ErrorReference("JB-REP-503")]
    public async Task<IActionResult> Report(string slug, ReportListingBody request, CancellationToken cancellationToken)
    {
        var key = Request.Headers["Idempotency-Key"].ToString();
        var reported = await sender.Send(
            new ReportListingCommand(User.ToViewer().Subject!, slug, request.Reason, request.Description, key, User.FindFirst("name")?.Value), cancellationToken);
        return StatusCode(StatusCodes.Status201Created, reported);
    }
}

/// <summary>What a chat or social app fetches to preview a shared link (L2-038 AC4).</summary>
[ApiController]
[Route("api/listings/{slug}/social-preview")]
[AllowAnonymous]
public sealed class SharePreviewController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ErrorReference("JB-BIZ-503")]
    public async Task<ContentResult> Get(string slug, CancellationToken cancellationToken) =>
        Content(await sender.Send(new GetSharePreviewQuery(slug), cancellationToken), "text/html; charset=utf-8");
}
