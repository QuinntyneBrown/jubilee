namespace Jubilee.Domain;

/// <summary>The names the enumerations carry in URLs and JSON.</summary>
public static class WireValues
{
    private static readonly (OfferFilter Value, string Wire)[] OfferPairs =
    [
        (OfferFilter.FreeQuote, "free-quote"),
        (OfferFilter.EmergencyCalls, "emergency-calls"),
        (OfferFilter.OpenSaturdays, "open-saturdays"),
    ];

    private static readonly (AreaServed Value, string Wire)[] AreaPairs =
    [
        (AreaServed.Scarborough, "scarborough"),
        (AreaServed.NorthYork, "north-york"),
        (AreaServed.EastYork, "east-york"),
        (AreaServed.Etobicoke, "etobicoke"),
        (AreaServed.Downtown, "downtown"),
    ];

    private static readonly (ListingSort Value, string Wire)[] SortPairs =
    [
        (ListingSort.Recommended, "recommended"),
        (ListingSort.Newest, "newest"),
        (ListingSort.NameAscending, "name"),
    ];

    public static string Of(OfferFilter value) => OfferPairs.Single(p => p.Value == value).Wire;

    public static string Of(AreaServed value) => AreaPairs.Single(p => p.Value == value).Wire;

    public static string Of(ListingSort value) => SortPairs.Single(p => p.Value == value).Wire;

    public static string Of(TileTint value) => value.ToString().ToLowerInvariant();

    public static string Of(TileIcon value) => value.ToString().ToLowerInvariant();

    /// <summary>"draft", "pending-reference", "ready-to-review", "needs-decision", "changes-requested" or "live".</summary>
    public static string Of(ListingStage value) => value switch
    {
        ListingStage.PendingReference => "pending-reference",
        ListingStage.ReadyToReview => "ready-to-review",
        ListingStage.NeedsDecision => "needs-decision",
        ListingStage.ChangesRequested => "changes-requested",
        _ => value.ToString().ToLowerInvariant(),
    };

    public static string Of(ListingKind value) => value switch
    {
        ListingKind.Shop => "shop",
        ListingKind.Space => "space",
        _ => "services",
    };

    private static readonly (SpaceTerm Value, string Wire)[] TermPairs =
    [
        (SpaceTerm.ShortStay, "short-stay"),
        (SpaceTerm.LongTerm, "long-term"),
        (SpaceTerm.Room, "room"),
        (SpaceTerm.Roommate, "roommate"),
    ];

    /// <summary>"short-stay", "long-term", "room" or "roommate" (L2-188 AC1).</summary>
    public static string Of(SpaceTerm value) => TermPairs.Single(p => p.Value == value).Wire;

    /// <summary>The term of a wire value; null for anything else.</summary>
    public static SpaceTerm? ParseTerm(string? wire) =>
        TermPairs.Where(p => p.Wire == wire).Select(p => (SpaceTerm?)p.Value).FirstOrDefault();

    public static string Of(ServiceAction value) => value.ToString().ToLowerInvariant();

    public static string Of(ServicePriceKind value) => value.ToString().ToLowerInvariant();

    /// <summary>"few-hours", "day" or "few-days"; null for <see cref="ReplyTimeBand.None"/>.</summary>
    public static string? Of(ReplyTimeBand value) => value switch
    {
        ReplyTimeBand.FewHours => "few-hours",
        ReplyTimeBand.Day => "day",
        ReplyTimeBand.FewDays => "few-days",
        _ => null,
    };

    public static OfferFilter? ParseOffer(string wire) => Find(OfferPairs, wire);

    public static AreaServed? ParseArea(string wire) => Find(AreaPairs, wire);

    public static ListingSort? ParseSort(string wire) => Find(SortPairs, wire);

    private static T? Find<T>((T Value, string Wire)[] pairs, string wire)
        where T : struct
    {
        foreach (var pair in pairs)
        {
            if (string.Equals(pair.Wire, wire, StringComparison.OrdinalIgnoreCase))
            {
                return pair.Value;
            }
        }

        return null;
    }
}
