using Jubilee.Api.Errors;
using Jubilee.Api.Sessions;
using Jubilee.Application.Staff;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>The staff session of the admin application: who is signed in, and signing out (L2-190).</summary>
[ApiController]
[Route("api/staff/session")]
[AllowAnonymous]
public sealed class StaffSessionController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Current(CancellationToken cancellationToken)
    {
        var result = await HttpContext.AuthenticateAsync(StaffSession.Scheme);
        if (!result.Succeeded)
        {
            // A member session is no staff session (L2-191 AC4); an ended staff cookie says so (L2-190 AC3).
            var ended = Request.Cookies.ContainsKey(StaffSession.CookieName);
            await ProblemWriter.WriteAsync(
                HttpContext, StatusCodes.Status401Unauthorized, "Sign in to continue.", code: ended ? "SESSION_EXPIRED" : "sign_in_required");
            return new EmptyResult();
        }

        var user = result.Principal!;
        return Ok(await sender.Send(
            new GetStaffSessionQuery(
                user.FindFirst("name")?.Value ?? "",
                user.FindFirst("email")?.Value ?? "",
                user.FindAll(StaffSession.RoleClaim).Select(c => c.Value).ToList()),
            cancellationToken));
    }

    /// <summary>"Sign out": ends the staff session on the server and removes the cookie (L2-190 AC4); a member session is untouched (AC5).</summary>
    [HttpDelete]
    public async Task<IActionResult> End()
    {
        await HttpContext.SignOutAsync(StaffSession.Scheme);
        return NoContent();
    }
}
