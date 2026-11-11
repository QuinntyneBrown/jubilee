using Jubilee.Api.Errors;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Search;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>Search the directory, the empty search page and a member's recent searches.</summary>
[ApiController]
[Route("api/search")]
[ErrorReference("JB-SRCH-503")]
public sealed class SearchController(ISender sender) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting(SearchRateLimit.Policy)]
    public async Task<IActionResult> Search([FromQuery] string? q, CancellationToken cancellationToken)
    {
        // The answer depends on who is asking (recent searches), so it is never stored.
        Response.Headers.CacheControl = "private, no-store";
        var answer = await sender.Send(new SearchDirectoryQuery(q, User.ToViewer()), cancellationToken);
        return Ok((object?)answer.Results ?? answer.Start);
    }

    [HttpGet("start")]
    [AllowAnonymous]
    public async Task<ActionResult<SearchStartDto>> Start(CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "private, no-store";
        return Ok(await sender.Send(new GetSearchStartQuery(User.ToViewer()), cancellationToken));
    }

    [HttpDelete("recent/{id:guid}")]
    public async Task<IActionResult> RemoveRecent(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new RemoveRecentSearchCommand(id, User.ToViewer().Subject!), cancellationToken);
        return NoContent();
    }

    [HttpDelete("recent")]
    public async Task<IActionResult> ClearRecent(CancellationToken cancellationToken)
    {
        await sender.Send(new ClearRecentSearchesCommand(User.ToViewer().Subject!), cancellationToken);
        return NoContent();
    }
}
