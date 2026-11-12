using Jubilee.Application.Directory;
using Jubilee.Domain;

namespace Jubilee.Application.Listings;

/// <summary>The relation of the caller to a listing; the server decides it from the session.</summary>
public enum ViewerRelation
{
    Visitor = 0,
    Member = 1,
    Owner = 2,
    Verifier = 3,
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
/// The rental details on the page of a space (L2-196). Built without the exact address, which the
/// page never carries, whoever asks (L2-199 AC1).
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

/// <summary>The listing page of one business (L2-033, L2-034) or space (L2-196).</summary>
public sealed record ListingPageDto(
    string Slug,
    string Kind,
    string Name,
    CategoryLinkDto Category,
    bool Verified,
    string Stage,
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
    Guid? OpenRequestId = null);
