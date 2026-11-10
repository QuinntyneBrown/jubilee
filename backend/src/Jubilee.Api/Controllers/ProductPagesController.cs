using Jubilee.Api.Errors;
using Jubilee.Api.Filters;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>The product page of a shop's product. Anonymous callers are welcome.</summary>
[ApiController]
[Route("api/listings/{slug}/products/{productSlug}")]
[AllowAnonymous]
[EnableRateLimiting(DirectoryRateLimit.Policy)]
[ErrorReference("JB-PRD-503")]
public sealed class ProductPagesController(ISender sender) : ControllerBase
{
    [HttpGet]
    [SessionAwareCache]
    public async Task<ActionResult<ProductPageDto>> Get(string slug, string productSlug, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetProductPageQuery(slug, productSlug, User.ToViewer()), cancellationToken));
}
