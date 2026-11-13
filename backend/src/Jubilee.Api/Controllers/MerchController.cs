using Jubilee.Api.Errors;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Merch;
using Jubilee.Domain;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>
/// Jubilee's own merchandise, the Purpose Tee (L1-034, ADR 0073). A buyer needs no account, so every
/// action here is open on purpose; none sets or reads a session, and the rules are in the handlers.
/// </summary>
[ApiController]
[Route("api/merch")]
[AllowAnonymous]
public sealed class MerchController(ISender sender) : ControllerBase
{
    /// <summary>The tee, its fits and sizes and what is left of each (L2-263 AC4).</summary>
    [HttpGet(MerchProduct.PurposeTeeSlug)]
    [EnableRateLimiting(DirectoryRateLimit.Policy)]
    [ErrorReference("JB-MERCH-503")]
    public Task<MerchProductDto> PurposeTee(CancellationToken cancellationToken) =>
        sender.Send(new GetMerchProductQuery(MerchProduct.PurposeTeeSlug), cancellationToken);
}
