using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-192, L2-189 AC8
// Description: the staff endpoints answer only callers on an allowed network, decided from the address
// the trusted proxy wrote, before any authentication; other endpoints are not restricted.
// The test allow-list is 127.0.0.1, ::1, 10.0.0.0/8 and 2001:db8::/32 (JubileeApiFactory).
public sealed class NetworkRestrictionTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Outside = "203.0.113.5";
    private const string AdminHostOutbound = "20.40.60.80";

    private readonly JubileeApiFactory _factory;

    public NetworkRestrictionTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static HttpRequestMessage From(string address, string path, params (string Name, string Value)[] headers)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add(JubileeApiFactory.RemoteAddressHeader, address);
        foreach (var (name, value) in headers)
        {
            request.Headers.Add(name, value);
        }

        return request;
    }

    private static async Task<string?> Code(HttpResponseMessage response) =>
        (await response.Content.ReadAsStringAsync()) is { Length: > 0 } body
        && JsonDocument.Parse(body).RootElement.TryGetProperty("code", out var code)
            ? code.GetString()
            : null;

    // L2-192 AC1, L2-189 AC8
    [Theory]
    [InlineData("/api/admin/verifications")]
    [InlineData("/api/admin/reports")]
    [InlineData("/api/staff/session")]
    [InlineData("/api/staff/sign-in/start")]
    [InlineData("/api/staff/sign-in/callback?state=x&code=y")]
    public async Task L2_192_AC1_a_caller_outside_the_allow_list_is_refused_on_every_staff_endpoint(string path)
    {
        var response = await _factory.CreateClient().SendAsync(From(Outside, path));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("NETWORK_NOT_ALLOWED", await Code(response));
    }

    // L2-192 AC1: before authentication, whatever the request carries
    [Fact]
    public async Task L2_192_AC1_the_network_is_checked_before_any_session()
    {
        var member = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna", "verifier");
        var staff = _factory.CreateStaffClient("Esther Mensah", "member|esther", "verifier");

        var asMember = await member.SendAsync(From(Outside, "/api/admin/verifications"));
        var asStaff = await staff.SendAsync(From(Outside, "/api/admin/verifications"));

        Assert.Equal("NETWORK_NOT_ALLOWED", await Code(asMember));
        Assert.Equal("NETWORK_NOT_ALLOWED", await Code(asStaff));
        Assert.Contains(_factory.Logs.Entries, e => e.Message.Contains("NETWORK_NOT_ALLOWED") && e.Message.Contains(Outside));
    }

    // L2-192 AC1: addresses and ranges, IPv4 and IPv6
    [Theory]
    [InlineData("10.1.2.3")]
    [InlineData("::ffff:10.1.2.3")]
    [InlineData("2001:db8::7")]
    [InlineData("::1")]
    public async Task L2_192_AC1_a_caller_inside_the_allow_list_reaches_the_staff_endpoint(string address)
    {
        var staff = _factory.CreateStaffClient("Esther Mensah", "member|esther", "verifier");

        var response = await staff.SendAsync(From(address, "/api/admin/verifications"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // L2-192 AC7
    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/session")]
    [InlineData("/api/directory")]
    public async Task L2_192_AC7_endpoints_that_are_not_staff_endpoints_are_not_restricted(string path)
    {
        var response = await _factory.CreateClient().SendAsync(From(Outside, path));

        Assert.NotEqual("NETWORK_NOT_ALLOWED", await Code(response));
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // L2-192 AC4: X-Forwarded-For is trusted only from the loopback proxy, and only its last entry
    [Theory]
    [InlineData("127.0.0.1", "10.1.2.3, 203.0.113.5", false)] // a forged first entry; App Service appended the caller
    [InlineData("127.0.0.1", "203.0.113.9, 10.1.2.3", true)] // the last entry is the caller
    [InlineData(Outside, "10.1.2.3", false)] // not from the loopback proxy: the header is not believed
    public async Task L2_192_AC4_only_the_trusted_proxy_decides_the_callers_address(string peer, string forwardedFor, bool allowed)
    {
        var staff = _factory.CreateStaffClient("Esther Mensah", "member|esther", "verifier");

        var response = await staff.SendAsync(From(peer, "/api/admin/verifications", ("X-Forwarded-For", forwardedFor)));

        Assert.Equal(allowed ? HttpStatusCode.OK : HttpStatusCode.Forbidden, response.StatusCode);
    }

    // L2-192 AC2, AC4: through the admin host, which proves itself with the proxy key
    [Theory]
    [InlineData(JubileeApiFactory.StaffProxyKey, "10.1.2.3", true)]
    [InlineData(JubileeApiFactory.StaffProxyKey, Outside, false)]
    [InlineData("a-guess", "10.1.2.3", false)]
    [InlineData("", "10.1.2.3", false)]
    public async Task L2_192_AC2_the_admin_hosts_proxy_states_the_staff_members_address_only_with_the_key(
        string key, string clientAddress, bool allowed)
    {
        var staff = _factory.CreateStaffClient("Esther Mensah", "member|esther", "verifier");

        var response = await staff.SendAsync(From(
            "127.0.0.1",
            "/api/admin/verifications",
            ("X-Forwarded-For", AdminHostOutbound),
            ("X-Jubilee-Client-Address", clientAddress),
            ("X-Jubilee-Proxy-Key", key)));

        Assert.Equal(allowed ? HttpStatusCode.OK : HttpStatusCode.Forbidden, response.StatusCode);
    }

    // L2-192 AC4: the address header alone is never believed
    [Fact]
    public async Task L2_192_AC4_a_client_address_header_without_the_key_is_ignored()
    {
        var response = await _factory.CreateClient().SendAsync(From(
            Outside, "/api/staff/session", ("X-Jubilee-Client-Address", "10.1.2.3")));

        Assert.Equal("NETWORK_NOT_ALLOWED", await Code(response));
    }
}

// Acceptance Test
// Traces to: L2-192 AC3
// Description: an empty or missing allow-list refuses everyone.
public sealed class EmptyAllowListTests
{
    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task L2_192_AC3_without_an_allow_list_every_staff_endpoint_is_refused(string? list)
    {
        using var factory = new JubileeApiFactory();
        using var configured = factory.WithWebHostBuilder(builder => builder.UseSetting("StaffAccess:AllowedNetworks", list));

        var response = await configured.CreateClient().GetAsync("/api/staff/session");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains("NETWORK_NOT_ALLOWED", await response.Content.ReadAsStringAsync());
    }

    // L2-192: an allow-list that does not parse stops the API rather than guessing
    [Fact]
    public void L2_192_an_entry_that_is_not_an_address_or_a_range_stops_the_api()
    {
        using var factory = new JubileeApiFactory();
        using var configured = factory.WithWebHostBuilder(builder => builder.UseSetting("StaffAccess:AllowedNetworks", "10.0.0.0/8, office"));

        var refused = Assert.ThrowsAny<Exception>(() => configured.CreateClient());

        Assert.Contains("office", refused.GetBaseException().Message);
    }
}
