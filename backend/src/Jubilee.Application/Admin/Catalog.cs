using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Admin;

public sealed record AdminFieldDto(
    string Key, string Label, string Type, bool System, bool Searchable, bool Sortable, bool Editable, bool Creatable,
    IReadOnlyList<string>? Options, string? RefTable);

public sealed record AdminTableDto(
    string Key, string Label, string Singular, string Group, string Sentence, string? Empty, int Count,
    IReadOnlyList<AdminFieldDto> Fields, IReadOnlyList<string> DefaultColumns, string? StatusField,
    bool ReadOnly, bool Private, bool CanChange, bool CanEdit, bool CanCreate, bool CanDelete, bool WeeklyExport);

public sealed record AdminGroupDto(string Name, bool ReadOnly, IReadOnlyList<AdminTableDto> Tables);

public sealed record AdminCatalogDto(IReadOnlyList<AdminGroupDto> Groups);

/// <summary>The groups and the tables the staff member may read, with their counts and rights (L2-272 AC2, L2-284 AC1).</summary>
public sealed record GetAdminCatalogQuery(StaffViewer Staff) : IRequest<AdminCatalogDto>;

public sealed class GetAdminCatalogQueryHandler(IAppDbContext db) : IRequestHandler<GetAdminCatalogQuery, AdminCatalogDto>
{
    public async Task<AdminCatalogDto> Handle(GetAdminCatalogQuery request, CancellationToken cancellationToken)
    {
        var groups = new List<AdminGroupDto>();
        // The tables the staff member gets by e-mail every Monday (L2-279 AC3).
        var weekly = (await db.AdminExportSubscriptions.AsNoTracking()
            .Where(s => s.StaffSubject == request.Staff.Subject).Select(s => s.TableKey).ToListAsync(cancellationToken)).ToHashSet();
        foreach (var group in AdminCatalog.Groups)
        {
            var tables = new List<AdminTableDto>();
            foreach (var table in AdminCatalog.Tables.Where(t => t.Group == group && AdminRights.CanRead(request.Staff, t)))
            {
                // The counts are read one after another: a DbContext runs one query at a time.
                tables.Add(AdminTables.Describe(
                    table, request.Staff, await table.CountAsync(db, cancellationToken), weekly.Contains(table.Key)));
            }

            if (tables.Count > 0)
            {
                groups.Add(new AdminGroupDto(group, group == AdminRights.System, tables));
            }
        }

        return new AdminCatalogDto(groups);
    }
}

/// <summary>Finding a table and describing it to the client.</summary>
public static class AdminTables
{
    /// <summary>The table the staff member asked for: 404 when it does not exist, 403 when the role may not read it.</summary>
    public static AdminTable Readable(StaffViewer staff, string key)
    {
        var table = AdminCatalog.Find(key) ?? throw new NotFoundException("NOT_FOUND", "There is no such table.");
        return AdminRights.CanRead(staff, table)
            ? table
            : throw new ForbiddenException("FORBIDDEN", "Your staff role may not read this table.");
    }

    public static AdminTableDto Describe(AdminTable table, StaffViewer staff, int count, bool weeklyExport = false)
    {
        var canChange = AdminRights.CanChange(staff, table);
        return new AdminTableDto(
            table.Key, table.Label, table.Singular, table.Group, table.Sentence, table.Empty, count,
            [.. table.Fields.Select(f => new AdminFieldDto(
                f.Key, f.Label, Wire(f.Type), f.System, f.Searchable, f.Sortable, f.Editable && canChange,
                canChange && table.Creatable && table.CreateFields.Contains(f.Key), f.Options, f.RefTable))],
            table.DefaultColumns, table.StatusField,
            AdminRights.IsReadOnly(table), table.Private, canChange,
            canChange && table.Editable, canChange && table.Creatable, AdminRights.CanDelete(staff, table), weeklyExport);
    }

    public static string Wire(AdminFieldType type) => type switch
    {
        AdminFieldType.DateTime => "datetime",
        _ => type.ToString().ToLowerInvariant(),
    };
}
