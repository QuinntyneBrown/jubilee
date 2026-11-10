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
