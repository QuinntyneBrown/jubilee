using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Accounts;

/// <summary>The e-mails the account journeys send, as text; <see cref="Emails.EmailLayout"/> adds the HTML part when they are sent (L2-179 AC4, AC5).</summary>
public sealed class AccountEmails(IAppDbContext db, AccountSettings settings, TimeProvider clock)
{
    /// <summary>Issues a fresh confirmation link, makes earlier ones stop working, and queues the e-mail.</summary>
    public async Task QueueConfirmationAsync(Member member, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var outstanding = await db.LinkTokens
            .Where(t => t.MemberId == member.Id && t.Purpose == LinkTokenPurpose.EmailConfirmation && t.SupersededAt == null && t.UsedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var token in outstanding)
        {
            token.Supersede(now);
        }

        var value = LinkTokens.NewValue();
        db.LinkTokens.Add(LinkToken.Issue(member.Id, LinkTokenPurpose.EmailConfirmation, LinkTokens.Hash(value), now, LinkToken.EmailConfirmationLifetime));
        db.OutboxMessages.Add(OutboxMessage.Email(
            member.Id,
            member.Email,
            "Confirm your e-mail for Jubilee",
            $"Hi {member.FirstName},\n\nConfirm your e-mail to message businesses and book meetings on Jubilee. Open this link within 24 hours:\n\n{settings.PublicBaseUrl.TrimEnd('/')}/verify-email/{value}\n\nIf you didn't join Jubilee, ignore this e-mail.\n\nJubilee · Toronto's Christian marketplace\n",
            now));
    }

    /// <summary>Tells the holder of an address that someone tried to use it (L2-141 AC2).</summary>
    public void QueueAddressInUseNotice(Member holder) =>
        db.OutboxMessages.Add(OutboxMessage.Email(
            holder.Id,
            holder.Email,
            "Someone tried to join Jubilee with your e-mail",
            $"Hi {holder.FirstName},\n\nSomeone tried to create a Jubilee account with your address. Your account is unchanged. If that was you, sign in at {settings.PublicBaseUrl.TrimEnd('/')}/sign-in.\n\nJubilee · Toronto's Christian marketplace\n",
            clock.GetUtcNow()));
}

/// <summary>Join with e-mail and password (L2-001, L2-002).</summary>
public sealed record JoinWithEmailCommand(
    string? FirstName, string? LastName, string? Email, string? Password, string? HomeChurch, string? HomeChurchAddress, bool AgreementAccepted)
    : IRequest<Member>;

public sealed class JoinWithEmailCommandHandler(
    IAppDbContext db,
    IPasswordHasher hasher,
    IBreachedPasswordChecker breaches,
    AccountEmails emails,
    Jubilee.Application.Content.ContentReader content,
    TimeProvider clock) : IRequestHandler<JoinWithEmailCommand, Member>
{
    public const int MaxNameLength = 50;
    public const int MaxPasswordLength = 128;
    public const int MinPasswordLength = 10;
    public const int MaxChurchLength = 100;

    public async Task<Member> Handle(JoinWithEmailCommand request, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string>();
        Name(errors, "firstName", request.FirstName);
        Name(errors, "lastName", request.LastName);
        if ((request.HomeChurch?.Trim().Length ?? 0) > MaxChurchLength)
        {
            errors["homeChurch"] = "TOO_LONG";
        }

        if ((request.HomeChurchAddress?.Trim().Length ?? 0) > Member.MaxHomeChurchAddressLength)
        {
            errors["homeChurchAddress"] = "TOO_LONG";
        }

        var email = EmailAddress.TryParse(request.Email);
        var rawEmail = request.Email?.Trim() ?? string.Empty;
        if (rawEmail.Length == 0)
        {
            errors["email"] = "REQUIRED";
        }
        else if (rawEmail.Length > EmailAddress.MaxLength)
        {
            errors["email"] = "TOO_LONG";
        }
        else if (email is null)
        {
            errors["email"] = "EMAIL_INVALID";
        }

        var password = request.Password ?? string.Empty;
        if (password.Length == 0)
        {
            errors["password"] = "REQUIRED";
        }
        else if (password.Length > MaxPasswordLength)
        {
            errors["password"] = "TOO_LONG";
        }
        else if (password.Length < MinPasswordLength)
        {
            errors["password"] = "PASSWORD_TOO_SHORT";
        }
        else if (await breaches.IsBreachedAsync(password, cancellationToken))
        {
            errors["password"] = "PASSWORD_BREACHED";
        }

        if (!request.AgreementAccepted)
        {
            errors["agreement"] = "AGREEMENT_REQUIRED";
        }

        if (email is not null && !errors.ContainsKey("email"))
        {
            var holder = await db.Members.SingleOrDefaultAsync(m => m.EmailKey == email.Key, cancellationToken);
            if (holder is not null)
            {
                errors["email"] = "EMAIL_TAKEN";
                emails.QueueAddressInUseNotice(holder);
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var member = Member.Join(email!, request.FirstName!, request.LastName!, request.HomeChurch, hasher.Hash(password), clock.GetUtcNow(), homeChurchAddress: request.HomeChurchAddress, termsVersion: await content.TermsVersion(cancellationToken));
        db.Members.Add(member);
        await emails.QueueConfirmationAsync(member, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return member;
    }

    private static void Name(Dictionary<string, string> errors, string field, string? value)
    {
        var length = value?.Trim().Length ?? 0;
        if (length == 0)
        {
            errors[field] = "REQUIRED";
        }
        else if (length > MaxNameLength)
        {
            errors[field] = "TOO_LONG";
        }
    }
}

/// <summary>"Send it again": earlier links stop working (L2-001 AC2).</summary>
public sealed record ResendConfirmationCommand(Guid MemberId) : IRequest;

public sealed class ResendConfirmationCommandHandler(IAppDbContext db, AccountEmails emails) : IRequestHandler<ResendConfirmationCommand>
{
    public async Task Handle(ResendConfirmationCommand request, CancellationToken cancellationToken)
    {
        var member = await db.Members.SingleOrDefaultAsync(m => m.Id == request.MemberId, cancellationToken);
        if (member is null || member.EmailStatus == EmailStatus.Confirmed)
        {
            return;
        }

        await emails.QueueConfirmationAsync(member, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public enum ConfirmEmailOutcome
{
    Confirmed,
    AlreadyConfirmed,
    Expired,
}

public sealed record ConfirmEmailResult(ConfirmEmailOutcome Outcome, string? FirstName);

/// <summary>Opens a confirmation link (L2-004). Needs no session: the link may be opened on another device.</summary>
public sealed record ConfirmEmailCommand(string? Token) : IRequest<ConfirmEmailResult>;

public sealed class ConfirmEmailCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ConfirmEmailCommand, ConfirmEmailResult>
{
    private static readonly ConfirmEmailResult Expired = new(ConfirmEmailOutcome.Expired, null);

    public async Task<ConfirmEmailResult> Handle(ConfirmEmailCommand request, CancellationToken cancellationToken)
    {
        // A malformed or unknown token reveals nothing about any account (L2-004 AC4).
        if (string.IsNullOrWhiteSpace(request.Token) || request.Token.Length > 200)
        {
            return Expired;
        }

        var hash = LinkTokens.Hash(request.Token);
        var token = await db.LinkTokens.SingleOrDefaultAsync(
            t => t.TokenHash == hash && t.Purpose == LinkTokenPurpose.EmailConfirmation, cancellationToken);
        if (token is null)
        {
            return Expired;
        }

        var member = await db.Members.SingleAsync(m => m.Id == token.MemberId, cancellationToken);
        var now = clock.GetUtcNow();
        if (token.IsRedeemable(now))
        {
            token.Redeem(now);
            member.ConfirmEmail();
            Notifications.NotificationRules.Tell(
                db, member.Id.ToString(), "account", "Your e-mail is confirmed", "You can now message businesses and book meetings.", "/account", now);
            await db.SaveChangesAsync(cancellationToken);
            return new ConfirmEmailResult(ConfirmEmailOutcome.Confirmed, member.FirstName);
        }

        // A used link changes nothing: success when the account is confirmed, otherwise expired.
        return token.UsedAt is not null && member.EmailStatus == EmailStatus.Confirmed
            ? new ConfirmEmailResult(ConfirmEmailOutcome.AlreadyConfirmed, member.FirstName)
            : Expired;
    }
}

/// <summary>"Use another e-mail": replaces the unconfirmed address and sends a new link (L2-004 AC5).</summary>
public sealed record ChangeUnconfirmedEmailCommand(Guid MemberId, string? Email) : IRequest;

public sealed class ChangeUnconfirmedEmailCommandHandler(IAppDbContext db, AccountEmails emails) : IRequestHandler<ChangeUnconfirmedEmailCommand>
{
    public async Task Handle(ChangeUnconfirmedEmailCommand request, CancellationToken cancellationToken)
    {
        var email = EmailAddress.TryParse(request.Email)
            ?? throw new ValidationFailedException(new Dictionary<string, string> { ["email"] = "EMAIL_INVALID" });
        var member = await db.Members.SingleOrDefaultAsync(m => m.Id == request.MemberId, cancellationToken)
            ?? throw new NotFoundException("member_not_found", "There is no such member.");
        if (member.EmailStatus == EmailStatus.Confirmed)
        {
            throw new ConflictException("email_already_confirmed", "This e-mail is already confirmed.");
        }

        // The answer is the same whether or not the address belongs to someone (L2-141 AC1).
        var holder = await db.Members.SingleOrDefaultAsync(m => m.EmailKey == email.Key && m.Id != member.Id, cancellationToken);
        if (holder is not null)
        {
            emails.QueueAddressInUseNotice(holder);
        }
        else
        {
            member.ReplaceUnconfirmedEmail(email);
            await emails.QueueConfirmationAsync(member, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>The e-mail provider reports a hard bounce or spam complaint (L2-179 AC2).</summary>
public sealed record RecordEmailBounceCommand(string Address) : IRequest;

public sealed class RecordEmailBounceCommandHandler(IAppDbContext db) : IRequestHandler<RecordEmailBounceCommand>
{
    public async Task Handle(RecordEmailBounceCommand request, CancellationToken cancellationToken)
    {
        var email = EmailAddress.TryParse(request.Address);
        if (email is null)
        {
            return;
        }

        var member = await db.Members.SingleOrDefaultAsync(m => m.EmailKey == email.Key, cancellationToken);
        if (member is not null)
        {
            member.MarkEmailBounced();
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}

/// <summary>Accepts the statement of faith and terms after joining with Google (L2-003 AC1).</summary>
public sealed record AcceptAgreementCommand(Guid MemberId) : IRequest;

public sealed class AcceptAgreementCommandHandler(IAppDbContext db, TimeProvider clock, Jubilee.Application.Content.ContentReader content) : IRequestHandler<AcceptAgreementCommand>
{
    public async Task Handle(AcceptAgreementCommand request, CancellationToken cancellationToken)
    {
        var member = await db.Members.SingleOrDefaultAsync(m => m.Id == request.MemberId, cancellationToken)
            ?? throw new NotFoundException("member_not_found", "There is no such member.");
        member.AcceptAgreement(clock.GetUtcNow(), await content.TermsVersion(cancellationToken));
        await db.SaveChangesAsync(cancellationToken);
    }
}

public enum GoogleSignInOutcome
{
    SignedIn,
    Linked,
    CreatedAwaitingAgreement,
    EmailNotVerified,
}

public sealed record GoogleSignInResult(GoogleSignInOutcome Outcome, Member? Member);

/// <summary>Completes a Google sign-in (L2-003).</summary>
public sealed record CompleteGoogleSignInCommand(GoogleIdentity Identity) : IRequest<GoogleSignInResult>;

public sealed class CompleteGoogleSignInCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<CompleteGoogleSignInCommand, GoogleSignInResult>
{
    public async Task<GoogleSignInResult> Handle(CompleteGoogleSignInCommand request, CancellationToken cancellationToken)
    {
        var identity = request.Identity;
        var email = EmailAddress.TryParse(identity.Email);
        if (!identity.EmailVerified || email is null)
        {
            return new GoogleSignInResult(GoogleSignInOutcome.EmailNotVerified, null);
        }

        var bySubject = await db.Members.SingleOrDefaultAsync(m => m.GoogleSubject == identity.Subject, cancellationToken);
        if (bySubject is not null)
        {
            return new GoogleSignInResult(GoogleSignInOutcome.SignedIn, bySubject);
        }

        var byEmail = await db.Members.SingleOrDefaultAsync(m => m.EmailKey == email.Key, cancellationToken);
        if (byEmail is { IsDeleted: true })
        {
            // A deleted account keeps its address for 30 days and can no longer be signed in to (L2-017).
            return new GoogleSignInResult(GoogleSignInOutcome.EmailNotVerified, null);
        }

        if (byEmail is not null)
        {
            byEmail.LinkGoogle(identity.Subject);
            await db.SaveChangesAsync(cancellationToken);
            return new GoogleSignInResult(GoogleSignInOutcome.Linked, byEmail);
        }

        var created = Member.JoinWithGoogle(
            email, string.IsNullOrWhiteSpace(identity.GivenName) ? email.Value.Split('@')[0] : identity.GivenName,
            identity.FamilyName ?? string.Empty, identity.Subject, clock.GetUtcNow());
        db.Members.Add(created);
        await db.SaveChangesAsync(cancellationToken);
        return new GoogleSignInResult(GoogleSignInOutcome.CreatedAwaitingAgreement, created);
    }
}

/// <summary>What <c>GET /api/session</c> says about a member's account.</summary>
public sealed record MemberAccountDto(
    Guid Id, string Email, string FirstName, string DisplayName, string Initials, string EmailStatus, bool EmailBounced, bool AgreementRequired);

public sealed record GetMemberAccountQuery(string Subject) : IRequest<MemberAccountDto?>;

public sealed class GetMemberAccountQueryHandler(IAppDbContext db) : IRequestHandler<GetMemberAccountQuery, MemberAccountDto?>
{
    public async Task<MemberAccountDto?> Handle(GetMemberAccountQuery request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(request.Subject, out var id))
        {
            return null;
        }

        var m = await db.Members.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (m is null)
        {
            return null;
        }

        var initials = (m.FirstName[..1] + (m.LastName.Length > 0 ? m.LastName[..1] : string.Empty)).ToUpperInvariant();
        return new MemberAccountDto(
            m.Id, m.Email, m.FirstName, m.DisplayName, initials,
            m.EmailStatus == EmailStatus.Confirmed ? "confirmed" : "unconfirmed", m.EmailBounced, !m.IsUsable());
    }
}

/// <summary>Sends the e-mails waiting in the outbox; a failure is retried with back-off (L2-179 AC3).</summary>
public sealed class OutboxDispatcher(
    IAppDbContext db, IEmailSender sender, TimeProvider clock, AccountSettings settings, Notifications.IUnsubscribeLinks unsubscribe)
{
    public async Task<int> DispatchDueAsync(CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var due = (await db.OutboxMessages.Where(m => m.SentAt == null && m.FailedAt == null).ToListAsync(cancellationToken))
            .Where(m => m.IsDue(now)).OrderBy(m => m.CreatedAt).Take(50).ToList();
        var sent = 0;
        foreach (var message in due)
        {
            try
            {
                var link = message.Category is { } category && message.MemberId is { } memberId
                    ? $"{settings.PublicBaseUrl.TrimEnd('/')}/api/email/unsubscribe/{unsubscribe.For(memberId, category)}"
                    : null;
                await sender.SendAsync(Emails.EmailLayout.Render(message.ToAddress, message.Subject, message.TextBody, link), cancellationToken);
                message.MarkSent(clock.GetUtcNow());
                sent++;
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                message.MarkAttemptFailed(clock.GetUtcNow());
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        return sent;
    }
}
