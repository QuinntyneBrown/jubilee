using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Onboarding;

/// <summary>
/// One product or service of a draft, with what its editor asks (L2-073): a product's stock and
/// description; a service's action and, when members can book it, its length and how it meets.
/// </summary>
public sealed record DraftItemDto(
    string Name,
    string? Detail,
    string PriceKind,
    int? PriceCents,
    string? Description,
    int? Stock,
    string Action,
    int? DurationMinutes,
    bool OffersVideo,
    bool OffersInPerson,
    string? InPersonPlace)
{
    public static DraftItemDto From(DraftItem item) => new(
        item.Name,
        item.Detail,
        WireValues.Of(item.PriceKind),
        item.PriceCents,
        item.Description,
        item.Stock,
        item.Action == ServiceAction.Book ? "book" : "ask",
        item.DurationMinutes,
        item.OffersVideo,
        item.OffersInPerson,
        item.InPersonPlace);
}

public sealed record ListingDraftDto(
    Guid Id,
    string Kind,
    string Name,
    string Tagline,
    string? CategorySlug,
    string? Highlight,
    string? Place,
    bool Agreed,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<DraftItemDto> Items,
    SpaceDraftDto? Space = null)
{
    public static ListingDraftDto From(ListingDraft draft) => new(
        draft.Id,
        Wire(draft.Kind),
        draft.Name,
        draft.Tagline,
        draft.CategorySlug,
        draft.Highlight,
        draft.Place,
        draft.Agreed,
        draft.UpdatedAt,
        [.. draft.Items.OrderBy(i => i.Position).Select(DraftItemDto.From)],
        draft.Space is null ? null : SpaceDraftDto.From(draft.Space));

    public static string Wire(ListingKind kind) => kind switch
    {
        ListingKind.Shop => "products",
        ListingKind.Space => "space",
        _ => "services",
    };
}

/// <summary>A space draft's rental details as its owner typed them, address included (L2-199 AC10).</summary>
public sealed record SpaceDraftDto(
    string Term,
    int? Rent,
    string Available,
    int MinimumStay,
    string Neighbourhood,
    string Address,
    string Place,
    IReadOnlyList<string> Facts,
    IReadOnlyList<string> Included,
    string? Household,
    IReadOnlyList<string> Rules)
{
    public static SpaceDraftDto From(SpaceDetails space) => new(
        WireValues.Of(space.Term),
        space.Rent > 0 ? space.Rent : null,
        space.Available,
        space.MinimumStay,
        space.Neighbourhood,
        space.Address,
        space.Place,
        space.Facts,
        space.Included,
        space.Household,
        space.Rules);
}

/// <summary>The space fields of the form (L2-199).</summary>
public sealed record SpaceInput(
    string? Term,
    int? Rent,
    string? Available,
    int? MinimumStay,
    string? Neighbourhood,
    string? Address,
    string? Place,
    IReadOnlyList<string>? Facts,
    IReadOnlyList<string>? Included,
    string? Household,
    IReadOnlyList<string>? Rules);

/// <summary>What the form holds; saving a draft accepts any of it, submitting validates it.</summary>
public sealed record DraftInput(
    string? Kind,
    string? Name,
    string? Tagline,
    string? CategorySlug,
    string? Highlight,
    string? Place,
    bool Agreed,
    IReadOnlyList<DraftItemInput>? Items,
    SpaceInput? Space = null);

public sealed record DraftItemInput(
    string? Name,
    string? Detail,
    string? PriceKind,
    int? PriceCents,
    string? Description = null,
    int? Stock = null,
    string? Action = null,
    int? DurationMinutes = null,
    bool? OffersVideo = null,
    bool? OffersInPerson = null,
    string? InPersonPlace = null);

public sealed record PublishedListingDto(
    Guid ListingId, string Slug, string Name, string Kind, string Stage, DateTimeOffset SubmittedAt);

public static class Drafts
{
    public const int MaxListings = 5;

    public static ListingKind KindOf(string? kind) => kind?.ToLowerInvariant() switch
    {
        "services" => ListingKind.Services,
        "space" => ListingKind.Space,
        _ => ListingKind.Shop,
    };

    /// <summary>The term chosen, or Short stay, the first choice, when none was (L2-198 AC2).</summary>
    public static SpaceTerm TermOf(SpaceInput? space) => WireValues.ParseTerm(space?.Term) ?? SpaceTerm.ShortStay;

    public static SpaceDetails? SpaceOf(DraftInput input)
    {
        if (KindOf(input.Kind) != ListingKind.Space)
        {
            return null;
        }

        return SpaceFrom(input.Space);
    }

    public static SpaceDetails SpaceFrom(SpaceInput? space) => SpaceDetails.Create(
        TermOf(space), space?.Rent ?? 0, space?.Available, space?.MinimumStay ?? 0, space?.Neighbourhood, space?.Address,
        space?.Place, space?.Facts, space?.Included, space?.Household, space?.Rules);

    /// <summary>The space fields every term needs, and the household a Room or Roommate needs (L2-199 AC6 to AC8).</summary>
    public static void ValidateSpace(SpaceInput? space, Dictionary<string, string> errors)
    {
        if (space?.Rent is not { } rent || rent <= 0)
        {
            errors["space.rent"] = "REQUIRED";
        }
        else if (rent > SpaceTerms.MaxRent)
        {
            errors["space.rent"] = "TOO_HIGH";
        }

        if (string.IsNullOrWhiteSpace(space?.Available))
        {
            errors["space.available"] = "REQUIRED";
        }

        if (string.IsNullOrWhiteSpace(space?.Neighbourhood))
        {
            errors["space.neighbourhood"] = "REQUIRED";
        }

        if (string.IsNullOrWhiteSpace(space?.Address))
        {
            errors["space.address"] = "REQUIRED";
        }

        if (SpaceTerms.AsksForHousehold(Drafts.TermOf(space)) && string.IsNullOrWhiteSpace(space?.Household))
        {
            errors["space.household"] = "REQUIRED";
        }
    }

    public static ServicePriceKind PriceKindOf(string? kind) => kind?.ToLowerInvariant() switch
    {
        "free" => ServicePriceKind.Free,
        "ask" => ServicePriceKind.Ask,
        _ => ServicePriceKind.Amount,
    };

    public static IEnumerable<DraftItem> ItemsOf(DraftInput input) =>
        (input.Items ?? []).Where(i => !string.IsNullOrWhiteSpace(i.Name)).Select(i => new DraftItem
        {
            Name = i.Name!,
            Detail = i.Detail,
            PriceKind = PriceKindOf(i.PriceKind),
            PriceCents = i.PriceCents,
            Description = i.Description,
            Stock = i.Stock,
            Action = string.Equals(i.Action, "book", StringComparison.OrdinalIgnoreCase) ? ServiceAction.Book : ServiceAction.Ask,
            DurationMinutes = i.DurationMinutes,
            OffersVideo = i.OffersVideo ?? true,
            OffersInPerson = i.OffersInPerson ?? false,
            InPersonPlace = i.InPersonPlace,
        });

    public static void Apply(ListingDraft draft, DraftInput input, DateTimeOffset now) =>
        draft.Save(
            KindOf(input.Kind), input.Name, input.Tagline, input.CategorySlug, input.Highlight, input.Place,
            input.Agreed, ItemsOf(input), now, SpaceOf(input));

    public static async Task<ListingDraft> Owned(IAppDbContext db, string subject, Guid id, CancellationToken cancellationToken) =>
        await db.ListingDrafts.Include(d => d.Items).SingleOrDefaultAsync(d => d.Id == id && d.OwnerSubject == subject, cancellationToken)
        ?? throw new NotFoundException("draft_not_found", "There is no such draft.");
}

public sealed record GetCurrentDraftQuery(string Subject) : IRequest<ListingDraftDto?>;

public sealed class GetCurrentDraftQueryHandler(IAppDbContext db) : IRequestHandler<GetCurrentDraftQuery, ListingDraftDto?>
{
    public async Task<ListingDraftDto?> Handle(GetCurrentDraftQuery request, CancellationToken cancellationToken)
    {
        var draft = await db.ListingDrafts.AsNoTracking().Include(d => d.Items)
            .Where(d => d.OwnerSubject == request.Subject)
            .OrderByDescending(d => d.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        return draft is null ? null : ListingDraftDto.From(draft);
    }
}

public sealed record GetDraftQuery(string Subject, Guid Id) : IRequest<ListingDraftDto>;

public sealed class GetDraftQueryHandler(IAppDbContext db) : IRequestHandler<GetDraftQuery, ListingDraftDto>
{
    public async Task<ListingDraftDto> Handle(GetDraftQuery request, CancellationToken cancellationToken) =>
        ListingDraftDto.From(await Drafts.Owned(db, request.Subject, request.Id, cancellationToken));
}

/// <summary>Saves a draft without validating it (L2-077 AC1); with no id it starts one, up to five listings in all (L2-079).</summary>
public sealed record SaveListingDraftCommand(string Subject, Guid? Id, DraftInput Input) : IRequest<ListingDraftDto>;

public sealed class SaveListingDraftCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<SaveListingDraftCommand, ListingDraftDto>
{
    public async Task<ListingDraftDto> Handle(SaveListingDraftCommand command, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        ListingDraft draft;
        if (command.Id is { } id)
        {
            draft = await Drafts.Owned(db, command.Subject, id, cancellationToken);
        }
        else
        {
            var owned = await db.Listings.CountAsync(l => l.OwnerId == command.Subject && l.DeletedAt == null, cancellationToken)
                + await db.ListingDrafts.CountAsync(d => d.OwnerSubject == command.Subject, cancellationToken);
            if (owned >= Drafts.MaxListings)
            {
                throw new ConflictException("LISTING_LIMIT", "You can list up to 5 businesses. Write to help@jubilee.example for more.");
            }

            draft = ListingDraft.Start(command.Subject, now);
            db.ListingDrafts.Add(draft);
        }

        Drafts.Apply(draft, command.Input, now);
        await db.SaveChangesAsync(cancellationToken);
        return ListingDraftDto.From(draft);
    }
}

/// <summary>Publishes a draft (L2-078): it becomes a live listing at once; nobody verifies it first (ADR 0057).</summary>
public sealed record PublishListingCommand(string Subject, string Name, Guid DraftId, DraftInput Input, string? IdempotencyKey)
    : IRequest<PublishedListingDto>;

public sealed partial class PublishListingCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<PublishListingCommand, PublishedListingDto>
{
    public const int MaxTaglineLength = 90;

    [GeneratedRegex(@"(https?://|www\.)\S+", RegexOptions.IgnoreCase)]
    private static partial Regex Url();

    [GeneratedRegex(@"\b[a-z0-9-]+\.(com|ca|net|org|co|io|app|shop|store|info)\b", RegexOptions.IgnoreCase)]
    private static partial Regex Domain();

    [GeneratedRegex(@"\S+@\S+\.\S+")]
    private static partial Regex Email();

    [GeneratedRegex(@"\+?\d{3}[\s.\-)]*\d{3}[\s.\-]*\d{4}")]
    private static partial Regex Phone();

    [GeneratedRegex(@"\b(code|coupon|promo)\b\s*:?\s*[A-Z0-9]{4,}|\d+\s*%\s*off", RegexOptions.IgnoreCase)]
    private static partial Regex Discount();

    public async Task<PublishedListingDto> Handle(PublishListingCommand command, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(command.IdempotencyKey) ? Guid.NewGuid().ToString() : command.IdempotencyKey.Trim();
        var earlier = await db.ListingSubmissions.AsNoTracking()
            .SingleOrDefaultAsync(s => s.OwnerSubject == command.Subject && s.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            var existing = await db.Listings.AsNoTracking().SingleAsync(l => l.Id == earlier.ListingId, cancellationToken);
            return Result(existing, earlier);
        }

        var draft = await Drafts.Owned(db, command.Subject, command.DraftId, cancellationToken);
        var input = command.Input;
        var name = input.Name?.Trim() ?? string.Empty;
        var tagline = input.Tagline?.Trim() ?? string.Empty;
        var errors = new Dictionary<string, string>();
        if (name.Length == 0)
        {
            errors["name"] = "REQUIRED";
        }

        if (tagline.Length == 0)
        {
            errors["tagline"] = "REQUIRED";
        }
        else if (tagline.Length > MaxTaglineLength)
        {
            errors["tagline"] = $"TOO_LONG:{tagline.Length.ToString(CultureInfo.InvariantCulture)}";
        }

        if (Drafts.KindOf(input.Kind) == ListingKind.Space)
        {
            // A space always sits in Rooms & rentals, so it has no category to choose (L2-198 AC3).
            Drafts.ValidateSpace(input.Space, errors);
        }
        else if (input.CategorySlug is null || Category.Find(input.CategorySlug) is null)
        {
            errors["categorySlug"] = "REQUIRED";
        }

        if (!input.Agreed)
        {
            errors["agreed"] = "REQUIRED";
        }

        if (errors.Count > 0)
        {
            // What was typed is kept, so the member returns to the same form (L2-077).
            Drafts.Apply(draft, input, clock.GetUtcNow());
            await db.SaveChangesAsync(cancellationToken);
            throw new ValidationFailedException(errors);
        }

        var now = clock.GetUtcNow();
        var flags = new List<string>();
        if (HasContactOrCode(name, tagline))
        {
            flags.Add("CONTACT_IN_TEXT");
        }

        var space = Drafts.SpaceOf(input);
        var listing = Listing.Create(
            await Listings.ListingSlugs.UniqueAsync(db, name, null, cancellationToken), name, tagline, space is null ? input.CategorySlug! : Category.RoomsSlug, now);
        listing.SetKind(Drafts.KindOf(input.Kind));
        listing.AssignOwner(command.Subject);

        // The public place of a space is its neighbourhood; the exact address stays in its details (L2-208).
        listing.Describe(new ListingProfile(command.Name, [], null, space?.Neighbourhood ?? input.Place?.Trim(), null, null, null, null));
        listing.SetHighlight(space is null ? ListingDraft.Cut(input.Highlight, ListingDraft.MaxHighlightLength) : null);
        listing.Publish(now);
        db.Listings.Add(listing);
        if (space is null)
        {
            AddItems(listing, input, now);
        }
        else
        {
            listing.DescribeSpace(space);
        }

        var submission = ListingSubmission.Record(listing.Id, command.Subject, key, flags, now);
        submission.MarkReady(now);
        db.ListingSubmissions.Add(submission);
        db.ListingDrafts.Remove(draft);
        // Members who asked to hear of new businesses in this category are told now (L2-222 AC1).
        await Notifications.NewBusinessNotifier.TellAsync(db, listing, now, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return Result(listing, submission);
    }

    private static PublishedListingDto Result(Listing listing, ListingSubmission submission) => new(
        listing.Id,
        listing.Slug,
        listing.Name,
        ListingDraftDto.Wire(listing.Kind),
        WireValues.Of(listing.Stage),
        submission.SubmittedAt);

    private static bool HasContactOrCode(string name, string tagline) =>
        Url().IsMatch(name) || Email().IsMatch(name) || Phone().IsMatch(name) || Discount().IsMatch(name)
        || Url().IsMatch(tagline) || Domain().IsMatch(tagline) || Email().IsMatch(tagline) || Phone().IsMatch(tagline) || Discount().IsMatch(tagline);

    private void AddItems(Listing listing, DraftInput input, DateTimeOffset now)
    {
        var items = Drafts.ItemsOf(input).Take(ListingDraft.MaxItems).ToList();
        if (listing.Kind == ListingKind.Shop)
        {
            var slugs = new HashSet<string>();
            for (var i = 0; i < items.Count; i++)
            {
                var slug = Slugs.Unique(Slugs.From(items[i].Name, "product"), slugs);
                var product = Product.Create(
                    listing.Id, slug, items[i].Name, items[i].PriceCents ?? 0, false, (TileTint)(i % 4), TileIcon.Bag, now.AddSeconds(-i));

                // The draft kept what was typed; the listing takes only what the product editor accepts (L2-073 AC5).
                var description = items[i].Description?.Trim();
                product.Revise(product.Name, product.PriceCents, description?.Length > Product.MaxDescriptionLength ? description[..Product.MaxDescriptionLength] : description);
                product.SetStock(items[i].Stock is >= 0 and <= Product.MaxStock ? items[i].Stock : null);
                db.Products.Add(product);
            }

            return;
        }

        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var price = item.PriceKind switch
            {
                ServicePriceKind.Free => ServicePrice.Free,
                ServicePriceKind.Amount when item.PriceCents is > 0 => ServicePrice.Amount(item.PriceCents.Value),
                _ => ServicePrice.Ask,
            };
            var service = Service.Create(listing.Id, i + 1, item.Name, item.Detail ?? string.Empty, price, ServiceAction.Ask);
            if (item.CanBeBooked)
            {
                // Booking details the service editor would refuse leave the service as "Ask for a quote" (L2-073 AC5).
                service.Revise(service.Name, service.Detail, price, ServiceAction.Book, item.DurationMinutes, item.OffersVideo, item.OffersInPerson, item.InPersonPlace);
            }

            db.Services.Add(service);
        }
    }
}

internal static class Slugs
{
    public static string From(string text, string fallback)
    {
        var builder = new StringBuilder();
        foreach (var character in text.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(char.IsAsciiLetterOrDigit(character) ? char.ToLowerInvariant(character) : '-');
        }

        var slug = Regex.Replace(builder.ToString(), "-{2,}", "-").Trim('-');
        if (slug.Length > 80)
        {
            slug = slug[..80].Trim('-');
        }

        return slug.Length == 0 ? fallback : slug;
    }

    public static string Unique(string slug, HashSet<string> used)
    {
        var candidate = slug;
        for (var n = 2; !used.Add(candidate); n++)
        {
            candidate = $"{slug}-{n.ToString(CultureInfo.InvariantCulture)}";
        }

        return candidate;
    }
}

/// <summary>Drafts untouched for 180 days: e-mail the owner, then delete 14 days later (L2-077 AC5, L2-182).</summary>
/// <summary>
/// The daily draft expiry (L2-077 AC5, L2-182 AC1): runs <see cref="ExpireListingDraftsCommand"/> once
/// a day however many instances of the worker run, and records its last success. The answer is the
/// number of drafts handled, or null when another instance already ran today.
/// </summary>
public sealed record RunListingDraftExpiryJobCommand : IRequest<int?>
{
    public const string Job = "listing-draft-expiry";

    public static readonly TimeSpan Every = TimeSpan.FromHours(24);
}

public sealed class RunListingDraftExpiryJobCommandHandler(Jobs.ScheduledJobs jobs, ISender sender)
    : IRequestHandler<RunListingDraftExpiryJobCommand, int?>
{
    public async Task<int?> Handle(RunListingDraftExpiryJobCommand command, CancellationToken cancellationToken)
    {
        int? handled = null;
        await jobs.RunOnceAsync(
            RunListingDraftExpiryJobCommand.Job,
            RunListingDraftExpiryJobCommand.Every,
            async token => handled = await sender.Send(new ExpireListingDraftsCommand(), token),
            cancellationToken);
        return handled;
    }
}

public sealed record ExpireListingDraftsCommand : IRequest<int>;

public sealed class ExpireListingDraftsCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<ExpireListingDraftsCommand, int>
{
    public async Task<int> Handle(ExpireListingDraftsCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var changed = 0;
        var gone = await db.ListingDrafts
            .Where(d => d.NoticeSentAt != null && d.NoticeSentAt <= now - ListingDraft.GraceAfterNotice)
            .ToListAsync(cancellationToken);
        db.ListingDrafts.RemoveRange(gone);
        changed += gone.Count;

        var idle = await db.ListingDrafts
            .Where(d => d.NoticeSentAt == null && d.UpdatedAt <= now - ListingDraft.IdleBeforeNotice)
            .ToListAsync(cancellationToken);
        foreach (var draft in idle)
        {
            draft.NoticeSent(now);
            if (Guid.TryParse(draft.OwnerSubject, out var ownerId)
                && await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == ownerId, cancellationToken) is { } owner)
            {
                var title = string.IsNullOrWhiteSpace(draft.Name) ? "your listing" : draft.Name;
                db.OutboxMessages.Add(OutboxMessage.Email(
                    owner.Id,
                    owner.Email,
                    $"Your draft of {title} will be deleted in 14 days",
                    $"Hi {owner.FirstName},\n\nYou started listing {title} on Jubilee and have not touched it in six months. We will delete the draft in 14 days.\n\nContinue it any time before then: {settings.PublicBaseUrl.TrimEnd('/')}/list\n\nNothing was ever public. Jubilee · Toronto's Christian marketplace\n",
                    now));
            }

            changed++;
        }

        await db.SaveChangesAsync(cancellationToken);
        return changed;
    }
}
