using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Jubilee.Api.Tests.Support;
using Microsoft.Extensions.Logging;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-143 AC3, L2-133 AC2, L2-133 AC5
// Description: "Where you're signed in" lists the member's live sessions, this device first, each with
// its device, its network with the last part hidden and when it was last active; any other session is
// signed out on its own; another member's session is not found, changes nothing and is logged (ADR 0065).
public sealed partial class AccountSessionsTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Joanna = "joanna.adeyemi@example.com";
    private const string Naomi = "naomi.laurent@example.com";
    private const string Password = "correct horse 13";
    private const string IPhone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
    private const string WindowsChrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    private const string MacFirefox = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:132.0) Gecko/20100101 Firefox/132.0";

    private readonly JubileeApiFactory _factory;

    public AccountSessionsTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        await Join("Joanna", "Adeyemi", Joanna);
        await Join("Naomi", "Laurent", Naomi);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task Join(string first, string last, string email)
    {
        var client = _factory.CreateClient();
        var joined = await client.PostAsJsonAsync("/api/account/join", new
        {
            firstName = first,
            lastName = last,
            email,
            password = Password,
            agreementAccepted = true,
        });
        Assert.Equal(HttpStatusCode.Created, joined.StatusCode);

        // Joining signs in; that browser signs out, so each test starts with no session.
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", XsrfToken().Match(string.Join(';', joined.Headers.GetValues("Set-Cookie"))).Groups[1].Value);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/session")).StatusCode);
    }

    /// <summary>A browser with its own cookie jar, signed in from <paramref name="address"/> with <paramref name="userAgent"/>.</summary>
    private async Task<HttpClient> SignedIn(string email, string? userAgent, string address)
    {
        var client = _factory.CreateClient();
        if (userAgent is not null)
        {
            client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", userAgent);
        }

        client.DefaultRequestHeaders.Add(JubileeApiFactory.RemoteAddressHeader, address);
        var response = await client.PostAsJsonAsync("/api/session", new { email, password = Password, keepSignedIn = false });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", XsrfToken().Match(string.Join(';', response.Headers.GetValues("Set-Cookie"))).Groups[1].Value);
        return client;
    }

    [GeneratedRegex("XSRF-TOKEN=([^;]+)")]
    private static partial Regex XsrfToken();

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static async Task<JsonElement[]> Sessions(HttpClient client)
    {
        var response = await client.GetAsync("/api/account/sessions");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return [.. (await Json(response)).EnumerateArray()];
    }

    private static async Task<bool> IsSignedIn(HttpClient client) =>
        (await Json(await client.GetAsync("/api/session"))).GetProperty("signedIn").GetBoolean();

    [Fact]
    public async Task L2_143_AC3_the_member_sees_each_device_with_its_network_and_last_activity_and_this_device_first()
    {
        var laptop = await SignedIn(Joanna, WindowsChrome, "198.51.100.7");
        await SignedIn(Naomi, MacFirefox, "192.0.2.44");
        var phone = await SignedIn(Joanna, IPhone, "203.0.113.18");

        var response = await phone.GetAsync("/api/account/sessions");
        var body = await response.Content.ReadAsStringAsync();
        var sessions = await Sessions(phone);

        Assert.Equal(2, sessions.Length);
        Assert.Equal("Safari on iPhone", sessions[0].GetProperty("device").GetString());
        Assert.Equal("203.0.113.x", sessions[0].GetProperty("network").GetString());
        Assert.True(sessions[0].GetProperty("current").GetBoolean());
        Assert.Equal("Chrome on Windows", sessions[1].GetProperty("device").GetString());
        Assert.Equal("198.51.100.x", sessions[1].GetProperty("network").GetString());
        Assert.False(sessions[1].GetProperty("current").GetBoolean());
        Assert.True(sessions[1].TryGetProperty("lastActiveAt", out var lastActive) && lastActive.ValueKind == JsonValueKind.String);
        Assert.DoesNotContain("203.0.113.18", body, StringComparison.Ordinal);
        Assert.DoesNotContain("198.51.100.7", body, StringComparison.Ordinal);
        Assert.DoesNotContain("192.0.2", body, StringComparison.Ordinal);
        Assert.Equal("Chrome on Windows", (await Sessions(laptop))[0].GetProperty("device").GetString());
    }

    [Theory]
    [InlineData(MacFirefox, "Firefox on macOS")]
    [InlineData("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0", "Edge on Windows")]
    [InlineData("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36", "Chrome on Android")]
    [InlineData("Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1", "Safari on iPad")]
    [InlineData("curl/8.4.0", "Unknown browser")]
    [InlineData(null, "Unknown browser")]
    public async Task L2_143_AC3_the_device_names_the_browser_and_the_system(string? userAgent, string device)
    {
        var client = await SignedIn(Joanna, userAgent, "203.0.113.18");

        Assert.Equal(device, (await Sessions(client))[0].GetProperty("device").GetString());
    }

    [Fact]
    public async Task L2_143_AC3_an_ipv6_network_keeps_its_first_three_groups()
    {
        var client = await SignedIn(Joanna, IPhone, "2001:db8:85a3:8d3:1319:8a2e:370:7348");

        Assert.Equal("2001:db8:85a3::", (await Sessions(client))[0].GetProperty("network").GetString());
    }

    [Fact]
    public async Task L2_143_AC3_signing_out_one_device_ends_that_session_only_and_says_so_again_when_repeated()
    {
        var laptop = await SignedIn(Joanna, WindowsChrome, "198.51.100.7");
        var tablet = await SignedIn(Joanna, MacFirefox, "198.51.100.9");
        var phone = await SignedIn(Joanna, IPhone, "203.0.113.18");
        var id = (await Sessions(phone)).Single(s => s.GetProperty("device").GetString() == "Chrome on Windows").GetProperty("id").GetString();
        _factory.Logs.Clear();

        var ended = await phone.DeleteAsync($"/api/account/sessions/{id}");
        var again = await phone.DeleteAsync($"/api/account/sessions/{id}");

        Assert.Equal(HttpStatusCode.NoContent, ended.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.False(await IsSignedIn(laptop));
        Assert.True(await IsSignedIn(tablet));
        Assert.True(await IsSignedIn(phone));
        Assert.Equal(["Safari on iPhone", "Firefox on macOS"], (await Sessions(phone)).Select(s => s.GetProperty("device").GetString()));
        Assert.Contains(_factory.Logs.Entries, e =>
            e.Message.Contains("Security event: SessionEnded", StringComparison.Ordinal)
            && e.Message.Contains(id!, StringComparison.Ordinal)
            && e.Message.Contains("203.0.113.18", StringComparison.Ordinal));
    }

    [Fact]
    public async Task L2_143_AC3_a_session_that_signed_out_is_not_listed()
    {
        var laptop = await SignedIn(Joanna, WindowsChrome, "198.51.100.7");
        var phone = await SignedIn(Joanna, IPhone, "203.0.113.18");

        Assert.Equal(HttpStatusCode.NoContent, (await laptop.DeleteAsync("/api/session")).StatusCode);

        Assert.Single(await Sessions(phone));
    }

    [Fact]
    public async Task L2_133_AC2_another_members_session_is_not_found_changes_nothing_and_the_attempt_is_logged()
    {
        var laptop = await SignedIn(Joanna, WindowsChrome, "198.51.100.7");
        var naomi = await SignedIn(Naomi, MacFirefox, "192.0.2.44");
        var id = (await Sessions(laptop))[0].GetProperty("id").GetString();
        _factory.Logs.Clear();

        var refused = await naomi.DeleteAsync($"/api/account/sessions/{id}");
        var unknown = await naomi.DeleteAsync($"/api/account/sessions/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, refused.StatusCode);
        Assert.Equal("session_not_found", (await Json(refused)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.True(await IsSignedIn(laptop));
        var attempt = Assert.Single(_factory.Logs.Entries, e =>
            e.Level == LogLevel.Warning
            && e.Message.Contains("session_not_found", StringComparison.Ordinal)
            && e.Message.Contains($"/api/account/sessions/{id}", StringComparison.Ordinal));
        Assert.Contains("192.0.2.44", attempt.Message, StringComparison.Ordinal);
        Assert.Contains("DELETE", attempt.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task L2_133_AC5_a_visitor_can_neither_list_nor_end_a_session()
    {
        var laptop = await SignedIn(Joanna, WindowsChrome, "198.51.100.7");
        var id = (await Sessions(laptop))[0].GetProperty("id").GetString();
        var visitor = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync("/api/account/sessions")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.DeleteAsync($"/api/account/sessions/{id}")).StatusCode);
        Assert.True(await IsSignedIn(laptop));
    }
}
