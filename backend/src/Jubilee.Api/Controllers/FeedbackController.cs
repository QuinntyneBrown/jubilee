using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.MemberFeedback;
using Jubilee.Application.Messaging;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SendRatingBody(int? Rating, string? Note, AreaScoresInput? Areas, bool MayContact);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SendBugReportBody(
    string? Where, string? Happened, string? Expected, string? Frequency, string? Screen, string? Version, IReadOnlyList<Guid>? ScreenshotIds,
    bool MayContact);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SendKudosBody(string? Business, IReadOnlyList<string>? Chips, string? Note, bool ShowOnPage, bool MayContact);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SaveCheckInBody(string? Moment, int? Score, string? Note);

/// <summary>
/// Member feedback (L1-029, ADR 0043). The member comes from the session and never from the body, so a
/// member sends and reads only their own (L2-133). A repeated <c>Idempotency-Key</c> returns the first
/// answer (L2-132). No address serves a screenshot.
/// </summary>
[ApiController]
[Route("api/feedback")]
public sealed class FeedbackController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    private string MemberName => User.FindFirst("name")?.Value ?? string.Empty;

    private string Key => Request.Headers["Idempotency-Key"].ToString();

    [HttpGet]
    [ErrorReference("JB-FBK-503")]
    public Task<IReadOnlyList<FeedbackItemDto>> Mine(CancellationToken cancellationToken) =>
        sender.Send(new GetMyFeedbackQuery(Subject), cancellationToken);

    [HttpGet("businesses")]
    [ErrorReference("JB-FBK-503")]
    public Task<IReadOnlyList<KudosBusinessDto>> Businesses(CancellationToken cancellationToken) =>
        sender.Send(new GetKudosBusinessesQuery(Subject), cancellationToken);

    [HttpPost("ratings")]
    [ErrorReference("JB-FBK-503")]
    public async Task<IActionResult> Rate(SendRatingBody request, CancellationToken cancellationToken)
    {
        var item = await sender.Send(
            new SendRatingCommand(Subject, MemberName, request.Rating, request.Note, request.Areas, request.MayContact, Key), cancellationToken);
        return StatusCode(StatusCodes.Status201Created, item);
    }

    [HttpPost("bug-reports")]
    [ErrorReference("JB-FBK-503")]
    public async Task<IActionResult> ReportBug(SendBugReportBody request, CancellationToken cancellationToken)
    {
        var item = await sender.Send(
            new SendBugReportCommand(
                Subject, MemberName, request.Where, request.Happened, request.Expected, request.Frequency, request.Screen, request.Version,
                Request.Headers.UserAgent.ToString(), request.ScreenshotIds, request.MayContact, Key),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, item);
    }

    [HttpPost("kudos")]
    [ErrorReference("JB-FBK-503")]
    public async Task<IActionResult> Thank(SendKudosBody request, CancellationToken cancellationToken)
    {
        var item = await sender.Send(
            new SendKudosCommand(Subject, MemberName, request.Business, request.Chips, request.Note, request.ShowOnPage, request.MayContact, Key),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, item);
    }

    [HttpPost("screenshots")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [ErrorReference("JB-FBK-503")]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        if (file is not null)
        {
            await file.CopyToAsync(buffer, cancellationToken);
        }

        try
        {
            var id = await sender.Send(new UploadFeedbackScreenshotCommand(Subject, buffer.ToArray()), cancellationToken);
            return StatusCode(StatusCodes.Status201Created, new { id });
        }
        catch (InvalidImageException invalid)
        {
            return UnprocessableEntity(new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "That picture can't be used.",
                Extensions = { ["code"] = invalid.Code, ["correlationId"] = HttpContext.TraceIdentifier },
            });
        }
    }

    [HttpPut("check-ins/{id:guid}")]
    [ErrorReference("JB-FBK-503")]
    public async Task<IActionResult> CheckIn(Guid id, SaveCheckInBody request, CancellationToken cancellationToken)
    {
        await sender.Send(new SaveCheckInCommand(id, Subject, MemberName, request.Moment, request.Score, request.Note), cancellationToken);
        return NoContent();
    }
}
