namespace Jubilee.Domain;

/// <summary>
/// One run of a scheduled job for one occurrence of its schedule (L2-182 AC1). The key is the job and
/// the occurrence, so of the instances that reach the same occurrence only one can record the run:
/// that one does the work, the others do nothing. <see cref="SucceededAt"/> is set when the work
/// ended well; the job's last success is its newest one.
/// </summary>
public sealed class JobRun
{
    private JobRun()
    {
    }

    /// <summary>The name of the job, such as <c>response-time-badges</c>.</summary>
    public string Job { get; private set; } = string.Empty;

    /// <summary>The start of the period the run is for, in UTC: the hour, for an hourly job.</summary>
    public DateTimeOffset Occurrence { get; private set; }

    public DateTimeOffset ClaimedAt { get; private set; }

    /// <summary>Null while the work runs, and for good when it failed.</summary>
    public DateTimeOffset? SucceededAt { get; private set; }

    /// <summary>The start of the period of <paramref name="every"/> that <paramref name="now"/> falls in, counted from the epoch of ticks in UTC.</summary>
    public static DateTimeOffset OccurrenceOf(DateTimeOffset now, TimeSpan every) =>
        new(now.UtcTicks - (now.UtcTicks % every.Ticks), TimeSpan.Zero);

    public static JobRun Claim(string job, DateTimeOffset occurrence, DateTimeOffset now) =>
        new() { Job = job, Occurrence = occurrence, ClaimedAt = now };

    public void Succeed(DateTimeOffset now) => SucceededAt = now;
}
