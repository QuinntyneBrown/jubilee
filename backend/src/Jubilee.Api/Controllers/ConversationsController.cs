using Jubilee.Api.Middleware;
using Jubilee.Application.Messaging;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

public sealed record StartConversationRequest(string? ListingSlug, string? Body, string? IdempotencyKey);

public sealed record SendMessageRequest(string? Body, string? IdempotencyKey, Guid? AttachmentId);

public sealed record MuteRequest(bool Muted);

public sealed record ReportRequest(string? Reason, bool Block);

/// <summary>Messages between a member and a business (L2-055 to L2-063).</summary>
[ApiController]
[Route("api/conversations")]
public sealed class ConversationsController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    private string Name => User.FindFirst("name")?.Value ?? "Member";

    [HttpGet]
    public Task<InboxDto> Inbox([FromQuery] string? q, CancellationToken cancellationToken) =>
        sender.Send(new GetInboxQuery(Subject, q), cancellationToken);

    [HttpPost]
    [RequiresConfirmedEmail]
    public async Task<IActionResult> Start([FromBody] StartConversationRequest request, CancellationToken cancellationToken)
    {
        var started = await sender.Send(
            new StartConversationCommand(Subject, Name, request.ListingSlug ?? string.Empty, request.Body, request.IdempotencyKey), cancellationToken);
        return StatusCode(StatusCodes.Status201Created, started);
    }

    [HttpGet("{id:guid}")]
    public Task<ConversationDto> Open(Guid id, [FromQuery] Guid? before, CancellationToken cancellationToken) =>
        sender.Send(new GetConversationQuery(Subject, id, before), cancellationToken);

    [HttpPost("{id:guid}/messages")]
    [RequiresConfirmedEmail]
    public async Task<IActionResult> Send(Guid id, [FromBody] SendMessageRequest request, CancellationToken cancellationToken)
    {
        var message = await sender.Send(
            new SendMessageCommand(id, Subject, Name, request.Body, request.IdempotencyKey, request.AttachmentId), cancellationToken);
        return StatusCode(StatusCodes.Status201Created, message);
    }

    [HttpPost("{id:guid}/attachments")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Attach(Guid id, IFormFile? file, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        if (file is not null)
        {
            await file.CopyToAsync(buffer, cancellationToken);
        }

        try
        {
            var attachmentId = await sender.Send(new UploadAttachmentCommand(Subject, id, buffer.ToArray()), cancellationToken);
            return StatusCode(StatusCodes.Status201Created, new { id = attachmentId });
        }
        catch (InvalidImageException invalid)
        {
            return UnprocessableEntity(new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "That photo can't be used.",
                Extensions = { ["code"] = invalid.Code, ["correlationId"] = HttpContext.TraceIdentifier },
            });
        }
    }

    [HttpPut("{id:guid}/mute")]
    public async Task<IActionResult> Mute(Guid id, [FromBody] MuteRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SetConversationMutedCommand(Subject, id, request.Muted), cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/report")]
    public async Task<IActionResult> Report(Guid id, [FromBody] ReportRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new ReportConversationCommand(Subject, id, request.Reason, request.Block), cancellationToken);
        return NoContent();
    }
}

/// <summary>Delivers a stored photo to the holder of a fresh signed link.</summary>
[ApiController]
[AllowAnonymous]
[Route("api/attachments")]
public sealed class AttachmentsController(ISender sender) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, [FromQuery] long expires, [FromQuery] string? sig, CancellationToken cancellationToken)
    {
        var content = await sender.Send(new GetAttachmentQuery(id, expires, sig ?? string.Empty), cancellationToken);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(content.Content, content.ContentType);
    }
}
