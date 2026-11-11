namespace Jubilee.Domain;

public enum DataExportStatus
{
    Requested = 0,
    Ready = 1,
    Expired = 2,
    Failed = 3,
}

/// <summary>
/// One member's request for a copy of their data (L2-018). The archive is built in the background, kept for the 7 days
/// the e-mailed link works and then deleted.
/// </summary>
public sealed class DataExport
{
    /// <summary>The build is tried this many times before the export is marked failed (L2-182).</summary>
    public const int MaxAttempts = 5;

    /// <summary>A member may ask this many times in a day (ADR 0034).</summary>
    public const int RequestsPerDay = 3;

    private DataExport()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public DataExportStatus Status { get; private set; }

    public DateTimeOffset RequestedAt { get; private set; }

    public DateTimeOffset? ReadyAt { get; private set; }

    public DateTimeOffset? ExpiresAt { get; private set; }

    public int Attempts { get; private set; }

    /// <summary>The hash of the e-mailed link's token (L2-140): the link is found by it.</summary>
    public string? TokenHash { get; private set; }

    /// <summary>The archive, a JSON document. Kept in a private column that no endpoint serves except the download.</summary>
    public string? ArchiveJson { get; private set; }

    public static DataExport Request(Guid memberId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        MemberId = memberId,
        Status = DataExportStatus.Requested,
        RequestedAt = now,
    };

    public void MarkReady(string archiveJson, string tokenHash, DateTimeOffset now)
    {
        Status = DataExportStatus.Ready;
        ArchiveJson = archiveJson;
        TokenHash = tokenHash;
        ReadyAt = now;
        ExpiresAt = now + LinkToken.DataDownloadLifetime;
    }

    /// <summary>A build that failed: tried again until the attempts are used up.</summary>
    public void RecordFailedAttempt()
    {
        Attempts++;
        if (Attempts >= MaxAttempts)
        {
            Status = DataExportStatus.Failed;
        }
    }

    public void Expire()
    {
        Status = DataExportStatus.Expired;
        ArchiveJson = null;
        TokenHash = null;
    }

    /// <summary>The link works for the member who asked, until it expires (L2-018 AC2).</summary>
    public bool IsDownloadableBy(Guid memberId, DateTimeOffset now) =>
        Status == DataExportStatus.Ready && MemberId == memberId && ExpiresAt is { } until && now < until && ArchiveJson is not null;
}
