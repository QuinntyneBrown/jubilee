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

public sealed record DraftItemDto(string Name, string? Detail, string PriceKind, int? PriceCents);

public sealed record ListingDraftDto(
    Guid Id,
    string Kind,
    string Name,
    string Tagline,
    string? CategorySlug,
    string? Highlight,
    string? Place,
    string Church,
    string PastorEmail,
    bool Agreed,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<DraftItemDto> Items)
{
    public static ListingDraftDto From(ListingDraft draft) => new(
        draft.Id,
        Wire(draft.Kind),
        draft.Name,
        draft.Tagline,
        draft.CategorySlug,
        draft.Highlight,
        draft.Place,
        draft.Church,
        draft.PastorEmail,
        draft.Agreed,
        draft.UpdatedAt,
        [.. draft.Items.OrderBy(i => i.Position).Select(i => new DraftItemDto(i.Name, i.Detail, WireValues.Of(i.PriceKind), i.PriceCents))]);

    public static string Wire(ListingKind kind) => kind == ListingKind.Shop ? "products" : "services";
}

/// <summary>What the form holds; saving a draft accepts any of it, submitting validates it.</summary>
public sealed record DraftInput(
    string? Kind,
    string? Name,
    string? Tagline,
    string? CategorySlug,
    string? Highlight,
    string? Place,
    string? Church,
    string? PastorEmail,
    bool Agreed,
    IReadOnlyList<DraftItemInput>? Items);

public sealed record DraftItemInput(string? Name, string? Detail, string? PriceKind, int? PriceCents);

public sealed record SubmittedListingDto(
    Guid ListingId, string Slug, string Name, string Kind, string Stage, string Church, string PastorEmail, DateTimeOffset SubmittedAt);

internal static class Drafts
{
    public const int MaxListings = 5;

    public static ListingKind KindOf(string? kind) =>
        string.Equals(kind, "services", StringComparison.OrdinalIgnoreCase) ? ListingKind.Services : ListingKind.Shop;

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
        });

    public static void Apply(ListingDraft draft, DraftInput input, DateTimeOffset now) =>
        draft.Save(
            KindOf(input.Kind), input.Name, input.Tagline, input.CategorySlug, input.Highlight, input.Place,
            input.Church, input.PastorEmail, input.Agreed, ItemsOf(input), now);

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

/// <summary>Submits a draft for verification (L2-078): it becomes a listing waiting on its church reference.</summary>
public sealed record SubmitListingCommand(string Subject, string Name, Guid DraftId, DraftInput Input, string? IdempotencyKey)
    : IRequest<SubmittedListingDto>;

public sealed partial class SubmitListingCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<SubmitListingCommand, SubmittedListingDto>
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

    public async Task<SubmittedListingDto> Handle(SubmitListingCommand command, CancellationToken cancellationToken)
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
        var pastor = input.PastorEmail?.Trim();
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

        if (input.CategorySlug is null || Category.Find(input.CategorySlug) is null)
        {
            errors["categorySlug"] = "REQUIRED";
        }

        if (string.IsNullOrWhiteSpace(input.Church))
        {
            errors["church"] = "REQUIRED";
        }

        var address = EmailAddress.TryParse(pastor);
        if (address is null)
        {
            errors["pastorEmail"] = "INVALID";
        }
        else if (await IsOwnEmail(command.Subject, address, cancellationToken))
        {
            errors["pastorEmail"] = "OWN_EMAIL";
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
        var pastorKey = address!.Key;
        var flags = new List<string>();
        if (HasContactOrCode(name, tagline))
        {
            flags.Add("CONTACT_IN_TEXT");
        }

        var others = await db.ListingSubmissions.AsNoTracking()
            .Where(s => s.PastorEmailKey == pastorKey && s.OwnerSubject != command.Subject && s.SubmittedAt >= now.AddDays(-30))
            .Select(s => s.OwnerSubject)
            .Distinct()
            .CountAsync(cancellationToken);
        if (others >= 5)
        {
            flags.Add("REFERENCE_REUSED");
        }

        var listing = Listing.Create(await UniqueSlug(name, cancellationToken), name, tagline, input.CategorySlug!, now);
        listing.SetKind(Drafts.KindOf(input.Kind));
        listing.AssignOwner(command.Subject);
        listing.Describe(new ListingProfile(command.Name, [], null, input.Place?.Trim(), null, null, null, null));
        listing.SetHighlight(input.Highlight);
        listing.MoveTo(ListingStage.PendingReference);
        db.Listings.Add(listing);
        AddItems(listing, input, now);

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
        var submission = ListingSubmission.Record(
            listing.Id, command.Subject, input.Church!.Trim(), address.Value, token, key, flags, now);
        db.ListingSubmissions.Add(submission);
        db.OutboxMessages.Add(ReferenceRequest(listing, command.Name, submission, now));
        db.ListingDrafts.Remove(draft);
        await db.SaveChangesAsync(cancellationToken);
        return Result(listing, submission);
    }

    private static SubmittedListingDto Result(Listing listing, ListingSubmission submission) => new(
        listing.Id,
        listing.Slug,
        listing.Name,
        ListingDraftDto.Wire(listing.Kind),
        "pending-reference",
        submission.Church,
        submission.PastorEmail,
        submission.SubmittedAt);

    private async Task<bool> IsOwnEmail(string subject, EmailAddress pastor, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(subject, out var id))
        {
            return false;
        }

        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == id, cancellationToken);
        return member is not null && member.EmailKey == pastor.Key;
    }

    private static bool HasContactOrCode(string name, string tagline) =>
        Url().IsMatch(name) || Email().IsMatch(name) || Phone().IsMatch(name) || Discount().IsMatch(name)
        || Url().IsMatch(tagline) || Domain().IsMatch(tagline) || Email().IsMatch(tagline) || Phone().IsMatch(tagline) || Discount().IsMatch(tagline);

    private async Task<string> UniqueSlug(string name, CancellationToken cancellationToken)
    {
        var baseSlug = Slugs.From(name, "business");
        var taken = await db.Listings.AsNoTracking()
            .Where(l => l.Slug == baseSlug || l.Slug.StartsWith(baseSlug + "-"))
            .Select(l => l.Slug)
            .ToListAsync(cancellationToken);
        if (!taken.Contains(baseSlug))
        {
            return baseSlug;
        }

        for (var n = 2; ; n++)
        {
            var candidate = $"{baseSlug}-{n.ToString(CultureInfo.InvariantCulture)}";
            if (!taken.Contains(candidate))
            {
                return candidate;
            }
        }
    }

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
            db.Services.Add(Service.Create(listing.Id, i + 1, item.Name, item.Detail ?? string.Empty, price, ServiceAction.Ask));
        }
    }

    /// <summary>Only the reference's name for the business goes out: never the tagline, the products or the owner's other details (L2-074 AC1).</summary>
    private OutboxMessage ReferenceRequest(Listing listing, string ownerName, ListingSubmission submission, DateTimeOffset now) =>
        OutboxMessage.Email(
            null,
            submission.PastorEmail,
            $"Can you confirm {listing.Name}? A reference request from Jubilee",
            $"Hello,\n\n{ownerName} has named you as a church reference for {listing.Name}, a business they would like to list on Jubilee, Toronto's Christian marketplace.\n\nWe only ask whether you know them and can confirm the commitments in our statement of faith. It takes a minute and we contact you privately; you do not need an account.\n\nAnswer here: {settings.PublicBaseUrl.TrimEnd('/')}/reference/{submission.ReferenceToken}\n\nIf you do not know {ownerName}, you can ignore this e-mail.\n\nJubilee · Toronto's Christian marketplace\n",
            now);
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
