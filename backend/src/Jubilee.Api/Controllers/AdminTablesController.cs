using System.Security.Claims;
using Jubilee.Api.Errors;
using Jubilee.Api.Sessions;
using Jubilee.Application.Admin;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>Any staff session; each handler checks what the role may read and change per table (L2-284, ADR 0074).</summary>
public sealed class RequiresStaffAttribute() : AuthorizeAttribute(StaffPolicies.Staff);

/// <summary>The staff member behind a staff session.</summary>
public static class StaffClaims
{
    public static StaffViewer ToStaff(this ClaimsPrincipal user) => new(
        user.FindFirst("sub")?.Value ?? string.Empty,
        user.FindFirst("name")?.Value ?? "The Jubilee team",
        [.. user.FindAll(StaffSession.RoleClaim).Select(c => c.Value)]);
}

/// <summary>The schema-driven tables of the admin application (L2-276 to L2-284, ADR 0074).</summary>
[ApiController]
[RequiresStaff]
[Route("api/admin/tables")]
public sealed class AdminTablesController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ErrorReference("JB-ADM-503")]
    public Task<AdminCatalogDto> Catalog(CancellationToken cancellationToken) =>
        sender.Send(new GetAdminCatalogQuery(User.ToStaff()), cancellationToken);

    [HttpGet("{table}")]
    [ErrorReference("JB-ADM-503")]
    public Task<AdminRowsDto> Rows(
        string table, [FromQuery] string? q, [FromQuery] string? status, [FromQuery] string? sort, [FromQuery] string? dir,
        [FromQuery] int? page, [FromQuery] int? size, CancellationToken cancellationToken) =>
        sender.Send(new GetAdminRowsQuery(User.ToStaff(), table, q, status, sort, dir, page, size), cancellationToken);
}
