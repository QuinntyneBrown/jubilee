namespace Jubilee.Domain;

/// <summary>
/// "Email me this weekly" (L2-279 AC3, ADR 0075): a staff member's wish to be e-mailed, every Monday at 08:00 in
/// Toronto, a link to a table's CSV in the admin application. One per staff member and table; it holds the Monday it
/// was last sent for, so a week is sent once.
/// </summary>
public sealed class AdminExportSubscription
{
    private AdminExportSubscription()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The subject of the staff session that turned it on.</summary>
    public string StaffSubject { get; private set; } = string.Empty;

    /// <summary>The staff account it is sent to; without one it is never sent.</summary>
    public Guid? StaffMemberId { get; private set; }

    public string TableKey { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The Monday of the last week it was sent for.</summary>
    public DateOnly? LastSentOn { get; private set; }

    public static AdminExportSubscription Start(string staffSubject, Guid? staffMemberId, string tableKey, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        StaffSubject = staffSubject,
        StaffMemberId = staffMemberId,
        TableKey = tableKey,
        CreatedAt = now,
    };

    public void SentFor(DateOnly monday) => LastSentOn = monday;
}
