using System.Globalization;
using System.Text.Json;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Admin;

/// <summary>A table whose records reference this one, through a field, with how many (L2-282 AC4).</summary>
public sealed record AdminPointerDto(string Table, string Label, string Field, int Count);

/// <summary>One line of a record's history: who, what they did, and when (L2-282 AC5).</summary>
public sealed record AdminHistoryDto(DateTimeOffset At, string Actor, string What)
{
    /// <summary>The line as one sentence: "Miriam Castillo put it on hold".</summary>
    public string Text => $"{Actor} {What}";
}

/// <summary>One record of a table: its name, status, values, the records that point at it and its history (L2-282).</summary>
public sealed record AdminRecordDto(
    string Table, string Id, string Name, string? Status, IReadOnlyDictionary<string, object?> Values,
    IReadOnlyList<AdminPointerDto> PointsHere, IReadOnlyList<AdminHistoryDto> History);

public sealed record GetAdminRecordQuery(StaffViewer Staff, string Table, string Id) : IRequest<AdminRecordDto>;

public sealed class GetAdminRecordQueryHandler(IAppDbContext db) : IRequestHandler<GetAdminRecordQuery, AdminRecordDto>
{
    public async Task<AdminRecordDto> Handle(GetAdminRecordQuery request, CancellationToken cancellationToken)
    {
        var table = AdminTables.Readable(request.Staff, request.Table);
        try
        {
            var row = await table.FindAsync(db, request.Id, cancellationToken)
                ?? throw new NotFoundException("NOT_FOUND", "There is no such record.");
            var resolved = (await AdminValues.Resolve(db, request.Staff, [row], cancellationToken))[0];
            var status = table.StatusField is { } key ? resolved.Values.GetValueOrDefault(key) as string : null;
            return new AdminRecordDto(
                table.Key, resolved.Id, resolved.Name, status, resolved.Values,
                await PointsHere(table, request, cancellationToken),
                await History(table, resolved, cancellationToken));
        }
        catch (Exception exception) when (exception is not OperationCanceledException and not ForbiddenException and not NotFoundException)
        {
            throw new UnavailableException(
                "JB-ADM-504", $"We couldn't load {table.Singular.ToLowerInvariant()} {request.Id}.", exception);
        }
    }

    /// <summary>Each readable table with a field that references this table, and how many of its records point here.</summary>
    private async Task<IReadOnlyList<AdminPointerDto>> PointsHere(AdminTable table, GetAdminRecordQuery request, CancellationToken cancellationToken)
    {
        var pointers = new List<AdminPointerDto>();
        foreach (var other in AdminCatalog.Tables.Where(t => AdminRights.CanRead(request.Staff, t)))
        {
            foreach (var field in other.Fields.Where(f => f.RefTable == table.Key))
            {
                // One query at a time: a DbContext runs one query at a time.
                var count = await other.CountReferencesAsync(db, field.Key, request.Id, cancellationToken);
                if (count > 0)
                {
                    pointers.Add(new AdminPointerDto(other.Key, other.Label, field.Label, count));
                }
            }
        }

        return pointers;
    }

    /// <summary>The audited actions on the record and its creation, newest first (L2-282 AC5).</summary>
    private async Task<IReadOnlyList<AdminHistoryDto>> History(AdminTable table, AdminRowDto record, CancellationToken cancellationToken)
    {
        var audits = await db.AuditRecords.AsNoTracking().Where(a => a.TargetId == record.Id).ToListAsync(cancellationToken);
        var lines = audits.SelectMany(a => AdminHistory.Lines(table, a.ActorName, a.Action, a.Before, a.After, a.At)).ToList();
        if (AdminHistory.When(record.Values.GetValueOrDefault("createdAt")) is { } created)
        {
            lines.Add(new AdminHistoryDto(created, "Jubilee", $"created this {table.Singular.ToLowerInvariant()}"));
        }

        return [.. lines.OrderByDescending(l => l.At)];
    }
}

/// <summary>How an audit record reads in a record's history (L2-282 AC5).</summary>
public static class AdminHistory
{
    /// <summary>What a staff member did, by the last part of the audit action.</summary>
    private static readonly Dictionary<string, string> Phrases = new(StringComparer.Ordinal)
    {
        ["read"] = "opened it",
        ["create"] = "created it",
        ["delete"] = "deleted it",
        ["restore"] = "restored it",
        ["held"] = "put it on hold",
        ["hold-lifted"] = "lifted its hold",
        ["removed"] = "removed it",
        ["taken-down"] = "took it down",
        ["published"] = "published it",
    };

    public static IEnumerable<AdminHistoryDto> Lines(
        AdminTable table, string actor, string action, string? before, string? after, DateTimeOffset at)
    {
        var verb = action[(action.LastIndexOf('.') + 1)..];
        if (verb == "update")
        {
            var old = Fields(before);
            foreach (var (key, value) in Fields(after))
            {
                var label = table.Fields.FirstOrDefault(f => f.Key == key)?.Label ?? key;
                yield return new AdminHistoryDto(at, actor, $"changed {label.ToLowerInvariant()} from {old.GetValueOrDefault(key) ?? "—"} to {value ?? "—"}");
            }

            yield break;
        }

        yield return new AdminHistoryDto(at, actor, Phrases.TryGetValue(verb, out var phrase) ? phrase : $"recorded {action}");
    }

    public static DateTimeOffset? When(object? value) => value switch
    {
        DateTimeOffset at => at,
        DateTime at => new DateTimeOffset(DateTime.SpecifyKind(at, DateTimeKind.Utc)),
        string text when DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var at) => at,
        _ => null,
    };

    /// <summary>The fields of a change, as written by the admin application: a JSON object of field to value.</summary>
    private static Dictionary<string, string?> Fields(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || !json.TrimStart().StartsWith('{'))
        {
            return [];
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            return document.RootElement.EnumerateObject().ToDictionary(
                p => p.Name,
                p => p.Value.ValueKind switch
                {
                    JsonValueKind.Null => null,
                    JsonValueKind.String => p.Value.GetString(),
                    _ => p.Value.GetRawText(),
                });
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
