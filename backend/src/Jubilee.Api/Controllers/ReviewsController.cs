using Jubilee.Api.Errors;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Reviews;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>
/// The reviews of one listing (L2-237). Reading is open to anyone on purpose; the session, when there
/// is one, says whether the caller may write and which review is theirs (L2-133).
/// </summary>
[ApiController]
[Route("api/listings/{slug}/reviews")]
[ErrorReference("JB-REV-503")]
public sealed class ListingReviewsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting(DirectoryRateLimit.Policy)]
    public async Task<ActionResult<ListingReviewsDto>> Get(string slug, [FromQuery] string? product, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetListingReviewsQuery(slug, product, User.ToViewer()), cancellationToken));
}
