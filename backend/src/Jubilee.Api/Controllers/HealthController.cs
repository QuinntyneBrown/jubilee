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
}
