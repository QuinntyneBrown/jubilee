using System.Text.Json.Serialization;
using Jubilee.Api.Middleware;
using Jubilee.Application.Accounts;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

[ApiController]
[Route("api/session")]
public sealed class SessionController(ISender sender) : ControllerBase
{
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
            return new SessionDto(
                true, account.FirstName, account.DisplayName, account.Initials,
                account.Email, account.EmailStatus, account.EmailBounced, account.AgreementRequired, User.ToViewer().IsVerifier);
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

        return new SessionDto(true, firstName, displayName, initials.ToUpperInvariant(), null, "confirmed", false, false, User.ToViewer().IsVerifier);
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
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] bool? IsVerifier = null)
{
    public static readonly SessionDto Visitor = new(false, null, null, null, null, null, null, null);
}
