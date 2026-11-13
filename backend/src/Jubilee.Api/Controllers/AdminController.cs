using System.Security.Claims;
using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Application.Moderation;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Jubilee.Api.Sessions;
using Microsoft.AspNetCore.Authorization;

namespace Jubilee.Api.Controllers;

/// <summary>
/// Only a staff session holding the <c>moderator</c> role reaches the listings, moderation and featured
/// endpoints (L2-191, ADR 0040); a member session is refused whatever it carries.
/// </summary>
public sealed class RequiresModeratorAttribute() : AuthorizeAttribute(StaffPolicies.Moderator);

/// <summary>Only a staff session holding the <c>admin</c> role reaches the administrator endpoints (L2-191).</summary>
public sealed class RequiresAdminAttribute() : AuthorizeAttribute(StaffPolicies.Admin);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record TakeDownRequest(string? Reason);

/// <summary>The Jubilee team's listings, one listing and the takedown (L2-098 to L2-101, ADR 0057).</summary>
[ApiController]
[RequiresModerator]
[Route("api/admin/listings")]
public sealed class AdminListingsController(ISender sender) : ControllerBase
{
    private Reviewer Reviewer => new(User.ToViewer().Subject!, User.FindFirst("name")?.Value ?? "The Jubilee team");

    [HttpGet]
    [ErrorReference("JB-ADM-503")]
    public Task<AdminListingsDto> List([FromQuery] string? q, CancellationToken cancellationToken) =>
        sender.Send(new GetAdminListingsQuery(q), cancellationToken);

    [HttpGet("{id:guid}")]
    [ErrorReference("JB-ADM-502")]
    public Task<AdminListingDto> Get(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new GetAdminListingQuery(Reviewer, id), cancellationToken);

    [HttpPost("{id:guid}/take-down")]
    public Task<AdminListingDto> TakeDown(Guid id, [FromBody] TakeDownRequest request, CancellationToken cancellationToken) =>
        sender.Send(new TakeDownListingCommand(Reviewer, id, request.Reason), cancellationToken);
}

/// <summary>Searching the append-only audit log (L2-180).</summary>
[ApiController]
[RequiresAdmin]
[Route("api/admin/audit")]
public sealed class AdminAuditController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<AuditRecordDto>> Search(
        [FromQuery] string? actor, [FromQuery] string? target, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to,
        CancellationToken cancellationToken) =>
        sender.Send(new SearchAuditLogQuery(actor, target, from, to), cancellationToken);
}
