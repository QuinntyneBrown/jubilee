using Jubilee.Application.Admin;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>The records the jump palette lists for the text typed (L2-273 AC3, AC6).</summary>
[ApiController]
[RequiresStaff]
[Route("api/admin/jump")]
public sealed class AdminJumpController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<AdminJumpDto>> Get([FromQuery] string? q, CancellationToken cancellationToken) =>
        sender.Send(new GetAdminJumpQuery(User.ToStaff(), q), cancellationToken);
}
