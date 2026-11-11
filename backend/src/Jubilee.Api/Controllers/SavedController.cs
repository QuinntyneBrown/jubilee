using Jubilee.Api.Errors;
using Jubilee.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>
/// A member's private saved list (L2-041, L2-042). Every endpoint needs a session and takes the member from it: no
/// route names a member, so another member's list cannot be addressed (L2-133). Unconfirmed members are admitted (L2-005).
/// </summary>
[ApiController]
[Route("api/saved")]
public sealed class SavedController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    [HttpGet]
    [ErrorReference("JB-SAV-503")]
    public async Task<SavedListDto> Get(CancellationToken cancellationToken) =>
        await sender.Send(new GetSavedListQuery(Subject), cancellationToken);

    [HttpPut("businesses/{slug}")]
    [ErrorReference("JB-SAV-504")]
    public async Task<IActionResult> SaveBusiness(string slug, CancellationToken cancellationToken)
    {
        await sender.Send(new SaveBusinessCommand(Subject, slug), cancellationToken);
        return NoContent();
    }

    [HttpDelete("businesses/{slug}")]
    [ErrorReference("JB-SAV-504")]
    public async Task<IActionResult> UnsaveBusiness(string slug, CancellationToken cancellationToken)
    {
        await sender.Send(new UnsaveBusinessCommand(Subject, slug), cancellationToken);
        return NoContent();
    }

    [HttpPut("products/{listingSlug}/{productSlug}")]
    [ErrorReference("JB-SAV-504")]
    public async Task<IActionResult> SaveProduct(string listingSlug, string productSlug, CancellationToken cancellationToken)
    {
        await sender.Send(new SaveProductCommand(Subject, listingSlug, productSlug), cancellationToken);
        return NoContent();
    }

    [HttpDelete("products/{listingSlug}/{productSlug}")]
    [ErrorReference("JB-SAV-504")]
    public async Task<IActionResult> UnsaveProduct(string listingSlug, string productSlug, CancellationToken cancellationToken)
    {
        await sender.Send(new UnsaveProductCommand(Subject, listingSlug, productSlug), cancellationToken);
        return NoContent();
    }

    [HttpDelete("items/{id:guid}")]
    [ErrorReference("JB-SAV-504")]
    public async Task<IActionResult> Remove(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new UnsaveItemCommand(Subject, id), cancellationToken);
        return NoContent();
    }
}
