namespace Jubilee.Domain;

/// <summary>What a member sent (L1-029, ADR 0043): one record, told apart by its kind.</summary>
public enum FeedbackKind
{
    Rating = 0,
    BugReport = 1,
    Kudos = 2,
    CheckIn = 3,
}

/// <summary>What became of feedback. Staff move it on; the member reads it in words (L2-213).</summary>
public enum FeedbackStatus
{
    Received = 0,
    Read = 1,
    InProgress = 2,
    Fixed = 3,
}

/// <summary>How often a bug happens, as the member says (L2-212 AC4).</summary>
public enum BugFrequency
{
    Once = 0,
    Sometimes = 1,
    EveryTime = 2,
}

/// <summary>The moment a check-in follows (L2-211).</summary>
public enum CheckInMoment
{
    RequestSent = 0,
    ListingSubmitted = 1,
}

/// <summary>The 1 to 5 scores a rating may give to each part of Jubilee (L2-212 AC2). A part not used is null.</summary>
public sealed record AreaScores(int? Finding, int? Listing, int? Messaging, int? Trust)
{
    public static readonly AreaScores None = new(null, null, null, null);
}

/// <summary>
/// A rating, a bug report, kudos or a moment check-in from one member (L2-214). It belongs to its
/// member: only they read it in the app. The fields of the other kinds stay null.
/// </summary>
public sealed class Feedback
{
    public const int MaxNoteLength = 1000;

    public const int MaxAnswerLength = 2000;

    public const int MaxScreenshots = 3;

    public const int MaxScreenLength = 100;

    public const int MaxVersionLength = 40;

    public const int MaxUserAgentLength = 400;

    public const int MinScore = 1;

    public const int MaxScore = 5;

    /// <summary>The chips a member may choose for kudos (L2-210 AC5), as they travel.</summary>
    public static readonly string[] KudosChips = ["trust", "easy-to-list", "quick-replies", "church-family", "fair-prices"];

    /// <summary>Where a bug happened (L2-212 AC4), as it travels.</summary>
    public static readonly string[] BugPlaces = ["browse", "business", "listing", "messages", "requests", "account", "other"];

    private Feedback()
    {
    }

    public Guid Id { get; private set; }

    public FeedbackKind Kind { get; private set; }

    public string MemberSubject { get; private set; } = string.Empty;

    /// <summary>The member's name when they sent it, for the team.</summary>
    public string MemberName { get; private set; } = string.Empty;

    public FeedbackStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The client's key for this submission; a repeat of it returns the first answer (L2-132).</summary>
    public string IdempotencyKey { get; private set; } = string.Empty;

    /// <summary>The member agreed to be messaged about it (L2-212 AC10). Never assumed.</summary>
    public bool MayContact { get; private set; }

    /// <summary>The overall rating, or the score of a check-in: 1 to 5.</summary>
    public int? Rating { get; private set; }

    /// <summary>The note of a rating, of kudos or of a check-in.</summary>
    public string? Note { get; private set; }

    public int? FindingScore { get; private set; }

    public int? ListingScore { get; private set; }

    public int? MessagingScore { get; private set; }

    public int? TrustScore { get; private set; }

    /// <summary>The team's reply, shown to the member under the item (L2-213 AC2).</summary>
    public string? Reply { get; private set; }

    /// <summary>A bug report's reference, <c>FB-</c> and six characters, which no other report has (ADR 0043).</summary>
    public string? Reference { get; private set; }

    /// <summary>Where the bug happened, one of <see cref="BugPlaces"/>; the panel does not ask.</summary>
    public string? Place { get; private set; }

    public string? Happened { get; private set; }

    public string? Expected { get; private set; }

    public BugFrequency? Frequency { get; private set; }

    /// <summary>The screen the member was on when they reported, as the app names it.</summary>
    public string? Screen { get; private set; }

    /// <summary>The browser and device, from the request's <c>User-Agent</c> header.</summary>
    public string? UserAgent { get; private set; }

    public string? AppVersion { get; private set; }

    /// <summary>The business kudos are for; null when they are for the Jubilee team.</summary>
    public Guid? ListingId { get; private set; }

    /// <summary>The name of that business when the kudos were sent.</summary>
    public string? BusinessName { get; private set; }

    /// <summary>The chosen chips of kudos, as they travel, separated by commas.</summary>
    public string? Chips { get; private set; }

    /// <summary>The member agreed that Jubilee may show the kudos on the business's page.</summary>
    public bool ShowOnPage { get; private set; }

    /// <summary>The moment a check-in follows.</summary>
    public CheckInMoment? Moment { get; private set; }

    public IReadOnlyList<string> ChipList => string.IsNullOrEmpty(Chips) ? [] : Chips.Split(',');

    public static bool IsScore(int? score) => score is >= MinScore and <= MaxScore;

    public static Feedback Rate(
        string memberSubject, string memberName, int rating, string? note, AreaScores areas, bool mayContact, string idempotencyKey, DateTimeOffset now)
    {
        var feedback = New(FeedbackKind.Rating, memberSubject, memberName, idempotencyKey, now);
        feedback.Rating = rating;
        feedback.Note = note;
        feedback.FindingScore = areas.Finding;
        feedback.ListingScore = areas.Listing;
        feedback.MessagingScore = areas.Messaging;
        feedback.TrustScore = areas.Trust;
        feedback.MayContact = mayContact;
        return feedback;
    }

    public static Feedback ReportBug(
        string memberSubject, string memberName, string reference, string? place, string happened, string? expected, BugFrequency? frequency,
        string? screen, string? userAgent, string? appVersion, bool mayContact, string idempotencyKey, DateTimeOffset now)
    {
        var feedback = New(FeedbackKind.BugReport, memberSubject, memberName, idempotencyKey, now);
        feedback.Reference = reference;
        feedback.Place = place;
        feedback.Happened = happened;
        feedback.Expected = expected;
        feedback.Frequency = frequency;
        feedback.Screen = screen;
        feedback.UserAgent = userAgent;
        feedback.AppVersion = appVersion;
        feedback.MayContact = mayContact;
        return feedback;
    }

    /// <summary>Kudos for the Jubilee team, or for <paramref name="business"/> when one is named.</summary>
    public static Feedback Thank(
        string memberSubject, string memberName, Listing? business, IEnumerable<string> chips, string? note, bool showOnPage, bool mayContact,
        string idempotencyKey, DateTimeOffset now)
    {
        var feedback = New(FeedbackKind.Kudos, memberSubject, memberName, idempotencyKey, now);
        feedback.ListingId = business?.Id;
        feedback.BusinessName = business?.Name;
        feedback.Chips = string.Join(',', chips);
        feedback.Note = note;
        feedback.ShowOnPage = business is not null && showOnPage;
        feedback.MayContact = mayContact;
        return feedback;
    }

    /// <summary>A check-in under the id the app made for its confirmation (ADR 0043).</summary>
    public static Feedback CheckIn(Guid id, string memberSubject, string memberName, CheckInMoment moment, int score, string? note, DateTimeOffset now)
    {
        var feedback = New(FeedbackKind.CheckIn, memberSubject, memberName, id.ToString(), now);
        feedback.Id = id;
        feedback.Moment = moment;
        feedback.Rating = score;
        feedback.Note = note;
        return feedback;
    }

    /// <summary>The member chose another score or sent the note: one answer is kept (L2-211 AC5).</summary>
    public void Answer(CheckInMoment moment, int score, string? note)
    {
        Moment = moment;
        Rating = score;
        Note = note;
    }

    public void MarkRead() => Status = FeedbackStatus.Read;

    public void StartWork() => Status = FeedbackStatus.InProgress;

    public void MarkFixed() => Status = FeedbackStatus.Fixed;

    public void ReplyWith(string reply) => Reply = reply;

    private static Feedback New(FeedbackKind kind, string memberSubject, string memberName, string idempotencyKey, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Kind = kind,
        MemberSubject = memberSubject,
        MemberName = memberName,
        Status = FeedbackStatus.Received,
        IdempotencyKey = idempotencyKey,
        CreatedAt = now,
    };
}

/// <summary>
/// A picture a member added to a bug report (L2-212 AC6): cleaned bytes, kept for the team and never
/// served to the app. It waits without a report until the report that names it is sent.
/// </summary>
public sealed class FeedbackScreenshot
{
    private FeedbackScreenshot()
    {
    }

    public Guid Id { get; private set; }

    public Guid? FeedbackId { get; private set; }

    public string UploaderSubject { get; private set; } = string.Empty;

    public string ContentType { get; private set; } = string.Empty;

    public byte[] Content { get; private set; } = [];

    public DateTimeOffset CreatedAt { get; private set; }

    public static FeedbackScreenshot Store(string uploaderSubject, string contentType, byte[] content, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        UploaderSubject = uploaderSubject,
        ContentType = contentType,
        Content = content,
        CreatedAt = now,
    };

    public void AttachTo(Guid feedbackId) => FeedbackId = feedbackId;
}
