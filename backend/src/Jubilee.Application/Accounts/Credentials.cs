using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Jubilee.Application.Accounts;

/// <summary>"Change e-mail": the new address and the current password (L2-014). Nothing changes until the link is opened.</summary>
public sealed record RequestEmailChangeCommand(Guid MemberId, string? Email, string? CurrentPassword) : IRequest;

public sealed class RequestEmailChangeCommandHandler(
    IAppDbContext db, IPasswordHasher hasher, AccountSettings settings, TimeProvider clock, ILogger<RequestEmailChangeCommandHandler> logger)
    : IRequestHandler<RequestEmailChangeCommand>
{
    public async Task Handle(RequestEmailChangeCommand request, CancellationToken cancellationToken)
    {
        var member = await db.Members.SingleOrDefaultAsync(m => m.Id == request.MemberId, cancellationToken)
            ?? throw new NotFoundException("MEMBER_NOT_FOUND", "There is no such account.");

        var errors = new Dictionary<string, string>();
        var email = EmailAddress.TryParse(request.Email);
        if (email is null)
        {
            errors["email"] = string.IsNullOrWhiteSpace(request.Email) ? "REQUIRED" : "EMAIL_INVALID";
        }
        else if (await db.Members.AnyAsync(m => m.EmailKey == email.Key && m.Id != member.Id, cancellationToken))
        {
            errors["email"] = "EMAIL_IN_USE";
        }

        if (member.PasswordHash is not null && !CurrentPassword.Matches(member, request.CurrentPassword, hasher))
        {
            errors["currentPassword"] = "CURRENT_PASSWORD_INCORRECT";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var now = clock.GetUtcNow();
        var outstanding = await db.LinkTokens
            .Where(t => t.MemberId == member.Id && t.Purpose == LinkTokenPurpose.ChangeEmail && t.SupersededAt == null && t.UsedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var token in outstanding)
        {
            token.Supersede(now);
        }

        var value = LinkTokens.NewValue();
        db.LinkTokens.Add(LinkToken.Issue(
            member.Id, LinkTokenPurpose.ChangeEmail, LinkTokens.Hash(value), now, LinkToken.ChangeEmailLifetime, email!.Value));
        var baseUrl = settings.PublicBaseUrl.TrimEnd('/');
        db.OutboxMessages.Add(OutboxMessage.Email(
            member.Id,
            email.Value,
            "Confirm your new e-mail for Jubilee",
            $"Hi {member.FirstName},\n\nConfirm this address to use it for your Jubilee account. Open this link within 24 hours:\n\n{baseUrl}/confirm-email-change/{value}\n\nIf you didn't ask for this, ignore this e-mail. Nothing changes until the link is opened.\n\nJubilee · Toronto's Christian marketplace\n",
            now));
        db.OutboxMessages.Add(OutboxMessage.Email(
            member.Id,
            member.Email,
            "A Jubilee e-mail change was requested",
            $"Hi {member.FirstName},\n\nSomeone asked to change the e-mail of your Jubilee account to {email.Value}. Your address stays {member.Email} until the link sent to the new address is opened.\n\nIf it wasn't you, change your password right away.\n\nJubilee · Toronto's Christian marketplace\n",
            now));
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Security event: EmailChangeRequested for member {MemberId}", member.Id);
    }
}

public enum EmailChangeOutcome
{
    Confirmed,
    Expired,
    EmailInUse,
}

/// <summary>Opens the link in the e-mail to the new address (L2-014 AC3). The link is the credential, so no session is needed.</summary>
public sealed record ConfirmEmailChangeCommand(string? Token) : IRequest<EmailChangeOutcome>;

public sealed class ConfirmEmailChangeCommandHandler(IAppDbContext db, TimeProvider clock, ILogger<ConfirmEmailChangeCommandHandler> logger)
    : IRequestHandler<ConfirmEmailChangeCommand, EmailChangeOutcome>
{
    public async Task<EmailChangeOutcome> Handle(ConfirmEmailChangeCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        if (string.IsNullOrWhiteSpace(request.Token) || request.Token.Length > 200)
        {
            return EmailChangeOutcome.Expired;
        }

        var hash = LinkTokens.Hash(request.Token);
        var token = await db.LinkTokens.SingleOrDefaultAsync(t => t.TokenHash == hash && t.Purpose == LinkTokenPurpose.ChangeEmail, cancellationToken);
        if (token is null || !token.IsRedeemable(now) || EmailAddress.TryParse(token.TargetEmail) is not { } target)
        {
            return EmailChangeOutcome.Expired;
        }

        var member = await db.Members.SingleAsync(m => m.Id == token.MemberId, cancellationToken);
        if (await db.Members.AnyAsync(m => m.EmailKey == target.Key && m.Id != member.Id, cancellationToken))
        {
            return EmailChangeOutcome.EmailInUse;
        }

        member.ChangeEmail(target);
        token.Redeem(now);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Security event: EmailChanged for member {MemberId}", member.Id);
        return EmailChangeOutcome.Confirmed;
    }
}

/// <summary>"Change password" or, for a member who joined with Google, "Set a password" (L2-015).</summary>
public sealed record ChangePasswordCommand(Guid MemberId, string? CurrentPassword, string? NewPassword, string? RepeatPassword) : IRequest<Member>;

public sealed class ChangePasswordCommandHandler(
    IAppDbContext db, IPasswordHasher hasher, IBreachedPasswordChecker breaches, TimeProvider clock, ILogger<ChangePasswordCommandHandler> logger)
    : IRequestHandler<ChangePasswordCommand, Member>
{
    public async Task<Member> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var member = await db.Members.SingleOrDefaultAsync(m => m.Id == request.MemberId, cancellationToken)
            ?? throw new NotFoundException("MEMBER_NOT_FOUND", "There is no such account.");

        var errors = new Dictionary<string, string>();
        if (member.PasswordHash is not null && !CurrentPassword.Matches(member, request.CurrentPassword, hasher))
        {
            errors["currentPassword"] = "CURRENT_PASSWORD_INCORRECT";
        }

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

        var now = clock.GetUtcNow();
        member.ChangePassword(hasher.Hash(password), now);
        var waiting = await db.LinkTokens
            .Where(t => t.MemberId == member.Id && t.Purpose == LinkTokenPurpose.PasswordReset && t.UsedAt == null && t.SupersededAt == null)
            .ToListAsync(cancellationToken);
        foreach (var token in waiting)
        {
            token.Supersede(now);
        }

        db.OutboxMessages.Add(OutboxMessage.Email(
            member.Id,
            member.Email,
            "Your Jubilee password was changed",
            $"Hi {member.FirstName},\n\nThe password of your Jubilee account was just changed, and every other device was signed out. If that was you, there is nothing to do.\n\nIf it wasn't you, reset your password again right away and write to us.\n\nJubilee · Toronto's Christian marketplace\n",
            now));
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Security event: PasswordChanged for member {MemberId}", member.Id);
        return member;
    }
}

internal static class CurrentPassword
{
    /// <summary>True when the member has a password and the one given is it. The password never reaches a log.</summary>
    public static bool Matches(Member member, string? given, IPasswordHasher hasher) =>
        member.PasswordHash is not null && !string.IsNullOrEmpty(given) && hasher.Verify(member.PasswordHash, given);
}
