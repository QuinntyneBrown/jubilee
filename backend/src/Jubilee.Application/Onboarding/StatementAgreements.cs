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

        // Each listing the daily job paused is live again at once, without new verification (L2-075 AC6).
        foreach (var lapsed in await db.Listings.Where(l => l.OwnerId == request.Subject && l.StatementLapsedAt != null).ToListAsync(cancellationToken))
        {
            lapsed.ResumeAfterStatement();
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// The daily statement-of-faith job (L2-075 AC6, L2-182 AC1): once the 30 days to agree have passed,
/// pauses each live listing of an owner who has not agreed to the current version and e-mails the owner
/// once per listing. Runs once a day however many instances of the worker run. The answer is the
/// number of listings paused, or null when another instance already ran today.
/// </summary>
public sealed record RunStatementAgreementJobCommand : IRequest<int?>
{
    public const string Job = "statement-agreement";

    public static readonly TimeSpan Every = TimeSpan.FromHours(24);
}

public sealed class RunStatementAgreementJobCommandHandler(Jobs.ScheduledJobs jobs, IAppDbContext db, TimeProvider clock, Accounts.AccountSettings settings)
    : IRequestHandler<RunStatementAgreementJobCommand, int?>
{
    public async Task<int?> Handle(RunStatementAgreementJobCommand command, CancellationToken cancellationToken)
    {
        int? paused = null;
        await jobs.RunOnceAsync(
            RunStatementAgreementJobCommand.Job,
            RunStatementAgreementJobCommand.Every,
            async token => paused = await PauseOverdue(token),
            cancellationToken);
        return paused;
    }

    private async Task<int> PauseOverdue(CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        if (!StatementOfFaith.IsOverdue(now))
        {
            return 0;
        }

        // A listing already stamped is paused already, so a repeat sends nothing.
        var live = await db.Listings
            .Where(l => l.OwnerId != null && l.DeletedAt == null && l.Stage == ListingStage.Live && !l.IsPaused && l.StatementLapsedAt == null)
            .ToListAsync(cancellationToken);
        var paused = 0;
        foreach (var owned in live.GroupBy(l => l.OwnerId!))
        {
            if (!StatementOfFaith.IsDue(await StatementAgreements.LatestAgreedAsync(db, owned.Key, cancellationToken)))
            {
                continue;
            }

            var owner = Guid.TryParse(owned.Key, out var ownerId)
                ? await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == ownerId, cancellationToken)
                : null;
            foreach (var listing in owned)
            {
                listing.PauseForStatement(now);
                paused++;
                if (owner is not null)
                {
                    db.OutboxMessages.Add(OutboxMessage.Email(
                        owner.Id,
                        owner.Email,
                        $"{listing.Name} is paused until you agree to the statement of faith",
                        Body(owner.FirstName, listing.Name),
                        now));
                }
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return paused;
    }

    /// <summary>The e-mail of <c>emails/statement-lapsed</c>.</summary>
    private string Body(string firstName, string business) =>
        $"Hi {firstName},\n\n"
        + $"We updated Jubilee’s statement of faith on {Date(StatementOfFaith.UpdatedOn)} and asked every owner to read it and agree within {StatementOfFaith.DaysToAgree} days. "
        + $"We have not had your agreement, so {business} is paused: it is hidden from browse and search. Your requests and your messages stay, and nothing is deleted.\n\n"
        + $"Read the statement and agree, and {business} is live again at once: {settings.PublicBaseUrl.TrimEnd('/')}/my-business\n\n"
        + "Jubilee · Toronto's Christian marketplace\n";

    private static string Date(DateOnly day) => day.ToString("d MMMM yyyy", System.Globalization.CultureInfo.InvariantCulture);
}
