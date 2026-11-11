namespace Jubilee.Domain;

/// <summary>
/// How quickly a business answers (L2-054): the median first response over the last 30 days. The
/// listing earns the "Replies fast" badge with a median under 24 hours over at least 3 responses.
/// </summary>
public sealed class ResponseTimeStat
{
    public static readonly TimeSpan Window = TimeSpan.FromDays(30);

    public static readonly TimeSpan FastUnder = TimeSpan.FromHours(24);

    public const int MinimumResponses = 3;

    private ResponseTimeStat()
    {
    }

    public Guid ListingId { get; private set; }

    /// <summary>Null when there is no response in the window.</summary>
    public TimeSpan? MedianFirstResponse { get; private set; }

    public int ResponseCount { get; private set; }

    public bool RepliesFast { get; private set; }

    public DateTimeOffset ComputedAt { get; private set; }

    public static ResponseTimeStat Compute(Guid listingId, IReadOnlyList<TimeSpan> responses, DateTimeOffset now)
    {
        var stat = new ResponseTimeStat { ListingId = listingId };
        stat.Set(responses, now);
        return stat;
    }

    public void Set(IReadOnlyList<TimeSpan> responses, DateTimeOffset now)
    {
        var ordered = responses.Order().ToList();
        ResponseCount = ordered.Count;
        MedianFirstResponse = ordered.Count == 0
            ? null
            : ordered.Count % 2 == 1
                ? ordered[ordered.Count / 2]
                : (ordered[(ordered.Count / 2) - 1] + ordered[ordered.Count / 2]) / 2;
        RepliesFast = ResponseCount >= MinimumResponses && MedianFirstResponse < FastUnder;
        ComputedAt = now;
    }
}
