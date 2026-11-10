using Jubilee.Api.Filters;
using Jubilee.Application.Directory;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>The public directory. Responses carry no personal data, so one serves every caller.</summary>
[ApiController]
[Route("api/directory")]
[AllowAnonymous]
[PublicDirectoryCache]
public sealed class DirectoryController(ISender sender) : ControllerBase
{
    [HttpGet("welcome")]
    public async Task<ActionResult<WelcomeDto>> GetWelcome(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetWelcomeQuery(), cancellationToken));
}
