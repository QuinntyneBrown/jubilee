using System.Web;
using Jubilee.Infrastructure.Accounts;
using Microsoft.Extensions.Configuration;

namespace Jubilee.Infrastructure.Tests;

// Acceptance Test
// Traces to: L2-189, L2-195
// Description: the staff directory adapters: Entra ID's v1.0 authorization request with PKCE and a fresh
// sign-in, and the development identity, which proves a second factor without leaving the machine.
public sealed class StaffIdentityClientTests
{
    private const string Tenant = "11111111-2222-3333-4444-555555555555";

    private static IConfiguration Settings(params (string Key, string Value)[] values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values.ToDictionary(v => v.Key, v => (string?)v.Value)).Build();

    // L2-189 AC2
    [Fact]
    public void L2_189_AC2_the_entra_request_asks_for_a_fresh_sign_in_with_state_nonce_and_pkce()
    {
        var client = new EntraStaffIdentityClient(new HttpClient(), Settings(
            ("StaffSignIn:TenantId", Tenant), ("StaffSignIn:ClientId", "client-1"), ("StaffSignIn:ClientSecret", "secret")));

        var url = client.BuildAuthorizationUrl("https://admin.jubilee.to/api/staff/sign-in/callback", "the-state", "the-nonce", "the-challenge");
        var query = HttpUtility.ParseQueryString(url.Query);

        Assert.Equal($"https://login.microsoftonline.com/{Tenant}/oauth2/authorize", url.GetLeftPart(UriPartial.Path));
        Assert.Equal("client-1", query["client_id"]);
        Assert.Equal("code", query["response_type"]);
        Assert.Equal("https://admin.jubilee.to/api/staff/sign-in/callback", query["redirect_uri"]);
        Assert.Equal("the-state", query["state"]);
        Assert.Equal("the-nonce", query["nonce"]);
        Assert.Equal("the-challenge", query["code_challenge"]);
        Assert.Equal("S256", query["code_challenge_method"]);
        Assert.Equal("login", query["prompt"]);
        Assert.Contains("openid", query["scope"]!.Split(' '));
        Assert.Equal(Tenant, client.TenantId);
    }

    // L2-189: each endpoint is a setting (ADR 0040)
    [Fact]
    public void L2_189_the_authorization_endpoint_is_a_setting()
    {
        var client = new EntraStaffIdentityClient(new HttpClient(), Settings(
            ("StaffSignIn:TenantId", Tenant), ("StaffSignIn:AuthorizationEndpoint", "https://login.example/authorize")));

        var url = client.BuildAuthorizationUrl("https://admin.jubilee.to/cb", "s", "n", "c");

        Assert.Equal("https://login.example/authorize", url.GetLeftPart(UriPartial.Path));
    }

    // L2-195: the development identity
    [Fact]
    public async Task L2_195_the_development_identity_signs_in_the_configured_address_with_a_second_factor()
    {
        var client = new DevelopmentStaffIdentityClient(Settings(("StaffSignIn:DevelopmentEmail", "miriam@jubilee.to")));

        var url = client.BuildAuthorizationUrl("http://localhost:4202/api/staff/sign-in/callback", "the-state", "n", "c");
        var identity = await client.RedeemAsync("http://localhost:4202/api/staff/sign-in/callback", "development", "v", "n", default);

        Assert.Equal("http://localhost:4202/api/staff/sign-in/callback?code=development&state=the-state", url.ToString());
        Assert.Equal("miriam@jubilee.to", identity.Email);
        Assert.Equal(client.TenantId, identity.TenantId);
        Assert.Contains("mfa", identity.Methods);
    }
}
