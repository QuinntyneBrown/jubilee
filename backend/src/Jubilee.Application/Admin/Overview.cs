using Jubilee.Application.Abstractions;
using Jubilee.Application.Admin.Tables;
using Jubilee.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Admin;

/// <summary>One line of the work queue: its table, how many wait, the oldest of them and whether it is urgent (L2-274 AC3).</summary>
public sealed record AdminQueueLineDto(
    string Table, string Label, int Count, bool Urgent, string NextId, string Next, DateTimeOffset? OldestAt);

/// <summary>A section of the work queue, "Safety" or "Waiting on us", with the lines that have something waiting.</summary>
public sealed record AdminQueueSectionDto(string Title, string Note, IReadOnlyList<AdminQueueLineDto> Lines);

/// <summary>"Since yesterday": what happened on Jubilee in the last 24 hours (L2-274 AC1).</summary>
public sealed record AdminSinceDto(int Members, int Listings, int Orders, int Requests);

/// <summary>
/// One item of System (L2-275 AC1–AC3): a job run that <c>failed</c>, an outbox message <c>retrying</c> or that
/// <c>gave-up</c>, or <c>maintenance</c> under way, with the table that holds it.
/// </summary>
public sealed record AdminSystemItemDto(
    string Kind, string Table, string? Subject, DateTimeOffset At, int? Attempts = null, DateTimeOffset? Until = null);

/// <summary>One line of Recent changes: "{first name} {what} {record ID}" with the time (L2-275 AC4).</summary>
public sealed record AdminChangeDto(string Actor, string What, string? Table, string RecordId, DateTimeOffset At);

/// <summary>The overview (L2-274, L2-275): what is waiting on staff, System and Recent changes.</summary>
public sealed record AdminOverviewDto(
    int Waiting, AdminSinceDto Since, IReadOnlyList<AdminQueueSectionDto> Sections,
    IReadOnlyList<AdminSystemItemDto> System, IReadOnlyList<AdminChangeDto> Changes);

public sealed record GetAdminOverviewQuery(StaffViewer Staff) : IRequest<AdminOverviewDto>;

/// <summary>
/// Reads the overview at the moment it opens, with the staff session; nothing is cached, polled or pushed (L2-274 AC7,
/// ADR 0058). Only the lines of tables the staff member may read are counted (L2-284).
/// </summary>
public sealed class GetAdminOverviewQueryHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<GetAdminOverviewQuery, AdminOverviewDto>
{
    private static readonly TimeSpan Day = TimeSpan.FromHours(24);

    /// <summary>The work queue (L2-274 AC2): each line's table, label, waiting statuses and urgency.</summary>
    private static readonly (string Title, string Note, Line[] Lines)[] Queue =
    [
        ("Safety", "Answer within 24 hours",
        [
            new("security-alerts", null, Urgent: true, Statuses: []),
            new("listing-reports", null, Urgent: true, Statuses: ["open"], v => RefName(v, "listingId")),
            new("conversation-reports", null, Urgent: false, Statuses: ["open", "in review"], v => Text(v, "reason")),
            new("review-reports", null, Urgent: false, Statuses: ["open"], v => Text(v, "reason") is { } reason ? $"Marked {reason}" : null),
        ]),
        ("Waiting on us", "Members are waiting for a decision",
        [
            new("data-exports", "Data exports not delivered", Urgent: false, Statuses: ["failed", "processing"], v => RefName(v, "memberId")),
            new("feedback", "New feedback", Urgent: false, Statuses: ["new"], v => Text(v, "body") is { } note ? $"“{note}”" : null),
        ]),
    ];

    public async Task<AdminOverviewDto> Handle(GetAdminOverviewQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var now = clock.GetUtcNow();
            var sections = new List<AdminQueueSectionDto>();
            foreach (var (title, note, lines) in Queue)
            {
                var shown = new List<AdminQueueLineDto>();
                foreach (var line in lines)
                {
                    if (AdminCatalog.Find(line.Table) is { } table && AdminRights.CanRead(request.Staff, table)
                        && await Count(request.Staff, table, line, now, cancellationToken) is { } counted)
                    {
                        shown.Add(counted);
                    }
                }

                sections.Add(new AdminQueueSectionDto(title, note, shown));
            }

            return new AdminOverviewDto(
                sections.Sum(s => s.Lines.Sum(l => l.Count)),
                await Since(now - Day, cancellationToken),
                sections,
                await System(request.Staff, now, cancellationToken),
                await Changes(request.Staff, cancellationToken));
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new UnavailableException("JB-ADM-503", "We couldn't load what is waiting on staff.", exception);
        }
    }

    /// <summary>
    /// How many records of the line wait, and the oldest of them; null when none waits (L2-274 AC2). A security alert
    /// has no status: it waits for the 24 hours after it is raised.
    /// </summary>
    private async Task<AdminQueueLineDto?> Count(
        StaffViewer staff, AdminTable table, Line line, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (line.Statuses.Length == 0)
        {
            var alerts = db.SecurityAlerts.AsNoTracking().Where(a => a.RaisedAt >= now - Day);
            var count = await alerts.CountAsync(cancellationToken);
            var oldest = await alerts.OrderBy(a => a.RaisedAt).FirstOrDefaultAsync(cancellationToken);
            return oldest is null
                ? null
                : new AdminQueueLineDto(table.Key, line.Label ?? table.Label, count, line.Urgent, oldest.Id.ToString(), oldest.Kind, oldest.RaisedAt);
        }

        var total = 0;
        AdminRow? first = null;
        DateTimeOffset? firstAt = null;
        foreach (var status in line.Statuses)
        {
            // One query at a time: a DbContext runs one query at a time.
            var (rows, count) = await table.PageAsync(
                db, new AdminRowsRequest(null, status, "createdAt", Descending: false, Page: 1, Size: 1), cancellationToken);
            total += count;
            if (rows.Count > 0 && At(rows[0]) is var at && (first is null || at < firstAt))
            {
                first = rows[0];
                firstAt = at;
            }
        }

        if (first is null)
        {
            return null;
        }

        // "Next" describes the oldest record by what it is about, else by its name (L2-274 AC3).
        var resolved = (await AdminValues.Resolve(db, staff, [first], cancellationToken))[0];
        var next = line.Describe?.Invoke(resolved.Values) ?? resolved.Name;
        return new AdminQueueLineDto(table.Key, line.Label ?? table.Label, total, line.Urgent, first.Id, next, firstAt);
    }

    private static string? Text(IReadOnlyDictionary<string, object?> values, string key) =>
        values.GetValueOrDefault(key) is string { Length: > 0 } text ? text : null;

    private static string? RefName(IReadOnlyDictionary<string, object?> values, string key) =>
        values.GetValueOrDefault(key) is AdminRefValue { Name: { Length: > 0 } name } ? name : null;

    private static DateTimeOffset? At(AdminRow row) => row.Values.GetValueOrDefault("createdAt") switch
    {
        DateTimeOffset at => at,
        DateTime at => new DateTimeOffset(at, TimeSpan.Zero),
        _ => null,
    };

    private async Task<AdminSinceDto> Since(DateTimeOffset since, CancellationToken cancellationToken) => new(
        await db.Members.AsNoTracking().CountAsync(m => m.CreatedAt >= since, cancellationToken),
        await db.Listings.AsNoTracking().CountAsync(l => l.PublishedAt >= since, cancellationToken),
        await db.MerchOrders.AsNoTracking().CountAsync(o => o.PaidAt >= since, cancellationToken),
        await db.Requests.AsNoTracking().CountAsync(r => r.CreatedAt >= since, cancellationToken));

    /// <summary>
    /// The job runs that failed in the last 24 hours, the outbox messages retrying or given up in that time, and
    /// maintenance under way (L2-275 AC1–AC3), each only where the staff member reads its table.
    /// </summary>
    private async Task<IReadOnlyList<AdminSystemItemDto>> System(StaffViewer staff, DateTimeOffset now, CancellationToken cancellationToken)
    {
        bool Reads(string key) => AdminCatalog.Find(key) is { } table && AdminRights.CanRead(staff, table);
        var items = new List<AdminSystemItemDto>();
        if (Reads("job-runs"))
        {
            var failedBefore = now - SiteTables.JobGivesUpAfter;
            var failed = await db.JobRuns.AsNoTracking()
                .Where(r => r.SucceededAt == null && r.ClaimedAt < failedBefore && r.ClaimedAt >= now - Day)
                .OrderByDescending(r => r.ClaimedAt).Take(5).ToListAsync(cancellationToken);
            items.AddRange(failed.Select(r => new AdminSystemItemDto("failed", "job-runs", r.Job, r.ClaimedAt)));
        }

        if (Reads("outbox-messages"))
        {
            var retrying = await db.OutboxMessages.AsNoTracking()
                .Where(m => m.SentAt == null && m.FailedAt == null && m.Attempts > 0)
                .OrderBy(m => m.CreatedAt).Take(5).ToListAsync(cancellationToken);
            items.AddRange(retrying.Select(m => new AdminSystemItemDto("retrying", "outbox-messages", m.Subject, m.NextAttemptAt, m.Attempts)));
            var gaveUp = await db.OutboxMessages.AsNoTracking()
                .Where(m => m.FailedAt >= now - Day)
                .OrderByDescending(m => m.FailedAt).Take(5).ToListAsync(cancellationToken);
            items.AddRange(gaveUp.Select(m => new AdminSystemItemDto("gave-up", "outbox-messages", m.Subject, m.FailedAt!.Value, m.Attempts)));
        }

        if (Reads("maintenance-windows"))
        {
            var live = await db.MaintenanceWindows.AsNoTracking()
                .Where(w => w.EndedAt == null).OrderByDescending(w => w.StartedAt).FirstOrDefaultAsync(cancellationToken);
            if (live is not null)
            {
                items.Add(new AdminSystemItemDto("maintenance", "maintenance-windows", null, live.StartedAt, Until: live.BackBy));
            }
        }

        return items;
    }

    /// <summary>The four newest audit records, as "{first name} {what} {record ID}" (L2-275 AC4).</summary>
    private async Task<IReadOnlyList<AdminChangeDto>> Changes(StaffViewer staff, CancellationToken cancellationToken)
    {
        if (AdminCatalog.Find("audit-records") is not { } audit || !AdminRights.CanRead(staff, audit))
        {
            return [];
        }

        var newest = await db.AuditRecords.AsNoTracking().OrderByDescending(a => a.At).Take(4).ToListAsync(cancellationToken);
        return [.. newest.Select(a =>
        {
            var table = AdminCatalog.Find(a.TargetType);
            var first = a.ActorName.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? a.ActorName;
            var thing = (table?.Singular ?? a.TargetType).ToLowerInvariant();
            return new AdminChangeDto(first, $"{Verb(a.Action)} {thing}", table?.Key, a.TargetId, a.At);
        })];
    }

    /// <summary>What an audited action did, from the word after its last dot: "feedback.update" was "updated".</summary>
    public static string Verb(string action)
    {
        var word = action[(action.LastIndexOf('.') + 1)..];
        return word switch
        {
            "update" => "updated",
            "create" => "created",
            "read" => "read",
            "delete" => "deleted",
            "restore" => "restored",
            "export" => "exported",
            _ => word,
        };
    }

    private sealed record Line(
        string Table, string? Label, bool Urgent, string[] Statuses, Func<IReadOnlyDictionary<string, object?>, string?>? Describe = null);
}
