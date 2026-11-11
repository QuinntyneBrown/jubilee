using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Api.Middleware;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Reference;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ReferenceTokenRequest(string? Token);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ReferenceAnswerRequest(string? Token, string? Answer, string? Name, string? Role, string? Note);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ChangeReferenceRequest(string? Church, string? PastorEmail);

/// <summary>
/// What a church reference does without an account (L2-081, L2-082). The token travels in the body,
/// never the address, so it stays out of logs (L2-140).
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/reference-requests")]
[EnableRateLimiting(ReferenceRateLimit.Policy)]
public sealed class ReferenceRequestsController(ISender sender) : ControllerBase
{
    [HttpPost("open")]
    [ErrorReference("JB-REF-502")]
    public Task<ReferenceRequestView> Open([FromBody] ReferenceTokenRequest request, CancellationToken cancellationToken) =>
        sender.Send(new OpenReferenceRequestQuery(request.Token), cancellationToken);

    [HttpPost("answer")]
    public async Task<IActionResult> Answer([FromBody] ReferenceAnswerRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SubmitReferenceAnswerCommand(request.Token, request.Answer, request.Name, request.Role, request.Note), cancellationToken);
        return NoContent();
    }

    [HttpPost("report")]
    public async Task<IActionResult> Report([FromBody] ReferenceTokenRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new ReportUnexpectedRequestCommand(request.Token), cancellationToken);
        return NoContent();
    }
}

/// <summary>The owner's side of the church reference: its stage, a reminder, a new request, a new reference.</summary>
[ApiController]
[Route("api/listings/{id:guid}/reference")]
public sealed class OwnerReferenceController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    private string OwnerName => User.FindFirst("name")?.Value ?? "A member";

    [HttpGet]
    public Task<ReferenceStatusDto> Status(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new GetReferenceStatusQuery(Subject, id), cancellationToken);

    [HttpPost("resend")]
    public Task<ReferenceStatusDto> Resend(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new ResendReferenceRequestCommand(Subject, OwnerName, id), cancellationToken);

    [HttpPost("remind")]
    public Task<ReferenceStatusDto> Remind(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new RemindReferenceCommand(Subject, OwnerName, id), cancellationToken);

    [HttpPost("change")]
    public Task<ReferenceStatusDto> Change(Guid id, [FromBody] ChangeReferenceRequest request, CancellationToken cancellationToken) =>
        sender.Send(new ChangeReferenceCommand(Subject, OwnerName, id, request.Church, request.PastorEmail), cancellationToken);
}
