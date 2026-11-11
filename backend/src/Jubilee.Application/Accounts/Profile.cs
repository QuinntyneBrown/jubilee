using System.Text.RegularExpressions;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Accounts;

/// <summary>What the account page shows and edits (L2-013, L2-014, L2-015).</summary>
public sealed record AccountDto(
    string FirstName,
    string LastName,
    string Email,
    string EmailStatus,
    string? Phone,
    string? PostalCode,
    string? HomeChurch,
    string? Pronouns,
    DateTimeOffset MemberSince,
    DateTimeOffset? ProfileSavedAt,
    bool HasPassword,
    DateTimeOffset? PasswordChangedAt);

public sealed record GetAccountQuery(Guid MemberId) : IRequest<AccountDto>;

public sealed class GetAccountQueryHandler(IAppDbContext db) : IRequestHandler<GetAccountQuery, AccountDto>
{
    public async Task<AccountDto> Handle(GetAccountQuery request, CancellationToken cancellationToken)
    {
        var m = await db.Members.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.MemberId, cancellationToken)
            ?? throw new NotFoundException("MEMBER_NOT_FOUND", "There is no such account.");
        return Profiles.ToDto(m);
    }
}

internal static partial class Profiles
{
    public static AccountDto ToDto(Member m) => new(
        m.FirstName, m.LastName, m.Email, m.EmailStatus == EmailStatus.Confirmed ? "confirmed" : "unconfirmed",
        m.Phone is { Length: 10 } p ? $"{p[..3]}-{p[3..6]}-{p[6..]}" : null,
        m.PostalCode, m.HomeChurch, m.Pronouns, m.CreatedAt, m.ProfileSavedAt, m.PasswordHash is not null, m.PasswordChangedAt);

    [GeneratedRegex("[^0-9]")]
    private static partial Regex NotDigit();

    [GeneratedRegex(@"^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$")]
    private static partial Regex PostalCode();

    /// <summary>Ten digits for a phone like <c>416-555-0142</c>; null when empty; false when it is not a phone.</summary>
    public static bool TryPhone(string? raw, out string? phone)
    {
        phone = null;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return true;
        }

        var digits = NotDigit().Replace(raw, string.Empty);
        var onlyPhoneCharacters = Regex.IsMatch(raw, @"^[\d\s\-().+]+$");
        if (!onlyPhoneCharacters)
        {
            return false;
        }

        if (digits.Length == 11 && digits[0] == '1')
        {
            digits = digits[1..];
        }

        if (digits.Length != 10)
        {
            return false;
        }

        phone = digits;
        return true;
    }

    /// <summary>The postal code in the form <c>M4C 1A1</c>; null when empty; false when it is not complete.</summary>
    public static bool TryPostalCode(string? raw, out string? postal)
    {
        postal = null;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return true;
        }

        var trimmed = raw.Trim();
        if (!PostalCode().IsMatch(trimmed))
        {
            return false;
        }

        var compact = trimmed.Replace(" ", string.Empty).Replace("-", string.Empty).ToUpperInvariant();
        postal = $"{compact[..3]} {compact[3..]}";
        return true;
    }
}

/// <summary>Saves the six profile fields (L2-013).</summary>
public sealed record UpdateProfileCommand(
    Guid MemberId, string? FirstName, string? LastName, string? Phone, string? PostalCode, string? HomeChurch, string? Pronouns) : IRequest;

public sealed class UpdateProfileCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<UpdateProfileCommand>
{
    public async Task Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string>();
        Name(errors, "firstName", request.FirstName);
        Name(errors, "lastName", request.LastName);
        if (!Profiles.TryPhone(request.Phone, out var phone))
        {
            errors["phone"] = "PHONE_INVALID";
        }

        if (!Profiles.TryPostalCode(request.PostalCode, out var postal))
        {
            errors["postalCode"] = "POSTAL_CODE_INVALID";
        }

        if ((request.HomeChurch?.Trim().Length ?? 0) > 100)
        {
            errors["homeChurch"] = "TOO_LONG";
        }

        if ((request.Pronouns?.Trim().Length ?? 0) > 40)
        {
            errors["pronouns"] = "TOO_LONG";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var member = await db.Members.SingleOrDefaultAsync(m => m.Id == request.MemberId, cancellationToken)
            ?? throw new NotFoundException("MEMBER_NOT_FOUND", "There is no such account.");
        member.UpdateProfile(request.FirstName!, request.LastName!, phone, postal, request.HomeChurch, request.Pronouns, clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
    }

    private static void Name(Dictionary<string, string> errors, string field, string? value)
    {
        var trimmed = value?.Trim() ?? string.Empty;
        if (trimmed.Length == 0)
        {
            errors[field] = "REQUIRED";
        }
        else if (trimmed.Length > 50)
        {
            errors[field] = "TOO_LONG";
        }
    }
}
