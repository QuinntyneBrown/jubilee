namespace Jubilee.Domain;

/// <summary>
/// A listing the verification team chose as "Featured this week": shown from
/// <see cref="StartsOn"/> for <see cref="DurationDays"/> days, counted in America/Toronto (L2-106).
/// </summary>
public sealed class FeaturedSlot
{
    public const int DurationDays = 7;

    private FeaturedSlot()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public int Position { get; private set; }

    public DateOnly StartsOn { get; private set; }

    public static FeaturedSlot Create(Guid listingId, int position, DateOnly startsOn) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        Position = position,
        StartsOn = startsOn,
    };

    public void RestartOn(DateOnly startsOn) => StartsOn = startsOn;

    public bool IsCurrentOn(DateOnly today) => StartsOn <= today && today < StartsOn.AddDays(DurationDays);
}
