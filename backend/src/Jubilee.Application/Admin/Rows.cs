using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using MediatR;

namespace Jubilee.Application.Admin;

/// <summary>A reference as the client draws it: the record's name, or "deleted" when it is gone (L2-281 AC1, ADR 0074).</summary>
public sealed record AdminRefValue(string Table, string Id, string? Name, bool Deleted);

public sealed record AdminRowDto(string Id, string Name, IReadOnlyDictionary<string, object?> Values);

public sealed record AdminRowsDto(IReadOnlyList<AdminRowDto> Rows, int Total, int Page, int Size);

/// <summary>A page of a table, searched, filtered and sorted by the database (L2-276, L2-277, L2-278).</summary>
public sealed record GetAdminRowsQuery(
    StaffViewer Staff, string Table, string? Search, string? Status, string? Sort, string? Direction, int? Page, int? Size)
    : IRequest<AdminRowsDto>;

public sealed class GetAdminRowsQueryHandler(IAppDbContext db) : IRequestHandler<GetAdminRowsQuery, AdminRowsDto>
{
    /// <summary>The rows-per-page a staff member may choose (L2-278 AC3).</summary>
    public static readonly IReadOnlyList<int> Sizes = [25, 50, 100, 250];

    public async Task<AdminRowsDto> Handle(GetAdminRowsQuery request, CancellationToken cancellationToken)
    {
        var table = AdminTables.Readable(request.Staff, request.Table);
        var size = request.Size is { } s && Sizes.Contains(s) ? s : Sizes[0];
        var page = Math.Max(1, request.Page ?? 1);
        try
        {
            var (rows, total) = await table.PageAsync(
                db, new AdminRowsRequest(request.Search, request.Status, request.Sort, request.Direction == "desc", page, size), cancellationToken);
            return new AdminRowsDto(await AdminValues.Resolve(db, request.Staff, rows, cancellationToken), total, page, size);
        }
        catch (Exception exception) when (exception is not OperationCanceledException and not ForbiddenException and not NotFoundException)
        {
            throw new UnavailableException("JB-ADM-503", $"We couldn't load {table.Label.ToLowerInvariant()}.", exception);
        }
    }
}

/// <summary>Turns the references of rows into their records' names, reading each table once (L2-276 AC3).</summary>
public static class AdminValues
{
    public static async Task<IReadOnlyList<AdminRowDto>> Resolve(
        IAppDbContext db, StaffViewer staff, IReadOnlyList<AdminRow> rows, CancellationToken cancellationToken)
    {
        var wanted = rows
            .SelectMany(r => r.Values.Values.OfType<AdminRef>())
            .GroupBy(r => r.Table)
            .ToList();
        var names = new Dictionary<string, IReadOnlyDictionary<string, string>>();
        foreach (var group in wanted)
        {
            var target = AdminCatalog.Find(group.Key);
            if (target is not null && AdminRights.CanRead(staff, target))
            {
                names[group.Key] = await target.NamesAsync(db, [.. group.Select(r => r.Id)], cancellationToken);
            }
        }

        return [.. rows.Select(row => new AdminRowDto(
            row.Id,
            row.Name,
            row.Values.ToDictionary(v => v.Key, v => v.Value is AdminRef r ? Reference(r, names) : v.Value)))];
    }

    private static object Reference(AdminRef r, Dictionary<string, IReadOnlyDictionary<string, string>> names)
    {
        if (!names.TryGetValue(r.Table, out var found))
        {
            return new AdminRefValue(r.Table, r.Id, null, false);
        }

        return found.TryGetValue(r.Id, out var name)
            ? new AdminRefValue(r.Table, r.Id, name, false)
            : new AdminRefValue(r.Table, r.Id, null, true);
    }
}
