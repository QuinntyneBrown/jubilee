namespace Jubilee.Domain;

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
