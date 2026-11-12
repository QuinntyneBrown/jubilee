using System.Text.Json.Serialization;
using Jubilee.Api.Middleware;
using Jubilee.Application.Onboarding;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>One product or service of a draft. Unknown fields are refused (L2-133 AC4).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record DraftItemRequest(string? Name, string? Detail, string? PriceKind, int? PriceCents);

/// <summary>
/// The listing form. It has no stage, owner or verified field: unknown fields are refused with 400
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
    string? IdempotencyKey)
{
    public DraftInput ToInput() => new(
        Kind, Name, Tagline, CategorySlug, Highlight, Place, Agreed,
        Items?.Select(i => new DraftItemInput(i.Name, i.Detail, i.PriceKind, i.PriceCents)).ToList());
}

/// <summary>Listing a business: drafts, saving them and submitting for verification (L2-071 to L2-079).</summary>
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

    [HttpPost("{id:guid}/submit")]
    [RequiresConfirmedEmail]
    public async Task<IActionResult> Submit(Guid id, [FromBody] ListingDraftRequest request, CancellationToken cancellationToken)
    {
        var listing = await sender.Send(
            new SubmitListingCommand(Subject, User.FindFirst("name")?.Value ?? "Member", id, request.ToInput(), request.IdempotencyKey),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, listing);
    }
}
