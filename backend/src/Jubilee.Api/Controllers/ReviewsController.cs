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

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ReplyBody(string? Text);

/// <summary>
/// One review: its author changes or removes it, the owner of its listing replies (L2-232, L2-233, L2-237 AC5).
/// Anyone else is answered 404, as if it did not exist (L2-133 AC2); a reply by anyone but the owner is 403 NOT_OWNER.
/// </summary>
[ApiController]
[Route("api/reviews/{id:guid}")]
[ErrorReference("JB-REV-503")]
public sealed class ReviewsController(ISender sender) : ControllerBase
{
    [HttpPut]
    [EnableRateLimiting(ReviewRateLimit.Changes)]
    public async Task<ActionResult<ReviewDto>> Edit(Guid id, ReviewBody body, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new EditReviewCommand(id, User.ToViewer().Subject!, body.Rating, body.ItemId, body.Text), cancellationToken));

    [HttpDelete]
    public async Task<IActionResult> Remove(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new RemoveReviewCommand(id, User.ToViewer().Subject!), cancellationToken);
        return NoContent();
    }

    [HttpPut("reply")]
    [EnableRateLimiting(ReviewRateLimit.Changes)]
    public async Task<ActionResult<ReviewDto>> Reply(Guid id, ReplyBody body, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ReplyToReviewCommand(id, User.ToViewer().Subject!, body.Text), cancellationToken));
}
