using System.Text.Json.Serialization;
using Jubilee.Api.Middleware;
using Jubilee.Application.Onboarding;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>One product or service of a draft. Unknown fields are refused (L2-133 AC4).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record DraftItemRequest(
    string? Name,
    string? Detail,
    string? PriceKind,
    int? PriceCents,
    string? Description = null,
    int? Stock = null,
    string? Action = null,
    int? DurationMinutes = null,
    bool? OffersVideo = null,
    bool? OffersInPerson = null,
    string? InPersonPlace = null)
{
    public DraftItemInput ToInput() =>
        new(Name, Detail, PriceKind, PriceCents, Description, Stock, Action, DurationMinutes, OffersVideo, OffersInPerson, InPersonPlace);
}

/// <summary>The space fields of the form (L2-199). Unknown fields are refused.</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SpaceDraftRequest(
    string? Term,
    int? Rent,
    string? Available,
    int? MinimumStay,
    string? Neighbourhood,
    string? Address,
    string? Place,
    IReadOnlyList<string>? Facts,
    IReadOnlyList<string>? Included,
    string? Household,
    IReadOnlyList<string>? Rules)
{
    public SpaceInput ToInput() =>
        new(Term, Rent, Available, MinimumStay, Neighbourhood, Address, Place, Facts, Included, Household, Rules);
}

/// <summary>The platform fields of the form (L2-250).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PlatformDraftRequest(string? Website, string? Does, string? For, string? Pricing)
{
    public PlatformInput ToInput() => new(Website, Does, For, Pricing);
}

/// <summary>
/// The listing form. It has no stage or owner field: unknown fields are refused with 400
/// and nothing is changed (L2-133 AC4).
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ListingDraftRequest(
    string? Kind,
    string? Name,
    string? Tagline,
    string? CategorySlug,
    string? Highlight,
    string? Place,
    bool Agreed,
    IReadOnlyList<DraftItemRequest>? Items,
    string? IdempotencyKey,
    SpaceDraftRequest? Space = null,
    PlatformDraftRequest? Platform = null)
{
    public DraftInput ToInput() => new(
        Kind, Name, Tagline, CategorySlug, Highlight, Place, Agreed,
        Items?.Select(i => i.ToInput()).ToList(),
        Space?.ToInput(),
        Platform?.ToInput());
}

/// <summary>Listing a business: drafts, saving them and publishing them (L2-071 to L2-079, ADR 0057).</summary>
[ApiController]
[Route("api/listing-drafts")]
public sealed class ListingDraftsController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    [HttpGet("current")]
    public async Task<IActionResult> Current(CancellationToken cancellationToken) =>
        await sender.Send(new GetCurrentDraftQuery(Subject), cancellationToken) is { } draft ? Ok(draft) : NoContent();

    [HttpGet("{id:guid}")]
    public Task<ListingDraftDto> Get(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new GetDraftQuery(Subject, id), cancellationToken);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ListingDraftRequest request, CancellationToken cancellationToken)
    {
        var draft = await sender.Send(new SaveListingDraftCommand(Subject, null, request.ToInput()), cancellationToken);
        return StatusCode(StatusCodes.Status201Created, draft);
    }

    [HttpPut("{id:guid}")]
    public Task<ListingDraftDto> Save(Guid id, [FromBody] ListingDraftRequest request, CancellationToken cancellationToken) =>
        sender.Send(new SaveListingDraftCommand(Subject, id, request.ToInput()), cancellationToken);

    [HttpPost("{id:guid}/publish")]
    [RequiresConfirmedEmail]
    public async Task<IActionResult> Publish(Guid id, [FromBody] ListingDraftRequest request, CancellationToken cancellationToken)
    {
        var listing = await sender.Send(
            new PublishListingCommand(Subject, User.FindFirst("name")?.Value ?? "Member", id, request.ToInput(), request.IdempotencyKey),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, listing);
    }
}
