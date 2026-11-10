namespace Jubilee.Domain;

/// <summary>Jubilee keeps its calendar in Toronto.</summary>
public static class TorontoClock
{
    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById("America/Toronto");

    public static DateOnly Today(DateTimeOffset now) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, Zone).DateTime);
}
