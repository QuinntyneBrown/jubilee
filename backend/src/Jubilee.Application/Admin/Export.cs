using System.Globalization;
using System.Text;
using System.Text.Json;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Application.Jobs;
using Jubilee.Application.Moderation;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Admin;

/// <summary>A file the admin application downloads: its bytes, its media type and its name.</summary>
public sealed record AdminExportFile(byte[] Content, string ContentType, string FileName);

/// <summary>
/// A table as a CSV of its fields or a JSON of every field (L2-279 AC2): of every record the staff member may read, of
/// those matching the search and status, or of the selected IDs. A private table needs a reason (AC4); the export is
/// audited as <c>{table}.export</c> with the format, the number of rows and the reason.
/// </summary>
public sealed record ExportAdminTableQuery(
    StaffViewer Staff, string Table, string Format, string? Search, string? Status, IReadOnlyList<string> Ids, string? Reason)
    : IRequest<AdminExportFile>;

public sealed class ExportAdminTableQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ExportAdminTableQuery, AdminExportFile>
{
    /// <summary>A cell a spreadsheet would run as a formula starts with one of these.</summary>
    private static readonly char[] FormulaStarts = ['=', '+', '-', '@', '\t', '\r'];

    public async Task<AdminExportFile> Handle(ExportAdminTableQuery request, CancellationToken cancellationToken)
    {
        var table = AdminTables.Readable(request.Staff, request.Table);
        var json = string.Equals(request.Format, "json", StringComparison.OrdinalIgnoreCase);
        if (!json && !string.Equals(request.Format, "csv", StringComparison.OrdinalIgnoreCase))
        {
            throw new BadRequestException("FORMAT_UNKNOWN", "Export as csv or json.");
        }

        var reason = request.Reason?.Trim();
        if (table.Private && string.IsNullOrEmpty(reason))
        {
            throw new BadRequestException("REASON_REQUIRED", "Say why you are exporting private data. The reason is kept in Audit records.");
        }

        var rows = await table.ExportAsync(db, request.Search?.Trim(), request.Status, request.Ids, cancellationToken);
        var now = clock.GetUtcNow();
        var after = new Dictionary<string, string?>
        {
            ["format"] = json ? "json" : "csv",
            ["rows"] = rows.Count.ToString(CultureInfo.InvariantCulture),
        };
        if (!string.IsNullOrEmpty(reason))
        {
            after["reason"] = reason;
        }

        db.AuditRecords.Add(AuditRecord.Make(
            request.Staff.Subject, request.Staff.Name, $"{table.Key}.export", table.Key, table.Key,
            null, JsonSerializer.Serialize(after), reason, now));
        await db.SaveChangesAsync(cancellationToken);

        var day = DateOnly.FromDateTime(TorontoClock.Local(now)).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return json
            ? new AdminExportFile(Json(table, rows), "application/json", $"{table.Key}-{day}.json")
            : new AdminExportFile(Csv(table, rows), "text/csv", $"{table.Key}-{day}.csv");
    }

    private static byte[] Json(AdminTable table, IReadOnlyList<AdminRow> rows) =>
        JsonSerializer.SerializeToUtf8Bytes(rows.Select(r =>
            table.Fields.ToDictionary(f => f.Key, f => AdminWire.Text(r.Values.GetValueOrDefault(f.Key)))));

    /// <summary>RFC 4180: a header of the fields' labels, one line per record, each value in its wire form.</summary>
    private static byte[] Csv(AdminTable table, IReadOnlyList<AdminRow> rows)
    {
        var fields = table.Fields.Where(f => !f.OnRecordOnly).ToList();
        var csv = new StringBuilder();
        csv.Append(string.Join(',', fields.Select(f => Cell(f.Label)))).Append("\r\n");
        foreach (var row in rows)
        {
            csv.Append(string.Join(',', fields.Select(f => Cell(AdminWire.Text(row.Values.GetValueOrDefault(f.Key)))))).Append("\r\n");
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    private static string Cell(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        // A text that would run as a formula in a spreadsheet is written as text (OWASP CSV injection).
        if (value.IndexOfAny(FormulaStarts) == 0 && !decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out _))
        {
            value = "'" + value;
        }

        return value.IndexOfAny([',', '"', '\r', '\n']) >= 0 ? $"\"{value.Replace("\"", "\"\"", StringComparison.Ordinal)}\"" : value;
    }
}

/// <summary>Turns "Email me this weekly" on or off for the staff member and table (L2-279 AC3).</summary>
public sealed record SetWeeklyExportCommand(StaffViewer Staff, string Table, bool On) : IRequest;

public sealed class SetWeeklyExportCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SetWeeklyExportCommand>
{
    public async Task Handle(SetWeeklyExportCommand request, CancellationToken cancellationToken)
    {
        var table = AdminTables.Readable(request.Staff, request.Table);
        var existing = await db.AdminExportSubscriptions
            .Where(s => s.StaffSubject == request.Staff.Subject && s.TableKey == table.Key).ToListAsync(cancellationToken);
        if (request.On && existing.Count == 0)
        {
            db.AdminExportSubscriptions.Add(
                AdminExportSubscription.Start(request.Staff.Subject, request.Staff.StaffMemberId, table.Key, clock.GetUtcNow()));
        }
        else if (!request.On)
        {
            db.AdminExportSubscriptions.RemoveRange(existing);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class SendWeeklyExportsCommandHandler(ScheduledJobs jobs, IAppDbContext db, TimeProvider clock, TeamSettings team)
    : IRequestHandler<SendWeeklyExportsCommand, int?>
{
    public async Task<int?> Handle(SendWeeklyExportsCommand command, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var today = DateOnly.FromDateTime(TorontoClock.Local(now));
        var monday = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var due = TorontoClock.At(monday, SendWeeklyExportsCommand.At);
        if (now < due)
        {
            return null;
        }

        int? queued = null;
        await jobs.RunOnceAtAsync(SendWeeklyExportsCommand.Job, due, async token => queued = await QueueAsync(monday, now, token), cancellationToken);
        return queued;
    }

    private async Task<int> QueueAsync(DateOnly monday, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var subscriptions = await db.AdminExportSubscriptions.AsTracking()
            .Where(s => s.StaffMemberId != null && (s.LastSentOn == null || s.LastSentOn < monday)).ToListAsync(cancellationToken);
        var ids = subscriptions.Select(s => s.StaffMemberId!.Value).Distinct().ToList();
        var staff = await db.StaffMembers.AsNoTracking().Where(m => ids.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
        var queued = 0;
        foreach (var subscription in subscriptions)
        {
            var table = AdminCatalog.Tables.FirstOrDefault(t => t.Key == subscription.TableKey);
            if (table is null || !staff.TryGetValue(subscription.StaffMemberId!.Value, out var member))
            {
                continue;
            }

            // Sent only while the staff member holds a role that reads the table.
            var viewer = new StaffViewer(subscription.StaffSubject, member.Email, member.RoleNames());
            if (!AdminRights.CanRead(viewer, table))
            {
                continue;
            }

            var link = JubileeTeam.AdminLink(team, $"/{table.Key}?export=csv");
            db.OutboxMessages.Add(OutboxMessage.Email(
                null,
                member.Email,
                $"Your weekly export of {table.Label}",
                $"Hello,\n\nThis week's {table.Label.ToLowerInvariant()} are ready as a CSV in the admin application. The link opens it; sign in as usual. The file itself is never sent by e-mail.\n\n{link}\n\nTo stop these e-mails, choose “Stop the weekly email” in the table's Export menu.\n\nJubilee\n",
                now));
            subscription.SentFor(monday);
            queued++;
        }

        await db.SaveChangesAsync(cancellationToken);
        return queued;
    }
}
