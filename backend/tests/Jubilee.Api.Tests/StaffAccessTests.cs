using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-191, L2-098, L2-133
// Description: the admin-only endpoints answer only a staff session; a member session, whatever it
// carries, is refused with 403 STAFF_SESSION_REQUIRED, and no session with 401.
public sealed class StaffAccessTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public StaffAccessTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static readonly Guid Any = Guid.Parse("3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f");

    /// <summary>Every admin-only endpoint, as (method, path, body).</summary>
    public static TheoryData<string, string> Endpoints => new()
    {
        { "GET", "/api/admin/listings" },
        { "GET", $"/api/admin/listings/{Any}" },
        { "POST", $"/api/admin/listings/{Any}/take-down" },
        { "GET", "/api/admin/audit" },
        { "GET", "/api/admin/reports" },
        { "POST", $"/api/admin/reports/{Any}/open" },
        { "POST", $"/api/admin/reports/{Any}/actions" },
        { "GET", "/api/admin/featured" },
        { "GET", "/api/admin/featured/candidates" },
        { "PUT", "/api/admin/featured-weeks/2026-11-16" },
        { "GET", "/api/admin/content" },
        { "GET", "/api/admin/content/terms" },
        { "GET", "/api/admin/content/terms/versions" },
        { "POST", "/api/admin/content/terms/versions" },
    };

    private static HttpRequestMessage Request(string method, string path) =>
        new(new HttpMethod(method), path) { Content = method == "GET" ? null : JsonContent.Create(new { }) };

    private static async Task<string?> Code(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.TryGetProperty("code", out var code)
            ? code.GetString()
            : null;

    // L2-191 AC1
    [Theory]
    [MemberData(nameof(Endpoints))]
    public async Task L2_191_AC1_without_any_session_an_admin_endpoint_answers_401(string method, string path)
    {
        var response = await _factory.CreateClient().SendAsync(Request(method, path));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("sign_in_required", await Code(response));
    }

    // L2-191 AC2, AC5; L2-133 AC5
    [Theory]
    [MemberData(nameof(Endpoints))]
    public async Task L2_191_AC2_a_member_session_is_refused_whatever_role_it_carries(string method, string path)
    {
        foreach (var role in new string?[] { null, "moderator", "admin" })
        {
            var member = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna", role);

            var response = await member.SendAsync(Request(method, path));

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.Equal("STAFF_SESSION_REQUIRED", await Code(response));
        }
    }

    // L2-191 AC2: nothing happens
    [Fact]
    public async Task L2_191_AC2_a_member_session_that_claims_the_moderator_role_changes_nothing()
    {
        var listing = ListingMother.Public("ready-co", "shops");
        await _factory.Arrange(listing);
        var member = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna", "moderator");

        await member.PostAsJsonAsync($"/api/admin/listings/{listing.Id}/take-down", new { reason = "x" });

        await _factory.WithDb(async db =>
            Assert.Null((await db.Listings.FindAsync(listing.Id))!.DeletedAt));
    }

    // L2-191 AC2, L2-143 AC1
    [Fact]
    public async Task L2_191_AC2_the_refusal_of_a_member_session_is_logged_as_a_failed_authorization()
    {
        await _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna").GetAsync("/api/admin/listings");

        var entry = Assert.Single(_factory.Logs.Entries, e => e.Message.Contains("Failed authorization"));
        Assert.Contains("STAFF_SESSION_REQUIRED", entry.Message);
        Assert.Contains("member|joanna", entry.Message);
        Assert.Contains("/api/admin/listings", entry.Message);
    }

    // L2-191 AC3
    [Fact]
    public async Task L2_191_AC3_a_staff_session_with_the_moderator_role_reaches_the_queue()
    {
        var esther = _factory.CreateStaffClient("Esther Mensah", "member|esther", "moderator");

        var response = await esther.GetAsync("/api/admin/listings");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // L2-191 AC3
    [Fact]
    public async Task L2_191_AC3_a_staff_session_without_the_moderator_role_is_forbidden_from_the_jubilee_team_endpoints()
    {
        var ada = _factory.CreateStaffClient("Ada Admin", "staff|ada", "admin");

        var response = await ada.GetAsync("/api/admin/listings");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("FORBIDDEN", await Code(response));
    }

    // L2-191 AC3
    [Fact]
    public async Task L2_191_AC3_a_staff_session_without_the_admin_role_is_forbidden_from_the_administrator_endpoints()
    {
        var esther = _factory.CreateStaffClient("Esther Mensah", "member|esther", "moderator");
        var ada = _factory.CreateStaffClient("Ada Admin", "staff|ada", "admin");

        var refused = await esther.GetAsync("/api/admin/audit");
        var allowed = await ada.GetAsync("/api/admin/audit");

        Assert.Equal(HttpStatusCode.Forbidden, refused.StatusCode);
        Assert.Equal("FORBIDDEN", await Code(refused));
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
    }

    // L2-191 AC4
    [Fact]
    public async Task L2_191_AC4_a_staff_session_is_never_a_member_session()
    {
        var esther = _factory.CreateStaffClient("Esther Mensah", "member|esther", "moderator");

        var response = await esther.GetAsync("/api/me/navigation");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // L2-191 AC4: the state-changing request of a staff session carries the anti-CSRF token (L2-135)
    [Fact]
    public async Task L2_191_a_staff_write_without_the_anti_csrf_token_is_refused()
    {
        var esther = _factory.CreateStaffClient("Esther Mensah", "member|esther", "moderator");
        var request = new HttpRequestMessage(HttpMethod.Put, "/api/admin/featured-weeks/2026-11-16")
        {
            Content = JsonContent.Create(new { listingIds = Array.Empty<Guid>() }),
        };
        request.Headers.Add("X-XSRF-TOKEN", "forged");

        var response = await esther.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("csrf_token_invalid", await Code(response));
    }

    // L2-190 AC7
    [Fact]
    public async Task L2_190_AC7_the_staff_session_endpoint_answers_the_staff_member()
    {
        var ada = _factory.CreateStaffClient("Ada Admin", "staff|ada", "admin");

        var session = await _factory.GetJson("/api/staff/session", ada);

        Assert.Equal("Ada Admin", session.GetProperty("displayName").GetString());
        Assert.Equal("AA", session.GetProperty("initials").GetString());
        Assert.Equal("staff|ada@jubilee.test", session.GetProperty("email").GetString());
        Assert.Equal(["admin"], session.GetProperty("roles").EnumerateArray().Select(r => r.GetString()));
        Assert.False(session.TryGetProperty("verificationCount", out _));
    }

    // L2-190 AC7, L2-191 AC4
    [Fact]
    public async Task L2_190_AC7_without_a_staff_session_the_staff_session_endpoint_answers_401()
    {
        var anonymous = await _factory.CreateClient().GetAsync("/api/staff/session");
        var member = await _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna", "moderator").GetAsync("/api/staff/session");

        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal("sign_in_required", await Code(anonymous));
        Assert.Equal(HttpStatusCode.Unauthorized, member.StatusCode);
    }

    // L2-190 AC2, AC3
    [Fact]
    public async Task L2_190_AC2_a_staff_session_ends_after_30_minutes_without_a_request()
    {
        var esther = _factory.CreateStaffClient("Esther Mensah", "member|esther", "moderator");

        _factory.Clock.Advance(TimeSpan.FromMinutes(29));
        var active = await esther.GetAsync("/api/staff/session");
        _factory.Clock.Advance(TimeSpan.FromMinutes(31));
        var ended = await esther.GetAsync("/api/admin/listings");

        Assert.Equal(HttpStatusCode.OK, active.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, ended.StatusCode);
        Assert.Equal("SESSION_EXPIRED", await Code(ended));
    }

    // L2-190 AC2
    [Fact]
    public async Task L2_190_AC2_a_staff_session_ends_8_hours_after_sign_in_however_active()
    {
        var esther = _factory.CreateStaffClient("Esther Mensah", "member|esther", "moderator");

        for (var i = 0; i < 16; i++)
        {
            _factory.Clock.Advance(TimeSpan.FromMinutes(29));
            Assert.Equal(HttpStatusCode.OK, (await esther.GetAsync("/api/staff/session")).StatusCode);
        }

        _factory.Clock.Advance(TimeSpan.FromMinutes(29)); // 8 h 3 min after sign-in
        var ended = await esther.GetAsync("/api/staff/session");

        Assert.Equal(HttpStatusCode.Unauthorized, ended.StatusCode);
        Assert.Equal("SESSION_EXPIRED", await Code(ended));
    }

    // L2-190 AC1
    [Fact]
    public async Task L2_190_AC1_the_staff_cookie_is_a_host_only_secure_strict_session_cookie()
    {
        var client = _factory.CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            "/api/test/staff-sessions", new TestStaffSessionController.Body("Esther Mensah", "member|esther", ["moderator"]));

        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("__Host-jubilee.staff=", StringComparison.Ordinal));
        Assert.Contains("path=/", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("expires", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("domain", cookie, StringComparison.OrdinalIgnoreCase);
    }

    // L2-190 AC4, AC5
    [Fact]
    public async Task L2_190_AC4_signing_out_ends_the_staff_session_on_the_server()
    {
        var esther = _factory.CreateStaffClient("Esther Mensah", "member|esther", "moderator");
        var cookie = (await esther.GetAsync("/api/staff/session")).RequestMessage!.Headers.GetValues("Cookie").Single();

        var signOut = await esther.DeleteAsync("/api/staff/session");
        var replay = new HttpRequestMessage(HttpMethod.Get, "/api/staff/session");
        replay.Headers.Add("Cookie", cookie);
        var replayed = await _factory.CreateHttpsClient().SendAsync(replay);

        Assert.Equal(HttpStatusCode.NoContent, signOut.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, replayed.StatusCode);
    }
}
