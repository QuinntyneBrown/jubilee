using System.Security.Claims;
using Jubilee.Application.Abstractions;

namespace Jubilee.Api.Controllers;

public static class ViewerClaims
{
    /// <summary>The caller as the session's claims describe them; a caller without a session is a visitor.</summary>
    public static Viewer ToViewer(this ClaimsPrincipal user)
    {
        if (user.Identity?.IsAuthenticated != true)
        {
            return Viewer.Visitor;
        }

        var subject = user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(subject))
        {
            return Viewer.Visitor;
        }

        var isModerator = user.FindAll("role").Concat(user.FindAll(ClaimTypes.Role))
            .Any(c => string.Equals(c.Value, Viewer.ModeratorRole, StringComparison.Ordinal));
        return new Viewer(subject, isModerator);
    }
}
