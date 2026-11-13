using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Messaging;
using Jubilee.Application.OwnerWorkspace;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>A product as the owner types it. Unknown fields are refused, so a caller cannot set a slug or a listing (L2-133 AC4).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SaveProductBody(
    string? Name,
    string? Price,
    int? Stock,
    string? Description,
    int? MinimumQuantity,
    string? OptionName,
    List<OwnerProductOptionDto>? Options,
    string? IdempotencyKey,
    Guid? PhotoId = null);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SaveServiceBody(
    string? Name,
    string? Detail,
    string? Pricing,
    string? Price,
    string? Action,
    int? DurationMinutes,
    bool OffersVideo,
    bool OffersInPerson,
    string? Place,
    string? IdempotencyKey);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record MoveItemBody(int Position);

/// <summary>When meetings can be booked: days of the week (0 is Sunday), times of day in Toronto as <c>HH:mm</c> and the slot length (L2-220).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record MeetingHoursBody(List<int>? Days, string? OpensAt, string? ClosesAt, int? SlotMinutes);

/// <summary>The owner's products and services: list, add, change, delete and reorder (L2-089 to L2-095).</summary>
[ApiController]
[Route("api/my-business")]
public sealed class CatalogueController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    [HttpGet("products")]
    [ErrorReference("JB-PRD-503")]
    public Task<ProductsDto> Products(CancellationToken cancellationToken) =>
        sender.Send(new ListProductsQuery(Subject), cancellationToken);

    [HttpPost("products")]
    [ErrorReference("JB-PRD-504")]
    public async Task<IActionResult> AddProduct([FromBody] SaveProductBody body, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(Command(null, body), cancellationToken));

    [HttpPut("products/{id:guid}")]
    [ErrorReference("JB-PRD-504")]
    public Task<ProductRowDto> ChangeProduct(Guid id, [FromBody] SaveProductBody body, CancellationToken cancellationToken) =>
        sender.Send(Command(id, body), cancellationToken);

    /// <summary>A product photo, before the product is saved: checked, scanned and stored (L2-091 AC9, L2-138 AC6).</summary>
    [HttpPost("products/photos")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UploadProductPhoto(IFormFile? file, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        if (file is not null)
        {
            await file.CopyToAsync(buffer, cancellationToken);
        }

        try
        {
            var photo = await sender.Send(new UploadProductPhotoCommand(Subject, buffer.ToArray()), cancellationToken);
            return StatusCode(StatusCodes.Status201Created, photo);
        }
        catch (InvalidPhotoException invalid)
        {
            return UnprocessableEntity(new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "That photo can't be used.",
                Detail = invalid.Message,
                Extensions = { ["code"] = invalid.Code, ["correlationId"] = HttpContext.TraceIdentifier },
            });
        }
        catch (ScanUnavailableException unavailable)
        {
            // Nothing was stored: the photo can be added again when the scanner answers (L2-138 AC6).
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = unavailable.Message,
                Extensions = { ["code"] = ScanUnavailableException.Code, ["correlationId"] = HttpContext.TraceIdentifier },
            });
        }
    }

    [HttpDelete("products/{id:guid}")]
    public Task<DeletedItemDto> DeleteProduct(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new DeleteProductCommand(Subject, id), cancellationToken);

    [HttpPut("products/{id:guid}/position")]
    public Task<ProductsDto> MoveProduct(Guid id, [FromBody] MoveItemBody body, CancellationToken cancellationToken) =>
        sender.Send(new MoveProductCommand(Subject, id, body.Position), cancellationToken);

    [HttpGet("services")]
    [ErrorReference("JB-SVC-503")]
    public Task<ServicesDto> Services(CancellationToken cancellationToken) =>
        sender.Send(new ListServicesQuery(Subject), cancellationToken);

    [HttpPut("meeting-hours")]
    public Task<MeetingHoursDto> MeetingHours([FromBody] MeetingHoursBody body, CancellationToken cancellationToken) =>
        sender.Send(new SetMeetingHoursCommand(Subject, body.Days, body.OpensAt, body.ClosesAt, body.SlotMinutes), cancellationToken);

    [HttpPost("services")]
    [ErrorReference("JB-SVC-504")]
    public async Task<IActionResult> AddService([FromBody] SaveServiceBody body, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(Command(null, body), cancellationToken));

    [HttpPut("services/{id:guid}")]
    [ErrorReference("JB-SVC-504")]
    public Task<OwnerServiceRowDto> ChangeService(Guid id, [FromBody] SaveServiceBody body, CancellationToken cancellationToken) =>
        sender.Send(Command(id, body), cancellationToken);

    [HttpDelete("services/{id:guid}")]
    public Task<DeletedItemDto> DeleteService(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new DeleteServiceCommand(Subject, id), cancellationToken);

    [HttpPut("services/{id:guid}/position")]
    public Task<ServicesDto> MoveService(Guid id, [FromBody] MoveItemBody body, CancellationToken cancellationToken) =>
        sender.Send(new MoveServiceCommand(Subject, id, body.Position), cancellationToken);

    private SaveProductCommand Command(Guid? id, SaveProductBody body) => new(
        Subject, id, body.Name, body.Price, body.Stock, body.Description, body.MinimumQuantity, body.OptionName, body.Options, body.IdempotencyKey, body.PhotoId);

    private SaveServiceCommand Command(Guid? id, SaveServiceBody body) => new(
        Subject, id, body.Name, body.Detail, body.Pricing, body.Price, body.Action, body.DurationMinutes,
        body.OffersVideo, body.OffersInPerson, body.Place, body.IdempotencyKey);
}
