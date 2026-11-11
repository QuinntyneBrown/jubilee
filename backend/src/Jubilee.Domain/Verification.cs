namespace Jubilee.Domain;

/// <summary>What the verification team decided (L2-101, L2-102, L2-104).</summary>
public enum DecisionKind
{
    Approved = 1,
    ChangesRequested = 2,
    Declined = 3,
}

/// <summary>The five checks of the review screen (L2-100 AC3).</summary>
public static class ChecklistItems
{
    public static readonly IReadOnlyList<(string Key, string Label)> All =
    [
        ("owner-name", "Owner’s name matches the reference"),
        ("reference", "Reference confirmed and can vouch"),
        ("tagline", "Tagline and description are honest and clear"),
        ("photos", "At least one photo of the products or work"),
        ("category", "Category fits what they offer"),
    ];

    public static bool IsKnown(string key) => All.Any(i => i.Key == key);

    public static string LabelOf(string key) => All.First(i => i.Key == key).Label;
}

/// <summary>The areas a request for changes can name (L2-102 AC1).</summary>
public static class ChangeAreas
{
    public static readonly IReadOnlyList<(string Key, string Label)> All =
    [
        ("tagline", "Tagline or description"),
        ("photos", "Photos"),
        ("category", "Category"),
        ("reference", "Church reference"),
    ];

    public static bool IsKnown(string key) => All.Any(a => a.Key == key);
}

/// <summary>One ticked check, with who ticked it and when (L2-100 AC3).</summary>
public sealed class ReviewTick
{
    private ReviewTick()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public string Item { get; private set; } = string.Empty;

    public string TickedBy { get; private set; } = string.Empty;

    public string TickedByName { get; private set; } = string.Empty;

    public DateTimeOffset TickedAt { get; private set; }

    public static ReviewTick Make(Guid listingId, string item, string by, string byName, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        Item = item,
        TickedBy = by,
        TickedByName = byName,
        TickedAt = now,
    };
}

/// <summary>
/// A decision of the verification team about a listing. Approved and declined decisions start the
/// 90-day clock after which the reference's answer is deleted (L2-146).
/// </summary>
public sealed class ListingDecision
{
    private ListingDecision()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public DecisionKind Kind { get; private set; }

    public string DecidedBy { get; private set; } = string.Empty;

    public string DecidedByName { get; private set; } = string.Empty;

    public DateTimeOffset DecidedAt { get; private set; }

    /// <summary>The approval note, the message asking for changes, or the reason for declining.</summary>
    public string? Note { get; private set; }

    /// <summary>The areas a request for changes named.</summary>
    public List<string> Areas { get; private set; } = [];

    /// <summary>The checks ticked when the decision was made.</summary>
    public List<string> Ticked { get; private set; } = [];

    /// <summary>The words members read when changes were requested, to show what the owner changed (L2-103 AC2).</summary>
    public string? SnapshotName { get; private set; }

    public string? SnapshotTagline { get; private set; }

    public string? SnapshotCategory { get; private set; }

    public string? SnapshotAbout { get; private set; }

    /// <summary>Set when the owner resubmitted after this request for changes.</summary>
    public DateTimeOffset? ResolvedAt { get; private set; }

    /// <summary>Set when the reference's data was deleted, 90 days after an approval or a decline.</summary>
    public DateTimeOffset? ReferenceDeletedAt { get; private set; }

    public static ListingDecision Make(
        Guid listingId, DecisionKind kind, string by, string byName, string? note,
        IEnumerable<string> areas, IEnumerable<string> ticked, Listing listing, DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            ListingId = listingId,
            Kind = kind,
            DecidedBy = by,
            DecidedByName = byName,
            DecidedAt = now,
            Note = note,
            Areas = [.. areas],
            Ticked = [.. ticked],
            SnapshotName = listing.Name,
            SnapshotTagline = listing.Tagline,
            SnapshotCategory = listing.CategorySlug,
            SnapshotAbout = listing.About,
        };

    public void Resolve(DateTimeOffset now) => ResolvedAt = now;

    public void ReferenceDeleted(DateTimeOffset now) => ReferenceDeletedAt = now;
}

/// <summary>
/// An append-only record of a sensitive action (L2-180). The application never edits or deletes one.
/// </summary>
public sealed class AuditRecord
{
    private AuditRecord()
    {
    }

    public Guid Id { get; private set; }

    public string Actor { get; private set; } = string.Empty;

    public string ActorName { get; private set; } = string.Empty;

    public string Action { get; private set; } = string.Empty;

    public string TargetType { get; private set; } = string.Empty;

    public string TargetId { get; private set; } = string.Empty;

    public DateTimeOffset At { get; private set; }

    public string? Before { get; private set; }

    public string? After { get; private set; }

    public string? Reason { get; private set; }

    public static AuditRecord Make(
        string actor, string actorName, string action, string targetType, string targetId,
        string? before, string? after, string? reason, DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            Actor = actor,
            ActorName = actorName,
            Action = action,
            TargetType = targetType,
            TargetId = targetId,
            At = now,
            Before = before,
            After = after,
            Reason = reason,
        };
}
