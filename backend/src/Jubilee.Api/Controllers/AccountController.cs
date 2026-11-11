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

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PasswordResetRequestBody(string? Email);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ResetLinkBody(string? Token);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ResetPasswordBody(string? Token, string? NewPassword, string? RepeatPassword);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SignInBody(string? Email, string? Password);

public sealed record ResetLinkResponse(string State, string? Email);

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

    /// <summary>Asks for a reset link. It always answers 202: whether an account exists is not revealed (L2-141).</summary>
    [HttpPost("password-reset-requests")]
    [AllowAnonymous]
    [ErrorReference("JB-AUTH-503")]
    public async Task<IActionResult> RequestPasswordReset(PasswordResetRequestBody request, CancellationToken cancellationToken)
    {
        await sender.Send(new RequestPasswordResetCommand(request.Email), cancellationToken);
        return Accepted();
    }

    /// <summary>The state of a reset link. The token travels in the body, never in a URL (L2-140 AC2).</summary>
    [HttpPost("password-resets/inspect")]
    [AllowAnonymous]
    [ErrorReference("JB-AUTH-504")]
    public async Task<ActionResult<ResetLinkResponse>> InspectResetLink(ResetLinkBody request, CancellationToken cancellationToken)
    {
        NoReferrer();
        var view = await sender.Send(new InspectResetLinkQuery(request.Token), cancellationToken);
        return Ok(new ResetLinkResponse(view.State == ResetLinkState.Valid ? "valid" : "expired", view.Email));
    }

    [HttpPost("password-resets")]
    [AllowAnonymous]
    [ErrorReference("JB-AUTH-505")]
    public async Task<IActionResult> ResetPassword(ResetPasswordBody request, CancellationToken cancellationToken)
    {
        NoReferrer();
        await sender.Send(new ResetPasswordCommand(request.Token, request.NewPassword, request.RepeatPassword), cancellationToken);
        return NoContent();
    }

    /// <summary>Signs in with e-mail and password. The answer is the same for a wrong password and an unknown address.</summary>
    [HttpPost("sign-in")]
    [AllowAnonymous]
    [ErrorReference("JB-AUTH-503")]
    public async Task<IActionResult> SignIn(SignInBody request, CancellationToken cancellationToken)
    {
        var member = await sender.Send(new SignInWithPasswordCommand(request.Email, request.Password), cancellationToken);
        if (member is null)
        {
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "That e-mail and password do not match.");
        }

        await HttpContext.SignInMemberAsync(member);
        return NoContent();
    }

    private void NoReferrer()
    {
        Response.Headers["Referrer-Policy"] = "no-referrer";
        Response.Headers.CacheControl = "private, no-store";
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

/// <summary>Claims of the session cookie beyond the member identity.</summary>
public static class SessionClaims
{
    /// <summary>When the session began, in UTC ticks. A password change ends every session that began before it (L2-134 AC3).</summary>
    public const string IssuedAt = "jb_iat";
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
                new Claim(SessionClaims.IssuedAt, context.RequestServices.GetRequiredService<TimeProvider>().GetUtcNow().UtcTicks.ToString()),
            ],
            CookieAuthenticationDefaults.AuthenticationScheme);
        await context.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = false });
        CsrfToken.Issue(context);
    }
}
