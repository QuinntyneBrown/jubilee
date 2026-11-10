namespace Jubilee.Domain;

/// <summary>Main offer of a listing; it picks the layout of the listing page (L2-033, L2-034).</summary>
public enum ListingKind
{
    Services = 0,
    Shop = 1,
}

/// <summary>
/// What the owner tells members about the business on its listing page. Every value is optional;
/// the page leaves out what the owner has not given.
/// </summary>
/// <param name="OwnerName">The owner's name with credentials, for example "Trevor Chew, CKA®".</param>
/// <param name="Credentials">Credential tags, shown as wrapping tags.</param>
/// <param name="Delivery">Shops: how products reach the buyer.</param>
/// <param name="MadeToOrder">Shops: how long made-to-order work takes.</param>
public sealed record ListingProfile(
    string? OwnerName,
    IReadOnlyList<string> Credentials,
    string? About,
    string? Where,
    string? Hours,
    string? Languages,
    string? Delivery,
    string? MadeToOrder)
{
    public static readonly ListingProfile Empty = new(null, [], null, null, null, null, null, null);
}

/// <summary>
/// The "Replies" detail (L2-033 AC5), from the median first-reply time over the last 90 days:
/// under 6 hours, under 24 hours, otherwise days. <see cref="None"/> with fewer than 3 replies.
/// </summary>
public enum ReplyTimeBand
{
    None = 0,
    FewHours = 1,
    Day = 2,
    FewDays = 3,
}

public static class ReplyTimeBands
{
    /// <summary>The band of a median first-reply time; null means too few replies to say.</summary>
    public static ReplyTimeBand From(int? medianMinutes) => medianMinutes switch
    {
        null => ReplyTimeBand.None,
        < 6 * 60 => ReplyTimeBand.FewHours,
        < 24 * 60 => ReplyTimeBand.Day,
        _ => ReplyTimeBand.FewDays,
    };
}
