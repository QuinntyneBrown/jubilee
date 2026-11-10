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

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(UserHeader, out var values) || string.IsNullOrWhiteSpace(values))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var name = values.ToString();
        var identity = new ClaimsIdentity(
            [
                new Claim("sub", Guid.NewGuid().ToString()),
                new Claim("name", name),
                new Claim("given_name", name.Split(' ')[0]),
            ],
            SchemeName);
        return Task.FromResult(
            AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}
