using System.Linq.Expressions;
using System.Reflection;

namespace Jubilee.Application.Admin;

/// <summary>
/// Builds the fields of one table from selector expressions, so that the database applies search, filter and sort
/// to every record of the table, not only the page shown (L2-277 AC6).
/// </summary>
public static class AdminFields<T>
    where T : class
{
    private static readonly MethodInfo ToLower = typeof(string).GetMethod(nameof(string.ToLower), Type.EmptyTypes)!;
    private static readonly MethodInfo Contains = typeof(string).GetMethod(nameof(string.Contains), [typeof(string)])!;
    private static readonly MethodInfo GuidToString = typeof(Guid).GetMethod(nameof(Guid.ToString), Type.EmptyTypes)!;

    /// <summary>The record's ID, a Guid: shown in monospace, found by any part of it.</summary>
    public static AdminField<T> Id(Expression<Func<T, Guid>> selector)
    {
        var read = selector.Compile();
        return new AdminField<T>("id", "ID", AdminFieldType.Id)
        {
            System = true,
            Read = e => read(e).ToString(),
            Search = q => Lambda(
                Expression.Call(Expression.Call(selector.Body, GuidToString), Contains, Expression.Constant(q.ToLowerInvariant())), selector),
            Sort = Sorter(selector),
        };
    }

    /// <summary>A record whose key is text, such as a slug.</summary>
    public static AdminField<T> TextId(Expression<Func<T, string?>> selector) =>
        Text("id", "ID", selector, AdminFieldType.Id);

    public static AdminField<T> Text(string key, string label, Expression<Func<T, string?>> selector, AdminFieldType type = AdminFieldType.Text, bool searchable = true)
    {
        var read = selector.Compile();
        return new AdminField<T>(key, label, type)
        {
            System = type == AdminFieldType.Id,
            Read = e => read(e),
            Search = searchable
                ? q => Lambda(Expression.AndAlso(
                    Expression.NotEqual(selector.Body, Expression.Constant(null, typeof(string))),
                    Expression.Call(Expression.Call(selector.Body, ToLower), Contains, Expression.Constant(q.ToLowerInvariant()))), selector)
                : null,
            Sort = Sorter(selector),
        };
    }

    public static AdminField<T> Number<TValue>(string key, string label, Expression<Func<T, TValue>> selector, AdminFieldType type = AdminFieldType.Number)
    {
        var read = selector.Compile();
        return new AdminField<T>(key, label, type) { Read = e => read(e), Sort = Sorter(selector) };
    }

    /// <summary>An amount in cents, sent as dollars.</summary>
    public static AdminField<T> Money(string key, string label, Expression<Func<T, int?>> cents)
    {
        var read = cents.Compile();
        return new AdminField<T>(key, label, AdminFieldType.Money)
        {
            Read = e => read(e) is { } c ? c / 100m : null,
            Sort = Sorter(cents),
        };
    }

    public static AdminField<T> Bool(string key, string label, Expression<Func<T, bool>> selector)
    {
        var read = selector.Compile();
        return new AdminField<T>(key, label, AdminFieldType.Bool) { Read = e => read(e), Sort = Sorter(selector) };
    }

    public static AdminField<T> When(string key, string label, Expression<Func<T, DateTimeOffset?>> selector, bool system = false)
    {
        var read = selector.Compile();
        return new AdminField<T>(key, label, AdminFieldType.DateTime) { System = system, Read = e => read(e), Sort = Sorter(selector) };
    }

    public static AdminField<T> Day(string key, string label, Expression<Func<T, DateOnly?>> selector)
    {
        var read = selector.Compile();
        return new AdminField<T>(key, label, AdminFieldType.Date) { Read = e => read(e)?.ToString("yyyy-MM-dd"), Sort = Sorter(selector) };
    }

    /// <summary>A reference held as a Guid.</summary>
    public static AdminField<T> Ref(string key, string label, string table, Expression<Func<T, Guid?>> selector)
    {
        var read = selector.Compile();
        return new AdminField<T>(key, label, AdminFieldType.Ref)
        {
            RefTable = table,
            Read = e => read(e) is { } id ? new AdminRef(table, id.ToString()) : null,
            RefersTo = text => Guid.TryParse(text, out var guid)
                ? Lambda(Expression.Equal(selector.Body, Expression.Constant(guid, typeof(Guid?))), selector)
                : null,
            Search = q => Lambda(Expression.AndAlso(
                Expression.NotEqual(selector.Body, Expression.Constant(null, typeof(Guid?))),
                Expression.Call(Expression.Call(Expression.Property(selector.Body, "Value"), GuidToString), Contains, Expression.Constant(q.ToLowerInvariant()))), selector),
        };
    }

    /// <summary>A reference held as text: a member's subject, which is their ID.</summary>
    public static AdminField<T> RefText(string key, string label, string table, Expression<Func<T, string?>> selector)
    {
        var read = selector.Compile();
        return new AdminField<T>(key, label, AdminFieldType.Ref)
        {
            RefTable = table,
            Read = e => read(e) is { Length: > 0 } id ? new AdminRef(table, id) : null,
            RefersTo = text => Lambda(Expression.Equal(selector.Body, Expression.Constant(text, typeof(string))), selector),
            Search = q => Lambda(Expression.AndAlso(
                Expression.NotEqual(selector.Body, Expression.Constant(null, typeof(string))),
                Expression.Call(Expression.Call(selector.Body, ToLower), Contains, Expression.Constant(q.ToLowerInvariant()))), selector),
        };
    }

    /// <summary>A status held as an enumeration, with the word each value shows (L2-277 AC2, AC4).</summary>
    public static AdminField<T> Status<TEnum>(string key, string label, Expression<Func<T, TEnum>> selector, params (TEnum Value, string Word)[] words)
        where TEnum : struct, Enum
    {
        var read = selector.Compile();
        return new AdminField<T>(key, label, AdminFieldType.Status)
        {
            Options = [.. words.Select(w => w.Word)],
            Read = e => words.Where(w => w.Value.Equals(read(e))).Select(w => w.Word).FirstOrDefault() ?? read(e).ToString().ToLowerInvariant(),
            Filter = word => words.Where(w => w.Word == word).Select(w => Lambda(Expression.Equal(selector.Body, Expression.Constant(w.Value)), selector)).FirstOrDefault(),
            Sort = Sorter(selector),
        };
    }

    /// <summary>A nullable enumeration shown as a status; null shows as none.</summary>
    public static AdminField<T> Status<TEnum>(string key, string label, Expression<Func<T, TEnum?>> selector, params (TEnum Value, string Word)[] words)
        where TEnum : struct, Enum
    {
        var read = selector.Compile();
        return new AdminField<T>(key, label, AdminFieldType.Status)
        {
            Options = [.. words.Select(w => w.Word)],
            Read = e => read(e) is { } v ? words.Where(w => w.Value.Equals(v)).Select(w => w.Word).FirstOrDefault() : null,
            Filter = word => words.Where(w => w.Word == word)
                .Select(w => Lambda(Expression.Equal(selector.Body, Expression.Constant(w.Value, typeof(TEnum?))), selector)).FirstOrDefault(),
        };
    }

    /// <summary>A status worked out from several columns: each word is the first rule that holds (L2-277 AC2).</summary>
    public static AdminField<T> Status(string key, string label, params (string Word, Expression<Func<T, bool>> When)[] rules)
    {
        var compiled = rules.Select(r => (r.Word, When: r.When.Compile())).ToList();
        return new AdminField<T>(key, label, AdminFieldType.Status)
        {
            Options = [.. rules.Select(r => r.Word)],
            Read = e => compiled.FirstOrDefault(r => r.When(e)).Word,
            Filter = word =>
            {
                // The word holds when its rule holds and no earlier rule does.
                var index = Array.FindIndex(rules, r => r.Word == word);
                if (index < 0)
                {
                    return null;
                }

                var parameter = Expression.Parameter(typeof(T), "e");
                Expression body = Rebind(rules[index].When, parameter);
                for (var i = 0; i < index; i++)
                {
                    body = Expression.AndAlso(Expression.Not(Rebind(rules[i].When, parameter)), body);
                }

                return Expression.Lambda<Func<T, bool>>(body, parameter);
            },
        };
    }

    private static Expression<Func<T, bool>> Lambda(Expression body, LambdaExpression from) =>
        Expression.Lambda<Func<T, bool>>(body, from.Parameters);

    private static Func<IQueryable<T>, bool, IOrderedQueryable<T>> Sorter<TValue>(Expression<Func<T, TValue>> selector) =>
        (query, descending) => descending ? query.OrderByDescending(selector) : query.OrderBy(selector);

    private static Expression Rebind(LambdaExpression lambda, ParameterExpression parameter) =>
        new Replace(lambda.Parameters[0], parameter).Visit(lambda.Body);

    private sealed class Replace(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) => node == from ? to : base.VisitParameter(node);
    }
}

/// <summary>Combines the predicates of several fields into one, over one parameter.</summary>
internal static class Predicates
{
    public static Expression<Func<T, bool>> AnyOf<T>(IEnumerable<Expression<Func<T, bool>>> predicates)
    {
        var parameter = Expression.Parameter(typeof(T), "e");
        Expression? body = null;
        foreach (var predicate in predicates)
        {
            var rebound = new Replace(predicate.Parameters[0], parameter).Visit(predicate.Body);
            body = body is null ? rebound : Expression.OrElse(body, rebound);
        }

        return Expression.Lambda<Func<T, bool>>(body ?? Expression.Constant(false), parameter);
    }

    private sealed class Replace(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) => node == from ? to : base.VisitParameter(node);
    }
}
