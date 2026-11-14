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

/// <summary>How many records a change of the selection reached.</summary>
public sealed record AdminCountDto(int Count);

/// <summary>Sets one status on the selected records, each through the status field's binding and each audited (L2-280 AC4).</summary>
public sealed record SetAdminStatusCommand(StaffViewer Staff, string Table, IReadOnlyList<string> Ids, string Status)
    : IRequest<AdminCountDto>;

public sealed class SetAdminStatusCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<SetAdminStatusCommand, AdminCountDto>
{
    public async Task<AdminCountDto> Handle(SetAdminStatusCommand request, CancellationToken cancellationToken)
    {
        var table = AdminChanges.Changeable(request.Staff, request.Table);
        var field = table.StatusField is { } key ? table.Fields.Single(f => f.Key == key) : null;
        if (field is null || !field.Editable)
        {
            throw new ForbiddenException("FORBIDDEN", $"The status of {table.Label.ToLowerInvariant()} is not set here.");
        }

        var now = clock.GetUtcNow();
        var change = new AdminChange(request.Staff, now);
        var values = new Dictionary<string, string?> { [field.Key] = request.Status };
        var count = 0;
        foreach (var id in request.Ids.Distinct())
        {
            // A refusal throws before anything is saved, so no record of the selection changes.
            var changed = await table.UpdateAsync(db, id, values, change, cancellationToken);
            if (changed is { After.Count: > 0 })
            {
                AdminChanges.Audit(db, request.Staff, $"{table.Key}.update", table.Key, id, changed, now);
            }

            count += changed is null ? 0 : 1;
        }

        await db.SaveChangesAsync(cancellationToken);
        return new AdminCountDto(count);
    }
}

/// <summary>Deletes the selected records, each audited with its values (L2-281 AC3, AC5).</summary>
public sealed record DeleteAdminRecordsCommand(StaffViewer Staff, string Table, IReadOnlyList<string> Ids) : IRequest<AdminCountDto>;

/// <summary>Brings back records deleted by mistake, each audited ("Undo", L2-281 AC3).</summary>
public sealed record RestoreAdminRecordsCommand(StaffViewer Staff, string Table, IReadOnlyList<string> Ids) : IRequest<AdminCountDto>;

public sealed class DeleteAdminRecordsCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<DeleteAdminRecordsCommand, AdminCountDto>
{
    public async Task<AdminCountDto> Handle(DeleteAdminRecordsCommand request, CancellationToken cancellationToken)
    {
        var table = AdminChanges.Deletable(request.Staff, request.Table);
        var now = clock.GetUtcNow();
        var deleted = await table.DeleteAsync(db, request.Ids, now, cancellationToken);
        foreach (var (id, values) in deleted)
        {
            AdminChanges.Audit(db, request.Staff, $"{table.Key}.delete", table.Key, id, values, now);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new AdminCountDto(deleted.Count);
    }
}

public sealed class RestoreAdminRecordsCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<RestoreAdminRecordsCommand, AdminCountDto>
{
    public async Task<AdminCountDto> Handle(RestoreAdminRecordsCommand request, CancellationToken cancellationToken)
    {
        var table = AdminChanges.Deletable(request.Staff, request.Table);
        var now = clock.GetUtcNow();
        var restored = await table.RestoreAsync(db, request.Ids, cancellationToken);
        foreach (var (id, values) in restored)
        {
            AdminChanges.Audit(db, request.Staff, $"{table.Key}.restore", table.Key, id, values, now);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new AdminCountDto(restored.Count);
    }
}

/// <summary>Erases the records deleted from the admin application more than 30 days ago (L2-281 AC4).</summary>
public sealed record PurgeAdminDeletionsCommand : IRequest<int>
{
    /// <summary>How long a deleted record is kept apart before it is erased.</summary>
    public static readonly TimeSpan Kept = TimeSpan.FromDays(30);
}

public sealed class PurgeAdminDeletionsCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<PurgeAdminDeletionsCommand, int>
{
    public async Task<int> Handle(PurgeAdminDeletionsCommand request, CancellationToken cancellationToken)
    {
        var before = clock.GetUtcNow() - PurgeAdminDeletionsCommand.Kept;
        var erased = 0;
        foreach (var table in AdminCatalog.Tables.Where(t => t.Deletable))
        {
            erased += await table.PurgeAsync(db, before, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return erased;
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

    /// <summary>The table, when the role may delete in it: as <see cref="Changeable"/>, and 403 for a table that keeps its records (L2-281 AC5).</summary>
    public static AdminTable Deletable(StaffViewer staff, string key)
    {
        var table = Changeable(staff, key);
        return AdminRights.CanDelete(staff, table)
            ? table
            : throw new ForbiddenException("FORBIDDEN", $"{table.Label} are not deleted here.");
    }

    /// <summary>Adds the audit record of a change to the same save: the staff member, the time, the values before and after.</summary>
    public static void Audit(IAppDbContext db, StaffViewer staff, string action, string targetType, string targetId, AdminChanged changed, DateTimeOffset now) =>
        db.AuditRecords.Add(AuditRecord.Make(
            staff.Subject, staff.Name, action, targetType, targetId,
            changed.Before.Count > 0 ? JsonSerializer.Serialize(changed.Before) : null,
            JsonSerializer.Serialize(changed.After), null, now));
}

/// <summary>
/// The weekly export (L2-279 AC3): once it is Monday 08:00 in Toronto, e-mails each staff member who turned on "Email
/// me this weekly" a link to the table's CSV, while their role reads it. The answer is how many e-mails were queued, or
/// null before 08:00 or when this week's were already sent.
/// </summary>
public sealed record SendWeeklyExportsCommand : IRequest<int?>
{
    public const string Job = "admin-weekly-export";

    public static readonly TimeOnly At = new(8, 0);
}
