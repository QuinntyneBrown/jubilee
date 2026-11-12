using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Jubilee.Api.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Tests.Support;

/// <summary>
/// Test-only: starts a real staff session (the <c>Staff</c> scheme and its cookie) without the
/// identity provider, for tests about what a staff session may do rather than how it begins.
/// </summary>
[ApiController]
[Route("api/test/staff-sessions")]
[AllowAnonymous]
public sealed class TestStaffSessionController : ControllerBase
{
    public sealed record Body(string Name, string Subject, string[] Roles);

    [HttpPost]
    public async Task<IActionResult> Start(Body body)
    {
        await HttpContext.SignInStaffAsync(new StaffPrincipal(body.Subject, body.Name, $"{body.Subject}@jubilee.test", body.Roles, null));
        return NoContent();
    }
}

/// <summary>Copies the anti-CSRF cookie into the header of every state-changing request, as the admin application does.</summary>
public sealed partial class CsrfCopyingHandler : DelegatingHandler
{
    [GeneratedRegex("XSRF-TOKEN=([^;]+)")]
    private static partial Regex Token();

    public string? Value { get; set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (Value is not null && request.Method != HttpMethod.Get && !request.Headers.Contains("X-XSRF-TOKEN"))
        {
            request.Headers.Add("X-XSRF-TOKEN", Value);
        }

        var response = await base.SendAsync(request, cancellationToken);
        foreach (var cookie in response.Headers.TryGetValues("Set-Cookie", out var values) ? values : [])
        {
            var match = Token().Match(cookie);
            if (match.Success)
            {
                Value = match.Groups[1].Value;
            }
        }

        return response;
    }
}

public static class StaffClients
{
    /// <summary>A client over HTTPS (the <c>__Host-</c> cookie needs it) holding a staff session with these roles.</summary>
    public static HttpClient CreateStaffClient(this JubileeApiFactory factory, string name, string subject, params string[] roles)
    {
        var client = factory.CreateHttpsClient();
        var response = client.PostAsJsonAsync("/api/test/staff-sessions", new TestStaffSessionController.Body(name, subject, roles))
            .GetAwaiter().GetResult();
        response.EnsureSuccessStatusCode();
        return client;
    }
}
