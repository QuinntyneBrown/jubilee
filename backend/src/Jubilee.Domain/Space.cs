namespace Jubilee.Domain;

/// <summary>How a space is rented (L2-197 AC1).</summary>
public enum SpaceTerm
{
    ShortStay = 0,
    LongTerm = 1,
    Room = 2,
    Roommate = 3,
}

/// <summary>The rules each term carries: price unit, minimum-stay choices, household and call to action (ADR 0042).</summary>
public static class SpaceTerms
{
    public const int MaxRent = 50_000;

    public const int MaxFacts = 4;

    public const int MaxRules = 8;

    public const int MaxLineLength = 60;

    /// <summary>The four terms in display order.</summary>
    public static IReadOnlyList<SpaceTerm> All { get; } = [SpaceTerm.ShortStay, SpaceTerm.LongTerm, SpaceTerm.Room, SpaceTerm.Roommate];

    /// <summary>"The space" choices (L2-199 AC3).</summary>
    public static IReadOnlyList<string> Places { get; } =
        ["Private room", "Basement apartment", "Guest suite", "Entire house", "Condo", "Event hall"];

    /// <summary>"What's included" chips (L2-199 AC3).</summary>
    public static IReadOnlyList<string> Inclusions { get; } =
        ["Utilities", "Wi-Fi", "Laundry", "Furnished", "Parking", "Private bath", "Kitchen use", "Pets OK"];

    public static bool IsNightly(SpaceTerm term) => term == SpaceTerm.ShortStay;

    /// <summary>"night" for a Short stay, otherwise "month".</summary>
    public static string Per(SpaceTerm term) => IsNightly(term) ? "night" : "month";

    /// <summary>Nights for a Short stay, months otherwise (L2-199 AC2).</summary>
    public static IReadOnlyList<int> MinimumStayChoices(SpaceTerm term) => IsNightly(term) ? [1, 2, 3, 7] : [1, 4, 6, 12];

    /// <summary>"2 nights", "1 week", "Month to month", "4 months" or "12-month lease".</summary>
    public static string MinimumStayLabel(SpaceTerm term, int count) => IsNightly(term)
        ? count switch
        {
            1 => "1 night",
            7 => "1 week",
            _ => $"{count} nights",
        }
        : count switch
        {
            1 => "Month to month",
            12 => "12-month lease",
            _ => $"{count} months",
        };

    public static bool AsksForHousehold(SpaceTerm term) => term is SpaceTerm.Room or SpaceTerm.Roommate;

    /// <summary>"Request to book", "Request a viewing" or "Meet the household" (L2-206 AC1).</summary>
    public static string CallToAction(SpaceTerm term) => term switch
    {
        SpaceTerm.ShortStay => "Request to book",
        SpaceTerm.Roommate => "Meet the household",
        _ => "Request a viewing",
    };

    /// <summary>The "Staying" choices of a monthly request, in months (L2-206 AC4).</summary>
    public static IReadOnlyList<int> StayChoices { get; } = [1, 4, 6, 8, 12, 18];
}

/// <summary>
/// When a renter may read a space's exact address (L2-208): their own space request, once the owner
/// confirmed it, and while it stays confirmed or completed. Computed on each read, never copied.
/// </summary>
public static class SpaceAddressRelease
{
    public static bool IsReleased(Request request) =>
        request.Kind == RequestKind.Space && request.Status is RequestStatus.Confirmed or RequestStatus.Completed;
}

/// <summary>
/// The rental details of a space (L2-199). Owned by its listing or draft. The exact address is
/// private: only the owner and the renter whose request the owner accepted ever read it (L2-208).
/// </summary>
public sealed class SpaceDetails
{
    private SpaceDetails()
    {
    }

    public SpaceTerm Term { get; private set; }

    /// <summary>Whole Canadian dollars per night (Short stay) or per month.</summary>
    public int Rent { get; private set; }

    /// <summary>"Now", "Mar 1" or, for a Short stay, "Most weekends".</summary>
    public string Available { get; private set; } = string.Empty;

    /// <summary>Nights for a Short stay, months otherwise.</summary>
    public int MinimumStay { get; private set; }

    public string Neighbourhood { get; private set; } = string.Empty;

    public string Address { get; private set; } = string.Empty;

    /// <summary>"The space", one of <see cref="SpaceTerms.Places"/>.</summary>
    public string Place { get; private set; } = string.Empty;

    public List<string> Facts { get; private set; } = [];

    public List<string> Included { get; private set; } = [];

    /// <summary>Who lives there; Room and Roommate only.</summary>
    public string? Household { get; private set; }

    public List<string> Rules { get; private set; } = [];

    public string MinimumStayLabel => SpaceTerms.MinimumStayLabel(Term, MinimumStay);

    /// <summary>Keeps what was given, cut to the lengths and counts the form allows, without validating it.</summary>
    public static SpaceDetails Create(
        SpaceTerm term,
        int rent,
        string? available,
        int minimumStay,
        string? neighbourhood,
        string? address,
        string? place,
        IEnumerable<string>? facts,
        IEnumerable<string>? included,
        string? household,
        IEnumerable<string>? rules) => new()
        {
            Term = term,
            Rent = Math.Max(0, rent),
            Available = Cut(available, 40),
            MinimumStay = SpaceTerms.MinimumStayChoices(term).Contains(minimumStay) ? minimumStay : SpaceTerms.MinimumStayChoices(term)[0],
            Neighbourhood = Cut(neighbourhood, 60),
            Address = Cut(address, 200),
            Place = SpaceTerms.Places.Contains(place ?? string.Empty) ? place! : string.Empty,
            Facts = Lines(facts, SpaceTerms.MaxFacts),
            Included = [.. SpaceTerms.Inclusions.Where(i => included?.Contains(i) == true)],
            Household = SpaceTerms.AsksForHousehold(term) && !string.IsNullOrWhiteSpace(household) ? Cut(household, 1000) : null,
            Rules = Lines(rules, SpaceTerms.MaxRules),
        };

    private static List<string> Lines(IEnumerable<string>? lines, int max) =>
        [.. (lines ?? []).Select(l => Cut(l, SpaceTerms.MaxLineLength)).Where(l => l.Length > 0).Take(max)];

    private static string Cut(string? value, int max)
    {
        var trimmed = value?.Trim() ?? string.Empty;
        return trimmed.Length > max ? trimmed[..max] : trimmed;
    }
}
