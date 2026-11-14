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
        [.. user.FindAll(StaffSession.RoleClaim).Select(c => c.Value)])
    {
        Email = user.FindFirst("email")?.Value,
        StaffMemberId = Guid.TryParse(user.FindFirst(StaffSession.StaffIdClaim)?.Value, out var id) ? id : null,
    };
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

    /// <summary>
    /// The table as a CSV (its fields as columns) or JSON (every field), of every record, the matching ones or the
    /// selected ones; a private table needs a reason (L2-279 AC2, AC4).
    /// </summary>
    [HttpGet("{table}/export")]
    [ErrorReference("JB-ADM-503")]
    public async Task<IActionResult> Export(
        string table, [FromQuery] string? format, [FromQuery] string? q, [FromQuery] string? status, [FromQuery] string[]? ids,
        [FromQuery] string? reason, CancellationToken cancellationToken)
    {
        var file = await sender.Send(
            new ExportAdminTableQuery(User.ToStaff(), table, format ?? "csv", q, status, ids ?? [], reason), cancellationToken);
        return File(file.Content, file.ContentType, file.FileName);
    }

    /// <summary>"Email me this weekly": a link to the table's CSV every Monday (L2-279 AC3).</summary>
    [HttpPut("{table}/weekly-export")]
    [ErrorReference("JB-ADM-504")]
    public async Task<IActionResult> StartWeeklyExport(string table, CancellationToken cancellationToken)
    {
        await sender.Send(new SetWeeklyExportCommand(User.ToStaff(), table, true), cancellationToken);
        return NoContent();
    }

    /// <summary>"Stop the weekly email" (L2-279 AC3).</summary>
    [HttpDelete("{table}/weekly-export")]
    [ErrorReference("JB-ADM-504")]
    public async Task<IActionResult> StopWeeklyExport(string table, CancellationToken cancellationToken)
    {
        await sender.Send(new SetWeeklyExportCommand(User.ToStaff(), table, false), cancellationToken);
        return NoContent();
    }

    /// <summary>Deletes the selected records of a table that declares deletion (L2-281 AC3).</summary>
    [HttpPost("{table}/delete")]
    [ErrorReference("JB-ADM-504")]
    public Task<AdminCountDto> Delete(string table, [FromBody] AdminIdsRequest body, CancellationToken cancellationToken) =>
        sender.Send(new DeleteAdminRecordsCommand(User.ToStaff(), table, body.Ids ?? []), cancellationToken);

    /// <summary>Brings back records just deleted ("Undo", L2-281 AC3).</summary>
    [HttpPost("{table}/restore")]
    [ErrorReference("JB-ADM-504")]
    public Task<AdminCountDto> Restore(string table, [FromBody] AdminIdsRequest body, CancellationToken cancellationToken) =>
        sender.Send(new RestoreAdminRecordsCommand(User.ToStaff(), table, body.Ids ?? []), cancellationToken);

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

public sealed record AdminIdsRequest(IReadOnlyList<string>? Ids);
