using Jubilee.Application.Admin;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>The overview of the admin application: what is waiting on staff, System and Recent changes (L2-274, L2-275).</summary>
[ApiController]
[RequiresStaff]
[Route("api/admin/overview")]
public sealed class AdminOverviewController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<AdminOverviewDto> Get(CancellationToken cancellationToken) =>
        sender.Send(new GetAdminOverviewQuery(User.ToStaff()), cancellationToken);
}
