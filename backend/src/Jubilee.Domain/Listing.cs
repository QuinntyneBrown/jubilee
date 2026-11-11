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
            throw new ArgumentException($"'{categorySlug}' is not one of the ten categories.", nameof(categorySlug));
        }

        return new Listing
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            Name = name,
            SortName = Domain.SortName.From(name),
            Tagline = tagline,
            CategorySlug = categorySlug,
            Kind = categorySlug == Category.ShopsSlug ? ListingKind.Shop : ListingKind.Services,
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

    /// <summary>Moves the listing to a stage before live. Only <see cref="Approve"/> makes it live.</summary>
    public void MoveTo(ListingStage stage)
    {
        if (stage == ListingStage.Live)
        {
            throw new InvalidOperationException("A listing becomes live only by approval.");
        }

        Stage = stage;
    }

    public void Pause() => IsPaused = true;

    public void Resume() => IsPaused = false;

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
