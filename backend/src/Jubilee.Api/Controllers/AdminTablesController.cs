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

    [HttpGet("{table}/{id}")]
    [ErrorReference("JB-ADM-504")]
    public Task<AdminRecordDto> Record(string table, string id, CancellationToken cancellationToken) =>
        sender.Send(new GetAdminRecordQuery(User.ToStaff(), table, id), cancellationToken);

    /// <summary>Sets one status on the selected records (L2-280 AC4).</summary>
    [HttpPost("{table}/status")]
    [ErrorReference("JB-ADM-504")]
    public Task<AdminCountDto> SetStatus(string table, [FromBody] AdminStatusRequest body, CancellationToken cancellationToken) =>
        sender.Send(new SetAdminStatusCommand(User.ToStaff(), table, body.Ids ?? [], body.Status ?? string.Empty), cancellationToken);

    /// <summary>Changes the fields of a record through their bindings (L2-283 AC2).</summary>
    [HttpPatch("{table}/{id}")]
    [ErrorReference("JB-ADM-504")]
    public Task<AdminRecordDto> Update(string table, string id, [FromBody] AdminValuesRequest body, CancellationToken cancellationToken) =>
        sender.Send(new UpdateAdminRecordCommand(User.ToStaff(), table, id, body.Values ?? new Dictionary<string, string?>()), cancellationToken);

    /// <summary>Creates a record through the table's creation (L2-283 AC4).</summary>
    [HttpPost("{table}")]
    [ErrorReference("JB-ADM-504")]
    public async Task<ActionResult<AdminRecordDto>> Create(string table, [FromBody] AdminValuesRequest body, CancellationToken cancellationToken)
    {
        var record = await sender.Send(
            new CreateAdminRecordCommand(User.ToStaff(), table, body.Values ?? new Dictionary<string, string?>()), cancellationToken);
        return Created($"/api/admin/tables/{record.Table}/{record.Id}", record);
    }
}

/// <summary>The values of a change or a creation, by field key, in their wire form.</summary>
public sealed record AdminValuesRequest(Dictionary<string, string?>? Values);

/// <summary>The selected records and the status to set on them.</summary>
public sealed record AdminStatusRequest(IReadOnlyList<string>? Ids, string? Status);
