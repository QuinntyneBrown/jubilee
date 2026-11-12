using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.MemberFeedback;

/// <summary>
/// One item of "Your feedback" (L2-213): what the member needs to recognise it and to see what became of
/// it. The note, the browser and the screenshots stay with the team (L2-214 AC10).
/// </summary>
public sealed record FeedbackItemDto(
    Guid Id, string Kind, DateTimeOffset CreatedAt, string Status, int? Rating, string? Summary, string? Reference, string? Business, string? Reply);

/// <summary>The scores of a rating as they arrive; a part the member skipped is absent.</summary>
public sealed record AreaScoresInput(int? Finding, int? Listing, int? Messaging, int? Trust);

/// <summary>The words feedback travels in.</summary>
public static class FeedbackWire
{
    public static string Of(FeedbackKind kind) => kind switch
    {
        FeedbackKind.Rating => "rating",
        FeedbackKind.BugReport => "bug-report",
        FeedbackKind.Kudos => "kudos",
        _ => "check-in",
    };

    public static string Of(FeedbackStatus status) => status switch
    {
        FeedbackStatus.Read => "read",
        FeedbackStatus.InProgress => "in-progress",
        FeedbackStatus.Fixed => "fixed",
        _ => "received",
    };

    public static FeedbackItemDto ToItem(this Feedback feedback) => new(
        feedback.Id, Of(feedback.Kind), feedback.CreatedAt, Of(feedback.Status), feedback.Rating, Summary(feedback.Happened),
        feedback.Reference, feedback.BusinessName, feedback.Reply);

    /// <summary>How long the title of a bug report is in "Your feedback" (L2-213 AC1).</summary>
    public const int SummaryLength = 80;

    /// <summary>The first line of what happened, shortened to <see cref="SummaryLength"/> characters.</summary>
    public static string? Summary(string? happened)
    {
        if (happened is null)
        {
            return null;
        }

        var line = happened.Split('\n', 2)[0].Trim();
        return line.Length <= SummaryLength ? line : line[..(SummaryLength - 1)].TrimEnd() + "…";
    }
}

/// <summary>What every kind of feedback shares: the idempotency key (L2-132) and the hourly limit (L2-137).</summary>
public static class FeedbackRules
{
    /// <summary>Ratings, bug reports and kudos one member may send in an hour (L2-214 AC9).</summary>
    public const int ItemsPerHour = 10;

    public static readonly TimeSpan Window = TimeSpan.FromHours(1);

    public static string KeyOf(string? idempotencyKey) =>
        string.IsNullOrWhiteSpace(idempotencyKey) ? Guid.NewGuid().ToString() : idempotencyKey.Trim();

    /// <summary>The answer already given for this key by this member, if any.</summary>
    public static Task<Feedback?> Earlier(IAppDbContext db, string subject, string key, CancellationToken cancellationToken) =>
        db.Feedback.AsNoTracking().SingleOrDefaultAsync(f => f.MemberSubject == subject && f.IdempotencyKey == key, cancellationToken);

    public static async Task EnsureWithinLimit(IAppDbContext db, string subject, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var recent = (await db.Feedback.AsNoTracking()
            .Where(f => f.MemberSubject == subject && f.Kind != FeedbackKind.CheckIn)
            .Select(f => f.CreatedAt).ToListAsync(cancellationToken))
            .Where(at => now - at < Window).Order().ToList();
        if (recent.Count >= ItemsPerHour)
        {
            throw new RateLimitedException("rate_limited", recent[recent.Count - ItemsPerHour] + Window - now);
        }
    }

    /// <summary>A note trimmed to nothing is no note; one over the limit names its field.</summary>
    public static string? Note(string? note, IDictionary<string, string> errors, string field = "note")
    {
        var text = note?.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return null;
        }

        if (text.Length > Feedback.MaxNoteLength)
        {
            errors[field] = "NOTE_TOO_LONG";
        }

        return text;
    }
}

/// <summary>A member rates Jubilee, overall and part by part (L2-214 AC1).</summary>
public sealed record SendRatingCommand(
    string Subject, string MemberName, int? Rating, string? Note, AreaScoresInput? Areas, bool MayContact, string? IdempotencyKey)
    : IRequest<FeedbackItemDto>;

public sealed class SendRatingCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SendRatingCommand, FeedbackItemDto>
{
    public async Task<FeedbackItemDto> Handle(SendRatingCommand request, CancellationToken cancellationToken)
    {
        var key = FeedbackRules.KeyOf(request.IdempotencyKey);
        if (await FeedbackRules.Earlier(db, request.Subject, key, cancellationToken) is { } earlier)
        {
            return earlier.ToItem();
        }

        var errors = new Dictionary<string, string>();
        if (!Feedback.IsScore(request.Rating))
        {
            errors["rating"] = "RATING_REQUIRED";
        }

        var note = FeedbackRules.Note(request.Note, errors);
        var areas = request.Areas ?? new AreaScoresInput(null, null, null, null);
        int?[] scores = [areas.Finding, areas.Listing, areas.Messaging, areas.Trust];
        if (scores.Any(score => score is not null && !Feedback.IsScore(score)))
        {
            errors["areas"] = "SCORE_OUT_OF_RANGE";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var now = clock.GetUtcNow();
        await FeedbackRules.EnsureWithinLimit(db, request.Subject, now, cancellationToken);
        var feedback = Feedback.Rate(
            request.Subject, request.MemberName, request.Rating!.Value, note,
            new AreaScores(areas.Finding, areas.Listing, areas.Messaging, areas.Trust), request.MayContact, key, now);
        db.Feedback.Add(feedback);
        await db.SaveChangesAsync(cancellationToken);
        return feedback.ToItem();
    }
}

/// <summary>The member's own ratings, bug reports and kudos, newest first (L2-213, L2-214 AC10).</summary>
public sealed record GetMyFeedbackQuery(string Subject) : IRequest<IReadOnlyList<FeedbackItemDto>>;

public sealed class GetMyFeedbackQueryHandler(IAppDbContext db) : IRequestHandler<GetMyFeedbackQuery, IReadOnlyList<FeedbackItemDto>>
{
    public async Task<IReadOnlyList<FeedbackItemDto>> Handle(GetMyFeedbackQuery request, CancellationToken cancellationToken)
    {
        var mine = await db.Feedback.AsNoTracking()
            .Where(f => f.MemberSubject == request.Subject && f.Kind != FeedbackKind.CheckIn)
            .ToListAsync(cancellationToken);
        return [.. mine.OrderByDescending(f => f.CreatedAt).Select(f => f.ToItem())];
    }
}
