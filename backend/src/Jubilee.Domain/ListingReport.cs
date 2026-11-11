namespace Jubilee.Domain;

/// <summary>Why a member reports a listing; it routes the report to the right reviewer (L2-039).</summary>
public enum ReportReason
{
    NotRealBusiness = 0,
    Misleading = 1,
    BadExperience = 2,
    Other = 3,
}

public enum ReportStatus
{
    Open = 0,
    InReview = 1,
    Resolved = 2,
}

/// <summary>
/// A private report of one listing by one member (L2-039). A second report of the same listing by the same member
/// within 24 hours is added to this one as another entry. The reporter is never shown to the business.
/// </summary>
public sealed class ListingReport
{
    public const int MaxDescriptionLength = 2000;

    /// <summary>How long a report accepts more entries from its reporter (L2-039 AC5).</summary>
    public static readonly TimeSpan AdditionWindow = TimeSpan.FromHours(24);

    private readonly List<ListingReportEntry> _entries = [];

    private ListingReport()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public string ReporterSubject { get; private set; } = string.Empty;

    /// <summary>The name of the reporter when they reported, for the verification team only (L2-105 AC1).</summary>
    public string ReporterName { get; private set; } = string.Empty;

    public ReportStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The note a verifier wrote when resolving the report (L2-105 AC2).</summary>
    public string? ResolutionNote { get; private set; }

    public DateTimeOffset? ResolvedAt { get; private set; }

    public IReadOnlyList<ListingReportEntry> Entries => _entries;

    /// <summary>An open report moves to review when a verifier opens it; later opens change nothing.</summary>
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

    public static ListingReport Open(Guid listingId, string reporterSubject, string reporterName, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        ReporterSubject = reporterSubject,
        ReporterName = reporterName,
        Status = ReportStatus.Open,
        CreatedAt = now,
    };

    /// <summary>True while a new submission from the reporter still joins this report.</summary>
    public bool AcceptsAdditionAt(DateTimeOffset now) => now - CreatedAt < AdditionWindow;

    public ListingReportEntry Add(ReportReason reason, string description, string idempotencyKey, DateTimeOffset now)
    {
        var entry = ListingReportEntry.Create(Id, ReporterSubject, reason, description, idempotencyKey, now);
        _entries.Add(entry);
        return entry;
    }
}

/// <summary>One submission of a reason and a description.</summary>
public sealed class ListingReportEntry
{
    private ListingReportEntry()
    {
    }

    public Guid Id { get; private set; }

    public Guid ReportId { get; private set; }

    public string ReporterSubject { get; private set; } = string.Empty;

    public ReportReason Reason { get; private set; }

    public string Description { get; private set; } = string.Empty;

    /// <summary>The client's key for this submission; a repeat of it returns the first answer (L2-132).</summary>
    public string IdempotencyKey { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    internal static ListingReportEntry Create(
        Guid reportId, string reporterSubject, ReportReason reason, string description, string idempotencyKey, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ReportId = reportId,
        ReporterSubject = reporterSubject,
        Reason = reason,
        Description = description,
        IdempotencyKey = idempotencyKey,
        CreatedAt = now,
    };
}
