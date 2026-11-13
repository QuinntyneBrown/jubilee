using Jubilee.Application.Directory;
using Jubilee.Domain;

namespace Jubilee.Application.Listings;

/// <summary>The relation of the caller to a listing; the server decides it from the session.</summary>
public enum ViewerRelation
{
    Visitor = 0,
    Member = 1,
    Owner = 2,
    Moderator = 3,
}

/// <summary>
/// Where a listing stands for the public (L2-219 AC2): "live" for a public listing, otherwise the
/// first reason it is not public. The browser turns it into words.
/// </summary>
public static class ListingStatus
{
    public const string Live = "live";

    public static string Of(Listing listing) => listing switch
    {
        _ when listing.IsPublic() => Live,
        { IsUnderModerationHold: true } => "on-hold",
        { Stage: ListingStage.Live, IsPaused: true } => "paused",
        _ => "draft",
    };
}

/// <summary>One row of "Services" or "Custom work" (L2-033 AC2).</summary>
public sealed record ServiceRowDto(Guid Id, string Name, string Detail, string PriceKind, int? PriceCents, string Action)
{
    public static ServiceRowDto From(Service service) => new(
        service.Id,
        service.Name,
        service.Detail,
        WireValues.Of(service.PriceKind),
        service.PriceCents,
        WireValues.Of(service.Action));
}

/// <summary>
/// The "Details" list. A services listing fills Where, Hours and Languages; a shop fills Where,
/// Delivery and Made to order. A value the owner has not given is null and its row is left out.
/// </summary>
public sealed record ListingDetailsDto(
    string? Where,
    string? Hours,
    string? Languages,
    string? Delivery,
    string? MadeToOrder,
    DateTimeOffset OnJubileeSince,
    string? Replies);

/// <summary>
/// The rental details on the page of a space (L2-205). Built without the exact address, which the
/// page never carries, whoever asks (L2-208 AC1).
/// </summary>
public sealed record SpacePageDto(
    string Term,
    int Rent,
    string Per,
    string Available,
    int MinimumStay,
    string MinimumStayLabel,
    string Neighbourhood,
    string Place,
    IReadOnlyList<string> Facts,
    IReadOnlyList<string> Included,
    string? Household,
    IReadOnlyList<string> Rules,
    string CallToAction)
{
    public static SpacePageDto? From(Listing listing) => listing.Space is not { } space
        ? null
        : new SpacePageDto(
            WireValues.Of(space.Term),
            space.Rent,
            SpaceTerms.Per(space.Term),
            space.Available,
            space.MinimumStay,
            space.MinimumStayLabel,
            space.Neighbourhood,
            space.Place,
            space.Facts,
            space.Included,
            space.Household,
            space.Rules,
            SpaceTerms.CallToAction(space.Term));
}

/// <summary>
/// What the page of a software platform shows (L2-254): the founder's words and the web address the link out
/// goes to. The address is given only while it passes <see cref="PlatformRules.IsWebAddress"/>; otherwise it
/// and its host are null and the page links nowhere (L2-255 AC5). Nothing here requests the address.
/// </summary>
public sealed record PlatformPageDto(string? Website, string? Host, string Does, string For, string Pricing)
{
    public static PlatformPageDto? From(Listing listing)
    {
        if (listing.Kind != ListingKind.Platform || listing.Platform is not { } platform)
        {
            return null;
        }

        var website = PlatformRules.IsWebAddress(listing.Website) ? listing.Website!.Trim() : null;
        return new PlatformPageDto(website, website is null ? null : PlatformRules.Host(website), platform.Does, platform.For, platform.Pricing);
    }
}

/// <summary>
/// One photo of a listing as its public page shows it (L2-221): the key of its renditions under <c>/media</c>, its
/// alt text, and the size of the original, which says how wide each rendition really is.
/// </summary>
public sealed record ListingPagePhotoDto(string Key, string Alt, int Width, int Height);

/// <summary>The listing page of one business (L2-033, L2-034), space (L2-205) or software platform (L2-254).</summary>
public sealed record ListingPageDto(
    string Slug,
    string Kind,
    string Name,
    CategoryLinkDto Category,
    string Stage,
    string Status,
    string ViewerRelation,
    string? OwnerName,
    string Tagline,
    IReadOnlyList<string> Credentials,
    string? Highlight,
    string? About,
    string? CoverPhoto,
    ListingDetailsDto Details,
    IReadOnlyList<ServiceRowDto> Services,
    int ProductCount,
    IReadOnlyList<ProductCardDto> Products,
    IReadOnlyList<BusinessCardDto> Related,
    SpacePageDto? Space,
    IReadOnlyList<SpaceCardDto> RelatedSpaces,
    Guid? OpenRequestId = null,
    bool RepliesFast = false) : IAddressed
{
    /// <summary>The listing's address, written by <see cref="AddressBehavior{TRequest, TResponse}"/> (L2-244).</summary>
    public string? Address { get; set; }

    /// <summary>The owner's photos in their order, the cover first; empty when there are none (L2-221).</summary>
    public IReadOnlyList<ListingPagePhotoDto> Photos { get; init; } = [];

    /// <summary>The founder's words and the link out of a software platform; null for every other kind (L2-254 AC9).</summary>
    public PlatformPageDto? Platform { get; init; }
}
