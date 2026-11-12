using System.Security.Claims;
using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Application.Verification;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Jubilee.Api.Sessions;
using Microsoft.AspNetCore.Authorization;

namespace Jubilee.Api.Controllers;

/// <summary>
/// Only a staff session holding the <c>verifier</c> role reaches the verification and moderation
/// endpoints (L2-191, ADR 0040); a member session is refused whatever it carries.
/// </summary>
public sealed class RequiresVerifierAttribute() : AuthorizeAttribute(StaffPolicies.Verifier);

/// <summary>Only a staff session holding the <c>admin</c> role reaches the administrator endpoints (L2-191).</summary>
public sealed class RequiresAdminAttribute() : AuthorizeAttribute(StaffPolicies.Admin);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ChecklistRequest(IReadOnlyList<string>? Ticked);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ApproveRequest(string? Note);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RequestChangesRequest(IReadOnlyList<string>? Areas, string? Message);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record DeclineRequest(string? Reason);

/// <summary>The verification team's queue, review screen and decisions (L2-098 to L2-104).</summary>
[ApiController]
[RequiresVerifier]
[Route("api/admin/verifications")]
public sealed class AdminVerificationsController(ISender sender) : ControllerBase
{
    private Reviewer Reviewer => new(User.ToViewer().Subject!, User.FindFirst("name")?.Value ?? "Verification team");

    [HttpGet]
    [ErrorReference("JB-ADM-503")]
    public Task<VerificationQueueDto> Queue([FromQuery] string? stage, [FromQuery] string? q, CancellationToken cancellationToken) =>
        sender.Send(new GetVerificationQueueQuery(stage, q), cancellationToken);

    [HttpGet("{id:guid}")]
    [ErrorReference("JB-ADM-502")]
    public Task<VerificationReviewDto> Review(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new GetVerificationReviewQuery(Reviewer, id), cancellationToken);

    [HttpPut("{id:guid}/checklist")]
    public Task<IReadOnlyList<ReviewCheck>> Checklist(Guid id, [FromBody] ChecklistRequest request, CancellationToken cancellationToken) =>
        sender.Send(new SaveChecklistCommand(Reviewer, id, request.Ticked ?? []), cancellationToken);

    [HttpPost("{id:guid}/approve")]
    public Task<DecisionResultDto> Approve(Guid id, [FromBody] ApproveRequest request, CancellationToken cancellationToken) =>
        sender.Send(new ApproveListingCommand(Reviewer, id, request.Note), cancellationToken);

    [HttpPost("{id:guid}/request-changes")]
    public Task<DecisionResultDto> RequestChanges(Guid id, [FromBody] RequestChangesRequest request, CancellationToken cancellationToken) =>
        sender.Send(new RequestChangesCommand(Reviewer, id, request.Areas, request.Message), cancellationToken);

    [HttpPost("{id:guid}/decline")]
    public Task<DecisionResultDto> Decline(Guid id, [FromBody] DeclineRequest request, CancellationToken cancellationToken) =>
        sender.Send(new DeclineListingCommand(Reviewer, id, request.Reason), cancellationToken);
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

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ResubmitRequest(string? Name, string? Tagline, string? CategorySlug, string? About);

/// <summary>What the owner sees of the verification, and the resubmission after changes (L2-102, L2-103).</summary>
[ApiController]
[Route("api/listings/{id:guid}/verification")]
public sealed class OwnerVerificationController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    [HttpGet]
    public Task<OwnerVerificationDto> Get(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new GetOwnerVerificationQuery(Subject, id), cancellationToken);

    [HttpPost("resubmit")]
    public Task<OwnerVerificationDto> Resubmit(Guid id, [FromBody] ResubmitRequest request, CancellationToken cancellationToken) =>
        sender.Send(new ResubmitListingCommand(
            Subject, User.FindFirst("name")?.Value ?? "A member", id, request.Name, request.Tagline, request.CategorySlug, request.About),
            cancellationToken);
}
