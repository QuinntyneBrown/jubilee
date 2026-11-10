using Jubilee.Api.RateLimiting;
using Jubilee.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>What a signed-in member asks of a product.</summary>
[ApiController]
[Route("api/products/{id:guid}")]
[EnableRateLimiting(DirectoryRateLimit.Policy)]
public sealed class ProductsController(ISender sender) : ControllerBase
{
    /// <summary>"Tell me when it's back": idempotent, one open alert per member and product.</summary>
    [HttpPut("stock-alert")]
    public async Task<IActionResult> RequestStockAlert(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new RequestStockAlertCommand(id, User.ToViewer().Subject!), cancellationToken);
        return NoContent();
    }
}
