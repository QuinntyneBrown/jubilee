namespace Jubilee.Domain;

/// <summary>
/// The statement of faith an owner agrees to when listing (L2-075). The statement is a page of the app,
/// so a new version ships with the code: changing <see cref="Version"/> asks every owner whose latest
/// agreement is earlier to agree again within <see cref="DaysToAgree"/> days (ADR 0018).
/// </summary>
public static class StatementOfFaith
{
    /// <summary>The date the statement was last updated; recorded with each agreement.</summary>
    public const string Version = "2026-11-02";

    /// <summary>How long an owner has to agree to a new version before their live listings are paused (L2-075 AC6).</summary>
    public const int DaysToAgree = 30;

    /// <summary>The date of <see cref="Version"/>.</summary>
    public static DateOnly UpdatedOn { get; } = DateOnly.ParseExact(Version, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

    /// <summary>The last day to agree to <see cref="Version"/>: 30 days after it.</summary>
    public static DateOnly AgreeBy { get; } = UpdatedOn.AddDays(DaysToAgree);

    /// <summary>Whether the 30 days have passed on <paramref name="now"/>, read in Toronto.</summary>
    public static bool IsOverdue(DateTimeOffset now) => TorontoClock.Today(now) > AgreeBy;

    /// <summary>Whether <paramref name="latest"/>, the newest version an owner agreed to, is earlier than the current one. Versions are ISO dates, so they compare as text.</summary>
    public static bool IsDue(string? latest) => latest is not null && string.CompareOrdinal(latest, Version) < 0;
}

/// <summary>
/// An owner's agreement to a version of the statement of faith made outside a submission, when the
/// statement was updated (L2-075 AC4). One per owner and version.
/// </summary>
public sealed class StatementAgreement
{
    private StatementAgreement()
    {
    }

    public Guid Id { get; private set; }

    public string OwnerSubject { get; private set; } = string.Empty;

    public string Version { get; private set; } = string.Empty;

    public DateTimeOffset AgreedAt { get; private set; }

    public static StatementAgreement Record(string ownerSubject, string version, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        OwnerSubject = ownerSubject,
        Version = version,
        AgreedAt = now,
    };
}

/// <summary>
/// An owner's published listing's record: their agreement to the statement of faith
/// and the flags the Jubilee team should look at (L2-072, L2-075).
/// </summary>
public sealed class ListingSubmission
{
    private ListingSubmission()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public string OwnerSubject { get; private set; } = string.Empty;

    public string StatementVersion { get; private set; } = string.Empty;

    public DateTimeOffset AgreedAt { get; private set; }

    public DateTimeOffset SubmittedAt { get; private set; }

    /// <summary>Makes a repeat of the same submit the same submission (L2-132).</summary>
    public string IdempotencyKey { get; private set; } = string.Empty;

    /// <summary>What the review screen flags: <c>CONTACT_IN_TEXT</c>.</summary>
    public List<string> Flags { get; private set; } = [];

    /// <summary>When the listing was published; kept from before ADR 0057, when it meant "ready to review".</summary>
    public DateTimeOffset? ReadyAt { get; private set; }

    public void MarkReady(DateTimeOffset now) => ReadyAt = now;

    public void AddFlag(string flag)
    {
        if (!Flags.Contains(flag))
        {
            Flags = [.. Flags, flag];
        }
    }

    public static ListingSubmission Record(
        Guid listingId, string ownerSubject,
        string idempotencyKey, IEnumerable<string> flags, DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            ListingId = listingId,
            OwnerSubject = ownerSubject,
            StatementVersion = StatementOfFaith.Version,
            AgreedAt = now,
            SubmittedAt = now,
            IdempotencyKey = idempotencyKey,
            Flags = [.. flags],
        };
}
