using System.Text.Json;
using System.Text.RegularExpressions;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Content;

public sealed record ContentSectionDto(string Heading, string Anchor, string Body);

/// <summary>
/// One policy page as published (L2-107 to L2-110). A section's body is plain text: paragraphs are separated by a
/// blank line, a line that starts with "- " is a bullet, and <c>[text](/path)</c> is a link to a page of Jubilee or a mailto.
/// </summary>
public sealed record ContentDto(
    string Slug, string Title, string Lead, int Version, DateTimeOffset PublishedAt, IReadOnlyList<ContentSectionDto> Sections);

/// <summary>The first version of each page: the draft text of the mocks, served until staff publish another (ADR 0030).</summary>
public static class ContentDefaults
{
    public static readonly DateTimeOffset PublishedAt = new(2026, 11, 2, 17, 0, 0, TimeSpan.Zero);

    public static ContentDto? For(string slug) => slug switch
    {
        "statement-of-faith" => Make(slug, "Statement of faith",
            "Jubilee is open to everyone as a customer. Businesses that list here agree to the commitments below, and a pastor or elder confirms them.",
            [
                new("What we believe", "what-we-believe",
                    "We believe in one God — Father, Son and Holy Spirit — and that Jesus Christ is Lord. We hold the Bible to be God’s word and our guide for faith and for work."),
                new("How we do business", "how-we-do-business",
                    "- We tell the truth about what we sell, what it costs and when it will be ready.\n- We treat every customer with the same care, whatever their background or belief.\n- We keep our word, and we put it right when we fall short.\n- We see profit as something to steward: for our families, our churches and our city."),
                new("How a listing is confirmed", "how-a-listing-is-confirmed",
                    "Each owner names a pastor or elder who knows them. We contact that person privately before the listing goes live. Read more in [Help](/help)."),
            ]),
        "terms" => Make(slug, "Terms of use",
            "These terms cover using Jubilee as a member and as a listed business. Jubilee introduces buyers and businesses; the agreement to buy is between the two of you.",
            [
                new("Your account", "your-account",
                    "You need to be 18 or older and use your real name. Keep your password to yourself and tell us if someone else has used your account."),
                new("Listings", "listings",
                    "Businesses are responsible for the accuracy of their listing, prices and credentials. We may pause a listing while we look into a report."),
                new("Requests and payment", "requests-and-payment",
                    "Bookings, quotes and order requests are sent to the business, which confirms or declines them. Jubilee does not take payment or hold funds; you pay the business directly."),
                new("Conduct", "conduct",
                    "Be honest and kind in messages. We remove accounts that harass, mislead or spam other members."),
            ]),
        "privacy" => Make(slug, "Privacy",
            "We collect only what the marketplace needs to work, and we never sell it.",
            [
                new("What we keep", "what-we-keep",
                    "- Your name, e-mail, and optional phone and neighbourhood.\n- Messages and requests you send, so both sides can see them.\n- For businesses: listing details and the church reference you name."),
                new("Church references", "church-references",
                    "A reference’s answer is seen only by the Jubilee verification team. It is never shown to the business owner or the public, and we delete it 90 days after a decision."),
                new("Your choices", "your-choices",
                    "Change what we e-mail you in [notification settings](/account/notifications), and download or delete your account from [your account](/account)."),
                new("Privacy contact and your rights", "privacy-contact",
                    "To see or correct the personal information we hold about you, write to our privacy contact at [privacy@jubilee.example](mailto:privacy@jubilee.example). We answer within 30 days, as Canada’s privacy law (PIPEDA) requires."),
            ]),
        "help" => Make(slug, "Help",
            "Answers to the questions members ask most.",
            [
                new("How does a business get verified?", "how-does-a-business-get-verified",
                    "The owner names a pastor or elder. We e-mail that person a private form. When they confirm, our team reviews the listing and publishes it, usually within two business days."),
                new("Does Jubilee take payment?", "does-jubilee-take-payment",
                    "No. You send a booking, quote or order request, the business confirms it, and you pay the business directly in the way they offer."),
                new("Is it free?", "is-it-free", "Yes. Joining, messaging and listing a business are all free."),
                new("Who can see my messages?", "who-can-see-my-messages",
                    "Only you and the business you are writing to. Our team reads a conversation only when one of you reports it."),
                new("How do I report a listing?", "how-do-i-report-a-listing",
                    "Open the listing and choose Report at the bottom of the page. Reports are private and reviewed within one business day."),
            ]),
        _ => null,
    };

    private static ContentDto Make(string slug, string title, string lead, ContentSectionDto[] sections) =>
        new(slug, title, lead, 1, PublishedAt, sections);
}

/// <summary>Reads the published version of a page: the highest stored number, or the built-in first version.</summary>
public sealed class ContentReader(IAppDbContext db)
{
    public async Task<ContentDto?> Published(string slug, CancellationToken cancellationToken)
    {
        if (!ContentVersion.Slugs.Contains(slug))
        {
            return null;
        }

        var stored = await db.ContentVersions.AsNoTracking()
            .Where(v => v.Slug == slug).OrderByDescending(v => v.Number).FirstOrDefaultAsync(cancellationToken);
        return stored is null ? ContentDefaults.For(slug) : ToDto(stored);
    }

    /// <summary>The number of the published terms, recorded with each agreement (L2-108 AC2).</summary>
    public async Task<int> TermsVersion(CancellationToken cancellationToken) =>
        (await Published("terms", cancellationToken))!.Version;

    public static ContentDto ToDto(ContentVersion v) => new(
        v.Slug, v.Title, v.Lead, v.Number, v.PublishedAt,
        JsonSerializer.Deserialize<List<ContentSectionDto>>(v.SectionsJson) ?? []);
}

public sealed record GetPublishedContentQuery(string Slug) : IRequest<ContentDto>;

public sealed class GetPublishedContentQueryHandler(ContentReader reader) : IRequestHandler<GetPublishedContentQuery, ContentDto>
{
    public async Task<ContentDto> Handle(GetPublishedContentQuery request, CancellationToken cancellationToken) =>
        await reader.Published(request.Slug, cancellationToken)
            ?? throw new NotFoundException("CONTENT_NOT_FOUND", "There is no such page.");
}

public sealed record ContentVersionDto(int Number, string Title, DateTimeOffset PublishedAt, string PublishedBy, bool Published);

/// <summary>Every kept version of a page, newest first (L2-107 AC2).</summary>
public sealed record ListContentVersionsQuery(string Slug) : IRequest<IReadOnlyList<ContentVersionDto>>;

public sealed class ListContentVersionsQueryHandler(IAppDbContext db) : IRequestHandler<ListContentVersionsQuery, IReadOnlyList<ContentVersionDto>>
{
    public async Task<IReadOnlyList<ContentVersionDto>> Handle(ListContentVersionsQuery request, CancellationToken cancellationToken)
    {
        if (!ContentVersion.Slugs.Contains(request.Slug))
        {
            throw new NotFoundException("CONTENT_NOT_FOUND", "There is no such page.");
        }

        var stored = await db.ContentVersions.AsNoTracking()
            .Where(v => v.Slug == request.Slug).OrderByDescending(v => v.Number).ToListAsync(cancellationToken);
        var list = stored.Select((v, i) => new ContentVersionDto(v.Number, v.Title, v.PublishedAt, v.PublishedBy, i == 0)).ToList();
        list.Add(new ContentVersionDto(1, ContentDefaults.For(request.Slug)!.Title, ContentDefaults.PublishedAt, "built-in", list.Count == 0));
        return list.GroupBy(v => v.Number).Select(g => g.First()).OrderByDescending(v => v.Number).ToList();
    }
}

/// <summary>An admin publishes new text as the next version; no earlier version changes (L2-107 AC2, L2-133).</summary>
public sealed record PublishContentVersionCommand(
    string Admin, string Slug, string? Title, string? Lead, IReadOnlyList<ContentSectionDto>? Sections) : IRequest<ContentDto>;

public sealed partial class PublishContentVersionCommandHandler(IAppDbContext db, ContentReader reader, TimeProvider clock)
    : IRequestHandler<PublishContentVersionCommand, ContentDto>
{
    public const int MaxBodyLength = 20_000;

    public async Task<ContentDto> Handle(PublishContentVersionCommand request, CancellationToken cancellationToken)
    {
        var current = await reader.Published(request.Slug, cancellationToken)
            ?? throw new NotFoundException("CONTENT_NOT_FOUND", "There is no such page.");

        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            errors["title"] = "TITLE_REQUIRED";
        }

        var sections = new List<ContentSectionDto>();
        if (request.Sections is null || request.Sections.Count == 0)
        {
            errors["sections"] = "SECTIONS_REQUIRED";
        }
        else
        {
            foreach (var s in request.Sections)
            {
                if (string.IsNullOrWhiteSpace(s.Heading) || string.IsNullOrWhiteSpace(s.Body))
                {
                    errors["sections"] = "SECTION_INCOMPLETE";
                    break;
                }

                if (s.Body.Length > MaxBodyLength)
                {
                    errors["sections"] = "SECTION_TOO_LONG";
                    break;
                }

                var anchor = string.IsNullOrWhiteSpace(s.Anchor) ? Slugify(s.Heading) : Slugify(s.Anchor);
                sections.Add(new ContentSectionDto(s.Heading.Trim(), anchor, s.Body.Trim()));
            }
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var version = ContentVersion.Publish(
            request.Slug, current.Version + 1, request.Title!.Trim(), request.Lead?.Trim() ?? string.Empty,
            JsonSerializer.Serialize(sections), clock.GetUtcNow(), request.Admin);
        db.ContentVersions.Add(version);
        await db.SaveChangesAsync(cancellationToken);
        return ContentReader.ToDto(version);
    }

    private static string Slugify(string text) => NonWord().Replace(text.Trim().ToLowerInvariant(), "-").Trim('-');

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonWord();
}
