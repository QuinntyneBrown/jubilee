using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.Moderation;
using Jubilee.Application.Verification;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ReportActionRequest(string? Kind, string? ResolutionNote, string? MessageText);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record FeaturedWeekRequest(IReadOnlyList<Guid>? ListingIds);

/// <summary>The verification team's reports: the list, one report and the six actions (L2-105).</summary>
[ApiController]
[RequiresVerifier]
[Route("api/admin/reports")]
public sealed class AdminReportsController(ISender sender) : ControllerBase
{
    private Reviewer Reviewer => new(User.ToViewer().Subject!, User.FindFirst("name")?.Value ?? "Verification team");

    [HttpGet]
    [ErrorReference("JB-ADM-511")]
    public Task<ReportListDto> List([FromQuery] string? status, CancellationToken cancellationToken) =>
        sender.Send(new GetReportsQuery(status), cancellationToken);

    [HttpPost("{id:guid}/open")]
    [ErrorReference("JB-ADM-512")]
    public Task<ReportDetailDto> Open(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new OpenReportCommand(Reviewer, id), cancellationToken);

    [HttpPost("{id:guid}/actions")]
    public Task<ReportDetailDto> Act(Guid id, [FromBody] ReportActionRequest request, CancellationToken cancellationToken) =>
        sender.Send(new ApplyReportActionCommand(Reviewer, id, request.Kind, request.ResolutionNote, request.MessageText), cancellationToken);
}

/// <summary>Choosing the businesses "Featured this week" (L2-106).</summary>
[ApiController]
[RequiresVerifier]
[Route("api/admin")]
public sealed class AdminFeaturedController(ISender sender) : ControllerBase
{
    private Reviewer Reviewer => new(User.ToViewer().Subject!, User.FindFirst("name")?.Value ?? "Verification team");

    [HttpGet("featured")]
    [ErrorReference("JB-ADM-513")]
    public Task<FeaturedWeeksDto> Weeks(CancellationToken cancellationToken) =>
        sender.Send(new GetFeaturedWeeksQuery(), cancellationToken);

    [HttpGet("featured/candidates")]
    [ErrorReference("JB-ADM-514")]
    public Task<FeaturedCandidatesDto> Candidates([FromQuery] string? q, CancellationToken cancellationToken) =>
        sender.Send(new GetFeaturedCandidatesQuery(q), cancellationToken);

    [HttpPut("featured-weeks/{startDate}")]
    public Task<FeaturedWeekDto> Set(DateOnly startDate, [FromBody] FeaturedWeekRequest request, CancellationToken cancellationToken) =>
        sender.Send(new SetFeaturedWeekCommand(Reviewer, startDate, request.ListingIds), cancellationToken);
}
