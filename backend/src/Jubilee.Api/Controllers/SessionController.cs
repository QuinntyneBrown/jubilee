using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Api.Middleware;
using Jubilee.Api.Sessions;
using Jubilee.Application.Accounts;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>The body of <c>POST /api/session</c>. Unknown fields are refused (L2-136 AC1).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SignInRequest(string? Email, string? Password, bool KeepSignedIn);

[ApiController]
[Route("api/session")]
public sealed class SessionController(ISender sender) : ControllerBase
{
    /// <summary>Signs in with e-mail and password (L2-006). Throttled (L2-007); the answer does not reveal whether the e-mail has an account (L2-141).</summary>
    [HttpPost]
    [AllowAnonymous]
    [ErrorReference("JB-AUTH-503")]
    public async Task<IActionResult> SignIn(SignInRequest request, CancellationToken cancellationToken)
    {
        var address = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var result = await sender.Send(new SignInCommand(request.Email, request.Password, address), cancellationToken);
        switch (result.Outcome)
        {
            case SignInOutcome.SignedIn:
                await HttpContext.SignInMemberAsync(result.Member!, request.KeepSignedIn);
                var account = await sender.Send(new GetMemberAccountQuery(result.Member!.Id.ToString()), cancellationToken);
                return Ok(ToDto(account!, 0));
            case SignInOutcome.AccountLocked:
            case SignInOutcome.AddressBlocked:
                var seconds = Math.Max(1, (int)Math.Ceiling(result.RetryAfter!.Value.TotalSeconds));
                Response.Headers.RetryAfter = seconds.ToString(System.Globalization.CultureInfo.InvariantCulture);
                await ProblemWriter.WriteAsync(
                    HttpContext,
                    StatusCodes.Status429TooManyRequests,
                    result.Outcome == SignInOutcome.AccountLocked ? "Too many tries." : "You are doing that a lot.",
                    $"Try again in {Math.Max(1, (seconds + 59) / 60)} minutes.",
                    code: result.Outcome == SignInOutcome.AccountLocked ? "SIGN_IN_LOCKED" : "rate_limited");
                return new EmptyResult();
            default:
                await ProblemWriter.WriteAsync(
                    HttpContext, StatusCodes.Status401Unauthorized, "That password does not match this e-mail.", code: "INVALID_CREDENTIALS");
                return new EmptyResult();
        }
    }

    /// <summary>Signs out of this session only (L2-011 AC2).</summary>
    [HttpDelete]
    public async Task<IActionResult> EndSession()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    /// <summary>Ends every other session of the member (L2-011 AC4).</summary>
    [HttpDelete("others")]
    public async Task<IActionResult> SignOutOthers(CancellationToken cancellationToken)
    {
        if (Guid.TryParse(User.ToViewer().Subject, out var member))
        {
            await sender.Send(new EndOtherSessionsCommand(member, CurrentSessionId()), cancellationToken);
        }

        return NoContent();
    }

    private Guid? CurrentSessionId() =>
        Guid.TryParse(User.FindFirst(DatabaseTicketStore.SessionIdClaim)?.Value, out var id) ? id : null;

    private static SessionDto ToDto(MemberAccountDto account, int otherSessions) => new(
        true, account.FirstName, account.DisplayName, account.Initials,
        account.Email, account.EmailStatus, account.EmailBounced, account.AgreementRequired, otherSessions);

    /// <summary>Who is calling: a visitor (<c>signedIn: false</c>) or a signed-in member.</summary>
    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<SessionDto> Get(CancellationToken cancellationToken)
    {
        if (!Request.Cookies.ContainsKey(CsrfToken.Cookie))
        {
            CsrfToken.Issue(HttpContext);
        }

        if (User.Identity?.IsAuthenticated != true)
        {
            return SessionDto.Visitor;
        }

        // A member of the accounts table: the e-mail status is read from the database every time,
        // so a confirmation in another tab shows at once (L2-005 AC4).
        var subject = User.ToViewer().Subject;
        var account = subject is null ? null : await sender.Send(new GetMemberAccountQuery(subject), cancellationToken);
        if (account is not null)
        {
            var others = Guid.TryParse(subject, out var memberId)
                ? await sender.Send(new OtherSessionCountQuery(memberId, CurrentSessionId()), cancellationToken)
                : 0;
            return ToDto(account, others);
        }

        var displayName = (User.FindFirst("name")?.Value ?? User.Identity.Name ?? string.Empty).Trim();
        var words = displayName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var firstName = User.FindFirst("given_name")?.Value ?? words.FirstOrDefault() ?? string.Empty;
        var initials = words.Length switch
        {
            0 => string.Empty,
            1 => words[0][..1],
            _ => words[0][..1] + words[^1][..1],
        };

        return new SessionDto(true, firstName, displayName, initials.ToUpperInvariant(), null, "confirmed", false, false, 0);
    }
}

public sealed record SessionDto(
    bool SignedIn,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? FirstName,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? DisplayName,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Initials,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Email,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? EmailStatus,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] bool? EmailBounced,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] bool? AgreementRequired,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? OtherSessionCount)
{
    public static readonly SessionDto Visitor = new(false, null, null, null, null, null, null, null, null);
}
