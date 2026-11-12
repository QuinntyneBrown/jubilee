using System.Text.RegularExpressions;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Launch;

/// <summary>Where the team hears of a pre-registration and of a new sign-up (<c>Launch:TeamEmail</c>); null when nobody is told by e-mail (ADR 0044, ADR 0047).</summary>
public sealed record LaunchSettings(string? TeamEmail);

/// <summary>"Send my details" (L2-216): an owner's business, before launch. It lists and verifies nothing.</summary>
public sealed record PreRegisterBusinessCommand(
    string? BusinessName, string? ContactName, string? Email, string? Phone, string? Category, string? Area, string? Website,
    string? Description, bool Consent, DateTimeOffset? ReceivedAt = null) : IRequest;

public sealed partial class PreRegisterBusinessCommandHandler(IAppDbContext db, LaunchSettings settings, TimeProvider clock)
    : IRequestHandler<PreRegisterBusinessCommand>
{
    public async Task Handle(PreRegisterBusinessCommand request, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string>();
        Text(errors, "businessName", request.BusinessName, BusinessPreRegistration.MaxBusinessNameLength);
        Text(errors, "contactName", request.ContactName, BusinessPreRegistration.MaxContactNameLength);
        var email = LaunchValidation.Email(errors, request.Email);
        var phone = Phone(errors, request.Phone);
        var category = Domain.Category.Find(request.Category?.Trim());
        if (string.IsNullOrWhiteSpace(request.Category))
        {
            errors["category"] = "REQUIRED";
        }
        else if (category is null)
        {
            errors["category"] = "CATEGORY_UNKNOWN";
        }

        Text(errors, "area", request.Area, BusinessPreRegistration.MaxAreaLength);
        var website = Website(errors, request.Website);
        Text(errors, "description", request.Description, BusinessPreRegistration.MaxDescriptionLength);
        LaunchValidation.Consent(errors, request.Consent);
        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var now = clock.GetUtcNow();
        var at = LaunchValidation.ConsentTime(request.ReceivedAt, now);
        var sent = BusinessPreRegistration.Send(
            request.BusinessName!, request.ContactName!, email!, phone, category!, request.Area!, website, request.Description!, at);
        // The marketing host sends a submission again until it is accepted: the same one is stored once (AC10).
        if (request.ReceivedAt is not null
            && await db.BusinessPreRegistrations.AnyAsync(
                r => r.EmailKey == sent.EmailKey && r.BusinessName == sent.BusinessName && r.CreatedAt == at, cancellationToken))
        {
            return;
        }

        db.BusinessPreRegistrations.Add(sent);
        if (!string.IsNullOrWhiteSpace(settings.TeamEmail))
        {
            db.OutboxMessages.Add(OutboxMessage.Email(null, settings.TeamEmail.Trim(), $"New business pre-registration: {sent.BusinessName}", Describe(sent, category!), now));
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static void Text(Dictionary<string, string> errors, string field, string? value, int max)
    {
        var length = value?.Trim().Length ?? 0;
        if (length == 0)
        {
            errors[field] = "REQUIRED";
        }
        else if (length > max)
        {
            errors[field] = "TOO_LONG";
        }
    }

    /// <summary>Ten digits, with an eleventh leading 1 allowed; anything else that was typed is refused.</summary>
    private static string? Phone(Dictionary<string, string> errors, string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var digits = NotDigit().Replace(raw, string.Empty);
        if (digits.Length == 11 && digits[0] == '1')
        {
            digits = digits[1..];
        }

        if (digits.Length != 10 || Letter().IsMatch(raw))
        {
            errors["phone"] = "PHONE_INVALID";
            return null;
        }

        return digits;
    }

    /// <summary>Only <c>http</c> and <c>https</c> (L2-136 AC5). A bare host name is taken as <c>https</c>. The server never fetches it.</summary>
    private static string? Website(Dictionary<string, string> errors, string? raw)
    {
        var trimmed = raw?.Trim() ?? string.Empty;
        if (trimmed.Length == 0)
        {
            return null;
        }

        if (trimmed.Length > BusinessPreRegistration.MaxWebsiteLength)
        {
            errors["website"] = "TOO_LONG";
            return null;
        }

        var candidate = Scheme().IsMatch(trimmed) ? trimmed : $"https://{trimmed}";
        if (trimmed.Any(char.IsWhiteSpace)
            || !Uri.TryCreate(candidate, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || !uri.Host.Contains('.'))
        {
            errors["website"] = "WEBSITE_INVALID";
            return null;
        }

        return candidate;
    }

    private static string Describe(BusinessPreRegistration sent, Category category) =>
        "An owner sent their business's details from the launching-soon page.\n\n"
        + $"Business: {sent.BusinessName}\n"
        + $"Name: {sent.ContactName}\n"
        + $"E-mail: {sent.Email}\n"
        + $"Phone: {(sent.Phone is { Length: 10 } p ? $"{p[..3]}-{p[3..6]}-{p[6..]}" : "not given")}\n"
        + $"Category: {category.Name}\n"
        + $"Area of Toronto: {sent.Area}\n"
        + $"Website or social link: {sent.Website ?? "not given"}\n\n"
        + $"About the business:\n{sent.Description}\n\n"
        + "They agreed to be contacted about listing this business. It is not listed or verified: verification still applies.\n\n"
        + "Jubilee · Toronto's Christian marketplace\n";

    [GeneratedRegex(@"\D")]
    private static partial Regex NotDigit();

    [GeneratedRegex(@"\p{L}")]
    private static partial Regex Letter();

    [GeneratedRegex(@"^[a-zA-Z][a-zA-Z0-9+.-]*:")]
    private static partial Regex Scheme();
}
