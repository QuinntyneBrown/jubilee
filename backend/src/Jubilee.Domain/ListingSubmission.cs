namespace Jubilee.Domain;

/// <summary>The statement of faith an owner agrees to when listing (L2-075).</summary>
public static class StatementOfFaith
{
    /// <summary>The date the statement was last updated; recorded with each agreement.</summary>
    public const string Version = "2026-11-02";
}

/// <summary>
/// An owner's submission of a listing for verification: the church reference they named, their
/// agreement to the statement of faith, and what the verification team should look at (L2-074,
/// L2-075, L2-146). The reference's e-mail is used only for that listing's reference request.
/// </summary>
public sealed class ListingSubmission
{
    private ListingSubmission()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public string OwnerSubject { get; private set; } = string.Empty;

    public string Church { get; private set; } = string.Empty;

    public string PastorEmail { get; private set; } = string.Empty;

    /// <summary>The pastor's e-mail in lower case, for counting how often it is named.</summary>
    public string PastorEmailKey { get; private set; } = string.Empty;

    public string StatementVersion { get; private set; } = string.Empty;

    public DateTimeOffset AgreedAt { get; private set; }

    public DateTimeOffset SubmittedAt { get; private set; }

    /// <summary>Makes a repeat of the same submit the same submission (L2-132).</summary>
    public string IdempotencyKey { get; private set; } = string.Empty;

    /// <summary>What the review screen flags: <c>CONTACT_IN_TEXT</c>, <c>REFERENCE_REUSED</c>.</summary>
    public List<string> Flags { get; private set; } = [];

    public void AddFlag(string flag)
    {
        if (!Flags.Contains(flag))
        {
            Flags = [.. Flags, flag];
        }
    }

    /// <summary>The owner named another church reference (L2-084 AC3).</summary>
    public void ChangeReference(string church, string pastorEmail)
    {
        Church = church;
        PastorEmail = pastorEmail;
        PastorEmailKey = pastorEmail.ToLowerInvariant();
    }

    public static ListingSubmission Record(
        Guid listingId, string ownerSubject, string church, string pastorEmail,
        string idempotencyKey, IEnumerable<string> flags, DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            ListingId = listingId,
            OwnerSubject = ownerSubject,
            Church = church,
            PastorEmail = pastorEmail,
            PastorEmailKey = pastorEmail.ToLowerInvariant(),
            StatementVersion = StatementOfFaith.Version,
            AgreedAt = now,
            SubmittedAt = now,
            IdempotencyKey = idempotencyKey,
            Flags = [.. flags],
        };
}
