using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Application.Listings;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Reviews;

/// <summary>Anyone signed in but the author reports a review privately to the verification team (L2-235).</summary>
public sealed record ReportReviewCommand(Guid Id, string Subject, string ReporterName, string? Reason, string? Note, string? IdempotencyKey)
    : IRequest<ReportedDto>;

public sealed class ReportReviewCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ReportReviewCommand, ReportedDto>
{
    public const string OwnReviewCode = "OWN_REVIEW";

    /// <summary>Reports of reviews one member may send in a day (L2-235 AC6).</summary>
    public const int PerDay = 10;

    public static readonly IReadOnlyDictionary<string, ReviewReportReason> Reasons = new Dictionary<string, ReviewReportReason>
    {
        ["not-a-real-dealing"] = ReviewReportReason.NotARealDealing,
        ["abusive"] = ReviewReportReason.Abusive,
        ["private-details"] = ReviewReportReason.PrivateDetails,
        ["advertising"] = ReviewReportReason.Advertising,
        ["other"] = ReviewReportReason.Other,
    };

    public async Task<ReportedDto> Handle(ReportReviewCommand request, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? Guid.NewGuid().ToString() : request.IdempotencyKey.Trim();
        var earlier = await db.ReviewReports.AsNoTracking()
            .SingleOrDefaultAsync(r => r.ReporterSubject == request.Subject && r.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            return new ReportedDto(earlier.Id);
        }

        var review = await ReviewLookup.ShownAsync(db, request.Id, cancellationToken);
        if (review.AuthorSubject == request.Subject)
        {
            throw new ForbiddenException(OwnReviewCode, "You can't report your own review.");
        }

        var errors = new Dictionary<string, string>();
        ReviewReportReason reason = default;
        if (request.Reason is null || !Reasons.TryGetValue(request.Reason, out reason))
        {
            errors["reason"] = "REASON_REQUIRED";
        }

        if (request.Note?.Trim().Length > ReviewReport.MaxNoteLength)
        {
            errors["note"] = "TOO_LONG";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var now = clock.GetUtcNow();
        var today = (await db.ReviewReports.AsNoTracking().Where(r => r.ReporterSubject == request.Subject).Select(r => r.CreatedAt).ToListAsync(cancellationToken))
            .Where(at => now - at < TimeSpan.FromDays(1)).Order().ToList();
        if (today.Count >= PerDay)
        {
            throw new RateLimitedException("rate_limited", today[today.Count - PerDay] + TimeSpan.FromDays(1) - now);
        }

        var report = ReviewReport.Open(review, request.Subject, request.ReporterName, reason, request.Note, key, now);
        db.ReviewReports.Add(report);
        await db.SaveChangesAsync(cancellationToken);
        return new ReportedDto(report.Id);
    }
}
