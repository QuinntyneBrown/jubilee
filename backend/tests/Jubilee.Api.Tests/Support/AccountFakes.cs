using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using Jubilee.Application.Accounts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Jubilee.Api.Middleware;

namespace Jubilee.Api.Tests.Support;

/// <summary>One sent e-mail: <c>Body</c> is the plain-text part, <c>Html</c> the HTML part.</summary>
public sealed record SentEmail(string To, string Subject, string Body, string? UnsubscribeUrl = null, string Html = "");

/// <summary>Collects the e-mails the worker would send; can be made to fail.</summary>
public sealed class FakeEmailSender : IEmailSender
{
    public ConcurrentQueue<SentEmail> Sent { get; } = new();

    public bool Failing { get; set; }

    public Task SendAsync(string to, string subject, string textBody, CancellationToken cancellationToken, string? unsubscribeUrl = null)
    {
        if (Failing)
        {
            throw new InvalidOperationException("The provider is down.");
        }

        Sent.Enqueue(new SentEmail(to, subject, textBody, unsubscribeUrl));
        return Task.CompletedTask;
    }

    public void Clear() => Sent.Clear();
}

public sealed class FakeBreachedPasswordChecker : IBreachedPasswordChecker
{
    public const string BreachedPassword = "password12345";

    public Task<bool> IsBreachedAsync(string password, CancellationToken cancellationToken) =>
        Task.FromResult(password == BreachedPassword);
}

public sealed class FakeBotChallenge : IBotChallengeVerifier
{
    public bool Passes { get; set; } = true;

    public Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken cancellationToken) => Task.FromResult(Passes);
}

/// <summary>
/// Google as a test double that holds the real client to its contract: the code is redeemed only
/// with the PKCE verifier of the challenge it was sent, and the nonce it was sent.
/// </summary>
public sealed class FakeGoogle : IGoogleIdentityClient
{
    private readonly ConcurrentDictionary<string, (string Nonce, string Challenge)> _sent = new();

    /// <summary>False stands for an environment without <c>Google:ClientId</c> and <c>Google:ClientSecret</c>.</summary>
    public bool IsConfigured { get; set; } = true;

    /// <summary>The identity Google will return for the next code.</summary>
    public GoogleIdentity Identity { get; set; } = new("google-1", "g@example.com", true, "Gina", "Gordon");

    public Uri LastUrl { get; private set; } = new("https://accounts.google.com/");

    public Uri BuildAuthorizationUrl(string redirectUri, string state, string nonce, string codeChallenge)
    {
        _sent[state] = (nonce, codeChallenge);
        LastUrl = new Uri(
            $"https://accounts.google.com/o/oauth2/v2/auth?state={state}&nonce={nonce}&code_challenge={codeChallenge}&code_challenge_method=S256");
        return LastUrl;
    }

    public Task<GoogleIdentity> RedeemAsync(string redirectUri, string code, string codeVerifier, string nonce, CancellationToken cancellationToken)
    {
        var challenge = Convert.ToBase64String(SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier)))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
        var sent = _sent.Values.FirstOrDefault(s => s.Nonce == nonce);
        if (sent.Challenge != challenge)
        {
            throw new InvalidOperationException("The PKCE verifier or the nonce does not match.");
        }

        return Task.FromResult(Identity);
    }

    public string QueryValue(string name) => HttpUtility.ParseQueryString(LastUrl.Query)[name]!;
}

/// <summary>A test-only endpoint that carries the confirmed-e-mail requirement, like sending a message will.</summary>
[ApiController]
[Route("api/test")]
public sealed class RestrictedController : ControllerBase
{
    [HttpPost("restricted")]
    [RequiresConfirmedEmail]
    public IActionResult Restricted() => Ok();

    [HttpPost("save")]
    public IActionResult Save() => Ok();
}
