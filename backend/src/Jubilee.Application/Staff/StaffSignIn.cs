using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Staff;

/// <summary>
/// Who signed in at the staff directory (L2-189): the tenant and object ID that identify them, the
/// e-mail address (<c>email</c>, <c>preferred_username</c> or <c>upn</c>), the name, and the
/// authentication methods (<c>amr</c>) the sign-in used.
/// </summary>
public sealed record StaffIdentity(string TenantId, string ObjectId, string Email, string DisplayName, IReadOnlyList<string> Methods);

/// <summary>The staff directory over OpenID Connect: Entra ID, or the development identity (ADR 0040).</summary>
public interface IStaffIdentityClient
{
    /// <summary>The only tenant whose identities are staff.</summary>
    string TenantId { get; }

    Uri BuildAuthorizationUrl(string redirectUri, string state, string nonce, string codeChallenge);

    /// <summary>Exchanges the code and validates the ID token (signature, issuer, audience, lifetime, nonce).</summary>
    Task<StaffIdentity> RedeemAsync(string redirectUri, string code, string codeVerifier, string nonce, CancellationToken cancellationToken);
}

public enum StaffSignInOutcome
{
    SignedIn,
    NoSecondFactor,
    NotStaff,
}

/// <summary>The outcome, and on success the account and the member the session acts as (L2-193 AC6).</summary>
public sealed record StaffSignInResult(StaffSignInOutcome Outcome, StaffMember? Staff = null, Guid? MemberId = null);

public sealed record CompleteStaffSignInCommand(StaffIdentity Identity, string ExpectedTenantId) : IRequest<StaffSignInResult>;

public sealed class CompleteStaffSignInCommandHandler(IAppDbContext db) : IRequestHandler<CompleteStaffSignInCommand, StaffSignInResult>
{
    public const string SecondFactor = "mfa";

    public async Task<StaffSignInResult> Handle(CompleteStaffSignInCommand request, CancellationToken cancellationToken)
    {
        var identity = request.Identity;

        // The API proves the second factor itself; the directory's own policy is not trusted for it (L2-189 AC3).
        if (!identity.Methods.Contains(SecondFactor, StringComparer.Ordinal))
        {
            return new StaffSignInResult(StaffSignInOutcome.NoSecondFactor);
        }

        // Another tenant's identity is never staff (L2-189 AC4).
        if (!string.Equals(identity.TenantId, request.ExpectedTenantId, StringComparison.OrdinalIgnoreCase))
        {
            return new StaffSignInResult(StaffSignInOutcome.NotStaff);
        }

        // Bound accounts are found by identity; an unbound one by its address, then bound (L2-193 AC5).
        var account = await db.StaffMembers.SingleOrDefaultAsync(
            s => s.TenantId == identity.TenantId && s.ObjectId == identity.ObjectId, cancellationToken);
        if (account is null && EmailAddress.TryParse(identity.Email) is { } email)
        {
            account = await db.StaffMembers.SingleOrDefaultAsync(s => s.Email == email.Key, cancellationToken);
            if (account is not null && !account.TryBindTo(identity.TenantId, identity.ObjectId))
            {
                account = null;
            }
        }

        if (account is null || account.Roles == StaffRoles.None)
        {
            return new StaffSignInResult(StaffSignInOutcome.NotStaff);
        }

        await db.SaveChangesAsync(cancellationToken);

        // The session acts as the member with the same confirmed address, so L2-098 AC5 holds (L2-193 AC6).
        var memberId = await db.Members
            .Where(m => m.EmailKey == account.Email && m.EmailStatus == EmailStatus.Confirmed && m.DeletedAt == null)
            .Select(m => (Guid?)m.Id)
            .SingleOrDefaultAsync(cancellationToken);
        return new StaffSignInResult(StaffSignInOutcome.SignedIn, account, memberId);
    }
}
