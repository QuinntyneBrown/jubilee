using Jubilee.Api.Errors;
using Jubilee.Api.Filters;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Directory;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>The public directory. Responses carry no personal data, so one serves every caller.</summary>
[ApiController]
[Route("api/directory")]
[AllowAnonymous]
[PublicDirectoryCache]
[EnableRateLimiting(DirectoryRateLimit.Policy)]
[ErrorReference("JB-DIR-503")]
public sealed class DirectoryController(ISender sender) : ControllerBase
{
    [HttpGet("welcome")]
    public async Task<ActionResult<WelcomeDto>> GetWelcome(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetWelcomeQuery(), cancellationToken));

    [HttpGet("home")]
    public async Task<ActionResult<BrowseHomeDto>> GetHome(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetBrowseHomeQuery(), cancellationToken));
}
