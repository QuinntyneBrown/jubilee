using Jubilee.Application.Abstractions;
using Jubilee.Application.Requests;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Jobs;

/// <summary>
/// Runs scheduled work at most once per occurrence of its schedule across instances and records its
/// success (L2-182 AC1; ADR 0050). An instance claims the occurrence by inserting its
/// <see cref="JobRun"/>; one that finds the row, or is refused by its key, does nothing.
/// </summary>
public sealed class ScheduledJobs(IAppDbContext db, TimeProvider clock)
{
    /// <summary>
    /// Does <paramref name="work"/> unless this occurrence of <paramref name="job"/> was already claimed.
    /// True when the work ran and its success was recorded. Work that throws leaves the run without a
    /// success, and the job runs again at its next occurrence.
    /// </summary>
    public Task<bool> RunOnceAsync(string job, TimeSpan every, Func<CancellationToken, Task> work, CancellationToken cancellationToken) =>
        RunOnceAtAsync(job, JobRun.OccurrenceOf(clock.GetUtcNow(), every), work, cancellationToken);

    /// <summary>
    /// The same for a job whose occurrences are not a fixed length apart in UTC, such as one that runs at
    /// 7:00 a.m. in Toronto (L2-182 AC3): the caller names the occurrence, the instant the run is for.
    /// </summary>
    public async Task<bool> RunOnceAtAsync(string job, DateTimeOffset occurrence, Func<CancellationToken, Task> work, CancellationToken cancellationToken)
    {
        occurrence = occurrence.ToUniversalTime();
        if (await db.JobRuns.AsNoTracking().AnyAsync(r => r.Job == job && r.Occurrence == occurrence, cancellationToken))
        {
            return false;
        }

        var run = JobRun.Claim(job, occurrence, clock.GetUtcNow());
        db.JobRuns.Add(run);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Another instance claimed the occurrence between the look and the insert: the key kept its row.
            db.JobRuns.Remove(run);
            return false;
        }

        await work(cancellationToken);
        run.Succeed(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    /// <summary>When <paramref name="job"/> last ended well; null when it never has.</summary>
    public async Task<DateTimeOffset?> LastSuccessAsync(string job, CancellationToken cancellationToken) =>
        (await db.JobRuns.AsNoTracking().Where(r => r.Job == job && r.SucceededAt != null).ToListAsync(cancellationToken))
        .Max(r => r.SucceededAt);
}

/// <summary>
/// The hourly response-time job (L2-054 AC2, L2-182 AC1): recomputes every live listing's "Replies
/// fast" badge, once per hour however many instances of the worker run. The answer is the number of
/// listings recomputed, or null when another instance already ran this hour.
/// </summary>
public sealed record RunResponseTimeBadgeJobCommand : IRequest<int?>
{
    public const string Job = "response-time-badges";

    public static readonly TimeSpan Every = TimeSpan.FromHours(1);
}

public sealed class RunResponseTimeBadgeJobCommandHandler(ScheduledJobs jobs, ISender sender) : IRequestHandler<RunResponseTimeBadgeJobCommand, int?>
{
    public async Task<int?> Handle(RunResponseTimeBadgeJobCommand command, CancellationToken cancellationToken)
    {
        int? recomputed = null;
        await jobs.RunOnceAsync(
            RunResponseTimeBadgeJobCommand.Job,
            RunResponseTimeBadgeJobCommand.Every,
            async token => recomputed = await sender.Send(new RecomputeResponseTimesCommand(), token),
            cancellationToken);
        return recomputed;
    }
}
