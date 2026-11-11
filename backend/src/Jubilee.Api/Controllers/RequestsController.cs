using System.Text;
using Jubilee.Api.Middleware;
using Jubilee.Application.Requests;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

public sealed record BookMeetingRequest(
    string? ListingSlug, Guid ServiceId, string? Day, string? Time, string? Mode, string? Note, string? IdempotencyKey);

public sealed record RequestQuoteRequest(
    string? ListingSlug, Guid? ServiceId, string? Description, string? NeededBy, string? Budget, string? Phone, string? IdempotencyKey);

/// <summary>The body of an order request. It has no price, shipping or total, and unknown fields are refused (L2-133 AC4).</summary>
[System.Text.Json.Serialization.JsonUnmappedMemberHandling(System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow)]
public sealed record RequestItemRequest(
    string? ListingSlug, string? ProductSlug, string? Option, int Quantity, Guid? DeliveryMethodId, string? ShippingAddress, string? Note, string? IdempotencyKey);

/// <summary>What the booking dialog reads about a business (L2-044).</summary>
[ApiController]
[Route("api/listings/{slug}")]
public sealed class ListingBookingController(ISender sender) : ControllerBase
{
    [HttpGet("booking")]
    public Task<BookingOptionsDto> Options(string slug, CancellationToken cancellationToken) =>
        sender.Send(new GetBookingOptionsQuery(slug), cancellationToken);

    [HttpGet("quote")]
    public Task<QuoteOptionsDto> QuoteOptions(string slug, CancellationToken cancellationToken) =>
        sender.Send(new GetQuoteOptionsQuery(slug), cancellationToken);

    [HttpGet("products/{product}/order")]
    public Task<OrderOptionsDto> OrderOptions(string slug, string product, CancellationToken cancellationToken) =>
        sender.Send(new GetOrderOptionsQuery(User.ToViewer().Subject!, slug, product), cancellationToken);

    [HttpGet("availability")]
    public Task<AvailabilityDto> Availability(string slug, [FromQuery] Guid serviceId, [FromQuery] string? day, CancellationToken cancellationToken) =>
        sender.Send(new GetAvailabilityQuery(slug, serviceId, day), cancellationToken);
}

/// <summary>A member's requests to businesses (L2-043 to L2-050).</summary>
[ApiController]
[Route("api/requests")]
public sealed class RequestsController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    [HttpPost("bookings")]
    [RequiresConfirmedEmail]
    public async Task<IActionResult> Book([FromBody] BookMeetingRequest request, CancellationToken cancellationToken)
    {
        var booked = await sender.Send(
            new BookMeetingCommand(
                Subject,
                User.FindFirst("name")?.Value ?? "Member",
                request.ListingSlug ?? string.Empty,
                request.ServiceId,
                request.Day,
                request.Time,
                request.Mode,
                request.Note,
                request.IdempotencyKey),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, booked);
    }

    [HttpPost("quotes")]
    [RequiresConfirmedEmail]
    public async Task<IActionResult> Quote([FromBody] RequestQuoteRequest request, CancellationToken cancellationToken)
    {
        var sent = await sender.Send(
            new RequestQuoteCommand(
                Subject,
                User.FindFirst("name")?.Value ?? "Member",
                request.ListingSlug ?? string.Empty,
                request.ServiceId,
                request.Description,
                request.NeededBy,
                request.Budget,
                request.Phone,
                request.IdempotencyKey),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, sent);
    }

    [HttpPost("orders")]
    [RequiresConfirmedEmail]
    public async Task<IActionResult> Order([FromBody] RequestItemRequest request, CancellationToken cancellationToken)
    {
        var sent = await sender.Send(
            new RequestItemCommand(
                Subject,
                User.FindFirst("name")?.Value ?? "Member",
                request.ListingSlug ?? string.Empty,
                request.ProductSlug,
                request.Option,
                request.Quantity,
                request.DeliveryMethodId,
                request.ShippingAddress,
                request.Note,
                request.IdempotencyKey),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, sent);
    }

    [HttpGet("{id:guid}/calendar.ics")]
    public async Task<IActionResult> Calendar(Guid id, CancellationToken cancellationToken)
    {
        var ics = await sender.Send(new GetBookingCalendarQuery(Subject, id), cancellationToken);
        return File(Encoding.UTF8.GetBytes(ics), "text/calendar; charset=utf-8", "booking.ics");
    }
}
