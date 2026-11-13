using System.Net;
using System.Net.Http.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-189, L2-190, L2-193
// Description: staff sign in through single sign-on only; the API proves the second factor, finds the
// staff account and binds it, and starts a staff session.
public sealed class StaffSignInTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public StaffSignInTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _factory.StaffDirectory.Reset();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private Task Grant(string email, StaffRoles roles) => _factory.WithDb(async db =>
    {
        var account = StaffMember.Create(EmailAddress.TryParse(email)!, ListingMother.Now);
        account.Grant(roles);
        db.StaffMembers.Add(account);
        await db.SaveChangesAsync();
    });

    /// <summary>Presses the button, signs in at the directory and comes back; answers the callback's response.</summary>
    private async Task<(HttpClient Client, HttpResponseMessage Callback)> SignIn(string? returnUrl = null, string? error = null)
    {
        var client = _factory.CreateHttpsClient();
        var start = await client.GetAsync("/api/staff/sign-in/start" + (returnUrl is null ? "" : $"?returnUrl={Uri.EscapeDataString(returnUrl)}"));
        Assert.Equal(HttpStatusCode.Redirect, start.StatusCode);
        var state = _factory.StaffDirectory.QueryValue("state");
        var callback = await client.GetAsync(
            $"/api/staff/sign-in/callback?state={state}" + (error is null ? "&code=the-code" : $"&error={error}"));
        return (client, callback);
    }

    private static bool HasStaffCookie(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Set-Cookie", out var cookies)
        && cookies.Any(c => c.StartsWith("__Host-jubilee.staff=", StringComparison.Ordinal) && !c.Contains("expires=Thu, 01 Jan 1970"));

    // L2-189 AC2, AC8
    [Fact]
    public async Task L2_189_AC2_the_button_sends_the_browser_to_the_directory_with_state_nonce_and_pkce()
    {
        var start = await _factory.CreateHttpsClient().GetAsync("/api/staff/sign-in/start?returnUrl=%2Freports");

        Assert.Equal(HttpStatusCode.Redirect, start.StatusCode);
        Assert.Equal(_factory.StaffDirectory.LastUrl, start.Headers.Location);
        Assert.NotEmpty(_factory.StaffDirectory.QueryValue("state"));
        Assert.NotEmpty(_factory.StaffDirectory.QueryValue("nonce"));
        Assert.NotEmpty(_factory.StaffDirectory.QueryValue("code_challenge"));
        Assert.Equal("https://admin.jubilee.test/api/staff/sign-in/callback", _factory.StaffDirectory.LastRedirectUri);
    }

    // L2-189 AC8: the redirect address never comes from the request
    [Fact]
    public async Task L2_189_AC8_a_forged_host_does_not_change_the_redirect_address()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/staff/sign-in/start");
        request.Headers.Host = "evil.example";

        await _factory.CreateHttpsClient().SendAsync(request);

        Assert.Equal("https://admin.jubilee.test/api/staff/sign-in/callback", _factory.StaffDirectory.LastRedirectUri);
    }

    // L2-189 AC7, L2-190 AC1
    [Fact]
    public async Task L2_189_AC7_a_staff_account_with_a_second_factor_signs_in_and_opens_the_screen_asked_for()
    {
        await Grant("esther@jubilee.to", StaffRoles.Moderator);

        var (client, callback) = await SignIn("/reports/42");

        Assert.Equal(HttpStatusCode.Redirect, callback.StatusCode);
        Assert.Equal("/reports/42", callback.Headers.Location!.OriginalString);
        Assert.True(HasStaffCookie(callback));
        var session = await _factory.GetJson("/api/staff/session", client);
        Assert.Equal("Esther Mensah", session.GetProperty("displayName").GetString());
        Assert.Equal("esther@jubilee.to", session.GetProperty("email").GetString());
        Assert.Equal(["moderator"], session.GetProperty("roles").EnumerateArray().Select(r => r.GetString()));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/listings")).StatusCode);
    }

    // L2-189 AC7
    [Theory]
    [InlineData(null)]
    [InlineData("/")]
    [InlineData("/account")]
    [InlineData("//evil.example/listings")]
    [InlineData("https://evil.example/listings")]
    public async Task L2_189_AC7_a_return_address_that_is_not_an_admin_screen_opens_the_listings(string? returnUrl)
    {
        await Grant("esther@jubilee.to", StaffRoles.Moderator);

        var (_, callback) = await SignIn(returnUrl);

        Assert.Equal("/listings", callback.Headers.Location!.OriginalString);
    }

    // L2-189 AC3
    [Fact]
    public async Task L2_189_AC3_a_sign_in_without_a_second_factor_is_refused()
    {
        await Grant("esther@jubilee.to", StaffRoles.Moderator);
        _factory.StaffDirectory.Identity = FakeStaffDirectory.Esther(methods: ["pwd"]);

        var (client, callback) = await SignIn();

        Assert.Equal("/sign-in?error=second-factor", callback.Headers.Location!.OriginalString);
        Assert.False(HasStaffCookie(callback));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/staff/session")).StatusCode);
    }

    // L2-189 AC4, L2-193 AC2
    [Theory]
    [InlineData("nobody")]
    [InlineData("no-role")]
    [InlineData("other-tenant")]
    public async Task L2_189_AC4_an_identity_that_is_not_a_staff_account_is_refused(string who)
    {
        if (who == "no-role")
        {
            await Grant("esther@jubilee.to", StaffRoles.None);
        }
        else if (who == "other-tenant")
        {
            await Grant("esther@jubilee.to", StaffRoles.Moderator);
            _factory.StaffDirectory.Identity = FakeStaffDirectory.Esther(tenant: "99999999-0000-0000-0000-000000000000");
        }

        var (_, callback) = await SignIn();

        Assert.Equal("/sign-in?error=not-staff", callback.Headers.Location!.OriginalString);
        Assert.False(HasStaffCookie(callback));
    }

    // L2-189 AC5
    [Fact]
    public async Task L2_189_AC5_a_callback_with_an_unknown_state_is_refused()
    {
        var callback = await _factory.CreateHttpsClient().GetAsync("/api/staff/sign-in/callback?state=made-up&code=x");

        Assert.Equal("/sign-in?error=sso", callback.Headers.Location!.OriginalString);
        Assert.False(HasStaffCookie(callback));
    }

    // L2-189 AC5
    [Fact]
    public async Task L2_189_AC5_a_used_state_is_refused_the_second_time()
    {
        await Grant("esther@jubilee.to", StaffRoles.Moderator);
        var (client, _) = await SignIn();
        var state = _factory.StaffDirectory.QueryValue("state");

        var again = await client.GetAsync($"/api/staff/sign-in/callback?state={state}&code=the-code");

        Assert.Equal("/sign-in?error=sso", again.Headers.Location!.OriginalString);
    }

    // L2-189 AC5
    [Theory]
    [InlineData("provider-error")]
    [InlineData("invalid-token")]
    public async Task L2_189_AC5_a_provider_error_or_an_invalid_token_is_refused(string failure)
    {
        await Grant("esther@jubilee.to", StaffRoles.Moderator);
        _factory.StaffDirectory.Fails = failure == "invalid-token";

        var (_, callback) = await SignIn(error: failure == "provider-error" ? "server_error" : null);

        Assert.Equal("/sign-in?error=sso", callback.Headers.Location!.OriginalString);
        Assert.False(HasStaffCookie(callback));
    }

    // L2-189 AC6
    [Fact]
    public async Task L2_189_AC6_cancelling_at_the_directory_returns_to_the_default_sign_in_screen()
    {
        var (_, callback) = await SignIn(error: "access_denied");

        Assert.Equal("/sign-in?error=cancelled", callback.Headers.Location!.OriginalString);
        Assert.False(HasStaffCookie(callback));
    }

    // L2-193 AC5
    [Fact]
    public async Task L2_193_AC5_the_first_sign_in_binds_the_account_and_afterwards_only_that_identity_signs_in()
    {
        await Grant("esther@jubilee.to", StaffRoles.Moderator);
        await SignIn();

        _factory.StaffDirectory.Identity = FakeStaffDirectory.Esther(objectId: "oid-someone-else");
        var (_, other) = await SignIn();

        var account = await _factory.Query(db => db.StaffMembers.SingleAsync());
        Assert.Equal(FakeStaffDirectory.Tenant, account.TenantId);
        Assert.Equal("oid-esther", account.ObjectId);
        Assert.Equal("/sign-in?error=not-staff", other.Headers.Location!.OriginalString);
    }

    // L2-193 AC6, L2-098 AC5: the staff account whose address is a member's confirmed e-mail acts as that member,
    // so the staff member cannot take down their own listing
    [Fact]
    public async Task L2_193_AC6_a_staff_member_who_signed_in_cannot_take_down_the_listing_of_the_member_with_their_address()
    {
        var esther = Member.Join(EmailAddress.TryParse("esther@jubilee.to")!, "Esther", "Mensah", null, "hash", ListingMother.Now.AddMonths(-3));
        esther.ConfirmEmail();
        var bakery = ListingMother.Public("esthers-bakery", "shops", "Esther's Bakery", ListingMother.Now.AddDays(-4));
        bakery.AssignOwner(esther.Id.ToString());
        await _factory.Arrange(esther, bakery);
        await Grant("esther@jubilee.to", StaffRoles.Moderator);
        var (client, _) = await SignIn();

        var listing = await _factory.GetJson($"/api/admin/listings/{bakery.Id}", client);
        var takeDown = await client.PostAsJsonAsync($"/api/admin/listings/{bakery.Id}/take-down", new { reason = "Testing my own listing." });

        Assert.True(listing.GetProperty("isOwnListing").GetBoolean());
        Assert.Equal(HttpStatusCode.Forbidden, takeDown.StatusCode);
        Assert.Contains("OWN_LISTING", await takeDown.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/listings/esthers-bakery")).StatusCode);
    }

    // L2-190 AC6: a revoked account's sessions end
    [Fact]
    public async Task L2_190_AC6_a_staff_session_of_an_account_whose_roles_were_revoked_has_ended()
    {
        await Grant("esther@jubilee.to", StaffRoles.Moderator);
        var (client, _) = await SignIn();
        var staffId = (await _factory.Query(db => db.StaffMembers.SingleAsync())).Id;

        await _factory.WithDb(async db =>
        {
            var account = await db.StaffMembers.SingleAsync();
            account.Revoke(StaffRoles.Moderator);
            foreach (var session in await db.Sessions.Where(s => s.StaffMemberId == staffId).ToListAsync())
            {
                session.End(ListingMother.Now);
            }

            await db.SaveChangesAsync();
        });

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/listings")).StatusCode);
    }
}

// Acceptance Test
// Traces to: L2-195
// Description: the development identity is refused outside the Development environment.
public sealed class StaffSignInProviderTests
{
    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public void L2_195_the_api_refuses_to_start_with_the_development_identity_outside_development(string environment)
    {
        using var factory = new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting("Database:Provider", Infrastructure.DependencyInjection.InMemoryProvider);
            builder.UseSetting("ConnectionStrings:Jubilee", $"jubilee-{Guid.NewGuid():N}");
            builder.UseSetting("StaffSignIn:Provider", "Development");
        });

        var refused = Assert.ThrowsAny<Exception>(() => factory.CreateClient());

        Assert.Contains("StaffSignIn:Provider", refused.GetBaseException().Message);
    }
}
