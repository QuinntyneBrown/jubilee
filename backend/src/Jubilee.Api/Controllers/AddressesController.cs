using Jubilee.Api.RateLimiting;
using Jubilee.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>
/// Where a listing's address <c>https://{label}.jubilee.to</c> leads, asked by the app's host before it redirects
/// (L2-243, ADR 0071). Anonymous, and it reads no session: an address keeps none (L2-246 AC3).
/// </summary>
[ApiController]
[Route("api/addresses")]
[AllowAnonymous]
[EnableRateLimiting(AddressRateLimit.Policy)]
public sealed class AddressesController(ISender sender) : ControllerBase
{
    [HttpGet("{label}")]
    public async Task<AddressDto> Get(string label, string? path, CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";
        return await sender.Send(new ResolveAddressQuery(label, path), cancellationToken);
    }
}
