using Jubilee.Application.Navigation;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

[ApiController]
[Route("api/me/navigation")]
public sealed class NavigationController(ISender sender) : ControllerBase
{
    /// <summary>The signed-in member's own navigation summary. Anonymous callers get 401.</summary>
    [HttpGet]
    public Task<NavigationSummary> Get(CancellationToken cancellationToken) =>
        sender.Send(new GetNavigationSummaryQuery(), cancellationToken);
}
