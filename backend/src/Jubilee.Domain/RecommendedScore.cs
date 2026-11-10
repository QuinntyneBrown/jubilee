namespace Jubilee.Domain;

/// <summary>
/// The documented score behind the "Recommended" order of a category (L2-025 AC3).
/// <para>
/// <c>score = 0.5 × completeness + 0.3 × responsiveness + 0.2 × recency</c>, each input in [0, 1]:
/// </para>
/// <list type="bullet">
/// <item><description><b>completeness</b> — the share of {tagline, highlight, at least one offer,
/// at least one area served} that the listing has filled in.</description></item>
/// <item><description><b>responsiveness</b> — <c>clamp(1 − medianResponseMinutes / 1440, 0, 1)</c>;
/// 0.5 while the listing has no measured response time.</description></item>
/// <item><description><b>recency</b> — <c>clamp(1 − daysSinceApproved / 365, 0, 1)</c>; 0 for a
/// listing that was never approved.</description></item>
/// </list>
/// <para>No input represents payment: paid placement does not exist. Ties are broken by name.</para>
/// </summary>
public static class RecommendedScore
{
    public const double CompletenessWeight = 0.5;
    public const double ResponsivenessWeight = 0.3;
    public const double RecencyWeight = 0.2;

    public static double Compute(
        string? tagline,
        string? highlight,
        OfferFilter offers,
        AreaServed areasServed,
        int? medianResponseMinutes,
        DateTimeOffset? approvedAt,
        DateTimeOffset now)
    {
        var filled = new[]
        {
            !string.IsNullOrWhiteSpace(tagline),
            !string.IsNullOrWhiteSpace(highlight),
            offers != OfferFilter.None,
            areasServed != AreaServed.None,
        };
        var completeness = filled.Count(f => f) / (double)filled.Length;

        var responsiveness = medianResponseMinutes is { } minutes
            ? Math.Clamp(1 - (minutes / 1440d), 0, 1)
            : 0.5;

        var recency = approvedAt is { } approved
            ? Math.Clamp(1 - ((now - approved).TotalDays / 365d), 0, 1)
            : 0;

        return (CompletenessWeight * completeness)
            + (ResponsivenessWeight * responsiveness)
            + (RecencyWeight * recency);
    }
}
