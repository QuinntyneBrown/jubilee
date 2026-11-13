namespace Jubilee.Domain;

/// <summary>What a moderator did about a report (L2-105 AC2).</summary>
public enum ReportActionKind
{
    Dismiss = 0,
    MessageReporter = 1,
    MessageOwner = 2,
    PlaceOnHold = 3,
    RemoveListing = 4,
    LiftHold = 5,

    /// <summary>Takes a reported review down, with a reason its author reads (L2-237 AC3).</summary>
    TakeDownReview = 6,
}

/// <summary>
/// One action taken on a report, with the note the moderator wrote. A report's actions are its history.
/// <see cref="ReportId"/> is the id of a <see cref="ListingReport"/> or a <see cref="ConversationReport"/>.
/// </summary>
public sealed class ReportAction
{
    public const int MaxNoteLength = 1000;
    public const int MaxMessageLength = 2000;

    private ReportAction()
    {
    }

    public Guid Id { get; private set; }

    public Guid ReportId { get; private set; }

    public ReportActionKind Kind { get; private set; }

    public string ResolutionNote { get; private set; } = string.Empty;

    /// <summary>The text sent to the reporter or the owner, for the two message actions.</summary>
    public string? MessageText { get; private set; }

    public string Actor { get; private set; } = string.Empty;

    public string ActorName { get; private set; } = string.Empty;

    public DateTimeOffset At { get; private set; }

    public static ReportAction Take(
        Guid reportId, ReportActionKind kind, string note, string? messageText, string actor, string actorName, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ReportId = reportId,
        Kind = kind,
        ResolutionNote = note,
        MessageText = messageText,
        Actor = actor,
        ActorName = actorName,
        At = now,
    };
}
