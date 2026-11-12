using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Jubilee.Application.Staff;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Jubilee.Infrastructure.Accounts;

/// <summary>
/// Microsoft Entra ID over OpenID Connect, single tenant, v1.0 endpoints, whose ID tokens carry
/// <c>amr</c> (ADR 0040). Settings: <c>StaffSignIn:TenantId</c>, <c>ClientId</c>, <c>ClientSecret</c>,
/// and optionally <c>AuthorizationEndpoint</c>, <c>TokenEndpoint</c>, <c>KeysEndpoint</c> and <c>Issuer</c>.
/// </summary>
public sealed class EntraStaffIdentityClient(HttpClient http, IConfiguration configuration) : IStaffIdentityClient
{
    public string TenantId => configuration["StaffSignIn:TenantId"] ?? string.Empty;

    private string ClientId => configuration["StaffSignIn:ClientId"] ?? string.Empty;

    private string Setting(string name, string fallback) =>
        configuration[$"StaffSignIn:{name}"] is { Length: > 0 } value ? value : fallback;

    private string AuthorizationEndpoint => Setting("AuthorizationEndpoint", $"https://login.microsoftonline.com/{TenantId}/oauth2/authorize");

    private string TokenEndpoint => Setting("TokenEndpoint", $"https://login.microsoftonline.com/{TenantId}/oauth2/token");

    private string KeysEndpoint => Setting("KeysEndpoint", $"https://login.microsoftonline.com/{TenantId}/discovery/keys");

    private string Issuer => Setting("Issuer", $"https://sts.windows.net/{TenantId}/");

    public Uri BuildAuthorizationUrl(string redirectUri, string state, string nonce, string codeChallenge)
    {
        var query = new Dictionary<string, string>
        {
            ["client_id"] = ClientId,
            ["redirect_uri"] = redirectUri,
            ["response_type"] = "code",
            ["response_mode"] = "query",
            ["scope"] = "openid profile email",
            ["state"] = state,
            ["nonce"] = nonce,
            ["code_challenge"] = codeChallenge,
            ["code_challenge_method"] = "S256",
            // Every staff sign-in authenticates afresh (ADR 0040).
            ["prompt"] = "login",
        };
        var text = string.Join('&', query.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
        return new Uri($"{AuthorizationEndpoint}?{text}");
    }

    public async Task<StaffIdentity> RedeemAsync(
        string redirectUri, string code, string codeVerifier, string nonce, CancellationToken cancellationToken)
    {
        using var response = await http.PostAsync(
            TokenEndpoint,
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = ClientId,
                ["client_secret"] = configuration["StaffSignIn:ClientSecret"] ?? string.Empty,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code",
                ["code_verifier"] = codeVerifier,
            }),
            cancellationToken);
        response.EnsureSuccessStatusCode();
        var tokens = await response.Content.ReadFromJsonAsync<TokenAnswer>(cancellationToken)
            ?? throw new InvalidOperationException("Entra ID returned no tokens.");

        var keysJson = await http.GetStringAsync(KeysEndpoint, cancellationToken);
        var result = await new JsonWebTokenHandler().ValidateTokenAsync(tokens.IdToken, new TokenValidationParameters
        {
            ValidIssuer = Issuer,
            ValidAudience = ClientId,
            IssuerSigningKeys = new JsonWebKeySet(keysJson).GetSigningKeys(),
            ValidateLifetime = true,
        });
        if (!result.IsValid)
        {
            throw new InvalidOperationException("The Entra ID token is not valid.", result.Exception);
        }

        var token = (JsonWebToken)result.SecurityToken;
        if (!token.TryGetPayloadValue<string>("nonce", out var tokenNonce) || tokenNonce != nonce)
        {
            throw new InvalidOperationException("The Entra ID token nonce does not match.");
        }

        string Claim(string name) => token.TryGetPayloadValue<string>(name, out var value) ? value ?? string.Empty : string.Empty;
        var methods = token.TryGetPayloadValue<string[]>("amr", out var amr) ? amr ?? [] : [];
        var email = new[] { Claim("email"), Claim("preferred_username"), Claim("upn"), Claim("unique_name") }
            .FirstOrDefault(v => v.Length > 0) ?? string.Empty;
        return new StaffIdentity(Claim("tid"), Claim("oid"), email, Claim("name"), methods);
    }

    private sealed record TokenAnswer([property: JsonPropertyName("id_token")] string IdToken);
}

/// <summary>
/// Local development without Entra ID (ADR 0040): the start sends the browser straight back to the
/// callback, which signs in <c>StaffSignIn:DevelopmentEmail</c> (named <c>StaffSignIn:DevelopmentName</c>)
/// with a password and a second factor.
/// The API refuses to start with it outside the Development environment.
/// </summary>
public sealed class DevelopmentStaffIdentityClient(IConfiguration configuration) : IStaffIdentityClient
{
    public string TenantId => "development";

    private string Email => configuration["StaffSignIn:DevelopmentEmail"] is { Length: > 0 } email ? email : "miriam@jubilee.to";

    public Uri BuildAuthorizationUrl(string redirectUri, string state, string nonce, string codeChallenge) =>
        new($"{redirectUri}?code=development&state={Uri.EscapeDataString(state)}");

    public Task<StaffIdentity> RedeemAsync(string redirectUri, string code, string codeVerifier, string nonce, CancellationToken cancellationToken) =>
        Task.FromResult(new StaffIdentity(
            TenantId,
            $"development|{Email}",
            Email,
            configuration["StaffSignIn:DevelopmentName"] is { Length: > 0 } name ? name : "Miriam Castillo",
            ["pwd", "mfa"]));
}
