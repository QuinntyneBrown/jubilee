using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Microsoft.AspNetCore.Hosting;

namespace Jubilee.Api.Tests;

/// <summary>The API as it runs outside a developer's machine: not the Development environment.</summary>
public sealed class DeployedApiFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(IWebHostBuilder builder) => builder.UseEnvironment("Staging");
}

/// <summary>The Development environment asked for the prefix all the same (<c>Session:HostPrefix</c>).</summary>
public sealed class HostPrefixApiFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(IWebHostBuilder builder) => builder.UseSetting("Session:HostPrefix", "true");
}

// The member session cookie (L2-135 AC1, ADR 0045): __Host-jubilee.session outside Development.
public abstract class SessionCookieTestsBase(JubileeApiFactory factory) : IAsyncLifetime
{
    private const string Email = "joanna.adeyemi@example.com";
    private const string Password = "correct horse 13";
    private const string Cookie = "__Host-jubilee.session";

    public async Task InitializeAsync()
    {
        await factory.Reset();
        var joined = await factory.CreateClient().PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Joanna",
            lastName = "Adeyemi",
            email = Email,
            password = Password,
            homeChurch = (string?)null,
            agreementAccepted = true,
        });
        Assert.Equal(HttpStatusCode.Created, joined.StatusCode);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Task<HttpResponseMessage> SignIn(HttpClient client, bool keep = false) =>
        client.PostAsJsonAsync("/api/session", new { email = Email, password = Password, keepSignedIn = keep });

    private static string SessionCookie(HttpResponseMessage response) =>
        response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith(Cookie + "=", StringComparison.Ordinal));

    [Fact]
    public async Task L2_135_AC1_the_session_cookie_has_the_host_prefix_and_is_secure_http_only_lax_and_for_the_whole_site()
    {
        var response = await SignIn(factory.CreateHttpsClient());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cookie = SessionCookie(response);
        var attributes = cookie.Split(';').Skip(1).Select(a => a.Trim().ToLowerInvariant()).ToArray();
        Assert.Contains("secure", attributes);
        Assert.Contains("httponly", attributes);
        Assert.Contains("samesite=lax", attributes);
        Assert.Contains("path=/", attributes);
        // A __Host- cookie names no domain: it belongs to the host that set it and to no other.
        Assert.DoesNotContain(attributes, a => a.StartsWith("domain=", StringComparison.Ordinal));
        // The value is opaque and far longer than 128 bits.
        var value = cookie.Split(';')[0][(Cookie.Length + 1)..];
        Assert.True(value.Length >= 43, $"The cookie value is {value.Length} characters.");
        Assert.DoesNotContain("joanna", value, StringComparison.OrdinalIgnoreCase);
        // No cookie is issued under the unprefixed name.
        Assert.DoesNotContain(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("jubilee.session=", StringComparison.Ordinal));
    }

    [Fact]
    public async Task L2_135_AC1_the_prefixed_cookie_is_the_session_it_signs_the_member_in_and_out()
    {
        var client = factory.CreateHttpsClient();
        await SignIn(client);

        var session = await Json(await client.GetAsync("/api/session"));
        Assert.True(session.GetProperty("signedIn").GetBoolean());

        var signedOut = await client.DeleteAsync("/api/session");
        Assert.Equal(HttpStatusCode.NoContent, signedOut.StatusCode);
        // The browser drops a __Host- cookie only when the removal is Secure and for Path=/ as well.
        var removal = SessionCookie(signedOut).ToLowerInvariant();
        Assert.Contains("expires=thu, 01 jan 1970", removal);
        Assert.Contains("secure", removal);
        Assert.Contains("path=/", removal);
        Assert.False((await Json(await client.GetAsync("/api/session"))).GetProperty("signedIn").GetBoolean());
    }

    [Fact]
    public async Task L2_135_AC2_a_state_changing_request_with_the_prefixed_cookie_needs_the_anti_CSRF_token()
    {
        var signedIn = await SignIn(factory.CreateHttpsClient());
        var value = SessionCookie(signedIn).Split(';')[0];
        var forged = factory.CreateDefaultClient(new Uri("https://localhost"));
        forged.DefaultRequestHeaders.Add("Cookie", value);

        var response = await forged.DeleteAsync("/api/session");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("csrf_token_invalid", (await Json(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_116_AC1_a_session_that_ended_is_told_so_and_the_prefixed_cookie_is_removed()
    {
        var client = factory.CreateHttpsClient();
        await SignIn(client);
        factory.Clock.Advance(TimeSpan.FromHours(13));

        var expired = await client.GetAsync("/api/me/navigation");

        Assert.Equal(HttpStatusCode.Unauthorized, expired.StatusCode);
        Assert.Equal("SESSION_EXPIRED", (await Json(expired)).GetProperty("code").GetString());
        var removal = SessionCookie(expired).ToLowerInvariant();
        Assert.Contains("expires=thu, 01 jan 1970", removal);
        Assert.Contains("secure", removal);
        Assert.Contains("path=/", removal);
        // With the cookie gone the caller is a visitor, told to sign in.
        var next = await client.GetAsync("/api/me/navigation");
        Assert.Equal("sign_in_required", (await Json(next)).GetProperty("code").GetString());
    }
}

public sealed class DeployedSessionCookieTests(DeployedApiFactory factory)
    : SessionCookieTestsBase(factory), IClassFixture<DeployedApiFactory>;

public sealed class HostPrefixSettingSessionCookieTests(HostPrefixApiFactory factory)
    : SessionCookieTestsBase(factory), IClassFixture<HostPrefixApiFactory>;

// No cross-origin caller (L2-135 AC3, ADR 0045): the API approves no other origin.
public sealed class CrossOriginTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>
{
    public static TheoryData<string> Origins => new()
    {
        "https://evil.example",
        "https://jubilee.test",
        "https://admin.jubilee.test",
        "null",
    };

    private static void AssertNothingAllowed(HttpResponseMessage response)
    {
        Assert.DoesNotContain(response.Headers, h => h.Key.StartsWith("Access-Control-", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [MemberData(nameof(Origins))]
    public async Task L2_135_AC3_a_read_from_another_origin_is_answered_without_any_permission_to_read_it(string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/session");
        request.Headers.Add("Origin", origin);

        var response = await factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        AssertNothingAllowed(response);
    }

    [Theory]
    [MemberData(nameof(Origins))]
    public async Task L2_135_AC3_a_preflight_from_another_origin_is_not_approved(string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/session");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "DELETE");
        request.Headers.Add("Access-Control-Request-Headers", "x-xsrf-token");

        var response = await factory.CreateClient().SendAsync(request);

        Assert.False(response.IsSuccessStatusCode, $"The preflight was answered {(int)response.StatusCode}.");
        AssertNothingAllowed(response);
    }

    [Fact]
    public async Task L2_135_AC3_a_sign_in_posted_from_another_origin_gets_no_permission_and_no_wildcard()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/session")
        {
            Content = JsonContent.Create(new { email = "nobody@example.com", password = "wrong password", keepSignedIn = false }),
        };
        request.Headers.Add("Origin", "https://evil.example");

        var response = await factory.CreateClient().SendAsync(request);

        AssertNothingAllowed(response);
    }
}
