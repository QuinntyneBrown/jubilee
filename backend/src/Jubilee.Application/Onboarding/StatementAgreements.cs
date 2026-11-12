using System.Globalization;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Onboarding;

/// <summary>
/// The agreement an owner owes to an updated statement of faith, as <c>GET /api/session</c> carries it
/// (L2-075 AC3): the version, its date, the last day to agree, whether that day has passed, and the
/// business the agreement concerns.
/// </summary>
public sealed record StatementDueDto(string Version, string UpdatedOn, string AgreeBy, bool Overdue, string Business);

/// <summary>The newest version of the statement of faith an owner agreed to, from their submissions and their agreements.</summary>
public static class StatementAgreements
{
    public static async Task<string?> LatestAgreedAsync(IAppDbContext db, string subject, CancellationToken cancellationToken)
    {
        var versions = await db.ListingSubmissions.AsNoTracking().Where(s => s.OwnerSubject == subject).Select(s => s.StatementVersion)
            .Concat(db.StatementAgreements.AsNoTracking().Where(a => a.OwnerSubject == subject).Select(a => a.Version))
            .ToListAsync(cancellationToken);
        return versions.Count == 0 ? null : versions.Max(StringComparer.Ordinal);
    }

    public static string Day(DateOnly day) => day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}

/// <summary>What the session says of the statement of faith: null unless the caller owes an agreement (L2-075 AC3).</summary>
public sealed record GetStatementDueQuery(string Subject) : IRequest<StatementDueDto?>;

public sealed class GetStatementDueQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<GetStatementDueQuery, StatementDueDto?>
{
    public async Task<StatementDueDto?> Handle(GetStatementDueQuery request, CancellationToken cancellationToken)
    {
        // A member with no agreement on record has listed nothing and is not asked.
        if (!StatementOfFaith.IsDue(await StatementAgreements.LatestAgreedAsync(db, request.Subject, cancellationToken)))
        {
            return null;
        }

        var listing = await OwnerWorkspace.Workspace.Find(db, request.Subject, false, cancellationToken);
        if (listing is null)
        {
            return null;
        }

        return new StatementDueDto(
            StatementOfFaith.Version,
            StatementAgreements.Day(StatementOfFaith.UpdatedOn),
            StatementAgreements.Day(StatementOfFaith.AgreeBy),
            StatementOfFaith.IsOverdue(clock.GetUtcNow()),
            listing.Name);
    }
}

/// <summary>
/// "I agree" in the dialog "The statement of faith has been updated" (L2-075 AC4). The version must be
/// the current one, so nobody agrees to a text they were not shown; a repeat records nothing more.
/// </summary>
public sealed record AgreeToStatementCommand(string Subject, string? Version) : IRequest;

public sealed class AgreeToStatementCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<AgreeToStatementCommand>
{
    public async Task Handle(AgreeToStatementCommand request, CancellationToken cancellationToken)
    {
        if (request.Version != StatementOfFaith.Version)
        {
            throw new ConflictException(
                "STATEMENT_VERSION", "The statement of faith has changed since this page loaded. Read it again and agree to the current version.");
        }

        if (!await db.StatementAgreements.AnyAsync(a => a.OwnerSubject == request.Subject && a.Version == request.Version, cancellationToken))
        {
            db.StatementAgreements.Add(StatementAgreement.Record(request.Subject, request.Version, clock.GetUtcNow()));
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
