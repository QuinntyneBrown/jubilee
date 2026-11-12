namespace Jubilee.Domain;

/// <summary>What a review is about: one of the listing's services or products, or the stay (L2-226 AC3).</summary>
public sealed record ReviewItem(Guid? ServiceId, Guid? ProductId, string Name);

/// <summary>
/// One member's review of one listing (L1-031, ADR 0058). Only a member whose request the owner
/// confirmed or completed writes one, so every review is Verified. It shows its author by first
/// name and last initial only (L2-238). The owner's one public reply is kept on it.
/// </summary>
public sealed class Review
{
    public const int MinTextLength = 40;

    public const int MaxTextLength = 2000;

    public const int MaxReplyLength = 1000;

    public const int MaxReasonLength = 1000;

    /// <summary>How long a taken-down review is kept for the record before it is deleted (L2-238 AC4).</summary>
    public static readonly TimeSpan TakenDownKeptFor = TimeSpan.FromDays(365);

    private Review()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public Guid? ServiceId { get; private set; }

    public Guid? ProductId { get; private set; }

    /// <summary>The item's name when the review was written, so a renamed or deleted item does not empty it.</summary>
    public string ItemName { get; private set; } = string.Empty;

    /// <summary>The author's session subject; never shown.</summary>
    public string AuthorSubject { get; private set; } = string.Empty;

    /// <summary>First name and last initial, as it was when the review was written: "Joanna A.".</summary>
    public string AuthorName { get; private set; } = string.Empty;

    public int Rating { get; private set; }

    public string Text { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? EditedAt { get; private set; }

    /// <summary>The client's key for this review; a repeat of it returns the first answer (L2-132).</summary>
    public string IdempotencyKey { get; private set; } = string.Empty;

    public string? ReplyText { get; private set; }

    /// <summary>Who the reply is from: the owner's name, or the listing's.</summary>
    public string? ReplyFrom { get; private set; }

    public DateTimeOffset? RepliedAt { get; private set; }

    public DateTimeOffset? ReplyEditedAt { get; private set; }

    /// <summary>When the verification team took the review down; it is then shown nowhere (L2-236).</summary>
    public DateTimeOffset? TakenDownAt { get; private set; }

    /// <summary>The reason the author was given.</summary>
    public string? TakeDownReason { get; private set; }

    public bool IsShown => TakenDownAt is null;

    public string Initials => string.Concat(AuthorName.Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(2).Select(w => char.ToUpperInvariant(w[0])));

    public static bool IsRating(int? rating) => rating is >= 1 and <= 5;

    /// <summary>"Joanna A." of "Joanna Adeyemi"; one word stays as it is (L2-238 AC1).</summary>
    public static string ShownName(string fullName)
    {
        var words = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return words.Length switch
        {
            0 => "A member",
            1 => words[0],
            _ => $"{words[0]} {char.ToUpperInvariant(words[^1][0])}.",
        };
    }

    public static Review Write(
        Guid listingId, ReviewItem item, string authorSubject, string authorFullName, int rating, string text, string idempotencyKey, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        ServiceId = item.ServiceId,
        ProductId = item.ProductId,
        ItemName = item.Name,
        AuthorSubject = authorSubject,
        AuthorName = ShownName(authorFullName),
        Rating = rating,
        Text = text.Trim(),
        CreatedAt = now,
        IdempotencyKey = idempotencyKey,
    };

    /// <summary>The author changes the review; the reply stays (L2-232 AC7).</summary>
    public void Edit(ReviewItem item, int rating, string text, DateTimeOffset now)
    {
        ServiceId = item.ServiceId;
        ProductId = item.ProductId;
        ItemName = item.Name;
        Rating = rating;
        Text = text.Trim();
        EditedAt = now;
    }

    /// <summary>The owner's one public reply; a second replaces the first. True when it is the first.</summary>
    public bool ReplyWith(string from, string text, DateTimeOffset now)
    {
        var first = RepliedAt is null;
        ReplyFrom = from;
        ReplyText = text.Trim();
        if (first)
        {
            RepliedAt = now;
        }
        else
        {
            ReplyEditedAt = now;
        }

        return first;
    }

    public void TakeDown(string reason, DateTimeOffset now)
    {
        TakenDownAt = now;
        TakeDownReason = reason.Trim();
    }
}

/// <summary>Why a review is reported (L2-235 AC1).</summary>
public enum ReviewReportReason
{
    NotARealDealing = 0,
    Abusive = 1,
    PrivateDetails = 2,
    Advertising = 3,
    Other = 4,
}

/// <summary>A member's private report of a review to the verification team (L2-235). The author never learns who sent it.</summary>
public sealed class ReviewReport
{
    public const int MaxNoteLength = 1000;

    private ReviewReport()
    {
    }

    public Guid Id { get; private set; }

    public Guid ReviewId { get; private set; }

    public Guid ListingId { get; private set; }

    public string ReporterSubject { get; private set; } = string.Empty;

    /// <summary>For the verification team only (L2-105 AC1).</summary>
    public string ReporterName { get; private set; } = string.Empty;

    public ReviewReportReason Reason { get; private set; }

    public string? Note { get; private set; }

    public ReportStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public string IdempotencyKey { get; private set; } = string.Empty;

    public string? ResolutionNote { get; private set; }

    public DateTimeOffset? ResolvedAt { get; private set; }

    public static ReviewReport Open(
        Review review, string reporterSubject, string reporterName, ReviewReportReason reason, string? note, string idempotencyKey, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ReviewId = review.Id,
        ListingId = review.ListingId,
        ReporterSubject = reporterSubject,
        ReporterName = reporterName,
        Reason = reason,
        Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
        Status = ReportStatus.Open,
        CreatedAt = now,
        IdempotencyKey = idempotencyKey,
    };

    public void StartReview()
    {
        if (Status == ReportStatus.Open)
        {
            Status = ReportStatus.InReview;
        }
    }

    public void Resolve(string note, DateTimeOffset now)
    {
        Status = ReportStatus.Resolved;
        ResolutionNote = note;
        ResolvedAt = now;
    }
}

/// <summary>
/// The count of each star of a listing or a product, stored so a card needs no query (ADR 0058).
/// <see cref="Stars"/> holds the counts of 5, 4, 3, 2 and 1 stars, in that order.
/// </summary>
public sealed record StarCounts(int Five, int Four, int Three, int Two, int One)
{
    public static readonly StarCounts None = new(0, 0, 0, 0, 0);

    /// <summary>A card shows a rating from this many reviews (L2-230).</summary>
    public const int CardMinimum = 3;

    public int Count => Five + Four + Three + Two + One;

    public int[] Stars => [Five, Four, Three, Two, One];

    /// <summary>The average to one decimal, rounded half up; 0 without reviews.</summary>
    public decimal Average => Count == 0
        ? 0
        : Math.Round((decimal)((5 * Five) + (4 * Four) + (3 * Three) + (2 * Two) + One) / Count, 1, MidpointRounding.AwayFromZero);

    public static StarCounts Of(IEnumerable<int> ratings)
    {
        var list = ratings.ToList();
        return new(list.Count(r => r == 5), list.Count(r => r == 4), list.Count(r => r == 3), list.Count(r => r == 2), list.Count(r => r == 1));
    }
}
