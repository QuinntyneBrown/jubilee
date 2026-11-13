using System.Security.Claims;
using Jubilee.Api.Controllers;
using Jubilee.Api.Errors;
using Jubilee.Api.Middleware;
using Jubilee.Domain;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;

namespace Jubilee.Api.Sessions;

/// <summary>Who a staff session is for: the subject the handlers see, the name, the address and the roles (ADR 0040).</summary>
public sealed record StaffPrincipal(string Subject, string Name, string Email, IReadOnlyCollection<string> Roles, Guid? StaffMemberId);

/// <summary>
/// The staff session (L2-190): a second cookie scheme beside the members' default one. Its cookie
/// is <c>__Host-jubilee.staff</c> (HttpOnly, Secure, SameSite=Strict, no expiry) and its ticket is
/// kept by <see cref="StaffTicketStore"/>. Only the admin-only endpoints authenticate it, so a staff
/// session is never a member session (L2-191 AC4).
/// </summary>
public static class StaffSession
{
    public const string Scheme = "Staff";
    public const string CookieName = "__Host-jubilee.staff";

    /// <summary>The id of the staff account, on a staff session only.</summary>
    public const string StaffIdClaim = "jb_staff";

    public const string RoleClaim = "role";

    /// <summary>Starts a staff session with a new identifier (no session fixation, L2-190 AC1).</summary>
    public static async Task SignInStaffAsync(this HttpContext context, StaffPrincipal staff)
    {
        List<Claim> claims =
        [
            new("sub", staff.Subject),
            new("name", staff.Name),
            new("email", staff.Email),
            new(SessionClaims.IssuedAt, context.RequestServices.GetRequiredService<TimeProvider>().GetUtcNow().UtcTicks.ToString()),
        ];
        claims.AddRange(staff.Roles.Select(role => new Claim(RoleClaim, role)));
        if (staff.StaffMemberId is { } id)
        {
            claims.Add(new Claim(StaffIdClaim, id.ToString()));
        }

        await context.SignInAsync(
            Scheme,
            new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme, "name", RoleClaim)),
            new AuthenticationProperties { IsPersistent = false });
        CsrfToken.Issue(context);
    }

    public static void Configure(CookieAuthenticationOptions options)
    {
        options.Cookie.Name = CookieName;
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.Path = "/";
        options.ExpireTimeSpan = SessionPolicy.StaffAbsoluteLifetime;
        options.SlidingExpiration = false;
        options.Events.OnRedirectToLogin = ChallengeAsync;
        options.Events.OnRedirectToAccessDenied = ForbidAsync;
    }

    /// <summary>
    /// No staff session: a member session is told it is the wrong kind (403 STAFF_SESSION_REQUIRED,
    /// L2-191 AC2), an ended staff session is told so (401 SESSION_EXPIRED, L2-190 AC3), and anyone
    /// else is asked to sign in (401, L2-191 AC1).
    /// </summary>
    private static async Task ChallengeAsync(RedirectContext<CookieAuthenticationOptions> context)
    {
        var http = context.HttpContext;
        var member = await http.AuthenticateAsync();
        if (member.Succeeded)
        {
            LogRefusal(http, "STAFF_SESSION_REQUIRED", member.Principal);
            await ProblemWriter.WriteAsync(
                http, StatusCodes.Status403Forbidden, "This is for the Jubilee staff.",
                "Sign in to the admin application with your staff account.", code: "STAFF_SESSION_REQUIRED");
            return;
        }

        var ended = http.Request.Cookies.ContainsKey(CookieName);
        if (ended)
        {
            http.Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/", Secure = true, SameSite = SameSiteMode.Strict });
        }

        await ProblemWriter.WriteAsync(
            http, StatusCodes.Status401Unauthorized, "Sign in to continue.", code: ended ? "SESSION_EXPIRED" : "sign_in_required");
    }

    /// <summary>A staff session without the role the endpoint needs (403 FORBIDDEN, L2-191 AC3).</summary>
    private static Task ForbidAsync(RedirectContext<CookieAuthenticationOptions> context)
    {
        LogRefusal(context.HttpContext, "FORBIDDEN", context.HttpContext.User);
        return ProblemWriter.WriteAsync(
            context.HttpContext, StatusCodes.Status403Forbidden, "You don't have access to this.",
            "Your staff account does not hold the role this needs.", code: "FORBIDDEN");
    }

    /// <summary>A failed authorization is a security event (L2-143 AC1).</summary>
    private static void LogRefusal(HttpContext http, string code, ClaimsPrincipal? caller) =>
        http.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(StaffSession)).LogWarning(
            "Failed authorization ({Code}) for {Actor} from {Address} on {Method} {Path}. CorrelationId {CorrelationId}",
            code,
            caller?.FindFirst("sub")?.Value ?? "anonymous",
            http.Connection.RemoteIpAddress,
            http.Request.Method,
            LoggedPath.Of(http),
            http.TraceIdentifier);

    /// <summary>True when the caller is a staff session; member-only rules (the agreement) do not apply to it.</summary>
    public static bool IsStaff(this ClaimsPrincipal user) =>
        user.Identities.Any(i => i.IsAuthenticated && i.AuthenticationType == Scheme);
}

/// <summary>The two staff policies: a staff session, authenticated by the staff scheme only, holding the role (L2-191).</summary>
public static class StaffPolicies
{
    public const string Moderator = "staff-moderator";
    public const string Admin = "staff-admin";

    public static AuthorizationBuilder AddStaffPolicies(this AuthorizationBuilder builder) => builder
        .AddPolicy(Moderator, Policy(Application.Abstractions.Viewer.ModeratorRole))
        .AddPolicy(Admin, Policy("admin"));

    private static AuthorizationPolicy Policy(string role) => new AuthorizationPolicyBuilder(StaffSession.Scheme)
        .RequireAuthenticatedUser()
        .RequireClaim(StaffSession.RoleClaim, role)
        .Build();
}
