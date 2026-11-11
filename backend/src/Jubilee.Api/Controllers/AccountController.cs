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

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ProfileBody(string? FirstName, string? LastName, string? Phone, string? PostalCode, string? HomeChurch, string? Pronouns);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PreferenceBody(string? Setting, bool? Enabled, string? Frequency);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record EmailChangeBody(string? Email, string? CurrentPassword);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ChangePasswordBody(string? CurrentPassword, string? NewPassword, string? RepeatPassword);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record DeleteAccountBody(string? Confirmation);

public sealed record EmailChangeResponse(string Outcome);

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

    /// <summary>"Download my data": records the request; the worker builds the archive and e-mails the link (L2-018 AC1).</summary>
    [HttpPost("data-exports")]
    [ErrorReference("JB-ACC-521")]
    public async Task<IActionResult> RequestDataExport(CancellationToken cancellationToken) =>
        Accepted(await sender.Send(new RequestDataExportCommand(MemberId()), cancellationToken));

    [HttpGet("data-exports/current")]
    [ErrorReference("JB-ACC-522")]
    public async Task<ActionResult<DataExportStatusDto>> CurrentDataExport(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetDataExportStatusQuery(MemberId()), cancellationToken));

    /// <summary>The e-mailed link: the archive, for the signed-in owner of the data until the link expires (L2-018 AC2).</summary>
    [HttpGet("data-exports/{token}")]
    [ErrorReference("JB-ACC-523")]
    public async Task<IActionResult> DownloadDataExport(string token, CancellationToken cancellationToken)
    {
        NoReferrer();
        var archive = await sender.Send(new DownloadDataExportQuery(MemberId(), token), cancellationToken);
        return File(System.Text.Encoding.UTF8.GetBytes(archive), "application/json", "jubilee-data.json");
    }

    [HttpGet("deletion-summary")]
    [ErrorReference("JB-ACC-524")]
    public async Task<ActionResult<DeletionSummaryDto>> DeletionSummary(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetDeletionSummaryQuery(MemberId()), cancellationToken));

    /// <summary>Deletes the account after the member typed DELETE, and ends this session (L2-017).</summary>
    [HttpDelete]
    [ErrorReference("JB-ACC-525")]
    public async Task<IActionResult> DeleteAccount(DeleteAccountBody request, CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteAccountCommand(MemberId(), request.Confirmation), cancellationToken);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
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

    /// <summary>The account page: profile, e-mail state and when the password changed (L2-013, L2-015).</summary>
    [HttpGet]
    [ErrorReference("JB-ACC-503")]
    public async Task<ActionResult<AccountDto>> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAccountQuery(MemberId()), cancellationToken));

    [HttpPut("profile")]
    [ErrorReference("JB-ACC-503")]
    public async Task<ActionResult<AccountDto>> SaveProfile(ProfileBody request, CancellationToken cancellationToken)
    {
        await sender.Send(
            new UpdateProfileCommand(MemberId(), request.FirstName, request.LastName, request.Phone, request.PostalCode, request.HomeChurch, request.Pronouns),
            cancellationToken);
        return Ok(await sender.Send(new GetAccountQuery(MemberId()), cancellationToken));
    }

    /// <summary>The five e-mail switches and how often (L2-016).</summary>
    [HttpGet("notification-preferences")]
    [ErrorReference("JB-PREF-503")]
    public async Task<ActionResult<NotificationPreferencesDto>> GetPreferences(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetNotificationPreferencesQuery(MemberId()), cancellationToken));

    [HttpPatch("notification-preferences")]
    [ErrorReference("JB-PREF-503")]
    public async Task<ActionResult<NotificationPreferencesDto>> SetPreference(PreferenceBody request, CancellationToken cancellationToken)
    {
        await sender.Send(new UpdateNotificationPreferenceCommand(MemberId(), request.Setting, request.Enabled, request.Frequency), cancellationToken);
        return Ok(await sender.Send(new GetNotificationPreferencesQuery(MemberId()), cancellationToken));
    }

    [HttpPost("email-change")]
    [ErrorReference("JB-ACC-503")]
    public async Task<IActionResult> RequestEmailChange(EmailChangeBody request, CancellationToken cancellationToken)
    {
        await sender.Send(new RequestEmailChangeCommand(MemberId(), request.Email, request.CurrentPassword), cancellationToken);
        return Accepted();
    }

    /// <summary>Opens the link sent to the new address. The link is the credential, so it may be opened on another device.</summary>
    [HttpPost("email-change/confirm")]
    [AllowAnonymous]
    [ErrorReference("JB-VERIFY-502")]
    public async Task<ActionResult<EmailChangeResponse>> ConfirmEmailChange(ConfirmEmailRequest request, CancellationToken cancellationToken)
    {
        NoReferrer();
        var outcome = await sender.Send(new ConfirmEmailChangeCommand(request.Token), cancellationToken);
        return Ok(new EmailChangeResponse(outcome switch
        {
            EmailChangeOutcome.Confirmed => "confirmed",
            EmailChangeOutcome.EmailInUse => "email-in-use",
            _ => "expired",
        }));
    }

    /// <summary>Changes the password and ends every other session; this session starts again so it goes on (L2-015, L2-134 AC3).</summary>
    [HttpPut("password")]
    [ErrorReference("JB-ACC-503")]
    public async Task<IActionResult> ChangePassword(ChangePasswordBody request, CancellationToken cancellationToken)
    {
        var member = await sender.Send(new ChangePasswordCommand(MemberId(), request.CurrentPassword, request.NewPassword, request.RepeatPassword), cancellationToken);
        await HttpContext.SignInMemberAsync(member);
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
