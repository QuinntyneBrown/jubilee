using System.Security.Cryptography;
using System.Text;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>Continue with Google over OpenID Connect with state, nonce and PKCE (L2-003).</summary>
[ApiController]
[Route("api/auth/google")]
[AllowAnonymous]
public sealed class GoogleSignInController(
    IGoogleIdentityClient google,
    IOidcTransactionStore transactions,
    ISender sender,
    AccountSettings settings,
    ILogger<GoogleSignInController> logger) : ControllerBase
{
    /// <param name="from">The page the visitor started on, <c>join</c> or <c>sign-in</c>; a failure is shown there.</param>
    [HttpGet("start")]
    public async Task<IActionResult> Start([FromQuery] string? returnUrl, [FromQuery] string? from, CancellationToken cancellationToken)
    {
        var transaction = new OidcTransaction(
            State: RandomValue(), Nonce: RandomValue(), CodeVerifier: RandomValue(), ReturnUrl: ReturnUrl.Parse(returnUrl),
            From: from == "join" ? "join" : "sign-in");
        if (!google.IsConfigured)
        {
            // The pages hide the button when Google is off; a request made all the same goes nowhere (L2-003 AC5).
            return Redirect(Failure(transaction, "google"));
        }

        await transactions.SaveAsync(transaction, cancellationToken);
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(transaction.CodeVerifier)));
        return Redirect(google.BuildAuthorizationUrl(RedirectUri(), transaction.State, transaction.Nonce, challenge).ToString());
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error, CancellationToken cancellationToken)
    {
        // A callback with an unknown or used state is rejected (L2-003 AC3). Nothing is known about where it started.
        var transaction = string.IsNullOrEmpty(state) ? null : await transactions.ConsumeAsync(state, cancellationToken);
        if (transaction is null)
        {
            return Redirect("/sign-in?error=google");
        }

        // The visitor pressed "Cancel" at Google: not a failure, and they keep their place (L2-003 AC6).
        if (error == "access_denied")
        {
            return Redirect(Failure(transaction, "google-cancelled"));
        }

        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code))
        {
            return Redirect(Failure(transaction, "google"));
        }

        GoogleIdentity identity;
        try
        {
            identity = await google.RedeemAsync(RedirectUri(), code, transaction.CodeVerifier, transaction.Nonce, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "A Google sign-in could not be completed.");
            return Redirect(Failure(transaction, "google"));
        }

        var result = await sender.Send(new CompleteGoogleSignInCommand(identity), cancellationToken);
        switch (result.Outcome)
        {
            case GoogleSignInOutcome.EmailNotVerified:
                return Redirect(Failure(transaction, "google-email"));
            case GoogleSignInOutcome.CreatedAwaitingAgreement:
                await HttpContext.SignInMemberAsync(result.Member!);
                return Redirect($"/join/agreement?returnUrl={Uri.EscapeDataString(transaction.ReturnUrl)}");
            default:
                await HttpContext.SignInMemberAsync(result.Member!);
                return Redirect(result.Member!.IsUsable()
                    ? transaction.ReturnUrl
                    : $"/join/agreement?returnUrl={Uri.EscapeDataString(transaction.ReturnUrl)}");
        }
    }

    /// <summary>Back to the page the sign-in started on, with the error to show and the place the visitor was going to.</summary>
    private static string Failure(OidcTransaction transaction, string error) =>
        $"/{transaction.From}?error={error}"
        + (transaction.ReturnUrl == "/" ? string.Empty : $"&returnUrl={Uri.EscapeDataString(transaction.ReturnUrl)}");

    /// <summary>Built from <c>App:PublicBaseUrl</c>, never from the request, so a forged Host header cannot change it (ADR 0037).</summary>
    private string RedirectUri() => $"{settings.PublicBaseUrl.TrimEnd('/')}/api/auth/google/callback";

    private static string RandomValue() => Base64Url(RandomNumberGenerator.GetBytes(32));

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
