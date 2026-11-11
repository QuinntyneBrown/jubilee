using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.Requests;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>The decline of a request. Unknown fields are refused, so a caller cannot set a status or a price (L2-133 AC4).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record DeclineRequestBody(string? Reason, string? Message);

/// <summary>The owner's side of requests: the list, confirm, undo and decline (L2-051 to L2-053).</summary>
[ApiController]
[Route("api/my-business/requests")]
public sealed class IncomingRequestsController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    [HttpGet]
    [ErrorReference("JB-REQ-503")]
    public Task<IncomingRequestsDto> List([FromQuery] string? tab, [FromQuery] string? listing, CancellationToken cancellationToken) =>
        sender.Send(new ListIncomingRequestsQuery(Subject, tab, listing), cancellationToken);

    [HttpPost("{id:guid}/confirm")]
    public Task<RequestDecisionDto> Confirm(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new ConfirmRequestCommand(Subject, id), cancellationToken);

    [HttpPost("{id:guid}/confirm/undo")]
    public Task<RequestDecisionDto> UndoConfirm(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new UndoConfirmRequestCommand(Subject, id), cancellationToken);

    [HttpPost("{id:guid}/decline")]
    public Task<RequestDecisionDto> Decline(Guid id, [FromBody] DeclineRequestBody body, CancellationToken cancellationToken) =>
        sender.Send(new DeclineRequestCommand(Subject, id, body.Reason, body.Message), cancellationToken);
}
