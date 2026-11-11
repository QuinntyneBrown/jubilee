using System.Security.Cryptography;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Jubilee.Application.Accounts;

public enum SignInOutcome
{
    SignedIn,
    InvalidCredentials,
    AccountLocked,
    AddressBlocked,
}

public sealed record SignInResult(SignInOutcome Outcome, Member? Member, TimeSpan? RetryAfter);

/// <summary>Sign in with e-mail and password (L2-006), throttled (L2-007) and without revealing which addresses have accounts (L2-141).</summary>
public sealed record SignInCommand(string? Email, string? Password, string Address) : IRequest<SignInResult>;

public sealed class SignInCommandHandler(
    IAppDbContext db,
    IPasswordHasher hasher,
    AccountSettings settings,
    TimeProvider clock,
    ILogger<SignInCommandHandler> logger) : IRequestHandler<SignInCommand, SignInResult>
{
    // Checked when no account matches, so both paths take about as long (L2-141).
    private static string? _dummyHash;

    public async Task<SignInResult> Handle(SignInCommand request, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string>();
        var email = EmailAddress.TryParse(request.Email);
        if (email is null)
        {
            errors["email"] = "EMAIL_INVALID";
        }

        if (string.IsNullOrEmpty(request.Password))
        {
            errors["password"] = "REQUIRED";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var now = clock.GetUtcNow();
        var since = now - SignInFailure.Window;
        var accountKey = LinkTokens.Hash(email!.Key);

        // The address is checked first, then the account (L2-007).
        var fromAddress = await db.SignInFailures
            .Where(f => f.Address == request.Address && f.At > since)
            .OrderBy(f => f.At)
            .Select(f => f.At)
            .ToListAsync(cancellationToken);
        if (fromAddress.Count >= SignInFailure.AddressLimit)
        {
            logger.LogWarning("Sign-in blocked for address {Address}: too many failures.", request.Address);
            return new SignInResult(SignInOutcome.AddressBlocked, null, fromAddress[0] + SignInFailure.Window - now);
        }

        var failures = await db.SignInFailures
            .Where(f => f.AccountKey == accountKey && f.At > since)
            .OrderBy(f => f.At)
            .Select(f => f.At)
            .ToListAsync(cancellationToken);
        if (failures.Count >= SignInFailure.AccountLimit)
        {
            // The lock lasts 15 minutes from the failure that started it, and holds for the right password too.
            var lockedUntil = failures[SignInFailure.AccountLimit - 1] + SignInFailure.Window;
            logger.LogWarning("Sign-in locked for an account from {Address}.", request.Address);
            return new SignInResult(SignInOutcome.AccountLocked, null, lockedUntil - now);
        }

        var member = await db.Members.SingleOrDefaultAsync(m => m.EmailKey == email.Key, cancellationToken);
        var passwordMatches = false;
        if (member?.PasswordHash is { } hash)
        {
            passwordMatches = hasher.Verify(hash, request.Password!);
        }
        else
        {
            _dummyHash ??= hasher.Hash(Convert.ToHexString(RandomNumberGenerator.GetBytes(16)));
            hasher.Verify(_dummyHash, request.Password!);
        }

        if (member is null || !passwordMatches)
        {
            db.SignInFailures.Add(SignInFailure.Record(accountKey, request.Address, now));
            var lockStarts = failures.Count + 1 == SignInFailure.AccountLimit;
            if (lockStarts && member is not null)
            {
                db.OutboxMessages.Add(OutboxMessage.Email(
                    member.Id,
                    member.Email,
                    "Sign-in to Jubilee was blocked",
                    $"Hi {member.FirstName},\n\nWe blocked sign-in to your Jubilee account for 15 minutes after repeated failed attempts. If that was you, wait and try again. If it was not, reset your password: {settings.PublicBaseUrl.TrimEnd('/')}/forgot-password\n\nJubilee · Toronto's Christian marketplace\n",
                    now));
            }

            await db.SaveChangesAsync(cancellationToken);
            logger.LogWarning("Sign-in failed from {Address}.", request.Address);
            if (lockStarts)
            {
                logger.LogWarning("Sign-in locked for an account from {Address} after repeated failures.", request.Address);
            }

            return new SignInResult(SignInOutcome.InvalidCredentials, null, null);
        }

        var cleared = await db.SignInFailures.Where(f => f.AccountKey == accountKey).ToListAsync(cancellationToken);
        db.SignInFailures.RemoveRange(cleared);
        // Failures nobody needs any more.
        db.SignInFailures.RemoveRange(await db.SignInFailures.Where(f => f.At <= since).ToListAsync(cancellationToken));
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Sign-in succeeded for member {MemberId} from {Address}.", member.Id, request.Address);
        return new SignInResult(SignInOutcome.SignedIn, member, null);
    }
}

/// <summary>How many other sessions the member has (L2-011 AC4).</summary>
public sealed record OtherSessionCountQuery(Guid MemberId, Guid? CurrentSessionId) : IRequest<int>;

public sealed class OtherSessionCountQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<OtherSessionCountQuery, int>
{
    public async Task<int> Handle(OtherSessionCountQuery request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var sessions = await db.Sessions
            .Where(s => s.MemberId == request.MemberId && s.EndedAt == null && s.Id != request.CurrentSessionId)
            .ToListAsync(cancellationToken);
        return sessions.Count(s => !SessionPolicy.IsExpired(s, now));
    }
}

/// <summary>Ends every session of the member but the current one (L2-011 AC4).</summary>
public sealed record EndOtherSessionsCommand(Guid MemberId, Guid? CurrentSessionId) : IRequest;

public sealed class EndOtherSessionsCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<EndOtherSessionsCommand>
{
    public async Task Handle(EndOtherSessionsCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var others = await db.Sessions
            .Where(s => s.MemberId == request.MemberId && s.EndedAt == null && s.Id != request.CurrentSessionId)
            .ToListAsync(cancellationToken);
        foreach (var session in others)
        {
            session.End(now);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
