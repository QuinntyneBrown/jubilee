using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.Content;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PublishContentBody(string? Title, string? Lead, List<ContentSectionDto>? Sections);

/// <summary>The four policy pages (L2-107 to L2-110): anyone reads the published version.</summary>
[ApiController]
[Route("api/content/{slug}")]
[AllowAnonymous]
public sealed class ContentController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ErrorReference("JB-CONT-503")]
    public Task<ContentDto> Get(string slug, CancellationToken cancellationToken) =>
        sender.Send(new GetPublishedContentQuery(slug), cancellationToken);
}

/// <summary>Only an admin publishes a new version or reads the kept ones (L2-133).</summary>
[ApiController]
[RequiresAdmin]
[Route("api/admin/content/{slug}/versions")]
public sealed class AdminContentController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<ContentVersionDto>> List(string slug, CancellationToken cancellationToken) =>
        sender.Send(new ListContentVersionsQuery(slug), cancellationToken);

    [HttpPost]
    public async Task<IActionResult> Publish(string slug, PublishContentBody request, CancellationToken cancellationToken)
    {
        var published = await sender.Send(
            new PublishContentVersionCommand(User.ToViewer().Subject!, slug, request.Title, request.Lead, request.Sections),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, published);
    }
}
