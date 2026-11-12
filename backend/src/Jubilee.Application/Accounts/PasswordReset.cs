using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Jubilee.Application.Accounts;

/// <summary>"Send reset link": records the request and nothing else, so it is the same for any address (L2-008, L2-141).</summary>
public sealed record RequestPasswordResetCommand(string? Email) : IRequest;

public sealed class RequestPasswordResetCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<RequestPasswordResetCommand>
{
    public async Task Handle(RequestPasswordResetCommand request, CancellationToken cancellationToken)
    {
        var raw = request.Email?.Trim() ?? string.Empty;
        var email = EmailAddress.TryParse(raw);
        if (email is null)
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["email"] = raw.Length == 0 ? "REQUIRED" : "EMAIL_INVALID" });
        }

        db.PasswordResetRequests.Add(PasswordResetRequest.Record(email, clock.GetUtcNow()));
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// The worker's side of a reset request: the only place that reads the account. It sends at most 3 links per address
/// in an hour and makes earlier unused links stop working (L2-008 AC2 and AC4, L2-137).
/// </summary>
public sealed class PasswordResetLinks(IAppDbContext db, AccountSettings settings, TimeProvider clock)
{
    public const int LimitPerHour = 3;

    public async Task<int> IssueAsync(CancellationToken cancellationToken)
    {
        var pending = (await db.PasswordResetRequests.Where(r => r.ProcessedAt == null).ToListAsync(cancellationToken))
            .OrderBy(r => r.RequestedAt).ThenBy(r => r.Id).ToList();
        var issued = 0;
        foreach (var request in pending)
        {
            var now = clock.GetUtcNow();
            var since = request.RequestedAt - TimeSpan.FromHours(1);
            var earlier = (await db.PasswordResetRequests
                .Where(r => r.EmailKey == request.EmailKey && r.ProcessedAt != null)
                .ToListAsync(cancellationToken)).Count(r => r.RequestedAt > since);
            request.MarkProcessed(now);
            if (earlier < LimitPerHour)
            {
                var member = await db.Members.SingleOrDefaultAsync(m => m.EmailKey == request.EmailKey, cancellationToken);
                if (member is not null)
                {
                    await IssueFor(member, now, cancellationToken);
                    issued++;
                }
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        return issued;
    }

    private async Task IssueFor(Member member, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var outstanding = await db.LinkTokens
            .Where(t => t.MemberId == member.Id && t.Purpose == LinkTokenPurpose.PasswordReset && t.SupersededAt == null && t.UsedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var token in outstanding)
        {
            token.Supersede(now);
        }

        var value = LinkTokens.NewValue();
        db.LinkTokens.Add(LinkToken.Issue(member.Id, LinkTokenPurpose.PasswordReset, LinkTokens.Hash(value), now, LinkToken.PasswordResetLifetime));
        db.OutboxMessages.Add(OutboxMessage.Email(
            member.Id,
            member.Email,
            "Reset your Jubilee password",
            $"Hi {member.FirstName},\n\nSomeone asked to reset the password of your Jubilee account. Open this link within 60 minutes to choose a new one. It works once:\n\n{settings.PublicBaseUrl.TrimEnd('/')}/reset-password/{value}\n\nIf it wasn't you, ignore this e-mail. Your password stays as it is.\n\nJubilee · Toronto's Christian marketplace\n",
            now));
    }
}

public enum ResetLinkState
{
    Valid,
    Expired,
}

/// <summary>What a reset link is: valid with the account address, or expired (used, replaced, unknown or old alike).</summary>
public sealed record ResetLinkView(ResetLinkState State, string? Email);

public sealed record InspectResetLinkQuery(string? Token) : IRequest<ResetLinkView>;

public sealed class InspectResetLinkQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<InspectResetLinkQuery, ResetLinkView>
{
    public async Task<ResetLinkView> Handle(InspectResetLinkQuery request, CancellationToken cancellationToken)
    {
        var redeemable = await ResetLinks.FindRedeemableAsync(db, request.Token, clock.GetUtcNow(), cancellationToken);
        if (redeemable is null)
        {
            return new ResetLinkView(ResetLinkState.Expired, null);
        }

        var member = await db.Members.SingleAsync(m => m.Id == redeemable.MemberId, cancellationToken);
        return new ResetLinkView(ResetLinkState.Valid, member.Email);
    }
}

internal static class ResetLinks
{
    public static async Task<LinkToken?> FindRedeemableAsync(IAppDbContext db, string? value, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 200)
        {
            return null;
        }

        var hash = LinkTokens.Hash(value);
        var token = await db.LinkTokens.SingleOrDefaultAsync(t => t.TokenHash == hash && t.Purpose == LinkTokenPurpose.PasswordReset, cancellationToken);
        return token is not null && token.IsRedeemable(now) ? token : null;
    }
}

/// <summary>Chooses the new password (L2-009, L2-134).</summary>
public sealed record ResetPasswordCommand(string? Token, string? NewPassword, string? RepeatPassword) : IRequest;

public sealed class ResetPasswordCommandHandler(
    IAppDbContext db, IPasswordHasher hasher, IBreachedPasswordChecker breaches, TimeProvider clock, ILogger<ResetPasswordCommandHandler> logger)
    : IRequestHandler<ResetPasswordCommand>
{
    public async Task Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var token = await ResetLinks.FindRedeemableAsync(db, request.Token, now, cancellationToken)
            ?? throw new Errors.GoneException("LINK_EXPIRED", "This link has expired.");

        var errors = new Dictionary<string, string>();
        var password = request.NewPassword ?? string.Empty;
        if (password.Length == 0)
        {
            errors["newPassword"] = "REQUIRED";
        }
        else if (password.Length > JoinWithEmailCommandHandler.MaxPasswordLength)
        {
            errors["newPassword"] = "TOO_LONG";
        }
        else if (password.Length < JoinWithEmailCommandHandler.MinPasswordLength)
        {
            errors["newPassword"] = "PASSWORD_TOO_SHORT";
        }
        else if (await breaches.IsBreachedAsync(password, cancellationToken))
        {
            errors["newPassword"] = "PASSWORD_BREACHED";
        }

        if (!errors.ContainsKey("newPassword") && !string.Equals(password, request.RepeatPassword, StringComparison.Ordinal))
        {
            errors["repeatPassword"] = "PASSWORDS_DIFFER";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var member = await db.Members.SingleAsync(m => m.Id == token.MemberId, cancellationToken);
        member.ChangePassword(hasher.Hash(password), now);
        foreach (var session in await db.Sessions.Where(x => x.MemberId == member.Id && x.EndedAt == null).ToListAsync(cancellationToken))
        {
            session.End(now);
        }

        token.Redeem(now);
        var others = await db.LinkTokens
            .Where(t => t.MemberId == member.Id && t.Purpose == LinkTokenPurpose.PasswordReset && t.UsedAt == null && t.SupersededAt == null)
            .ToListAsync(cancellationToken);
        foreach (var other in others)
        {
            other.Supersede(now);
        }

        db.OutboxMessages.Add(OutboxMessage.Email(
            member.Id,
            member.Email,
            "Your Jubilee password was changed",
            $"Hi {member.FirstName},\n\nThe password of your Jubilee account was just changed, and you were signed out everywhere. If that was you, there is nothing to do.\n\nIf it wasn't you, reset your password again right away and write to us.\n\nJubilee · Toronto's Christian marketplace\n",
            now));
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Security event: PasswordReset for member {MemberId} succeeded", member.Id);
    }
}

/// <summary>The smallest sign-in the reset needs: e-mail and password. Lockout and the sign-in page are journey 5.</summary>
public sealed record SignInWithPasswordCommand(string? Email, string? Password) : IRequest<Member?>;

public sealed class SignInWithPasswordCommandHandler(IAppDbContext db, IPasswordHasher hasher, ILogger<SignInWithPasswordCommandHandler> logger)
    : IRequestHandler<SignInWithPasswordCommand, Member?>
{
    // Checked for an unknown address too, so the answer takes about as long either way (L2-141 AC1).
    private static readonly Lazy<string> NoOne = new(() => $"argon2id$m=19456,t=2,p=1${Convert.ToBase64String(new byte[16])}${Convert.ToBase64String(new byte[32])}");

    public async Task<Member?> Handle(SignInWithPasswordCommand request, CancellationToken cancellationToken)
    {
        var email = EmailAddress.TryParse(request.Email);
        var member = email is null ? null : await db.Members.SingleOrDefaultAsync(m => m.EmailKey == email.Key, cancellationToken);
        var password = request.Password ?? string.Empty;
        var ok = hasher.Verify(member?.PasswordHash ?? NoOne.Value, password) && member?.PasswordHash is not null;
        logger.LogInformation("Security event: SignIn {Outcome}", ok ? "succeeded" : "failed");
        return ok ? member : null;
    }
}
