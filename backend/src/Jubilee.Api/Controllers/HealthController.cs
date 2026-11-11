using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    /// <summary>Readiness probe used by the e2e web server and deployments.</summary>
    [HttpGet]
    [AllowAnonymous]
    public IActionResult Get() => Ok(new { status = "ok" });

    /// <summary>
    /// What the app asks to learn whether Jubilee can be reached (L2-121): 204, no session, no data read. Held by
    /// maintenance mode like every other request, so the app can tell the member why.
    /// </summary>
    [HttpGet("ping")]
    [AllowAnonymous]
    public IActionResult Ping() => NoContent();
}
