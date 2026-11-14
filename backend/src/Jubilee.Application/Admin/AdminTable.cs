using System.Linq.Expressions;
using Jubilee.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Admin;

/// <summary>One record of a table as the admin application reads it: its ID, its name (L2-282 AC2) and its values.</summary>
public sealed record AdminRow(string Id, string Name, IReadOnlyDictionary<string, object?> Values);

/// <summary>What a table screen asks for (L2-277, L2-278).</summary>
public sealed record AdminRowsRequest(string? Search, string? Status, string? Sort, bool Descending, int Page, int Size);

/// <summary>
/// The description of one of Jubilee's tables in the admin application (ADR 0074): its key, names, group, sentence,
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

    /// <summary>A table that declares deletion (ADR 0074, L2-281).</summary>
    public bool Deletable { get; init; }

    public virtual bool Creatable => false;

    public bool Editable => Fields.Any(f => f.Editable);

    public abstract Task<int> CountAsync(IAppDbContext db, CancellationToken cancellationToken);

    public abstract Task<(IReadOnlyList<AdminRow> Rows, int Total)> PageAsync(IAppDbContext db, AdminRowsRequest request, CancellationToken cancellationToken);

    public abstract Task<AdminRow?> FindAsync(IAppDbContext db, string id, CancellationToken cancellationToken);

    /// <summary>The names of the records with these IDs; an ID that is missing or deleted is left out.</summary>
    public abstract Task<IReadOnlyDictionary<string, string>> NamesAsync(IAppDbContext db, IReadOnlyCollection<string> ids, CancellationToken cancellationToken);

    /// <summary>Records whose ID or name contains the text, for the jump palette (L2-273 AC3).</summary>
    public abstract Task<IReadOnlyList<AdminRow>> MatchAsync(IAppDbContext db, string text, int take, CancellationToken cancellationToken);

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
