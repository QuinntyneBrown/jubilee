using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.Abstractions;
using Jubilee.Application.OwnerWorkspace;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>The owner's edit of the listing's page. Unknown fields are refused (L2-133 AC4).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SaveListingBody(
    int Version, string? Name, string? Tagline, string? Category, string? About, string? Where, string? Hours, string? Website, string? Highlight,
    SpaceDraftRequest? Space = null, Guid? ListingId = null);

/// <summary>The business the owner chooses in the switcher (L2-079 AC5).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ChooseBusinessBody(Guid ListingId);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record MovePhotoBody(int Position);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record DescribePhotoBody(string? Alt);

/// <summary>The day the owner is back, as <c>yyyy-MM-dd</c>, or null to clear the away period (L2-062).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record AwayPeriodBody(string? Until);

/// <summary>The owner's workspace: the overview, the listing's page, its photos, pause and resume (L2-085 to L2-088, L2-096).</summary>
[ApiController]
[Route("api/my-business")]
public sealed class MyBusinessController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    [HttpGet]
    [ErrorReference("JB-BIZ-503")]
    public Task<MyBusinessDto> Overview(CancellationToken cancellationToken) =>
        sender.Send(new GetMyBusinessQuery(Subject), cancellationToken);

    [HttpGet("listing")]
    [ErrorReference("JB-LST-503")]
    public Task<ListingEditorDto> Editor(CancellationToken cancellationToken) =>
        sender.Send(new GetListingEditorQuery(Subject), cancellationToken);

    [HttpPut("listing")]
    [ErrorReference("JB-LST-504")]
    public Task<ListingEditorDto> Save([FromBody] SaveListingBody body, CancellationToken cancellationToken) =>
        sender.Send(new SaveListingCommand(
            Subject, body.Version, body.Name, body.Tagline, body.Category, body.About, body.Where, body.Hours, body.Website, body.Highlight,
            body.Space?.ToInput(), body.ListingId),
            cancellationToken);

    [HttpPut("current")]
    public async Task<IActionResult> Choose([FromBody] ChooseBusinessBody body, CancellationToken cancellationToken)
    {
        await sender.Send(new ChooseBusinessCommand(Subject, body.ListingId), cancellationToken);
        return NoContent();
    }

    [HttpPost("pause")]
    public Task<PauseResultDto> Pause(CancellationToken cancellationToken) =>
        sender.Send(new PauseListingCommand(Subject), cancellationToken);

    [HttpPut("away")]
    public Task<AwayPeriodDto> Away([FromBody] AwayPeriodBody body, CancellationToken cancellationToken) =>
        sender.Send(new SetAwayPeriodCommand(Subject, body.Until), cancellationToken);

    [HttpPost("resume")]
    public Task<PauseResultDto> Resume(CancellationToken cancellationToken) =>
        sender.Send(new ResumeListingCommand(Subject), cancellationToken);

    [HttpPost("photos")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> AddPhoto(IFormFile? file, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        if (file is not null)
        {
            await file.CopyToAsync(buffer, cancellationToken);
        }

        try
        {
            var editor = await sender.Send(new AddPhotoCommand(Subject, buffer.ToArray()), cancellationToken);
            return StatusCode(StatusCodes.Status201Created, editor);
        }
        catch (InvalidPhotoException invalid)
        {
            return UnprocessableEntity(new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "That photo can't be used.",
                Detail = invalid.Message,
                Extensions = { ["code"] = invalid.Code, ["correlationId"] = HttpContext.TraceIdentifier },
            });
        }
    }

    [HttpPut("photos/{id:guid}/position")]
    public Task<ListingEditorDto> Move(Guid id, [FromBody] MovePhotoBody body, CancellationToken cancellationToken) =>
        sender.Send(new MovePhotoCommand(Subject, id, body.Position), cancellationToken);

    [HttpPut("photos/{id:guid}/alt")]
    public Task<ListingEditorDto> Describe(Guid id, [FromBody] DescribePhotoBody body, CancellationToken cancellationToken) =>
        sender.Send(new DescribePhotoCommand(Subject, id, body.Alt), cancellationToken);

    [HttpDelete("photos/{id:guid}")]
    public Task<ListingEditorDto> Remove(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new RemovePhotoCommand(Subject, id), cancellationToken);
}

/// <summary>Delivers stored renditions: a fixed type, no sniffing, cached for good because the name is random (L2-138 AC2).</summary>
[ApiController]
[AllowAnonymous]
[Route("media")]
public sealed class MediaController(IMediaStore store) : ControllerBase
{
    private static readonly HashSet<int> Widths = [320, 640, 1280];

    [HttpGet("{key}/{file}")]
    public async Task<IActionResult> Get(string key, string file, CancellationToken cancellationToken)
    {
        var dot = file.LastIndexOf('.');
        if (dot < 1 || key.Length != 32 || !key.All(Uri.IsHexDigit)
            || !int.TryParse(file[..dot], out var width) || !Widths.Contains(width))
        {
            return NotFound();
        }

        var extension = file[(dot + 1)..];
        var type = extension switch { "jpg" => "image/jpeg", "webp" => "image/webp", _ => null };
        if (type is null)
        {
            return NotFound();
        }

        var data = await store.Read(key, width, extension == "jpg" ? "jpeg" : "webp", cancellationToken);
        if (data is null)
        {
            return NotFound();
        }

        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(data, type);
    }
}
