namespace Jubilee.Domain;

/// <summary>
/// Someone who asked, on the launching-soon marketing page, to be told when Jubilee launches
/// (L2-217). One per address. The consent is kept with it: these people have no account, so there
/// is no member to tie a <see cref="ConsentRecord"/> to (L2-218 AC1, ADR 0044).
/// </summary>
public sealed class LaunchSubscriber
{
    public const int MaxFirstNameLength = 50;

    /// <summary>How long a sign-up or a pre-registration is kept (L2-148 AC6).</summary>
    public static readonly TimeSpan Retention = TimeSpan.FromDays(365);

    private LaunchSubscriber()
    {
    }

    public Guid Id { get; private set; }

    public string Email { get; private set; } = string.Empty;

    /// <summary>The address in lower case: two sign-ups are the same when their keys are.</summary>
    public string EmailKey { get; private set; } = string.Empty;

    public string? FirstName { get; private set; }

    public DateTimeOffset ConsentedAt { get; private set; }

    public ConsentMethod ConsentMethod { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static LaunchSubscriber SignUp(EmailAddress email, string? firstName, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Email = email.Value,
        EmailKey = email.Key,
        FirstName = string.IsNullOrWhiteSpace(firstName) ? null : firstName.Trim(),
        ConsentedAt = now,
        ConsentMethod = ConsentMethod.MarketingSiteForm,
        CreatedAt = now,
    };
}

/// <summary>
/// The details an owner sent before launch, so that the Jubilee team can arrange for the listing to
/// be on Jubilee on launch day (L2-216). It is not a listing and not a draft, and it
/// lists nothing: the owner publishes the listing once Jubilee opens. Every one sent is kept, because one owner
/// may have two businesses.
/// </summary>
public sealed class BusinessPreRegistration
{
    public const int MaxBusinessNameLength = 80;

    public const int MaxContactNameLength = 100;

    public const int MaxAreaLength = 80;

    public const int MaxWebsiteLength = 200;

    public const int MaxDescriptionLength = 500;

    private BusinessPreRegistration()
    {
    }

    public Guid Id { get; private set; }

    public string BusinessName { get; private set; } = string.Empty;

    public string ContactName { get; private set; } = string.Empty;

    public string Email { get; private set; } = string.Empty;

    public string EmailKey { get; private set; } = string.Empty;

    /// <summary>Ten digits, when the owner gave a number.</summary>
    public string? Phone { get; private set; }

    public string CategorySlug { get; private set; } = string.Empty;

    public string Area { get; private set; } = string.Empty;

    /// <summary>An <c>http</c> or <c>https</c> address, when the owner gave one (L2-136 AC5).</summary>
    public string? Website { get; private set; }

    public string Description { get; private set; } = string.Empty;

    public DateTimeOffset ConsentedAt { get; private set; }

    public ConsentMethod ConsentMethod { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static BusinessPreRegistration Send(
        string businessName, string contactName, EmailAddress email, string? phone, Category category, string area, string? website,
        string description, DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(),
            BusinessName = businessName.Trim(),
            ContactName = contactName.Trim(),
            Email = email.Value,
            EmailKey = email.Key,
            Phone = phone,
            CategorySlug = category.Slug,
            Area = area.Trim(),
            Website = website,
            Description = description.Trim(),
            ConsentedAt = now,
            ConsentMethod = ConsentMethod.MarketingSiteForm,
            CreatedAt = now,
        };
}
