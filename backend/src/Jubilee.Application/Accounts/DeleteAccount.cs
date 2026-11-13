using Jubilee.Application.Abstractions;
using Jubilee.Application.Directory;
using Jubilee.Application.Errors;
using Jubilee.Application.Moderation;
using Jubilee.Application.Requests;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Jubilee.Application.Accounts;

/// <summary>What the delete-account dialog names and counts (L2-017 AC1).</summary>
public sealed record DeletionSummaryDto(string Name, string Email, int Conversations, int OpenRequests);

public sealed record GetDeletionSummaryQuery(Guid MemberId) : IRequest<DeletionSummaryDto>;

public sealed class GetDeletionSummaryQueryHandler(IAppDbContext db) : IRequestHandler<GetDeletionSummaryQuery, DeletionSummaryDto>
{
    public async Task<DeletionSummaryDto> Handle(GetDeletionSummaryQuery request, CancellationToken cancellationToken)
    {
        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == request.MemberId && m.DeletedAt == null, cancellationToken)
            ?? throw new NotFoundException("MEMBER_NOT_FOUND", "There is no such account.");
        var subject = member.Id.ToString();
        return new DeletionSummaryDto(
            member.DisplayName,
            member.Email,
            await db.Conversations.CountAsync(c => c.MemberSubject == subject, cancellationToken),
            await db.Requests.CountAsync(r => r.MemberSubject == subject && (r.Status == RequestStatus.New || r.Status == RequestStatus.Confirmed), cancellationToken));
    }
}

/// <summary>
/// Deletes the account after the member typed DELETE (L2-017). Everything is done in one unit of work, so a failure removes
/// nothing: sessions end, open requests are cancelled and the businesses told, the member's own listings are unpublished,
/// the saved list and searches go, a confirmation is mailed and the audit log records it. The rest of the personal data
/// is erased 30 days later by <see cref="AccountErasure"/>.
/// </summary>
public sealed record DeleteAccountCommand(Guid MemberId, string? Confirmation) : IRequest;

public sealed class DeleteAccountCommandHandler(
    IAppDbContext db, TimeProvider clock, AccountSettings settings, IDirectoryReadCache directory, IDeletionLedger ledger,
    ILogger<DeleteAccountCommandHandler> logger)
    : IRequestHandler<DeleteAccountCommand>
{
    public const string Phrase = "DELETE";

    public async Task Handle(DeleteAccountCommand command, CancellationToken cancellationToken)
    {
        // Exactly the word, in capitals: "delete" or "DELETE " are not it (L2-017 AC2).
        if (!string.Equals(command.Confirmation, Phrase, StringComparison.Ordinal))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["confirmation"] = "CONFIRMATION_MISMATCH" });
        }

        var member = await db.Members.SingleOrDefaultAsync(m => m.Id == command.MemberId && m.DeletedAt == null, cancellationToken)
            ?? throw new NotFoundException("MEMBER_NOT_FOUND", "There is no such account.");
        var subject = member.Id.ToString();
        var now = clock.GetUtcNow();

        // The businesses of the open requests are told now; a deletion re-applied after a restore does not tell them again.
        var open = await db.Requests.Include(r => r.Transitions)
            .Where(r => r.MemberSubject == subject && (r.Status == RequestStatus.New || r.Status == RequestStatus.Confirmed))
            .ToListAsync(cancellationToken);
        foreach (var request in open)
        {
            var listing = await db.Listings.SingleAsync(l => l.Id == request.ListingId, cancellationToken);
            request.Cancel(subject, now);
            await MemberRequestMail.TellOwner(
                db, settings, listing, request, now,
                $"{request.MemberName} cancelled a {IncomingRules.Noun(request.Kind)}",
                $"{request.MemberName} deleted their Jubilee account, so their {IncomingRules.Noun(request.Kind)} ({MemberRequestRules.Title(request)}) is cancelled. Nothing more is needed from you.",
                cancellationToken);
        }

        await AccountDeletion.ApplyAsync(db, member, now, now, "account.deleted", cancellationToken);
        db.OutboxMessages.Add(OutboxMessage.Email(
            member.Id,
            member.Email,
            "Your Jubilee account was deleted",
            $"Hi {member.FirstName},\n\nYour Jubilee account is deleted. You are signed out everywhere, your open requests are cancelled and the businesses have been told. Your personal data is erased within 30 days.\n\nIf you didn't do this, write to help@jubilee.example at once.\n\nJubilee · Toronto's Christian marketplace\n",
            now));
        await db.SaveChangesAsync(cancellationToken);
        directory.Invalidate();

        // Outside the database, so a restore deletes the account again (L2-017 AC7). A write that fails is made by the
        // worker's next pass, from the database.
        try
        {
            await ledger.Record(new DeletedAccount(member.Id, now), cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "The deletion of member {MemberId} could not be written to the deletion ledger. The worker will write it.", member.Id);
        }
    }
}

/// <summary>
/// What deleting an account changes, in the caller's unit of work (L2-017 AC3, AC4): open requests are cancelled, the
/// member's listings are deleted, what is the member's alone goes, every session ends, nothing can sign in again and the
/// audit log records it. Shared by the deletion and by its re-application after a restore (ADR 0069); telling others is
/// the caller's.
/// </summary>
public static class AccountDeletion
{
    public static async Task ApplyAsync(
        IAppDbContext db, Member member, DateTimeOffset deletedAt, DateTimeOffset now, string auditAction, CancellationToken cancellationToken)
    {
        var subject = member.Id.ToString();
        foreach (var request in await db.Requests.Include(r => r.Transitions)
            .Where(r => r.MemberSubject == subject && (r.Status == RequestStatus.New || r.Status == RequestStatus.Confirmed))
            .ToListAsync(cancellationToken))
        {
            // The query reads the store; a request the caller cancelled in this unit of work is not cancelled twice.
            if (request.Status is RequestStatus.New or RequestStatus.Confirmed)
            {
                request.Cancel(subject, now);
            }
        }

        foreach (var listing in await db.Listings.Where(l => l.OwnerId == subject && l.DeletedAt == null).ToListAsync(cancellationToken))
        {
            listing.Delete(deletedAt);
        }

        // Feedback is the member's own and leaves with them, screenshots first (L2-214 AC12).
        db.FeedbackScreenshots.RemoveRange(await db.FeedbackScreenshots.Where(s => s.UploaderSubject == subject).ToListAsync(cancellationToken));
        db.Feedback.RemoveRange(await db.Feedback.Where(f => f.MemberSubject == subject).ToListAsync(cancellationToken));
        // Reviews leave with their author, with their replies and reports, and the stars are counted again (ADR 0066).
        db.ReviewReports.RemoveRange(await db.ReviewReports.Where(r => r.ReporterSubject == subject).ToListAsync(cancellationToken));
        foreach (var review in await db.Reviews.Where(r => r.AuthorSubject == subject).ToListAsync(cancellationToken))
        {
            db.ReviewReports.RemoveRange(await db.ReviewReports.Where(r => r.ReviewId == review.Id && r.ReporterSubject != subject).ToListAsync(cancellationToken));
            db.Reviews.Remove(review);
            await Reviews.ReviewRules.RecountAsync(db, review, gone: true, productBefore: null, cancellationToken);
        }

        db.SavedItems.RemoveRange(await db.SavedItems.Where(s => s.MemberSubject == subject).ToListAsync(cancellationToken));
        db.RecentSearches.RemoveRange(await db.RecentSearches.Where(s => s.MemberSubject == subject).ToListAsync(cancellationToken));
        db.Notifications.RemoveRange(await db.Notifications.Where(n => n.MemberSubject == subject).ToListAsync(cancellationToken));
        db.LinkTokens.RemoveRange(await db.LinkTokens.Where(t => t.MemberId == member.Id).ToListAsync(cancellationToken));
        foreach (var export in await db.DataExports.Where(e => e.MemberId == member.Id).ToListAsync(cancellationToken))
        {
            export.Expire();
        }

        foreach (var session in await db.Sessions.Where(x => x.MemberId == member.Id && x.EndedAt == null).ToListAsync(cancellationToken))
        {
            session.End(now);
        }

        member.Delete(deletedAt);
        AuditLog.Record(db, new Reviewer(subject, "Member"), auditAction, "member", subject, null, null, null, now);
    }
}

/// <summary>
/// The worker's side of deletion: 30 days after an account was deleted its personal data is erased. What the member wrote
/// stays for the business, from a "Former member" (L2-017 AC6, L2-148).
/// </summary>
public sealed class AccountErasure(IAppDbContext db, TimeProvider clock)
{
    public async Task<int> EraseDueAsync(CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var due = (await db.Members.Where(m => m.DeletedAt != null && m.ErasedAt == null).ToListAsync(cancellationToken))
            .Where(m => now >= m.DeletedAt!.Value + Member.ErasureAfter).ToList();
        foreach (var member in due)
        {
            var subject = member.Id.ToString();
            foreach (var conversation in await db.Conversations.Where(c => c.MemberSubject == subject).ToListAsync(cancellationToken))
            {
                conversation.ForgetMember();
            }

            foreach (var message in await db.Messages.Where(m => m.SenderSubject == subject).ToListAsync(cancellationToken))
            {
                message.ForgetSender();
            }

            foreach (var request in await db.Requests.Where(r => r.MemberSubject == subject).ToListAsync(cancellationToken))
            {
                request.ForgetMember();
            }

            db.DataExports.RemoveRange(await db.DataExports.Where(e => e.MemberId == member.Id).ToListAsync(cancellationToken));
            db.Notifications.RemoveRange(await db.Notifications.Where(n => n.MemberSubject == subject).ToListAsync(cancellationToken));
            db.ConsentRecords.RemoveRange(await db.ConsentRecords.Where(c => c.MemberId == member.Id).ToListAsync(cancellationToken));
            db.PasswordResetRequests.RemoveRange(await db.PasswordResetRequests.Where(r => r.EmailKey == member.EmailKey).ToListAsync(cancellationToken));
            db.OutboxMessages.RemoveRange(await db.OutboxMessages.Where(o => o.MemberId == member.Id).ToListAsync(cancellationToken));
            member.Erase(now);
            await db.SaveChangesAsync(cancellationToken);
        }

        return due.Count;
    }
}
