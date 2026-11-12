namespace Jubilee.Domain;

/// <summary>
/// A product or service an owner added while listing a business (L2-073), with what the product
/// editor and the service editor ask. Like the draft it belongs to, it is kept as typed; submitting
/// turns it into a <see cref="Product"/> or a <see cref="Service"/>.
/// </summary>
public sealed class DraftItem
{
    public const int MaxNameLength = 120;

    public const int MaxDetailLength = 200;

    public const int MaxPlaceLength = 200;

    public DraftItem()
    {
    }

    public Guid Id { get; private set; } = Guid.NewGuid();

    public Guid ListingDraftId { get; private set; }

    public int Position { get; internal set; }

    public string Name { get; init; } = string.Empty;

    public string? Detail { get; init; }

    public ServicePriceKind PriceKind { get; init; }

    public int? PriceCents { get; init; }

    /// <summary>A product's description (L2-091).</summary>
    public string? Description { get; init; }

    /// <summary>A product's stock; null is not tracked.</summary>
    public int? Stock { get; init; }

    /// <summary>What members can do with a service: book a time or ask for a quote (L2-094).</summary>
    public ServiceAction Action { get; init; } = ServiceAction.Ask;

    /// <summary>The length of a meeting, for a service members can book.</summary>
    public int? DurationMinutes { get; init; }

    public bool OffersVideo { get; init; } = true;

    public bool OffersInPerson { get; init; }

    /// <summary>Where an in-person meeting happens.</summary>
    public string? InPersonPlace { get; init; }

    /// <summary>
    /// True when the booking details are ones the service editor accepts (L2-094 AC4): 15 to 480
    /// minutes, at least one way to meet, and a place when in person.
    /// </summary>
    public bool CanBeBooked =>
        Action == ServiceAction.Book
        && DurationMinutes is >= 15 and <= 480
        && (OffersVideo || OffersInPerson)
        && (!OffersInPerson || !string.IsNullOrWhiteSpace(InPersonPlace));
}

/// <summary>
/// A listing the member is still filling in (L2-077). Nothing is public until it is submitted, and
/// every field may be empty or invalid while it is a draft. Submitting turns it into a
/// <see cref="Listing"/> the verification team reviews.
/// </summary>
public sealed class ListingDraft
{
    public const int MaxNameLength = 120;

    public const int MaxTaglineLength = 200;

    public const int MaxItems = 50;

    /// <summary>A draft untouched this long is e-mailed about, then deleted 14 days later (L2-077 AC5).</summary>
    public static readonly TimeSpan IdleBeforeNotice = TimeSpan.FromDays(180);

    public static readonly TimeSpan GraceAfterNotice = TimeSpan.FromDays(14);

    private readonly List<DraftItem> _items = [];

    private ListingDraft()
    {
    }

    public Guid Id { get; private set; }

    public string OwnerSubject { get; private set; } = string.Empty;

    /// <summary>What the business mainly offers: a shop (products) or services.</summary>
    public ListingKind Kind { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string Tagline { get; private set; } = string.Empty;

    public string? CategorySlug { get; private set; }

    public string? Highlight { get; private set; }

    /// <summary>The store address of a shop, or the area a service business serves.</summary>
    public string? Place { get; private set; }

    public bool Agreed { get; private set; }

    /// <summary>The rental details of a space draft (L2-199); null for a business.</summary>
    public SpaceDetails? Space { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>When the owner was told the draft will be deleted; null before then.</summary>
    public DateTimeOffset? NoticeSentAt { get; private set; }

    public IReadOnlyList<DraftItem> Items => _items;

    public static ListingDraft Start(string ownerSubject, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        OwnerSubject = ownerSubject,
        CreatedAt = now,
        UpdatedAt = now,
    };

    /// <summary>Keeps what the member typed, cut to the lengths the form allows, without validating it.</summary>
    public void Save(
        ListingKind kind,
        string? name,
        string? tagline,
        string? categorySlug,
        string? highlight,
        string? place,
        bool agreed,
        IEnumerable<DraftItem> items,
        DateTimeOffset now,
        SpaceDetails? space = null)
    {
        Kind = kind;
        Space = kind == ListingKind.Space ? space : null;
        Name = Cut(name, MaxNameLength) ?? string.Empty;
        Tagline = Cut(tagline, MaxTaglineLength) ?? string.Empty;
        CategorySlug = Cut(categorySlug, 60);
        Highlight = Cut(highlight, 60);
        Place = Cut(place, 200);
        Agreed = agreed;
        _items.Clear();
        foreach (var item in items.Take(MaxItems))
        {
            _items.Add(new DraftItem
            {
                Name = Cut(item.Name, DraftItem.MaxNameLength) ?? string.Empty,
                Detail = Cut(item.Detail, DraftItem.MaxDetailLength),
                PriceKind = item.PriceKind,
                PriceCents = item.PriceCents is > 0 ? item.PriceCents : null,
                Description = Cut(item.Description, Product.MaxDescriptionLength),
                Stock = item.Stock,
                Action = item.Action,
                DurationMinutes = item.DurationMinutes,
                OffersVideo = item.OffersVideo,
                OffersInPerson = item.OffersInPerson,
                InPersonPlace = Cut(item.InPersonPlace, DraftItem.MaxPlaceLength),
                Position = _items.Count + 1,
            });
        }

        UpdatedAt = now;
        NoticeSentAt = null;
    }

    public void NoticeSent(DateTimeOffset now) => NoticeSentAt = now;

    private static string? Cut(string? value, int max)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return trimmed.Length > max ? trimmed[..max] : trimmed;
    }
}
