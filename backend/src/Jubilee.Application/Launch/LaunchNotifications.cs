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

    /// <summary>Consent is express: without it nothing is stored (L2-218 AC1).</summary>
    public static void Consent(Dictionary<string, string> errors, bool consent)
    {
        if (!consent)
        {
            errors["consent"] = "CONSENT_REQUIRED";
        }
    }
}

/// <summary>"Tell me when it launches" (L2-217): an address, an optional first name and consent.</summary>
public sealed record SignUpForLaunchCommand(string? Email, string? FirstName, bool Consent) : IRequest;

public sealed class SignUpForLaunchCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SignUpForLaunchCommand>
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

        db.LaunchSubscribers.Add(LaunchSubscriber.SignUp(email!, request.FirstName, clock.GetUtcNow()));
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Two sign-ups of one address at once: the unique key kept the first, which is the same outcome.
        }
    }
}
