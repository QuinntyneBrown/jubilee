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
    [HttpGet("start")]
    public async Task<IActionResult> Start([FromQuery] string? returnUrl, CancellationToken cancellationToken)
    {
        if (!google.IsConfigured)
        {
            return Redirect("/sign-in?error=google");
        }

        var transaction = new OidcTransaction(
            State: RandomValue(), Nonce: RandomValue(), CodeVerifier: RandomValue(), ReturnUrl: ReturnUrl.Parse(returnUrl));
        await transactions.SaveAsync(transaction, cancellationToken);
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(transaction.CodeVerifier)));
        return Redirect(google.BuildAuthorizationUrl(RedirectUri(), transaction.State, transaction.Nonce, challenge).ToString());
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error, CancellationToken cancellationToken)
    {
        // A callback with an unknown or used state is rejected; so is one Google refused (L2-003 AC3).
        var transaction = string.IsNullOrEmpty(state) ? null : await transactions.ConsumeAsync(state, cancellationToken);
        if (transaction is null || !string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code))
        {
            return Redirect("/sign-in?error=google");
        }

        GoogleIdentity identity;
        try
        {
            identity = await google.RedeemAsync(RedirectUri(), code, transaction.CodeVerifier, transaction.Nonce, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "A Google sign-in could not be completed.");
            return Redirect("/sign-in?error=google");
        }

        var result = await sender.Send(new CompleteGoogleSignInCommand(identity), cancellationToken);
        switch (result.Outcome)
        {
            case GoogleSignInOutcome.EmailNotVerified:
                return Redirect("/sign-in?error=google-email");
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

    private string RedirectUri() => $"{settings.PublicBaseUrl.TrimEnd('/')}/api/auth/google/callback";

    private static string RandomValue() => Base64Url(RandomNumberGenerator.GetBytes(32));

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
