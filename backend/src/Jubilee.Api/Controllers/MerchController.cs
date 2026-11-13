using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Merch;
using Jubilee.Domain;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>One line of a checkout: the size, the quantity and the price the buyer saw (L2-267 AC1).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record CheckoutLineBody(string? Sku, int Quantity, int UnitPriceCents);

/// <summary>The body of <c>POST /api/merch/checkout</c>. A total or a shipping fee is refused (L2-267 AC3).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record CheckoutBody(IReadOnlyList<CheckoutLineBody>? Lines, string? Delivery);

public sealed record CheckoutStartedDto(string Url);

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

    /// <summary>201 with the address of the provider's hosted page, where the card is entered (L2-267).</summary>
    [HttpPost("checkout")]
    [EnableRateLimiting(MerchRateLimit.Checkouts)]
    [ErrorReference("JB-MERCH-503")]
    public async Task<IActionResult> Checkout(CheckoutBody request, CancellationToken cancellationToken)
    {
        var url = await sender.Send(
            new StartCheckoutCommand([.. (request.Lines ?? []).Select(l => new CheckoutLineInput(l.Sku, l.Quantity, l.UnitPriceCents))], request.Delivery),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, new CheckoutStartedDto(url));
    }

    /// <summary>The return page's read: open, keyed by the 128-bit reference, nothing of the buyer (L2-269 AC7).</summary>
    [HttpGet("orders/{reference}")]
    [EnableRateLimiting(MerchRateLimit.OrderReads)]
    [ErrorReference("JB-MERCH-503")]
    public Task<MerchOrderDto> Order(string reference, CancellationToken cancellationToken) =>
        sender.Send(new GetMerchOrderQuery(reference), cancellationToken);

    /// <summary>
    /// Stripe's signed events (L2-268). The signature over the raw body is the proof: no session and no
    /// anti-CSRF token. Neither the body nor the signature is logged (AC7).
    /// </summary>
    [HttpPost("webhooks/stripe")]
    [EnableRateLimiting(MerchRateLimit.Webhooks)]
    public async Task<IActionResult> StripeEvent(CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(cancellationToken);
        try
        {
            await sender.Send(new CompleteCheckoutCommand(body, Request.Headers["Stripe-Signature"].ToString()), cancellationToken);
        }
        catch (Application.Accounts.ValidationFailedException invalid) when (invalid.Errors.ContainsKey("signature"))
        {
            await ProblemWriter.WriteAsync(
                HttpContext, StatusCodes.Status400BadRequest, "The signature is not valid.", code: "signature_invalid");
            return new EmptyResult();
        }
        catch (System.Text.Json.JsonException)
        {
            return BadRequest();
        }

        return Ok();
    }
}
