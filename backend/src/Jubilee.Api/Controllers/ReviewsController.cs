using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Reviews;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ReviewBody(int? Rating, Guid? ItemId, string? Text);

/// <summary>
/// The reviews of one listing (L2-237). Reading is open to anyone on purpose; the session, when there
/// is one, says whether the caller may write and which review is theirs (L2-133). Writing takes the
/// author from the session, never from the body; a repeated <c>Idempotency-Key</c> answers the first review (L2-132).
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

    [HttpGet("new")]
    public async Task<ActionResult<ReviewFormDto>> Form(string slug, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetReviewFormQuery(slug, User.ToViewer().Subject!, MemberName), cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Write(string slug, ReviewBody body, CancellationToken cancellationToken)
    {
        var review = await sender.Send(
            new WriteReviewCommand(slug, User.ToViewer().Subject!, MemberName, body.Rating, body.ItemId, body.Text, Request.Headers["Idempotency-Key"].ToString()),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, review);
    }

    private string MemberName => User.FindFirst("name")?.Value ?? "Member";
}
