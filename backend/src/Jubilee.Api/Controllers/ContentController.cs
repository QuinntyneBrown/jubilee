using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.Content;
using Jubilee.Application.Moderation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PublishContentBody(string? Title, string? Lead, List<ContentSectionDto>? Sections, int? BasedOn = null);

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

/// <summary>
/// The policies screens of the admin application (L2-226): only an admin lists the pages, reads one with its kept
/// versions and publishes a new version (L2-133).
/// </summary>
[ApiController]
[RequiresAdmin]
[Route("api/admin/content")]
public sealed class AdminContentController(ISender sender) : ControllerBase
{
    private Reviewer Admin => new(User.ToViewer().Subject!, User.FindFirst("name")?.Value ?? "A Jubilee administrator");

    [HttpGet]
    [ErrorReference("JB-ADM-521")]
    public Task<IReadOnlyList<AdminContentRow>> Pages(CancellationToken cancellationToken) =>
        sender.Send(new ListAdminContentQuery(), cancellationToken);

    [HttpGet("{slug}")]
    [ErrorReference("JB-ADM-522")]
    public Task<AdminContentDto> Page(string slug, CancellationToken cancellationToken) =>
        sender.Send(new GetAdminContentQuery(slug), cancellationToken);

    [HttpGet("{slug}/versions")]
    public Task<IReadOnlyList<ContentVersionDto>> List(string slug, CancellationToken cancellationToken) =>
        sender.Send(new ListContentVersionsQuery(slug), cancellationToken);

    [HttpPost("{slug}/versions")]
    public async Task<IActionResult> Publish(string slug, PublishContentBody request, CancellationToken cancellationToken)
    {
        var published = await sender.Send(
            new PublishContentVersionCommand(Admin, slug, request.Title, request.Lead, request.Sections, request.BasedOn),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, published);
    }
}
