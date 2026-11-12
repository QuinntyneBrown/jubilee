using System.Globalization;
using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Launch;

/// <summary><c>jubilee launch list</c> could not run as asked; the message says why.</summary>
public sealed class LaunchCommandException(string message) : Exception(message);

/// <summary>
/// <c>jubilee launch list --kind notifications|businesses</c> (L2-218 AC4): the submissions as
/// comma-separated lines, oldest first, with a header. Each reading is written to the audit log
/// with its kind and count, and no personal data (L2-150 AC4).
/// </summary>
public sealed record ListLaunchSubmissionsQuery(string? Kind) : IRequest<IReadOnlyList<string>>;

public sealed class ListLaunchSubmissionsQueryHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<ListLaunchSubmissionsQuery, IReadOnlyList<string>>
{
    public const string Notifications = "notifications";
    public const string Businesses = "businesses";

    public async Task<IReadOnlyList<string>> Handle(ListLaunchSubmissionsQuery request, CancellationToken cancellationToken)
    {
        var kind = request.Kind?.Trim().ToLowerInvariant();
        List<string> lines;
        switch (kind)
        {
            case Notifications:
                var subscribers = await db.LaunchSubscribers.AsNoTracking().ToListAsync(cancellationToken);
                lines = ["email,firstName,consentedAt,consentMethod"];
                lines.AddRange(subscribers.OrderBy(s => s.CreatedAt).Select(s => Line(s.Email, s.FirstName, Time(s.ConsentedAt), s.ConsentMethod.ToString())));
                break;
            case Businesses:
                var sent = await db.BusinessPreRegistrations.AsNoTracking().ToListAsync(cancellationToken);
                lines = ["businessName,contactName,email,phone,category,area,website,description,consentedAt,consentMethod"];
                lines.AddRange(sent.OrderBy(r => r.CreatedAt).Select(r => Line(
                    r.BusinessName, r.ContactName, r.Email, r.Phone, Category.Find(r.CategorySlug)?.Name ?? r.CategorySlug, r.Area, r.Website,
                    r.Description, Time(r.ConsentedAt), r.ConsentMethod.ToString())));
                break;
            default:
                throw new LaunchCommandException("Kind must be notifications or businesses.");
        }

        var count = lines.Count - 1;
        db.AuditRecords.Add(AuditRecord.Make(
            "cli", "jubilee launch list", "launch.list", kind, "all", null, $"{count} {(count == 1 ? "row" : "rows")}", null, clock.GetUtcNow()));
        await db.SaveChangesAsync(cancellationToken);
        return lines;
    }

    private static string Time(DateTimeOffset at) => at.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);

    private static string Line(params string?[] values) => string.Join(',', values.Select(Value));

    /// <summary>
    /// One value of a line (RFC 4180): quoted when it holds a comma, a quote or a line break. A value
    /// that a spreadsheet would run as a formula is led by an apostrophe, because strangers typed these.
    /// </summary>
    private static string Value(string? value)
    {
        var text = value ?? string.Empty;
        if (text.Length > 0 && text[0] is '=' or '+' or '-' or '@')
        {
            text = $"'{text}";
        }

        return text.IndexOfAny([',', '"', '\n', '\r']) >= 0 ? $"\"{text.Replace("\"", "\"\"")}\"" : text;
    }
}

public sealed record LaunchPurgeResult(int Subscribers, int PreRegistrations);

/// <summary>The retention rule of L2-148 AC6: sign-ups and pre-registrations go 12 months after they were sent.</summary>
public sealed record PurgeLaunchDataCommand : IRequest<LaunchPurgeResult>;

public sealed class PurgeLaunchDataCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<PurgeLaunchDataCommand, LaunchPurgeResult>
{
    public async Task<LaunchPurgeResult> Handle(PurgeLaunchDataCommand request, CancellationToken cancellationToken)
    {
        var before = clock.GetUtcNow() - LaunchSubscriber.Retention;
        var subscribers = await db.LaunchSubscribers.Where(s => s.CreatedAt <= before).ToListAsync(cancellationToken);
        var sent = await db.BusinessPreRegistrations.Where(r => r.CreatedAt <= before).ToListAsync(cancellationToken);
        db.LaunchSubscribers.RemoveRange(subscribers);
        db.BusinessPreRegistrations.RemoveRange(sent);
        await db.SaveChangesAsync(cancellationToken);
        return new LaunchPurgeResult(subscribers.Count, sent.Count);
    }
}
