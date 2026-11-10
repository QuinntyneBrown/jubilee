using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

[ApiController]
[Route("api/session")]
public sealed class SessionController : ControllerBase
{
    /// <summary>Who is calling: a visitor (<c>signedIn: false</c>) or a signed-in member.</summary>
    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public SessionDto Get()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return new SessionDto(false, null, null, null);
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

        return new SessionDto(true, firstName, displayName, initials.ToUpperInvariant());
    }
}

public sealed record SessionDto(
    bool SignedIn,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? FirstName,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? DisplayName,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Initials);
