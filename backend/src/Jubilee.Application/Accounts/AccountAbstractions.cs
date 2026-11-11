using System.Security.Cryptography;
using System.Text;

namespace Jubilee.Application.Accounts;

/// <summary>Argon2id hashing of passwords (L2-134 AC1). The plain password is never stored or logged.</summary>
public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string hash, string password);
}

/// <summary>Checks a password against a breached-password list by k-anonymity range query (L2-134 AC2).</summary>
public interface IBreachedPasswordChecker
{
    Task<bool> IsBreachedAsync(string password, CancellationToken cancellationToken);
}

/// <summary>The privacy-respecting bot challenge on the join form (L2-137 AC2).</summary>
public interface IBotChallengeVerifier
{
    Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken cancellationToken);
}

/// <summary>Sends one e-mail through the transactional e-mail provider.</summary>
public interface IEmailSender
{
    Task SendAsync(string to, string subject, string textBody, CancellationToken cancellationToken);
}

/// <summary>Where the app is served, for the links in e-mails (<c>App:PublicBaseUrl</c>).</summary>
public sealed record AccountSettings(string PublicBaseUrl);

/// <summary>Link tokens: at least 128 bits of randomness, stored only as a SHA-256 hash (L2-140).</summary>
public static class LinkTokens
{
    public static string NewValue() => Base64Url(RandomNumberGenerator.GetBytes(32));

    public static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

/// <summary>The invalid fields of a request, with a code each (L2-002 AC7). The API answers 422.</summary>
public sealed class ValidationFailedException(IReadOnlyDictionary<string, string> errors)
    : Exception("The request has invalid fields.")
{
    public IReadOnlyDictionary<string, string> Errors { get; } = errors;
}

/// <summary>Google's answer about who signed in (L2-003).</summary>
public sealed record GoogleIdentity(string Subject, string Email, bool EmailVerified, string GivenName, string FamilyName);

/// <summary>A pending Google sign-in, kept between the redirect and the callback (L2-003 AC3).</summary>
public sealed record OidcTransaction(string State, string Nonce, string CodeVerifier, string ReturnUrl);

public interface IOidcTransactionStore
{
    Task SaveAsync(OidcTransaction transaction, CancellationToken cancellationToken);

    /// <summary>Reads and deletes in one step, so a callback can be used once.</summary>
    Task<OidcTransaction?> ConsumeAsync(string state, CancellationToken cancellationToken);
}

public interface IGoogleIdentityClient
{
    bool IsConfigured { get; }

    Uri BuildAuthorizationUrl(string redirectUri, string state, string nonce, string codeChallenge);

    /// <summary>Exchanges the code and validates the ID token (signature, issuer, audience, expiry, nonce).</summary>
    Task<GoogleIdentity> RedeemAsync(string redirectUri, string code, string codeVerifier, string nonce, CancellationToken cancellationToken);
}
