using System.Text.Json.Serialization;
using Jubilee.Api.Errors;
using Jubilee.Api.RateLimiting;
using Jubilee.Application.Accounts;
using Jubilee.Application.Launch;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Jubilee.Api.Controllers;

/// <summary>The body of <c>POST /api/launch/notifications</c>. Unknown fields are refused (L2-136 AC1).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record LaunchNotificationBody(string? Email, string? FirstName, bool Consent, string? ChallengeToken);

/// <summary>What the launching-soon page needs before it shows its forms (L2-218 AC5).</summary>
public sealed record LaunchFormDto(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? BotChallengeSiteKey);

/// <summary>
/// The forms of the launching-soon marketing page (L1-030, ADR 0044). Its visitors have no account,
/// so every action here is open on purpose; the bot challenge and a limit per address guard them
/// (L2-218 AC3), and the rules are in the handlers.
/// </summary>
[ApiController]
[Route("api/launch")]
[AllowAnonymous]
public sealed class LaunchController(ISender sender, IBotChallengeVerifier bot, IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    public LaunchFormDto Form() =>
        new(configuration["BotChallenge:SiteKey"] is { Length: > 0 } key ? key : null);

    /// <summary>Always 202 with no body: a new address and a known one are answered alike (L2-217 AC5).</summary>
    [HttpPost("notifications")]
    [EnableRateLimiting(LaunchRateLimit.SignUps)]
    [ErrorReference("JB-LAUNCH-503")]
    public async Task<IActionResult> Notify(LaunchNotificationBody request, CancellationToken cancellationToken)
    {
        await PassChallengeAsync(request.ChallengeToken, cancellationToken);
        await sender.Send(new SignUpForLaunchCommand(request.Email, request.FirstName, request.Consent), cancellationToken);
        return Accepted();
    }

    /// <summary>The challenge comes first: a bot learns nothing about the fields (L2-218 AC3).</summary>
    private async Task PassChallengeAsync(string? token, CancellationToken cancellationToken)
    {
        if (!await bot.VerifyAsync(token, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["challenge"] = "CHALLENGE_FAILED" });
        }
    }
}
