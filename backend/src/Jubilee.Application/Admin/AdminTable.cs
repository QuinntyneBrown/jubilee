using System.Linq.Expressions;
using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Admin;

/// <summary>One record of a table as the admin application reads it: its ID, its name (L2-282 AC2) and its values.</summary>
public sealed record AdminRow(string Id, string Name, IReadOnlyDictionary<string, object?> Values);

/// <summary>The fields a change touched, with their values before and after, in their wire form (L2-283 AC5).</summary>
public sealed record AdminChanged(IReadOnlyDictionary<string, string?> Before, IReadOnlyDictionary<string, string?> After);

/// <summary>What a table screen asks for (L2-277, L2-278).</summary>
public sealed record AdminRowsRequest(string? Search, string? Status, string? Sort, bool Descending, int Page, int Size);

/// <summary>
/// The description of one of Jubilee's tables in the admin application (ADR 0075): its key, names, group, sentence,
/// fields and defaults, and how its records are read. The handlers work on any table through this base.
/// </summary>
public abstract class AdminTable
{
    protected AdminTable(string key, string label, string singular, string group, string sentence)
    {
        Key = key;
        Label = label;
        Singular = singular;
        Group = group;
        Sentence = sentence;
    }

    /// <summary>The table's key in kebab case: its route (<c>/members</c>, <c>/listing-reports</c>).</summary>
    public string Key { get; }

    public string Label { get; }

    public string Singular { get; }

    public string Group { get; }

    public string Sentence { get; }

    /// <summary>What an empty table says after "No {table} yet." (L2-099 AC4); null when the table has no words of its own.</summary>
    public string? Empty { get; init; }

    public abstract IReadOnlyList<AdminField> Fields { get; }

    /// <summary>The fields shown by default, in order (L2-276 AC3).</summary>
    public abstract IReadOnlyList<string> DefaultColumns { get; }

    public string? StatusField => Fields.FirstOrDefault(f => f.Type == AdminFieldType.Status && f.Key == "status")?.Key
        ?? Fields.FirstOrDefault(f => f.Type == AdminFieldType.Status)?.Key;

    /// <summary>Opened only while a report makes it needed, and exported only with a reason (L2-279 AC4, L2-284 AC3).</summary>
    public bool Private { get; init; }

    /// <summary>A table that declares deletion (ADR 0075, L2-281).</summary>
    public bool Deletable { get; init; }

    public virtual bool Creatable => false;

    /// <summary>The fields a new record is given, in order (L2-283 AC4); empty when the table has no creation.</summary>
    public IReadOnlyList<string> CreateFields { get; init; } = [];

    public bool Editable => Fields.Any(f => f.Editable);

    public abstract Task<int> CountAsync(IAppDbContext db, CancellationToken cancellationToken);

    public abstract Task<(IReadOnlyList<AdminRow> Rows, int Total)> PageAsync(IAppDbContext db, AdminRowsRequest request, CancellationToken cancellationToken);

    public abstract Task<AdminRow?> FindAsync(IAppDbContext db, string id, CancellationToken cancellationToken);

    /// <summary>The names of the records with these IDs; an ID that is missing or deleted is left out.</summary>
    public abstract Task<IReadOnlyDictionary<string, string>> NamesAsync(IAppDbContext db, IReadOnlyCollection<string> ids, CancellationToken cancellationToken);

    /// <summary>Records whose ID or name contains the text, for the jump palette (L2-273 AC3).</summary>
    public abstract Task<IReadOnlyList<AdminRow>> MatchAsync(IAppDbContext db, string text, int take, CancellationToken cancellationToken);

    /// <summary>
    /// Applies the values through the fields' bindings to the record (L2-283 AC2), without saving; null when the record
    /// does not exist. A value the rule refuses throws <c>ValidationFailedException</c> with every field's code.
    /// </summary>
    public abstract Task<AdminChanged?> UpdateAsync(
        IAppDbContext db, string id, IReadOnlyDictionary<string, string?> values, AdminChange change, CancellationToken cancellationToken);

    /// <summary>Creates a record through the table's creation (L2-283 AC4), without saving; returns its ID.</summary>
    public abstract Task<(string Id, AdminChanged Values)> CreateAsync(
        IAppDbContext db, IReadOnlyDictionary<string, string?> values, AdminChange change, CancellationToken cancellationToken);

    /// <summary>
    /// Marks the records with these IDs deleted (L2-281 AC3), without saving; returns each one's ID and values. An ID
    /// that is missing or already deleted is left out.
    /// </summary>
    public abstract Task<IReadOnlyList<(string Id, AdminChanged Values)>> DeleteAsync(
        IAppDbContext db, IReadOnlyCollection<string> ids, DateTimeOffset now, CancellationToken cancellationToken);

    /// <summary>Brings back the deleted records with these IDs as they were (L2-281 AC3), without saving.</summary>
    public abstract Task<IReadOnlyList<(string Id, AdminChanged Values)>> RestoreAsync(
        IAppDbContext db, IReadOnlyCollection<string> ids, CancellationToken cancellationToken);

    /// <summary>
    /// Every record that matches the search and the status, or that has one of the IDs when any are given, with every
    /// field, in the table's order (L2-279 AC2).
    /// </summary>
    public abstract Task<IReadOnlyList<AdminRow>> ExportAsync(
        IAppDbContext db, string? search, string? status, IReadOnlyCollection<string> ids, CancellationToken cancellationToken);

    /// <summary>Erases the records deleted before the given time (L2-281 AC4), without saving; returns how many.</summary>
    public abstract Task<int> PurgeAsync(IAppDbContext db, DateTimeOffset before, CancellationToken cancellationToken);

    /// <summary>How many records of this table reference the given record through the field (L2-282 AC4).</summary>
    public abstract Task<int> CountReferencesAsync(IAppDbContext db, string fieldKey, string id, CancellationToken cancellationToken);
}

/// <summary>A table over one entity type.</summary>
public class AdminTable<T> : AdminTable
    where T : class
{
    private readonly Func<IAppDbContext, IQueryable<T>> _source;
    private readonly Func<T, string> _idOf;
    private readonly Func<string, Expression<Func<T, bool>>?> _matchId;
    private readonly IReadOnlyList<AdminField<T>> _fields;
    private readonly IReadOnlyList<string> _nameFields;
    private readonly string? _defaultSort;

    public AdminTable(
        string key, string label, string singular, string group, string sentence,
        Func<IAppDbContext, IQueryable<T>> source,
        Expression<Func<T, Guid>> id,
        IReadOnlyList<AdminField<T>> fields,
        int columns = 6,
        string[]? nameFields = null,
        string? defaultSort = null)
        : this(key, label, singular, group, sentence, source, Compile(id), MatchGuid(id), fields, columns, nameFields, defaultSort)
    {
    }

    public AdminTable(
        string key, string label, string singular, string group, string sentence,
        Func<IAppDbContext, IQueryable<T>> source,
        Func<T, string> idOf,
        Func<string, Expression<Func<T, bool>>?> matchId,
        IReadOnlyList<AdminField<T>> fields,
        int columns = 6,
        string[]? nameFields = null,
        string? defaultSort = null)
        : base(key, label, singular, group, sentence)
    {
        _source = source;
        _idOf = idOf;
        _matchId = matchId;
        _fields = fields;
        _nameFields = nameFields ?? [];
        _defaultSort = defaultSort;
        DefaultColumns = [.. fields.Take(columns).Select(f => f.Key)];
    }

    public override IReadOnlyList<AdminField> Fields => _fields;

    public override IReadOnlyList<string> DefaultColumns { get; }

    public IReadOnlyList<AdminField<T>> TypedFields => _fields;

    public IQueryable<T> Query(IAppDbContext db) => _source(db);

    /// <summary>
    /// The creation of the feature that owns the table (L2-283 AC4): it checks the values with that feature's rules,
    /// throws <c>ValidationFailedException</c> when they refuse them, and adds the new entity to the context.
    /// </summary>
    public Func<IAppDbContext, IReadOnlyDictionary<string, string?>, AdminChange, CancellationToken, Task<T>>? Create { get; init; }

    public override bool Creatable => Create is not null;

    public Expression<Func<T, bool>>? Matching(string id) => _matchId(id);

    public string IdOf(T entity) => _idOf(entity);

    public override Task<int> CountAsync(IAppDbContext db, CancellationToken cancellationToken) =>
        _source(db).CountAsync(cancellationToken);

    public override async Task<(IReadOnlyList<AdminRow> Rows, int Total)> PageAsync(
        IAppDbContext db, AdminRowsRequest request, CancellationToken cancellationToken)
    {
        var query = Filtered(_source(db), request.Search, request.Status);
        var total = await query.CountAsync(cancellationToken);
        var sorted = Sorted(query, request.Sort, request.Descending);
        var page = await sorted.Skip((request.Page - 1) * request.Size).Take(request.Size).ToListAsync(cancellationToken);
        return ([.. page.Select(Row)], total);
    }

    public IQueryable<T> Filtered(IQueryable<T> query, string? search, string? status)
    {
        if (!string.IsNullOrWhiteSpace(search))
        {
            var text = search.Trim();
            query = query.Where(Predicates.AnyOf(_fields.Where(f => f.Search is not null).Select(f => f.Search!(text))));
        }

        if (!string.IsNullOrWhiteSpace(status) && StatusField is { } key
            && _fields.Single(f => f.Key == key).Filter?.Invoke(status) is { } filter)
        {
            query = query.Where(filter);
        }
        else if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(_ => false);
        }

        return query;
    }

    public IQueryable<T> Sorted(IQueryable<T> query, string? sort, bool descending)
    {
        var field = _fields.FirstOrDefault(f => f.Key == sort && f.Sort is not null);
        if (field is not null)
        {
            return field.Sort!(query, descending);
        }

        var fallback = _fields.FirstOrDefault(f => f.Key == _defaultSort && f.Sort is not null)
            ?? _fields.LastOrDefault(f => f.System && f.Type == AdminFieldType.DateTime && f.Sort is not null);
        return fallback is not null ? fallback.Sort!(query, true) : query;
    }

    public override async Task<AdminRow?> FindAsync(IAppDbContext db, string id, CancellationToken cancellationToken)
    {
        var match = _matchId(id);
        if (match is null)
        {
            return null;
        }

        var entity = await _source(db).Where(match).FirstOrDefaultAsync(cancellationToken);
        return entity is null ? null : Row(entity, record: true);
    }

    public override async Task<IReadOnlyDictionary<string, string>> NamesAsync(
        IAppDbContext db, IReadOnlyCollection<string> ids, CancellationToken cancellationToken)
    {
        var matches = ids.Distinct().Select(_matchId).OfType<Expression<Func<T, bool>>>().ToList();
        if (matches.Count == 0)
        {
            return new Dictionary<string, string>();
        }

        var found = await _source(db).Where(Predicates.AnyOf(matches)).ToListAsync(cancellationToken);
        return found.Select(Row).ToDictionary(r => r.Id, r => r.Name, StringComparer.OrdinalIgnoreCase);
    }

    public override async Task<IReadOnlyList<AdminRow>> MatchAsync(IAppDbContext db, string text, int take, CancellationToken cancellationToken)
    {
        var searched = _fields.Where(f => (f.Key == "id" || _nameFields.Contains(f.Key)) && f.Search is not null).ToList();
        if (searched.Count == 0)
        {
            return [];
        }

        var found = await _source(db).Where(Predicates.AnyOf(searched.Select(f => f.Search!(text.Trim())))).Take(take).ToListAsync(cancellationToken);
        return [.. found.Select(Row)];
    }

    public override async Task<AdminChanged?> UpdateAsync(
        IAppDbContext db, string id, IReadOnlyDictionary<string, string?> values, AdminChange change, CancellationToken cancellationToken)
    {
        var match = _matchId(id);
        var entity = match is null ? null : await _source(db).AsTracking().Where(match).FirstOrDefaultAsync(cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var errors = new Dictionary<string, string>();
        var before = new Dictionary<string, string?>();
        var after = new Dictionary<string, string?>();
        foreach (var (key, value) in values)
        {
            var field = _fields.FirstOrDefault(f => f.Key == key);
            if (field is null || !field.Editable)
            {
                errors[key] = "NOT_EDITABLE";
                continue;
            }

            var old = AdminWire.Text(field.ValueOf(entity));
            if (string.Equals(old ?? string.Empty, value ?? string.Empty, StringComparison.Ordinal))
            {
                continue;
            }

            if (field.Apply(entity, value, change) is { } error)
            {
                errors[key] = error;
                continue;
            }

            before[key] = old;
            after[key] = AdminWire.Text(field.ValueOf(entity));
        }

        if (errors.Count > 0)
        {
            throw new Accounts.ValidationFailedException(errors);
        }

        return new AdminChanged(before, after);
    }

    public override async Task<(string Id, AdminChanged Values)> CreateAsync(
        IAppDbContext db, IReadOnlyDictionary<string, string?> values, AdminChange change, CancellationToken cancellationToken)
    {
        var create = Create ?? throw new InvalidOperationException($"The table {Key} has no creation.");
        var unknown = values.Keys.Where(k => !CreateFields.Contains(k)).ToDictionary(k => k, _ => "NOT_EDITABLE");
        if (unknown.Count > 0)
        {
            throw new Accounts.ValidationFailedException(unknown);
        }

        var entity = await create(db, values, change, cancellationToken);
        var after = _fields.Where(f => CreateFields.Contains(f.Key)).ToDictionary(f => f.Key, f => AdminWire.Text(f.ValueOf(entity)));
        return (_idOf(entity), new AdminChanged(new Dictionary<string, string?>(), after));
    }

    public override async Task<IReadOnlyList<(string Id, AdminChanged Values)>> DeleteAsync(
        IAppDbContext db, IReadOnlyCollection<string> ids, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var found = await Deletables(_source(db), ids, cancellationToken);
        foreach (var entity in found)
        {
            ((IAdminDeletable)entity).AdminDelete(now);
        }

        return [.. found.Select(e => (_idOf(e), new AdminChanged(WireValues(e), new Dictionary<string, string?>())))];
    }

    public override async Task<IReadOnlyList<(string Id, AdminChanged Values)>> RestoreAsync(
        IAppDbContext db, IReadOnlyCollection<string> ids, CancellationToken cancellationToken)
    {
        var found = (await Deletables(_source(db).IgnoreQueryFilters(), ids, cancellationToken))
            .Where(e => ((IAdminDeletable)e).AdminDeletedAt is not null).ToList();
        foreach (var entity in found)
        {
            ((IAdminDeletable)entity).AdminRestore();
        }

        return [.. found.Select(e => (_idOf(e), new AdminChanged(new Dictionary<string, string?>(), WireValues(e))))];
    }

    public override async Task<IReadOnlyList<AdminRow>> ExportAsync(
        IAppDbContext db, string? search, string? status, IReadOnlyCollection<string> ids, CancellationToken cancellationToken)
    {
        var query = Filtered(_source(db), search, status);
        if (ids.Count > 0)
        {
            var matches = ids.Distinct().Select(_matchId).OfType<Expression<Func<T, bool>>>().ToList();
            query = matches.Count == 0 ? query.Where(_ => false) : query.Where(Predicates.AnyOf(matches));
        }

        var found = await Sorted(query, null, false).ToListAsync(cancellationToken);
        return [.. found.Select(e => Row(e, record: true))];
    }

    public override async Task<int> PurgeAsync(IAppDbContext db, DateTimeOffset before, CancellationToken cancellationToken)
    {
        if (!Deletable)
        {
            return 0;
        }

        var row = Expression.Parameter(typeof(T), "row");
        var deletedAt = Expression.Property(row, nameof(IAdminDeletable.AdminDeletedAt));
        var due = Expression.Lambda<Func<T, bool>>(
            Expression.LessThan(deletedAt, Expression.Constant(before, typeof(DateTimeOffset?))), row);
        var set = db.Set<T>();
        var found = await set.IgnoreQueryFilters().Where(due).ToListAsync(cancellationToken);
        set.RemoveRange(found);
        return found.Count;
    }

    private async Task<List<T>> Deletables(IQueryable<T> query, IReadOnlyCollection<string> ids, CancellationToken cancellationToken)
    {
        if (!Deletable || !typeof(IAdminDeletable).IsAssignableFrom(typeof(T)))
        {
            throw new InvalidOperationException($"The table {Key} does not declare deletion.");
        }

        var matches = ids.Distinct().Select(_matchId).OfType<Expression<Func<T, bool>>>().ToList();
        return matches.Count == 0 ? [] : await query.AsTracking().Where(Predicates.AnyOf(matches)).ToListAsync(cancellationToken);
    }

    private Dictionary<string, string?> WireValues(T entity) =>
        _fields.ToDictionary(f => f.Key, f => AdminWire.Text(f.ValueOf(entity)));

    public override async Task<int> CountReferencesAsync(IAppDbContext db, string fieldKey, string id, CancellationToken cancellationToken)
    {
        var match = _fields.Single(f => f.Key == fieldKey).RefersTo?.Invoke(id);
        return match is null ? 0 : await _source(db).CountAsync(match, cancellationToken);
    }

    public AdminRow Row(T entity) => Row(entity, record: false);

    public AdminRow Row(T entity, bool record)
    {
        var values = _fields.Where(f => record || !f.OnRecordOnly).ToDictionary(f => f.Key, f => f.ValueOf(entity));
        var id = _idOf(entity);
        var name = _nameFields.Select(k => values.GetValueOrDefault(k) as string).FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? id;
        return new AdminRow(id, name, values);
    }

    private static Func<T, string> Compile(Expression<Func<T, Guid>> id)
    {
        var read = id.Compile();
        return e => read(e).ToString();
    }

    private static Func<string, Expression<Func<T, bool>>?> MatchGuid(Expression<Func<T, Guid>> id) =>
        text => Guid.TryParse(text, out var guid)
            ? Expression.Lambda<Func<T, bool>>(Expression.Equal(id.Body, Expression.Constant(guid)), id.Parameters)
            : null;
}

/// <summary>A value in the text the admin application sends and the audit log keeps.</summary>
public static class AdminWire
{
    public static string? Text(object? value) => value switch
    {
        null => null,
        AdminRef reference => reference.Id,
        bool yes => yes ? "true" : "false",
        DateTimeOffset at => at.ToString("O", System.Globalization.CultureInfo.InvariantCulture),
        IFormattable formattable => formattable.ToString(null, System.Globalization.CultureInfo.InvariantCulture),
        _ => value.ToString(),
    };
}
