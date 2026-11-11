using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Jubilee.Application.Accounts;
using Konscious.Security.Cryptography;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Jubilee.Infrastructure.Accounts;

/// <summary>
/// Argon2id with 19 MiB of memory, 2 iterations and a unique 16-byte salt (L2-134 AC1). The stored
/// form is <c>argon2id$m=…,t=…,p=…$salt$hash</c>, so the cost can be raised later.
/// </summary>
public sealed class Argon2idPasswordHasher : IPasswordHasher
{
    private const int MemoryKib = 19 * 1024;
    private const int Iterations = 2;
    private const int Parallelism = 1;
    private const int HashBytes = 32;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Compute(password, salt, MemoryKib, Iterations, Parallelism);
        return $"argon2id$m={MemoryKib},t={Iterations},p={Parallelism}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public bool Verify(string hash, string password)
    {
        var parts = hash.Split('$');
        if (parts.Length != 4 || parts[0] != "argon2id")
        {
            return false;
        }

        var cost = parts[1].Split(',').Select(p => p.Split('=')).ToDictionary(p => p[0], p => int.Parse(p[1]));
        var expected = Convert.FromBase64String(parts[3]);
        var actual = Compute(password, Convert.FromBase64String(parts[2]), cost["m"], cost["t"], cost["p"]);
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    private static byte[] Compute(string password, byte[] salt, int memoryKib, int iterations, int parallelism)
    {
        using var argon = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            MemorySize = memoryKib,
            Iterations = iterations,
            DegreeOfParallelism = parallelism,
        };
        return argon.GetBytes(HashBytes);
    }
}

/// <summary>
/// Have I Been Pwned range query: only the first five characters of the SHA-1 leave the server
/// (k-anonymity). A service failure lets the password through rather than blocking joins.
/// </summary>
public sealed class HaveIBeenPwnedChecker(HttpClient http, IConfiguration configuration, ILogger<HaveIBeenPwnedChecker> logger)
    : IBreachedPasswordChecker
{
    public async Task<bool> IsBreachedAsync(string password, CancellationToken cancellationToken)
    {
        if (string.Equals(configuration["Passwords:CheckBreaches"], "false", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var sha1 = Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(password)));
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(2));
            var body = await http.GetStringAsync($"https://api.pwnedpasswords.com/range/{sha1[..5]}", timeout.Token);
            return body.Split('\n').Any(line => line.StartsWith(sha1[5..], StringComparison.OrdinalIgnoreCase));
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or OperationCanceledException)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                throw;
            }

            logger.LogWarning("The breached-password check was unavailable; the password was accepted.");
            return false;
        }
    }
}

/// <summary>
/// Cloudflare Turnstile verification (<c>BotChallenge:SecretKey</c>). Without a secret the challenge
/// is off, as in development and the e2e API.
/// </summary>
public sealed class TurnstileBotChallengeVerifier(HttpClient http, IConfiguration configuration) : IBotChallengeVerifier
{
    public async Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken cancellationToken)
    {
        var secret = configuration["BotChallenge:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        var form = new Dictionary<string, string> { ["secret"] = secret, ["response"] = token };
        if (remoteIp is not null)
        {
            form["remoteip"] = remoteIp;
        }

        try
        {
            using var response = await http.PostAsync(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify", new FormUrlEncodedContent(form), cancellationToken);
            var answer = await response.Content.ReadFromJsonAsync<TurnstileAnswer>(cancellationToken);
            return answer?.Success == true;
        }
        catch (HttpRequestException)
        {
            return false;
        }
    }

    private sealed record TurnstileAnswer([property: JsonPropertyName("success")] bool Success);
}

/// <summary>
/// Stand-in for the transactional e-mail provider (not chosen yet): it logs who an e-mail went to
/// and its subject, never the body, which holds a link token.
/// </summary>
public sealed class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(string to, string subject, string textBody, CancellationToken cancellationToken)
    {
        logger.LogInformation("E-mail \"{Subject}\" sent to {To}.", subject, to);
        return Task.CompletedTask;
    }
}

/// <summary>Pending Google sign-ins in the cache, keyed by <c>state</c>, for ten minutes.</summary>
public sealed class CacheOidcTransactionStore(IDistributedCache cache) : IOidcTransactionStore
{
    private static readonly DistributedCacheEntryOptions Lifetime =
        new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) };

    public Task SaveAsync(OidcTransaction transaction, CancellationToken cancellationToken) =>
        cache.SetStringAsync(Key(transaction.State), JsonSerializer.Serialize(transaction), Lifetime, cancellationToken);

    public async Task<OidcTransaction?> ConsumeAsync(string state, CancellationToken cancellationToken)
    {
        var key = Key(state);
        var json = await cache.GetStringAsync(key, cancellationToken);
        if (json is null)
        {
            return null;
        }

        await cache.RemoveAsync(key, cancellationToken);
        return JsonSerializer.Deserialize<OidcTransaction>(json);
    }

    private static string Key(string state) => $"oidc:{state}";
}

/// <summary>Google OpenID Connect over HTTP (<c>Google:ClientId</c>, <c>Google:ClientSecret</c>).</summary>
public sealed class GoogleIdentityClient(HttpClient http, IConfiguration configuration) : IGoogleIdentityClient
{
    private static readonly string[] Issuers = ["https://accounts.google.com", "accounts.google.com"];

    private string ClientId => configuration["Google:ClientId"] ?? string.Empty;

    public bool IsConfigured => ClientId.Length > 0 && !string.IsNullOrEmpty(configuration["Google:ClientSecret"]);

    public Uri BuildAuthorizationUrl(string redirectUri, string state, string nonce, string codeChallenge)
    {
        var query = new Dictionary<string, string>
        {
            ["client_id"] = ClientId,
            ["redirect_uri"] = redirectUri,
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["state"] = state,
            ["nonce"] = nonce,
            ["code_challenge"] = codeChallenge,
            ["code_challenge_method"] = "S256",
        };
        var text = string.Join('&', query.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
        return new Uri($"https://accounts.google.com/o/oauth2/v2/auth?{text}");
    }

    public async Task<GoogleIdentity> RedeemAsync(
        string redirectUri, string code, string codeVerifier, string nonce, CancellationToken cancellationToken)
    {
        using var response = await http.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = ClientId,
                ["client_secret"] = configuration["Google:ClientSecret"] ?? string.Empty,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code",
                ["code_verifier"] = codeVerifier,
            }),
            cancellationToken);
        response.EnsureSuccessStatusCode();
        var tokens = await response.Content.ReadFromJsonAsync<TokenAnswer>(cancellationToken)
            ?? throw new InvalidOperationException("Google returned no tokens.");

        var keysJson = await http.GetStringAsync("https://www.googleapis.com/oauth2/v3/certs", cancellationToken);
        var result = await new JsonWebTokenHandler().ValidateTokenAsync(tokens.IdToken, new TokenValidationParameters
        {
            ValidIssuers = Issuers,
            ValidAudience = ClientId,
            IssuerSigningKeys = new JsonWebKeySet(keysJson).GetSigningKeys(),
            ValidateLifetime = true,
        });
        if (!result.IsValid)
        {
            throw new InvalidOperationException("The Google ID token is not valid.", result.Exception);
        }

        var token = (JsonWebToken)result.SecurityToken;
        if (token.TryGetPayloadValue<string>("nonce", out var tokenNonce) is false || tokenNonce != nonce)
        {
            throw new InvalidOperationException("The Google ID token nonce does not match.");
        }

        token.TryGetPayloadValue<string>("email", out var email);
        token.TryGetPayloadValue<bool>("email_verified", out var verified);
        token.TryGetPayloadValue<string>("given_name", out var given);
        token.TryGetPayloadValue<string>("family_name", out var family);
        return new GoogleIdentity(token.Subject, email ?? string.Empty, verified, given ?? string.Empty, family ?? string.Empty);
    }

    private sealed record TokenAnswer([property: JsonPropertyName("id_token")] string IdToken);
}
