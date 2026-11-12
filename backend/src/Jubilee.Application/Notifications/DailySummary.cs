using System.Globalization;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Jobs;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Notifications;

/// <summary>
/// The daily summary (L2-016 AC6 to AC8, ADR 0053): once it is 7:00 a.m. in Toronto, each member's
/// e-mails held since the last summary become one e-mail. It runs once a day however many instances
/// of the worker tick (L2-182 AC1). The answer is how many summaries were queued, or null when it is
/// not yet 7:00 or today's were already sent.
/// </summary>
public sealed record SendDailySummariesCommand : IRequest<int?>
{
    public const string Job = "daily-summary";

    /// <summary>When the summary goes out, in Toronto.</summary>
    public static readonly TimeOnly At = new(7, 0);
}

public sealed class SendDailySummariesCommandHandler(ScheduledJobs jobs, IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<SendDailySummariesCommand, int?>
{
    public async Task<int?> Handle(SendDailySummariesCommand command, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var due = TorontoClock.At(TorontoClock.Today(now), SendDailySummariesCommand.At);
        if (now < due)
        {
            return null;
        }

        int? queued = null;
        await jobs.RunOnceAtAsync(SendDailySummariesCommand.Job, due, async token => queued = await QueueAsync(now, token), cancellationToken);
        return queued;
    }

    /// <summary>One e-mail per member with something held; the held rows go in the same save.</summary>
    private async Task<int> QueueAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var held = await db.OutboxMessages.Where(m => m.HeldForSummary && m.SentAt == null && m.FailedAt == null).ToListAsync(cancellationToken);
        var ids = held.Select(m => m.MemberId).Distinct().ToList();
        var members = await db.Members.AsNoTracking().Where(m => ids.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
        var day = TorontoClock.Local(now).ToString("dddd d MMMM", CultureInfo.InvariantCulture);
        var queued = 0;
        foreach (var group in held.GroupBy(m => m.MemberId))
        {
            db.OutboxMessages.RemoveRange(group);
            if (group.Key is not { } id || !members.TryGetValue(id, out var member))
            {
                continue;
            }

            // What the member turned off since is left out (AC7).
            var lines = group.Where(m => m.Category is { } category && member.WantsEmail(category))
                .OrderBy(m => m.CreatedAt).Select(m => $"• {m.Subject}").ToList();
            if (lines.Count == 0)
            {
                continue;
            }

            db.OutboxMessages.Add(OutboxMessage.Email(
                member.Id,
                member.Email,
                $"Your Jubilee summary for {day}",
                $"Hi {member.FirstName},\n\nHere is what happened on Jubilee since your last summary.\n\n{string.Join('\n', lines)}\n\nSee what happened: {settings.PublicBaseUrl.TrimEnd('/')}/notifications\n\nJubilee · Toronto's Christian marketplace\n",
                now,
                null,
                null,
                EmailCategories.Summary));
            queued++;
        }

        await db.SaveChangesAsync(cancellationToken);
        return queued;
    }
}
