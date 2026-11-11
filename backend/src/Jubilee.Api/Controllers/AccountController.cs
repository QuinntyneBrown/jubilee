using System.Security.Claims;
using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Api.Middleware;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>The body of <c>POST /api/account/join</c>. Unknown fields are refused (L2-136 AC1).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record JoinRequest(
    string? FirstName,
    string? LastName,
    string? Email,
    string? Password,
    string? HomeChurch,
    bool AgreementAccepted,
    string? ChallengeToken);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ConfirmEmailRequest(string? Token);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ChangeEmailRequest(string? Email);

public sealed record JoinResponse(string Email);

public sealed record ConfirmEmailResponse(string Outcome, string? FirstName);

/// <summary>Joining, confirming the e-mail address and the agreement (L2-001 to L2-005).</summary>
[ApiController]
[Route("api/account")]
public sealed class AccountController(ISender sender, IBotChallengeVerifier bot) : ControllerBase
{
    [HttpPost("join")]
    [AllowAnonymous]
    [EnableRateLimiting(AccountRateLimit.Joins)]
    [ErrorReference("JB-AUTH-503")]
    public async Task<ActionResult<JoinResponse>> Join(JoinRequest request, CancellationToken cancellationToken)
    {
        // The challenge comes first, so a bot learns nothing about which addresses have accounts (L2-141 AC2).
        if (!await bot.VerifyAsync(request.ChallengeToken, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["challenge"] = "CHALLENGE_FAILED" });
        }

        var member = await sender.Send(
            new JoinWithEmailCommand(
                request.FirstName, request.LastName, request.Email, request.Password, request.HomeChurch, request.AgreementAccepted),
            cancellationToken);
        await HttpContext.SignInMemberAsync(member);
        return StatusCode(StatusCodes.Status201Created, new JoinResponse(member.Email));
    }

    [HttpPost("confirmation/resend")]
    [EnableRateLimiting(AccountRateLimit.Resends)]
    [ErrorReference("JB-AUTH-503")]
    public async Task<IActionResult> ResendConfirmation(CancellationToken cancellationToken)
    {
        await sender.Send(new ResendConfirmationCommand(MemberId()), cancellationToken);
        return Accepted();
    }

    /// <summary>Opens a confirmation link. Needs no session: the link may be opened on another device.</summary>
    [HttpPost("confirmation")]
    [AllowAnonymous]
    [ErrorReference("JB-VERIFY-502")]
    public async Task<ActionResult<ConfirmEmailResponse>> Confirm(ConfirmEmailRequest request, CancellationToken cancellationToken)
    {
        Response.Headers["Referrer-Policy"] = "no-referrer";
        Response.Headers.CacheControl = "private, no-store";
        var result = await sender.Send(new ConfirmEmailCommand(request.Token), cancellationToken);
        var outcome = result.Outcome switch
        {
            ConfirmEmailOutcome.Confirmed => "confirmed",
            ConfirmEmailOutcome.AlreadyConfirmed => "already-confirmed",
            _ => "expired",
        };
        return Ok(new ConfirmEmailResponse(outcome, result.FirstName));
    }

    [HttpPut("unconfirmed-email")]
    [EnableRateLimiting(AccountRateLimit.Resends)]
    [ErrorReference("JB-AUTH-503")]
    public async Task<IActionResult> ChangeUnconfirmedEmail(ChangeEmailRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new ChangeUnconfirmedEmailCommand(MemberId(), request.Email), cancellationToken);
        return NoContent();
    }

    [HttpPost("agreement")]
    public async Task<IActionResult> AcceptAgreement(CancellationToken cancellationToken)
    {
        await sender.Send(new AcceptAgreementCommand(MemberId()), cancellationToken);
        return NoContent();
    }

    private Guid MemberId() => Guid.TryParse(User.ToViewer().Subject, out var id) ? id : Guid.Empty;
}

public static class SessionSignIn
{
    /// <summary>Starts a session for the member: a new identifier, so there is no session fixation (L2-010 AC5).</summary>
    public static async Task SignInMemberAsync(this HttpContext context, Member member)
    {
        var identity = new ClaimsIdentity(
            [
                new Claim("sub", member.Id.ToString()),
                new Claim("name", member.DisplayName),
                new Claim("given_name", member.FirstName),
                new Claim("email", member.Email),
            ],
            CookieAuthenticationDefaults.AuthenticationScheme);
        await context.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = false });
        CsrfToken.Issue(context);
    }
}
