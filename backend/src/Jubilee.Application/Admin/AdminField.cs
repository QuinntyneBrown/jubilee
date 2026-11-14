using System.Linq.Expressions;

namespace Jubilee.Application.Admin;

/// <summary>How a field's value is drawn and edited in the admin application (L2-276 AC3, L2-283 AC1).</summary>
public enum AdminFieldType
{
    Id,
    Text,
    Email,
    Mono,
    Json,
    Long,
    Status,
    Bool,
    Number,
    Money,
    Date,
    DateTime,
    Ref,
    Url,
}

/// <summary>A reference to another record, as the client draws it (ADR 0074).</summary>
public sealed record AdminRef(string Table, string Id);

/// <summary>
/// One field of a table (ADR 0074): its key, label, type, and how the database searches, filters and sorts it. The
/// value is read from a loaded entity in its wire form: a string, a number, a bool, a date, a status word, an
/// <see cref="AdminRef"/> or null.
/// </summary>
public abstract class AdminField
{
    protected AdminField(string key, string label, AdminFieldType type)
    {
        Key = key;
        Label = label;
        Type = type;
    }

    public string Key { get; }

    public string Label { get; }

    public AdminFieldType Type { get; }

    /// <summary>ID and timestamps: shown in the record's system line, never edited (L2-282 AC3).</summary>
    public bool System { get; init; }

    /// <summary>The table a reference points at.</summary>
    public string? RefTable { get; init; }

    /// <summary>A status's words, in the order the chips show them (L2-277 AC2).</summary>
    public IReadOnlyList<string>? Options { get; init; }

    /// <summary>Shown on the record only, never in a row or an export: a private message's text (L2-284 AC3).</summary>
    public bool OnRecordOnly { get; internal set; }

    public abstract bool Searchable { get; }

    public abstract bool Sortable { get; }

    /// <summary>True when a binding lets a staff member change it (L2-283 AC1, ADR 0074).</summary>
    public abstract bool Editable { get; }
}

/// <summary>A field over one entity type.</summary>
public sealed class AdminField<T> : AdminField
    where T : class
{
    internal AdminField(string key, string label, AdminFieldType type)
        : base(key, label, type)
    {
    }

    internal Func<T, object?> Read { get; init; } = _ => null;

    internal Func<string, Expression<Func<T, bool>>>? Search { get; init; }

    internal Func<string, Expression<Func<T, bool>>?>? Filter { get; init; }

    internal Func<IQueryable<T>, bool, IOrderedQueryable<T>>? Sort { get; init; }

    /// <summary>For a reference: the records whose field holds this ID (L2-282 AC4).</summary>
    internal Func<string, Expression<Func<T, bool>>?>? RefersTo { get; init; }

    /// <summary>Applies a new value with the owning feature's rule; returns an error code, or null when applied.</summary>
    internal Func<T, string?, AdminChange, string?>? Edit { get; private set; }

    public override bool Searchable => Search is not null;

    public override bool Sortable => Sort is not null;

    public override bool Editable => Edit is not null;

    public object? ValueOf(T entity) => Read(entity);

    /// <summary>
    /// Binds the field to the rule of the feature that owns it (L2-283 AC1, ADR 0074): the binding applies the new
    /// value, in its wire form, and returns an error code when the rule refuses it.
    /// </summary>
    public AdminField<T> EditWith(Func<T, string?, AdminChange, string?> edit)
    {
        Edit = edit;
        return this;
    }

    /// <summary>Applies a new value through the binding; returns an error code, or null when applied.</summary>
    public string? Apply(T entity, string? value, AdminChange change) =>
        Edit is null ? "NOT_EDITABLE" : Edit(entity, value, change);

    /// <summary>Keeps the field out of rows and exports (L2-284 AC3).</summary>
    public AdminField<T> RecordOnly()
    {
        OnRecordOnly = true;
        return this;
    }
}

/// <summary>What a binding needs to apply a change: who makes it and when.</summary>
public sealed record AdminChange(StaffViewer Staff, DateTimeOffset Now);
