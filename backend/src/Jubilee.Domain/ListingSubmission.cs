namespace Jubilee.Domain;

/// <summary>The statement of faith an owner agrees to when listing (L2-075).</summary>
public static class StatementOfFaith
{
    /// <summary>The date the statement was last updated; recorded with each agreement.</summary>
    public const string Version = "2026-11-02";
}

/// <summary>
/// An owner's submission of a listing for verification: their agreement to the statement of faith
/// and what the verification team should look at (L2-072, L2-075).
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

    /// <summary>When the listing last became ready for the verification team; "overdue" counts from here (L2-099 AC5).</summary>
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
