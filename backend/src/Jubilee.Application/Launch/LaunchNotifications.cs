using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Launch;

/// <summary>What the two forms of the launching-soon marketing page share (L2-216, L2-217).</summary>
public static class LaunchValidation
{
    /// <summary>The e-mail address of a form, or its code in <paramref name="errors"/>.</summary>
    public static EmailAddress? Email(Dictionary<string, string> errors, string? raw)
    {
        var trimmed = raw?.Trim() ?? string.Empty;
        var email = EmailAddress.TryParse(trimmed);
        if (trimmed.Length == 0)
        {
            errors["email"] = "REQUIRED";
        }
        else if (trimmed.Length > EmailAddress.MaxLength)
        {
            errors["email"] = "TOO_LONG";
        }
        else if (email is null)
        {
            errors["email"] = "EMAIL_INVALID";
        }

        return email;
    }

    /// <summary>
    /// When the consent was given: the time the marketing host received the form, or now when it
    /// named none or one that has not come yet (L2-218 AC9).
    /// </summary>
    public static DateTimeOffset ConsentTime(DateTimeOffset? receivedAt, DateTimeOffset now) =>
        receivedAt is { } at && at <= now ? at : now;

    /// <summary>Consent is express: without it nothing is stored (L2-218 AC1).</summary>
    public static void Consent(Dictionary<string, string> errors, bool consent)
    {
        if (!consent)
        {
            errors["consent"] = "CONSENT_REQUIRED";
        }
    }
}

/// <summary>
/// "Tell me when it launches" (L2-217): an address, an optional first name and consent.
/// <paramref name="ReceivedAt"/> is when the marketing host received it, when its proxy said so (L2-218 AC9).
/// </summary>
public sealed record SignUpForLaunchCommand(string? Email, string? FirstName, bool Consent, DateTimeOffset? ReceivedAt = null) : IRequest;

public sealed class SignUpForLaunchCommandHandler(IAppDbContext db, LaunchSettings settings, TimeProvider clock)
    : IRequestHandler<SignUpForLaunchCommand>
{
    public async Task Handle(SignUpForLaunchCommand request, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string>();
        var email = LaunchValidation.Email(errors, request.Email);
        if ((request.FirstName?.Trim().Length ?? 0) > LaunchSubscriber.MaxFirstNameLength)
        {
            errors["firstName"] = "TOO_LONG";
        }

        LaunchValidation.Consent(errors, request.Consent);
        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        // A repeat changes nothing and answers the same, so nobody learns whether an address is on the list (AC5).
        if (await db.LaunchSubscribers.AnyAsync(s => s.EmailKey == email!.Key, cancellationToken))
        {
            return;
        }

        var now = clock.GetUtcNow();
        var subscriber = LaunchSubscriber.SignUp(email!, request.FirstName, LaunchValidation.ConsentTime(request.ReceivedAt, now));
        db.LaunchSubscribers.Add(subscriber);
        if (!string.IsNullOrWhiteSpace(settings.TeamEmail))
        {
            // Written with the sign-up or not at all: only a new address tells the team (AC9).
            db.OutboxMessages.Add(OutboxMessage.Email(null, settings.TeamEmail.Trim(), "New launch notification sign-up", Describe(subscriber), now));
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Two sign-ups of one address at once: the unique key kept the first, which is the same outcome.
        }
    }

    private static string Describe(LaunchSubscriber subscriber) =>
        "Someone asked to be told when Jubilee launches, from the launching-soon page.\n\n"
        + $"E-mail: {subscriber.Email}\n"
        + $"First name: {subscriber.FirstName ?? "not given"}\n\n"
        + "They agreed to one e-mail, the launch notice. Nothing was sent to them now.\n\n"
        + "Jubilee · Toronto's Christian marketplace\n";
}
