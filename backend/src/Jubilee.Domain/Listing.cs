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

    public void SetAreasServed(AreaServed areasServed) => AreasServed = areasServed;

    public void SetMedianResponseMinutes(int? minutes) => MedianResponseMinutes = minutes;

    /// <summary>Recomputes the stored <see cref="RecommendedScore"/> as of <paramref name="now"/>.</summary>
    public void RefreshRecommendedScore(DateTimeOffset now) =>
        RecommendedScore = Domain.RecommendedScore.Compute(
            Tagline, Highlight, Offers, AreasServed, MedianResponseMinutes, ApprovedAt, now);
}
