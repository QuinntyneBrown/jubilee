using System.Security.Cryptography;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Application.Messaging;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.MemberFeedback;

/// <summary>A member reports a bug, with what the app and the request say about where it happened (L2-214 AC2).</summary>
public sealed record SendBugReportCommand(
    string Subject, string MemberName, string? Place, string? Happened, string? Expected, string? Frequency, string? Screen, string? Version,
    string? UserAgent, IReadOnlyList<Guid>? ScreenshotIds, bool MayContact, string? IdempotencyKey)
    : IRequest<FeedbackItemDto>;

public sealed class SendBugReportCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SendBugReportCommand, FeedbackItemDto>
{
    /// <summary>The letters and digits of a reference: none that can be misread (ADR 0043).</summary>
    public const string ReferenceAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

    public static readonly IReadOnlyDictionary<string, BugFrequency> Frequencies = new Dictionary<string, BugFrequency>
    {
        ["once"] = BugFrequency.Once,
        ["sometimes"] = BugFrequency.Sometimes,
        ["every-time"] = BugFrequency.EveryTime,
    };

    public async Task<FeedbackItemDto> Handle(SendBugReportCommand request, CancellationToken cancellationToken)
    {
        var key = FeedbackRules.KeyOf(request.IdempotencyKey);
        if (await FeedbackRules.Earlier(db, request.Subject, key, cancellationToken) is { } earlier)
        {
            return earlier.ToItem();
        }

        var errors = new Dictionary<string, string>();
        var place = Blank(request.Place);
        if (place is not null && !Feedback.BugPlaces.Contains(place))
        {
            errors["where"] = "PLACE_UNKNOWN";
        }

        var happened = request.Happened?.Trim() ?? string.Empty;
        if (happened.Length == 0)
        {
            errors["happened"] = "HAPPENED_REQUIRED";
        }
        else if (happened.Length > Feedback.MaxAnswerLength)
        {
            errors["happened"] = "HAPPENED_TOO_LONG";
        }

        var expected = Blank(request.Expected);
        if (expected?.Length > Feedback.MaxAnswerLength)
        {
            errors["expected"] = "EXPECTED_TOO_LONG";
        }

        BugFrequency? frequency = null;
        if (Blank(request.Frequency) is { } named)
        {
            if (Frequencies.TryGetValue(named, out var known))
            {
                frequency = known;
            }
            else
            {
                errors["frequency"] = "FREQUENCY_UNKNOWN";
            }
        }

        var screen = Blank(request.Screen);
        if (screen?.Length > Feedback.MaxScreenLength)
        {
            errors["screen"] = "SCREEN_TOO_LONG";
        }

        var version = Blank(request.Version);
        if (version?.Length > Feedback.MaxVersionLength)
        {
            errors["version"] = "VERSION_TOO_LONG";
        }

        var ids = (request.ScreenshotIds ?? []).Distinct().ToList();
        List<FeedbackScreenshot> screenshots = [];
        if (ids.Count > Feedback.MaxScreenshots)
        {
            errors["screenshots"] = "TOO_MANY_SCREENSHOTS";
        }
        else if (ids.Count > 0)
        {
            // Only pictures this member uploaded and has not put on a report yet (L2-133).
            screenshots = await db.FeedbackScreenshots
                .Where(s => ids.Contains(s.Id) && s.UploaderSubject == request.Subject && s.FeedbackId == null)
                .ToListAsync(cancellationToken);
            if (screenshots.Count != ids.Count)
            {
                errors["screenshots"] = "SCREENSHOT_NOT_FOUND";
            }
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var now = clock.GetUtcNow();
        await FeedbackRules.EnsureWithinLimit(db, request.Subject, now, cancellationToken);
        var userAgent = Blank(request.UserAgent);
        if (userAgent?.Length > Feedback.MaxUserAgentLength)
        {
            userAgent = userAgent[..Feedback.MaxUserAgentLength];
        }

        var feedback = Feedback.ReportBug(
            request.Subject, request.MemberName, await NewReference(cancellationToken), place, happened, expected, frequency, screen, userAgent,
            version, request.MayContact, key, now);
        db.Feedback.Add(feedback);
        foreach (var screenshot in screenshots)
        {
            screenshot.AttachTo(feedback.Id);
        }

        await db.SaveChangesAsync(cancellationToken);
        return feedback.ToItem();
    }

    private static string? Blank(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    /// <summary>A reference no other report has: drawn at random and drawn again on a clash.</summary>
    private async Task<string> NewReference(CancellationToken cancellationToken)
    {
        while (true)
        {
            var reference = "FB-" + RandomNumberGenerator.GetString(ReferenceAlphabet, 6);
            if (!await db.Feedback.AnyAsync(f => f.Reference == reference, cancellationToken))
            {
                return reference;
            }
        }
    }
}

/// <summary>A member thanks the Jubilee team, or a business they dealt with (L2-214 AC3, AC4).</summary>
public sealed record SendKudosCommand(
    string Subject, string MemberName, string? Business, IReadOnlyList<string>? Chips, string? Note, bool ShowOnPage, bool MayContact,
    string? IdempotencyKey)
    : IRequest<FeedbackItemDto>;

public sealed class SendKudosCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SendKudosCommand, FeedbackItemDto>
{
    public async Task<FeedbackItemDto> Handle(SendKudosCommand request, CancellationToken cancellationToken)
    {
        var key = FeedbackRules.KeyOf(request.IdempotencyKey);
        if (await FeedbackRules.Earlier(db, request.Subject, key, cancellationToken) is { } earlier)
        {
            return earlier.ToItem();
        }

        var errors = new Dictionary<string, string>();
        var chips = (request.Chips ?? []).Distinct().ToList();
        var note = FeedbackRules.Note(request.Note, errors);
        if (chips.Any(chip => !Feedback.KudosChips.Contains(chip)))
        {
            errors["chips"] = "CHIP_UNKNOWN";
        }
        else if (chips.Count == 0 && note is null)
        {
            errors["chips"] = "KUDOS_REQUIRED";
        }

        Listing? business = null;
        if (!string.IsNullOrWhiteSpace(request.Business))
        {
            var slug = request.Business.Trim();
            business = (await KudosBusinesses.For(db, request.Subject, cancellationToken)).SingleOrDefault(l => l.Slug == slug);
            if (business is null)
            {
                errors["business"] = "BUSINESS_NOT_CONTACTED";
            }
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var now = clock.GetUtcNow();
        await FeedbackRules.EnsureWithinLimit(db, request.Subject, now, cancellationToken);
        // The chips are stored in the order they are offered, whatever order they arrived in.
        var feedback = Feedback.Thank(
            request.Subject, request.MemberName, business, Feedback.KudosChips.Where(chips.Contains), note, request.ShowOnPage,
            request.MayContact, key, now);
        db.Feedback.Add(feedback);
        await db.SaveChangesAsync(cancellationToken);
        return feedback.ToItem();
    }
}

/// <summary>The businesses a member may send kudos to: public, and sent a request or a message by them (ADR 0043).</summary>
public static class KudosBusinesses
{
    public static async Task<List<Listing>> For(IAppDbContext db, string subject, CancellationToken cancellationToken)
    {
        var asked = await db.Requests.AsNoTracking().Where(r => r.MemberSubject == subject).Select(r => r.ListingId).ToListAsync(cancellationToken);
        var written = await db.Conversations.AsNoTracking().Where(c => c.MemberSubject == subject).Select(c => c.ListingId).ToListAsync(cancellationToken);
        var ids = asked.Concat(written).Distinct().ToList();
        return ids.Count == 0
            ? []
            : await db.Listings.AsNoTracking().WherePublic().Where(l => ids.Contains(l.Id)).ToListAsync(cancellationToken);
    }
}

public sealed record KudosBusinessDto(string Slug, string Name);

public sealed record GetKudosBusinessesQuery(string Subject) : IRequest<IReadOnlyList<KudosBusinessDto>>;

public sealed class GetKudosBusinessesQueryHandler(IAppDbContext db) : IRequestHandler<GetKudosBusinessesQuery, IReadOnlyList<KudosBusinessDto>>
{
    public async Task<IReadOnlyList<KudosBusinessDto>> Handle(GetKudosBusinessesQuery request, CancellationToken cancellationToken) =>
        [.. (await KudosBusinesses.For(db, request.Subject, cancellationToken))
            .OrderBy(l => l.Name, StringComparer.OrdinalIgnoreCase).Select(l => new KudosBusinessDto(l.Slug, l.Name))];
}

/// <summary>A picture for a bug report: cleaned, stored, and named by the report that is sent next (L2-214 AC6).</summary>
public sealed record UploadFeedbackScreenshotCommand(string Subject, byte[] Content) : IRequest<Guid>;

public sealed class UploadFeedbackScreenshotCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<UploadFeedbackScreenshotCommand, Guid>
{
    /// <summary>Screenshots one member may upload in an hour (L2-214 AC9).</summary>
    public const int UploadsPerHour = 30;

    public async Task<Guid> Handle(UploadFeedbackScreenshotCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var recent = (await db.FeedbackScreenshots.AsNoTracking().Where(s => s.UploaderSubject == request.Subject)
            .Select(s => s.CreatedAt).ToListAsync(cancellationToken))
            .Where(at => now - at < FeedbackRules.Window).Order().ToList();
        if (recent.Count >= UploadsPerHour)
        {
            throw new RateLimitedException("rate_limited", recent[recent.Count - UploadsPerHour] + FeedbackRules.Window - now);
        }

        var image = ImageSanitizer.Sanitize(request.Content);
        if (!image.Accepted)
        {
            throw new InvalidImageException(image.Problem == ImageProblem.TooLarge ? "TOO_LARGE" : "INVALID_IMAGE");
        }

        var screenshot = FeedbackScreenshot.Store(request.Subject, image.ContentType, image.Content, now);
        db.FeedbackScreenshots.Add(screenshot);
        await db.SaveChangesAsync(cancellationToken);
        return screenshot.Id;
    }
}

/// <summary>The answer to a moment check-in, under the id its confirmation made (L2-214 AC7).</summary>
public sealed record SaveCheckInCommand(Guid Id, string Subject, string MemberName, string? Moment, int? Score, string? Note) : IRequest;

public sealed class SaveCheckInCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SaveCheckInCommand>
{
    /// <summary>New check-ins one member may send in an hour (L2-214 AC9).</summary>
    public const int CheckInsPerHour = 30;

    public static readonly IReadOnlyDictionary<string, CheckInMoment> Moments = new Dictionary<string, CheckInMoment>
    {
        ["request-sent"] = CheckInMoment.RequestSent,
        ["listing-submitted"] = CheckInMoment.ListingSubmitted,
    };

    public async Task Handle(SaveCheckInCommand request, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string>();
        CheckInMoment moment = default;
        if (request.Moment is null || !Moments.TryGetValue(request.Moment, out moment))
        {
            errors["moment"] = "MOMENT_UNKNOWN";
        }

        if (!Feedback.IsScore(request.Score))
        {
            errors["score"] = "SCORE_REQUIRED";
        }

        var note = FeedbackRules.Note(request.Note, errors);
        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var existing = await db.Feedback.SingleOrDefaultAsync(f => f.Id == request.Id, cancellationToken);
        if (existing is not null)
        {
            // Another member's check-in, or other feedback, is not there for this caller (L2-133).
            if (existing.MemberSubject != request.Subject || existing.Kind != FeedbackKind.CheckIn)
            {
                throw new NotFoundException("check_in_not_found", "There is no such check-in.");
            }

            existing.Answer(moment, request.Score!.Value, note);
            await db.SaveChangesAsync(cancellationToken);
            return;
        }

        var now = clock.GetUtcNow();
        var recent = (await db.Feedback.AsNoTracking()
            .Where(f => f.MemberSubject == request.Subject && f.Kind == FeedbackKind.CheckIn)
            .Select(f => f.CreatedAt).ToListAsync(cancellationToken))
            .Where(at => now - at < FeedbackRules.Window).Order().ToList();
        if (recent.Count >= CheckInsPerHour)
        {
            throw new RateLimitedException("rate_limited", recent[recent.Count - CheckInsPerHour] + FeedbackRules.Window - now);
        }

        db.Feedback.Add(Feedback.CheckIn(request.Id, request.Subject, request.MemberName, moment, request.Score!.Value, note, now));
        await db.SaveChangesAsync(cancellationToken);
    }
}
