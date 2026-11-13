namespace Jubilee.Domain;

/// <summary>A business in the directory.</summary>
public sealed class Listing
{
    private Listing()
    {
    }

    public Guid Id { get; private set; }

    public string Slug { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    /// <summary>Stored form of <see cref="Name"/> that "Name A–Z" orders by.</summary>
    public string SortName { get; private set; } = string.Empty;

    public string Tagline { get; private set; } = string.Empty;

    /// <summary>Optional short perk line, for example "Emergency calls".</summary>
    public string? Highlight { get; private set; }

    public string CategorySlug { get; private set; } = string.Empty;

    /// <summary>Main offer: services or a shop. A listing in Shops starts as a shop.</summary>
    public ListingKind Kind { get; private set; }

    /// <summary>The owner's name with credentials, for example "Trevor Chew, CKA®".</summary>
    public string? OwnerName { get; private set; }

    /// <summary>The session subject of the member who owns the listing; null until claimed.</summary>
    public string? OwnerId { get; private set; }

    public List<string> Credentials { get; private set; } = [];

    public string? About { get; private set; }

    public string? Where { get; private set; }

    public string? Hours { get; private set; }

    public string? Languages { get; private set; }

    public string? Delivery { get; private set; }

    public string? MadeToOrder { get; private set; }

    public ListingStage Stage { get; private set; }

    public bool IsPaused { get; private set; }

    /// <summary>When the owner paused the listing; null while it is not paused (L2-096).</summary>
    public DateTimeOffset? PausedAt { get; private set; }

    /// <summary>Counts the owner's saves of the listing; an edit made from an older version is refused (L2-087 AC8).</summary>
    public int Version { get; private set; }

    /// <summary>The business's website (L2-087); null when it has none.</summary>
    public string? Website { get; private set; }

    /// <summary>When a change of name or category asked the verification team to look again (L2-087 AC6).</summary>
    public DateTimeOffset? RecheckRequestedAt { get; private set; }

    /// <summary>
    /// When the owner last chose this listing in the switcher of My business (L2-079 AC5); null until they choose.
    /// The owner's workspace shows the listing chosen last.
    /// </summary>
    public DateTimeOffset? WorkspaceChosenAt { get; private set; }

    public void ChooseForWorkspace(DateTimeOffset now) => WorkspaceChosenAt = now;

    /// <summary>A listing paused this long needs verifying again before it is public (L2-096 AC4).</summary>
    public static readonly TimeSpan PausedTooLong = TimeSpan.FromDays(365);

    public DateTimeOffset? DeletedAt { get; private set; }

    public bool IsUnderModerationHold { get; private set; }

    public DateTimeOffset? ApprovedAt { get; private set; }

    public string? ApprovedBy { get; private set; }

    public OfferFilter Offers { get; private set; }

    public AreaServed AreasServed { get; private set; }

    /// <summary>Null until messaging exists and a response time has been measured.</summary>
    public int? MedianResponseMinutes { get; private set; }

    /// <summary>Stored result of <see cref="Domain.RecommendedScore"/>.</summary>
    public double RecommendedScore { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>
    /// True only for a listing the verification team approved and that is currently live. Not
    /// stored: it shares its definition with <see cref="VerifiedListingSpecification"/>.
    /// </summary>
    public bool IsVerified => VerifiedListingSpecification.IsSatisfiedBy(this);

    public static Listing Create(string slug, string name, string tagline, string categorySlug, DateTimeOffset now)
    {
        if (Category.Find(categorySlug) is null)
        {
            throw new ArgumentException($"'{categorySlug}' is not one of the eleven categories.", nameof(categorySlug));
        }

        return new Listing
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            Name = name,
            SortName = Domain.SortName.From(name),
            Tagline = tagline,
            CategorySlug = categorySlug,
            Kind = Category.KindOf(categorySlug),
            Stage = ListingStage.Draft,
            CreatedAt = now,
        };
    }

    /// <summary>
    /// A public listing: verified and live, not paused, not deleted and not under a moderation
    /// hold (L2-028). Shares its definition with <see cref="PublicListingFilter"/>.
    /// </summary>
    public bool IsPublic() => PublicListingFilter.IsSatisfiedBy(this);

    /// <summary>
    /// The verification team's approval. The only code that sets <see cref="ApprovedAt"/>; it
    /// also makes the listing live.
    /// </summary>
    public void Approve(string approvedBy, DateTimeOffset now)
    {
        ApprovedAt = now;
        ApprovedBy = approvedBy;
        Stage = ListingStage.Live;
        RefreshRecommendedScore(now);
    }

    /// <summary>The owner's edit of the words members read; the review screen highlights what changed (L2-103 AC2).</summary>
    public void Reword(string name, string tagline, string categorySlug, string? about)
    {
        Name = name;
        SortName = Domain.SortName.From(name);
        Tagline = tagline;
        CategorySlug = categorySlug;
        About = about;
    }

    /// <summary>Moves the listing to a stage before live. Only <see cref="Approve"/> makes it live.</summary>
    public void MoveTo(ListingStage stage)
    {
        if (stage == ListingStage.Live)
        {
            throw new InvalidOperationException("A listing becomes live only by approval.");
        }

        Stage = stage;
    }

    public void Pause(DateTimeOffset? now = null)
    {
        IsPaused = true;
        PausedAt ??= now;
    }

    /// <summary>When the daily job paused the listing because its owner had not agreed to the updated statement of faith (L2-075 AC6).</summary>
    public DateTimeOffset? StatementLapsedAt { get; private set; }

    /// <summary>Pauses a live listing whose owner has not agreed to the updated statement of faith in time (L2-075 AC6).</summary>
    public void PauseForStatement(DateTimeOffset now)
    {
        Pause(now);
        StatementLapsedAt = now;
    }

    /// <summary>The owner agreed: a listing the job paused is live again at once, without new verification (L2-075 AC6).</summary>
    public void ResumeAfterStatement()
    {
        if (StatementLapsedAt is null)
        {
            return;
        }

        StatementLapsedAt = null;
        IsPaused = false;
        PausedAt = null;
    }

    /// <summary>Takes the listing off pause. After a year it goes back to the verification queue (L2-096 AC4).</summary>
    public void Resume(DateTimeOffset? now = null)
    {
        if (IsPaused && now is { } at && PausedAt is { } since && at - since >= PausedTooLong)
        {
            Stage = ListingStage.ReadyToReview;
        }

        IsPaused = false;
        PausedAt = null;
    }

    /// <summary>Gives the listing the slug of its new name (L2-113 AC2); the caller keeps the old one.</summary>
    public void MoveTo(string slug) => Slug = slug;

    /// <summary>
    /// The owner's edit of the listing's page (L2-087). Returns true when the name or category changed,
    /// which asks the verification team to look again.
    /// </summary>
    public bool Edit(string name, string tagline, string categorySlug, string? about, string? where, string? hours, string? website, string? highlight, DateTimeOffset now)
    {
        var reworded = !string.Equals(Name, name, StringComparison.Ordinal) || CategorySlug != categorySlug;
        Name = name;
        SortName = Domain.SortName.From(name);
        Tagline = tagline;
        if (CategorySlug != categorySlug)
        {
            CategorySlug = categorySlug;
            Kind = Category.KindOf(categorySlug);
        }

        About = Clean(about);
        Where = Clean(where);
        Hours = Clean(hours);
        Website = Clean(website);
        Highlight = Clean(highlight);
        Version++;
        if (reworded && Stage == ListingStage.Live)
        {
            RecheckRequestedAt = now;
        }

        RefreshRecommendedScore(now);
        return reworded;
    }

    /// <summary>The rental details of a space; null for a business (L2-199).</summary>
    public SpaceDetails? Space { get; private set; }

    /// <summary>Replaces the rental details of a space (L2-199, L2-209).</summary>
    public void DescribeSpace(SpaceDetails details)
    {
        if (Kind != ListingKind.Space)
        {
            throw new InvalidOperationException("Only a space has rental details.");
        }

        Space = details;
    }

    public void Delete(DateTimeOffset now) => DeletedAt ??= now;

    public void PlaceModerationHold() => IsUnderModerationHold = true;

    public void LiftModerationHold() => IsUnderModerationHold = false;

    public void SetHighlight(string? highlight) =>
        Highlight = string.IsNullOrWhiteSpace(highlight) ? null : highlight.Trim();

    public void SetOffers(OfferFilter offers) => Offers = offers;

    public void SetKind(ListingKind kind) => Kind = kind;

    public void AssignOwner(string subject) => OwnerId = string.IsNullOrWhiteSpace(subject)
        ? throw new ArgumentException("An owner has a subject.", nameof(subject))
        : subject;

    /// <summary>Replaces what the listing page tells members about the business.</summary>
    public void Describe(ListingProfile profile)
    {
        OwnerName = Clean(profile.OwnerName);
        Credentials = [.. profile.Credentials.Select(Clean).OfType<string>()];
        About = Clean(profile.About);
        Where = Clean(profile.Where);
        Hours = Clean(profile.Hours);
        Languages = Clean(profile.Languages);
        Delivery = Clean(profile.Delivery);
        MadeToOrder = Clean(profile.MadeToOrder);
    }

    /// <summary>The "Replies" band of the stored median first-reply time (L2-033 AC5).</summary>
    public ReplyTimeBand ReplyTimeBand => ReplyTimeBands.From(MedianResponseMinutes);

    public void SetAreasServed(AreaServed areasServed) => AreasServed = areasServed;

    /// <summary>Days of the week the business meets, as <see cref="DayOfWeek"/> bits; Monday to Friday until the owner says otherwise.</summary>
    public int MeetingDays { get; private set; } = WeekdayBits;

    /// <summary>Where an in-person meeting happens, for example "North York"; null when only video is offered.</summary>
    public string? MeetingArea { get; private set; }

    public const int WeekdayBits = (1 << (int)DayOfWeek.Monday) | (1 << (int)DayOfWeek.Tuesday) | (1 << (int)DayOfWeek.Wednesday) | (1 << (int)DayOfWeek.Thursday) | (1 << (int)DayOfWeek.Friday);

    public bool MeetsOn(DayOfWeek day) => (MeetingDays & (1 << (int)day)) != 0;

    public void SetMeetingDays(int days) => MeetingDays = days;

    /// <summary>The time of day in Toronto from which meetings are offered; null until the owner saves meeting hours (L2-220).</summary>
    public TimeOnly? MeetingOpensAt { get; private set; }

    /// <summary>The time of day in Toronto by which a meeting ends; null until the owner saves meeting hours.</summary>
    public TimeOnly? MeetingClosesAt { get; private set; }

    /// <summary>How often a time is offered, in minutes; null until the owner saves meeting hours.</summary>
    public int? MeetingSlotMinutes { get; private set; }

    /// <summary>The owner says when meetings can be booked (L2-220). Requests already sent are not touched.</summary>
    public void SetMeetingHours(int days, TimeOnly opensAt, TimeOnly closesAt, int slotMinutes)
    {
        MeetingDays = days;
        MeetingOpensAt = opensAt;
        MeetingClosesAt = closesAt;
        MeetingSlotMinutes = slotMinutes;
    }

    /// <summary>At or above this item amount a shop ships free; null when it never does (L2-046 AC4).</summary>
    public int? FreeShippingOverCents { get; private set; }

    public void SetFreeShippingOver(int? cents) => FreeShippingOverCents = cents is > 0 ? cents : null;

    public void SetMeetingArea(string? area) => MeetingArea = string.IsNullOrWhiteSpace(area) ? null : area.Trim();

    /// <summary>When the owner is away until (L2-062); null when not away.</summary>
    public DateTimeOffset? AwayUntil { get; private set; }

    public void SetAway(DateTimeOffset? until) => AwayUntil = until;

    public void SetMedianResponseMinutes(int? minutes) => MedianResponseMinutes = minutes;

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Recomputes the stored <see cref="RecommendedScore"/> as of <paramref name="now"/>.</summary>
    public void RefreshRecommendedScore(DateTimeOffset now) =>
        RecommendedScore = Domain.RecommendedScore.Compute(
            Tagline, Highlight, Offers, AreasServed, MedianResponseMinutes, ApprovedAt, now);
}
