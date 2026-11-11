using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Reference;

/// <summary>
/// What the owner sees of the church reference: the stage, never the answer, name, role or note
/// (L2-083 AC4, L2-146). <c>State</c> is <c>waiting</c>, <c>answered</c>, <c>not-known</c>,
/// <c>under-review</c> or <c>expired</c>.
/// </summary>
public sealed record ReferenceStatusDto(
    Guid ListingId,
    string Business,
    string Church,
    string ReferenceEmail,
    string State,
    DateTimeOffset RequestedAt,
    DateTimeOffset? ExpiresAt,
    bool ReminderDue,
    bool CanRemind,
    int ResendsLeft);

internal static class OwnerReferences
{
    public const int ResendsPerDay = 3;
    public static readonly TimeSpan ResendWindow = TimeSpan.FromHours(24);
    public static readonly TimeSpan ReminderGap = TimeSpan.FromHours(72);
    public static readonly TimeSpan ReminderAfter = TimeSpan.FromDays(7);

    public static async Task<(Listing Listing, ListingSubmission Submission)> Owned(
        IAppDbContext db, string subject, Guid listingId, CancellationToken cancellationToken)
    {
        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == listingId && l.OwnerId == subject && l.DeletedAt == null, cancellationToken)
            ?? throw new NotFoundException("listing_not_found", "We can't find that listing.");
        var submission = await db.ListingSubmissions.SingleOrDefaultAsync(s => s.ListingId == listingId, cancellationToken)
            ?? throw new NotFoundException("listing_not_found", "We can't find that listing.");
        return (listing, submission);
    }

    public static async Task<ReferenceStatusDto> Status(
        IAppDbContext db, Listing listing, ListingSubmission submission, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var links = await db.ReferenceLinks.AsNoTracking()
            .Where(l => l.ListingId == listing.Id)
            .ToListAsync(cancellationToken);
        // The newest link; of two issued at the same moment, the one still open.
        var latest = links.OrderByDescending(l => l.IssuedAt).ThenBy(l => l.ClosedAt != null).First();
        var state = "waiting";
        if (latest.EndedBy == ReferenceLinkEnd.Answered)
        {
            var kind = await db.ReferenceAnswers.AsNoTracking()
                .Where(a => a.LinkId == latest.Id)
                .Select(a => (ReferenceAnswerKind?)a.Kind)
                .SingleOrDefaultAsync(cancellationToken);
            state = kind switch
            {
                ReferenceAnswerKind.Vouches => "answered",
                ReferenceAnswerKind.DoesntKnow => "not-known",
                _ => "under-review",
            };
        }
        else if (latest.EndedBy == ReferenceLinkEnd.Reported)
        {
            state = "under-review";
        }
        else if (!latest.IsOpen(now))
        {
            state = "expired";
        }

        var waiting = state == "waiting";
        var resends = links.Count(l => l.Kind == ReferenceLinkKind.Resend && l.IssuedAt > now - ResendWindow);
        var reminded = links.Any(l => l.Kind == ReferenceLinkKind.Reminder && l.IssuedAt > now - ReminderGap);
        return new ReferenceStatusDto(
            listing.Id,
            listing.Name,
            submission.Church,
            submission.PastorEmail,
            state,
            latest.IssuedAt,
            waiting ? latest.ExpiresAt : null,
            waiting && now - latest.IssuedAt >= ReminderAfter,
            waiting && !reminded,
            Math.Max(0, ResendsPerDay - resends));
    }
}

public sealed record GetReferenceStatusQuery(string Subject, Guid ListingId) : IRequest<ReferenceStatusDto>;

public sealed class GetReferenceStatusQueryHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<GetReferenceStatusQuery, ReferenceStatusDto>
{
    public async Task<ReferenceStatusDto> Handle(GetReferenceStatusQuery request, CancellationToken cancellationToken)
    {
        var (listing, submission) = await OwnerReferences.Owned(db, request.Subject, request.ListingId, cancellationToken);
        return await OwnerReferences.Status(db, listing, submission, clock.GetUtcNow(), cancellationToken);
    }
}

/// <summary>"Send the request again": a fresh link, the old one stops working; 3 per 24 hours (L2-080 AC3).</summary>
public sealed record ResendReferenceRequestCommand(string Subject, string OwnerName, Guid ListingId) : IRequest<ReferenceStatusDto>;

public sealed class ResendReferenceRequestCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<ResendReferenceRequestCommand, ReferenceStatusDto>
{
    public async Task<ReferenceStatusDto> Handle(ResendReferenceRequestCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (listing, submission) = await OwnerReferences.Owned(db, request.Subject, request.ListingId, cancellationToken);
        if (listing.Stage != ListingStage.PendingReference)
        {
            throw new ConflictException("REFERENCE_NOT_WAITING", "This listing isn't waiting for a reference.");
        }

        var recent = await db.ReferenceLinks.AsNoTracking()
            .Where(l => l.ListingId == listing.Id && l.Kind == ReferenceLinkKind.Resend && l.IssuedAt > now - OwnerReferences.ResendWindow)
            .OrderBy(l => l.IssuedAt)
            .Select(l => l.IssuedAt)
            .ToListAsync(cancellationToken);
        if (recent.Count >= OwnerReferences.ResendsPerDay)
        {
            throw new RateLimitedException("REFERENCE_RESEND_LIMIT", recent[0] + OwnerReferences.ResendWindow - now);
        }

        var (_, first) = await ReferenceRequests.OwnerNames(db, request.Subject, cancellationToken);
        ReferenceRequests.Issue(
            db, settings, listing, request.OwnerName, first, submission, ReferenceLinkKind.Resend,
            await ReferenceRequests.OpenLinks(db, listing.Id, now, cancellationToken), now);
        await db.SaveChangesAsync(cancellationToken);
        return await OwnerReferences.Status(db, listing, submission, now, cancellationToken);
    }
}

/// <summary>"Send reminder": the reference gets a new link; at most one per 72 hours (L2-084 AC2).</summary>
public sealed record RemindReferenceCommand(string Subject, string OwnerName, Guid ListingId) : IRequest<ReferenceStatusDto>;

public sealed class RemindReferenceCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<RemindReferenceCommand, ReferenceStatusDto>
{
    public async Task<ReferenceStatusDto> Handle(RemindReferenceCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (listing, submission) = await OwnerReferences.Owned(db, request.Subject, request.ListingId, cancellationToken);
        var open = await ReferenceRequests.OpenLinks(db, listing.Id, now, cancellationToken);
        if (listing.Stage != ListingStage.PendingReference || open.Count == 0)
        {
            throw new ConflictException("REFERENCE_NOT_WAITING", "This listing isn't waiting for a reference.");
        }

        var last = await db.ReferenceLinks.AsNoTracking()
            .Where(l => l.ListingId == listing.Id && l.Kind == ReferenceLinkKind.Reminder && l.IssuedAt > now - OwnerReferences.ReminderGap)
            .OrderByDescending(l => l.IssuedAt)
            .Select(l => (DateTimeOffset?)l.IssuedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (last is { } at)
        {
            throw new RateLimitedException("REFERENCE_REMINDER_LIMIT", at + OwnerReferences.ReminderGap - now);
        }

        var (_, first) = await ReferenceRequests.OwnerNames(db, request.Subject, cancellationToken);
        ReferenceRequests.Issue(db, settings, listing, request.OwnerName, first, submission, ReferenceLinkKind.Reminder, open, now);
        await db.SaveChangesAsync(cancellationToken);
        return await OwnerReferences.Status(db, listing, submission, now, cancellationToken);
    }
}

/// <summary>"Change reference": a new church and e-mail; the old link stops working (L2-084 AC3).</summary>
public sealed record ChangeReferenceCommand(string Subject, string OwnerName, Guid ListingId, string? Church, string? PastorEmail)
    : IRequest<ReferenceStatusDto>;

public sealed class ChangeReferenceCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<ChangeReferenceCommand, ReferenceStatusDto>
{
    public async Task<ReferenceStatusDto> Handle(ChangeReferenceCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var (listing, submission) = await OwnerReferences.Owned(db, request.Subject, request.ListingId, cancellationToken);
        if (listing.Stage is not (ListingStage.PendingReference or ListingStage.NeedsDecision))
        {
            throw new ConflictException("REFERENCE_NOT_CHANGEABLE", "The reference can't be changed now.");
        }

        var errors = new Dictionary<string, string>();
        var church = request.Church?.Trim() ?? string.Empty;
        if (church.Length == 0)
        {
            errors["church"] = "REQUIRED";
        }

        var address = EmailAddress.TryParse(request.PastorEmail?.Trim());
        if (address is null)
        {
            errors["pastorEmail"] = "INVALID";
        }
        else if (Guid.TryParse(request.Subject, out var id)
            && await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == id, cancellationToken) is { } member
            && member.EmailKey == address.Key)
        {
            errors["pastorEmail"] = "OWN_EMAIL";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        submission.ChangeReference(church[..Math.Min(church.Length, 200)], address!.Value);
        listing.MoveTo(ListingStage.PendingReference);
        var (_, first) = await ReferenceRequests.OwnerNames(db, request.Subject, cancellationToken);
        ReferenceRequests.Issue(
            db, settings, listing, request.OwnerName, first, submission, ReferenceLinkKind.Change,
            await ReferenceRequests.OpenLinks(db, listing.Id, now, cancellationToken), now);
        await db.SaveChangesAsync(cancellationToken);
        return await OwnerReferences.Status(db, listing, submission, now, cancellationToken);
    }
}

/// <summary>
/// The worker's daily pass: an owner whose reference did not answer within 14 days is e-mailed once,
/// and My business then offers "Send a new request" (L2-084 AC4).
/// </summary>
public sealed record NotifyExpiredReferencesCommand : IRequest<int>;

public sealed class NotifyExpiredReferencesCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<NotifyExpiredReferencesCommand, int>
{
    public async Task<int> Handle(NotifyExpiredReferencesCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var expired = await db.ReferenceLinks
            .Where(l => l.ClosedAt == null && l.ExpiresAt <= now && l.ExpiryNoticeSentAt == null)
            .ToListAsync(cancellationToken);
        var sent = 0;
        foreach (var link in expired)
        {
            link.NoticeSent(now);
            var listing = await db.Listings.AsNoTracking().SingleOrDefaultAsync(l => l.Id == link.ListingId && l.DeletedAt == null, cancellationToken);
            if (listing is null
                || listing.Stage != ListingStage.PendingReference
                || !Guid.TryParse(listing.OwnerId, out var ownerId)
                || await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == ownerId, cancellationToken) is not { } owner)
            {
                continue;
            }

            db.OutboxMessages.Add(OutboxMessage.Email(
                owner.Id,
                owner.Email,
                $"Your church reference for {listing.Name} didn’t answer",
                $"Hi {owner.FirstName},\n\nThe request we sent to {link.ReferenceEmail} at {link.Church} wasn’t answered in 14 days, so the link has closed.\n\nSend a new request, or name someone else, from My business: {settings.PublicBaseUrl.TrimEnd('/')}/my-business\n\nJubilee · Toronto's Christian marketplace\n",
                now));
            sent++;
        }

        await db.SaveChangesAsync(cancellationToken);
        return sent;
    }
}
