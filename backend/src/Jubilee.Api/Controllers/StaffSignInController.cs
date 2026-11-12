using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Jubilee.Api.Sessions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Staff;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>
/// Staff sign-in through single sign-on, with state, nonce and PKCE (L2-189, ADR 0040). The endpoints
/// need no session; the network restriction (L2-192) still applies to them.
/// </summary>
[ApiController]
[Route("api/staff/sign-in")]
[AllowAnonymous]
public sealed partial class StaffSignInController(
    IStaffIdentityClient directory,
    IOidcTransactionStore transactions,
    ISender sender,
    IConfiguration configuration,
    ILogger<StaffSignInController> logger) : ControllerBase
{
    private const string Queue = "/verifications";

    [GeneratedRegex(@"^/(verifications|reports)(/[A-Za-z0-9-]+)?$|^/featured$")]
    private static partial Regex AdminScreen();

    [HttpGet("start")]
    public async Task<IActionResult> Start([FromQuery] string? returnUrl, CancellationToken cancellationToken)
    {
        var transaction = new OidcTransaction(
            State: RandomValue(), Nonce: RandomValue(), CodeVerifier: RandomValue(), ReturnUrl: Screen(returnUrl), From: "staff");
        await transactions.SaveAsync(transaction, cancellationToken);
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(transaction.CodeVerifier)));
        return Redirect(directory.BuildAuthorizationUrl(RedirectUri(), transaction.State, transaction.Nonce, challenge).ToString());
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error, CancellationToken cancellationToken)
    {
        // An unknown or used state, a provider error or an invalid token all end here (L2-189 AC5).
        var transaction = string.IsNullOrEmpty(state) ? null : await transactions.ConsumeAsync(state, cancellationToken);
        if (transaction is null || transaction.From != "staff")
        {
            return Failure("sso");
        }

        // "Cancel" at the directory is not a failure (L2-189 AC6).
        if (error == "access_denied")
        {
            return Failure("cancelled");
        }

        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code))
        {
            return Failure("sso");
        }

        StaffIdentity identity;
        try
        {
            identity = await directory.RedeemAsync(RedirectUri(), code, transaction.CodeVerifier, transaction.Nonce, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "A staff sign-in could not be completed.");
            return Failure("sso");
        }

        var result = await sender.Send(new CompleteStaffSignInCommand(identity, directory.TenantId), cancellationToken);
        if (result.Outcome != StaffSignInOutcome.SignedIn)
        {
            logger.LogWarning("Staff sign-in refused ({Outcome}) for {ObjectId}.", result.Outcome, identity.ObjectId);
            return Failure(result.Outcome == StaffSignInOutcome.NoSecondFactor ? "second-factor" : "not-staff");
        }

        var staff = result.Staff!;
        await HttpContext.SignInStaffAsync(new StaffPrincipal(
            result.MemberId?.ToString() ?? $"staff|{staff.Id}",
            string.IsNullOrWhiteSpace(identity.DisplayName) ? staff.Email : identity.DisplayName,
            staff.Email,
            staff.RoleNames(),
            staff.Id));
        return Redirect(transaction.ReturnUrl);
    }

    /// <summary>The asked-for screen of the admin application, or the queue (L2-189 AC7).</summary>
    private static string Screen(string? returnUrl) =>
        returnUrl is not null && AdminScreen().IsMatch(returnUrl) ? returnUrl : Queue;

    private RedirectResult Failure(string error) => Redirect($"/sign-in?error={error}");

    /// <summary>From <c>StaffSignIn:PublicBaseUrl</c>, never from the request (L2-189 AC8).</summary>
    private string RedirectUri() =>
        $"{(configuration["StaffSignIn:PublicBaseUrl"] ?? "https://admin.jubilee.to").TrimEnd('/')}/api/staff/sign-in/callback";

    private static string RandomValue() => Base64Url(RandomNumberGenerator.GetBytes(32));

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
