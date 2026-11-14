using System.Text.Json;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;

namespace Jubilee.Application.Admin;

/// <summary>Changes the fields of one record through their bindings, and audits it in the same save (L2-283 AC2, AC5).</summary>
public sealed record UpdateAdminRecordCommand(StaffViewer Staff, string Table, string Id, IReadOnlyDictionary<string, string?> Values)
    : IRequest<AdminRecordDto>;

/// <summary>Creates a record through the table's creation, and audits it in the same save (L2-283 AC4, AC5).</summary>
public sealed record CreateAdminRecordCommand(StaffViewer Staff, string Table, IReadOnlyDictionary<string, string?> Values)
    : IRequest<AdminRecordDto>;

public sealed class UpdateAdminRecordCommandHandler(IAppDbContext db, TimeProvider clock, ISender sender)
    : IRequestHandler<UpdateAdminRecordCommand, AdminRecordDto>
{
    public async Task<AdminRecordDto> Handle(UpdateAdminRecordCommand request, CancellationToken cancellationToken)
    {
        var table = AdminChanges.Changeable(request.Staff, request.Table);
        var now = clock.GetUtcNow();
        var changed = await table.UpdateAsync(db, request.Id, request.Values, new AdminChange(request.Staff, now), cancellationToken)
            ?? throw new NotFoundException("NOT_FOUND", "There is no such record.");
        if (changed.After.Count > 0)
        {
            AdminChanges.Audit(db, request.Staff, $"{table.Key}.update", table.Key, request.Id, changed, now);
            await db.SaveChangesAsync(cancellationToken);
        }

        return await sender.Send(new GetAdminRecordQuery(request.Staff, table.Key, request.Id), cancellationToken);
    }
}

public sealed class CreateAdminRecordCommandHandler(IAppDbContext db, TimeProvider clock, ISender sender)
    : IRequestHandler<CreateAdminRecordCommand, AdminRecordDto>
{
    public async Task<AdminRecordDto> Handle(CreateAdminRecordCommand request, CancellationToken cancellationToken)
    {
        var table = AdminChanges.Changeable(request.Staff, request.Table);
        if (!table.Creatable)
        {
            throw new ForbiddenException("FORBIDDEN", $"New {table.Label.ToLowerInvariant()} are not made here.");
        }

        var now = clock.GetUtcNow();
        var (id, values) = await table.CreateAsync(db, request.Values, new AdminChange(request.Staff, now), cancellationToken);
        AdminChanges.Audit(db, request.Staff, $"{table.Key}.create", table.Key, id, values, now);
        await db.SaveChangesAsync(cancellationToken);
        return await sender.Send(new GetAdminRecordQuery(request.Staff, table.Key, id), cancellationToken);
    }
}

/// <summary>The checks and the audit every change of the admin application shares (L2-284 AC1, AC5).</summary>
public static class AdminChanges
{
    /// <summary>The table, when the role may change it: 409 for a read-only table, 403 for one outside the role.</summary>
    public static AdminTable Changeable(StaffViewer staff, string key)
    {
        var table = AdminTables.Readable(staff, key);
        if (AdminRights.IsReadOnly(table))
        {
            throw new ConflictException("READ_ONLY", "Jubilee writes these records itself. They can be read and exported, never changed.");
        }

        return AdminRights.CanChange(staff, table)
            ? table
            : throw new ForbiddenException("FORBIDDEN", "Your staff role may not change this table.");
    }

    /// <summary>Adds the audit record of a change to the same save: the staff member, the time, the values before and after.</summary>
    public static void Audit(IAppDbContext db, StaffViewer staff, string action, string targetType, string targetId, AdminChanged changed, DateTimeOffset now) =>
        db.AuditRecords.Add(AuditRecord.Make(
            staff.Subject, staff.Name, action, targetType, targetId,
            changed.Before.Count > 0 ? JsonSerializer.Serialize(changed.Before) : null,
            JsonSerializer.Serialize(changed.After), null, now));
}
