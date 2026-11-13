using Jubilee.Api.Errors;
using Jubilee.Api.Filters;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>
/// The listing page of one business. Anonymous callers are welcome; the session, when there is
/// one, decides the caller's relation to the listing.
/// </summary>
[ApiController]
[Route("api/listings/{slug}")]
[AllowAnonymous]
[EnableRateLimiting(DirectoryRateLimit.Policy)]
[ErrorReference("JB-BIZ-503")]
public sealed class ListingsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [SessionAwareCache]
    [KeptSlugRedirect]
    public async Task<ActionResult<ListingPageDto>> Get(string slug, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetListingPageQuery(slug, User.ToViewer()), cancellationToken));

    /// <summary>The page was shown: counts a listing view unless the caller owns it (L2-037 AC3).</summary>
    [HttpPost("views")]
    public async Task<IActionResult> RecordView(string slug, CancellationToken cancellationToken)
    {
        await sender.Send(
            new RecordListingViewCommand(
                slug,
                User.ToViewer(),
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.ToString()),
            cancellationToken);
        return NoContent();
    }
}
