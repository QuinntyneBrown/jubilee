namespace Jubilee.Domain;

/// <summary>Jubilee keeps its calendar in Toronto.</summary>
public static class TorontoClock
{
    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById("America/Toronto");

    /// <summary>The instant that is <paramref name="time"/> on <paramref name="day"/> in Toronto.</summary>
    public static DateTimeOffset At(DateOnly day, TimeOnly time)
    {
        var local = day.ToDateTime(time);
        return new DateTimeOffset(local, Zone.GetUtcOffset(local));
    }

    /// <summary>The clock time in Toronto of an instant.</summary>
    public static DateTime Local(DateTimeOffset instant) => TimeZoneInfo.ConvertTime(instant, Zone).DateTime;

    public static DateOnly Today(DateTimeOffset now) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, Zone).DateTime);
}
