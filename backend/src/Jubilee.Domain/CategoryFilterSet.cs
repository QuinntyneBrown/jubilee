namespace Jubilee.Domain;

/// <summary>
/// The filters of a category query, parsed from the untrusted <c>offers</c> and <c>areas</c>
/// query values. Values outside the allowed sets are dropped (L2-024 AC6). Values within one
/// group combine with OR; the two groups combine with AND (L2-024 AC3).
/// </summary>
public sealed class CategoryFilterSet
{
    public const string OffersGroup = "offers";
    public const string AreasGroup = "areas";

    private CategoryFilterSet(IReadOnlyList<OfferFilter> offers, IReadOnlyList<AreaServed> areas)
    {
        Offers = offers;
        Areas = areas;
    }

    public static CategoryFilterSet Empty { get; } = new([], []);

    /// <summary>The applied offer filters, in request order.</summary>
    public IReadOnlyList<OfferFilter> Offers { get; }

    /// <summary>The applied area filters, in request order.</summary>
    public IReadOnlyList<AreaServed> Areas { get; }

    public IReadOnlyList<string> OfferValues => [.. Offers.Select(WireValues.Of)];

    public IReadOnlyList<string> AreaValues => [.. Areas.Select(WireValues.Of)];

    public bool IsEmpty => Offers.Count == 0 && Areas.Count == 0;

    public static CategoryFilterSet Parse(string? offers, string? areas) =>
        new(ParseGroup(offers, WireValues.ParseOffer), ParseGroup(areas, WireValues.ParseArea));

    public IQueryable<Listing> Apply(IQueryable<Listing> listings)
    {
        if (Offers.Count > 0)
        {
            var anyOffer = Offers.Aggregate(OfferFilter.None, (mask, offer) => mask | offer);
            listings = listings.Where(l => (l.Offers & anyOffer) != 0);
        }

        if (Areas.Count > 0)
        {
            var anyArea = Areas.Aggregate(AreaServed.None, (mask, area) => mask | area);
            listings = listings.Where(l => (l.AreasServed & anyArea) != 0);
        }

        return listings;
    }

    /// <summary>
    /// The nearby combinations: for each applied filter, the set that remains when that one
    /// filter is removed (L2-024 AC4).
    /// </summary>
    public IEnumerable<(string Group, string Value, CategoryFilterSet Remaining)> WithoutOneFilter()
    {
        foreach (var offer in Offers)
        {
            yield return (OffersGroup, WireValues.Of(offer), new([.. Offers.Where(o => o != offer)], Areas));
        }

        foreach (var area in Areas)
        {
            yield return (AreasGroup, WireValues.Of(area), new(Offers, [.. Areas.Where(a => a != area)]));
        }
    }

    private static List<T> ParseGroup<T>(string? raw, Func<string, T?> parse)
        where T : struct
    {
        var values = new List<T>();
        foreach (var part in (raw ?? string.Empty).Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            if (parse(part) is { } value && !values.Contains(value))
            {
                values.Add(value);
            }
        }

        return values;
    }
}
