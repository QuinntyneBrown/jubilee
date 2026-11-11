using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Jubilee.Api.Tests.Support;

/// <summary>
/// Test-only authentication: a request carrying <c>X-Test-User: Given Family</c> is a signed-in
/// member with that name. Requests without the header stay anonymous and are challenged by the
/// API's own default scheme.
/// </summary>
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string UserHeader = "X-Test-User";

    /// <summary>Set on a client whose real session cookie should authenticate it.</summary>
    public const string CookieSessionHeader = "X-Test-Cookie-Session";

    /// <summary>The session's subject; without it the subject follows from the name.</summary>
    public const string SubjectHeader = "X-Test-Subject";

    /// <summary>A role of the session, for example <c>verifier</c>.</summary>
    public const string RoleHeader = "X-Test-Role";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(UserHeader, out var values) || string.IsNullOrWhiteSpace(values))
        {
            // A client that asks for it (CookieSessionHeader) is read by its real session cookie, from joining or signing in.
            if (!Request.Headers.ContainsKey(CookieSessionHeader))
            {
                return AuthenticateResult.NoResult();
            }

            return await Context.AuthenticateAsync(Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme);
        }

        var name = values.ToString();
        var subject = Request.Headers.TryGetValue(SubjectHeader, out var subjects) && !string.IsNullOrWhiteSpace(subjects)
            ? subjects.ToString()
            : $"test|{name}";
        List<Claim> claims =
        [
            new Claim("sub", subject),
            new Claim("name", name),
            new Claim("given_name", name.Split(' ')[0]),
        ];
        if (Request.Headers.TryGetValue(RoleHeader, out var roles) && !string.IsNullOrWhiteSpace(roles))
        {
            claims.Add(new Claim("role", roles.ToString()));
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName));
    }
}
