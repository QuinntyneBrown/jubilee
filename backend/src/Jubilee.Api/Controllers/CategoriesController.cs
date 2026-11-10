using Jubilee.Api.Filters;
using Jubilee.Application.Directory;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>
/// The businesses of one category. The query string is untrusted and never causes a 400:
/// unknown filter values are ignored and an out-of-range page becomes the nearest valid page.
/// </summary>
[ApiController]
[Route("api/categories/{slug}/listings")]
[AllowAnonymous]
[PublicDirectoryCache]
public sealed class CategoriesController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CategoryPageResult>> GetListings(
        string slug,
        [FromQuery] string? offers,
        [FromQuery] string? areas,
        [FromQuery] string? sort,
        [FromQuery] string? page,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(GetCategoryListingsQuery.FromUntrusted(slug, offers, areas, sort, page), cancellationToken));

    [HttpGet("count")]
    public async Task<ActionResult<CategoryCountDto>> GetCount(
        string slug,
        [FromQuery] string? offers,
        [FromQuery] string? areas,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(GetCategoryListingCountQuery.FromUntrusted(slug, offers, areas), cancellationToken));
}
