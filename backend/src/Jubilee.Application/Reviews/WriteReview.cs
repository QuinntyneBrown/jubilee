using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Directory;
using Jubilee.Application.Errors;
using Jubilee.Application.Notifications;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Reviews;

public sealed record ReviewFormListingDto(string Slug, string Name, string Kind, string CategoryName, string CategorySlug, string? OwnerName);

public sealed record ReviewItemOptionDto(Guid Id, string Name);

/// <summary>What the Write a review screen needs (L2-238 AC2): <c>ItemLegend</c> is null when nothing is chosen.</summary>
public sealed record ReviewFormDto(ReviewFormListingDto Listing, IReadOnlyList<ReviewItemOptionDto> Items, string? ItemLegend, string AuthorName);

/// <summary>What a review may be about (L2-227 AC3).</summary>
public sealed record ReviewItems(IReadOnlyList<ReviewItemOptionDto> Options, string? Legend, ReviewItem? Only)
{
    public const string ServiceLegend = "service";
    public const string ProductLegend = "product";
    public const string PlatformItem = "Their platform";

    public static async Task<ReviewItems> OfAsync(IAppDbContext db, Listing listing, CancellationToken cancellationToken)
    {
        if (listing.Kind == ListingKind.Platform)
        {
            // A platform has nothing to choose between: the review is about the platform itself (L2-259 AC1).
            return new([], null, new ReviewItem(null, null, PlatformItem));
        }

        if (listing.Kind == ListingKind.Space)
        {
            var stay = listing.Space?.Term is SpaceTerm.ShortStay or null ? "My stay" : "Renting here";
            return new([], null, new ReviewItem(null, null, stay));
        }

        var services = (await db.Services.AsNoTracking().Where(s => s.ListingId == listing.Id).ToListAsync(cancellationToken))
            .OrderBy(s => s.Position).Select(s => (s.Id, s.Name, Product: false));
        var products = (await db.Products.AsNoTracking().Where(p => p.ListingId == listing.Id && !p.IsDeleted).ToListAsync(cancellationToken))
            .OrderBy(p => p.Position).Select(p => (p.Id, p.Name, Product: true));
        var all = services.Concat(products).ToList();
        return all.Count switch
        {
            0 => new([], null, new ReviewItem(null, null, listing.Kind == ListingKind.Shop ? "A purchase" : "Their service")),
            1 => new([], null, Item(all[0])),
            _ => new(
                [.. all.Select(a => new ReviewItemOptionDto(a.Id, a.Name))],
                all.All(a => a.Product) ? ProductLegend : ServiceLegend,
                null),
        };

        static ReviewItem Item((Guid Id, string Name, bool Product) a) => a.Product ? new(null, a.Id, a.Name) : new(a.Id, null, a.Name);
    }

    /// <summary>The item the review is about, or null when the listing offers a choice and the id is none of it.</summary>
    public async Task<ReviewItem?> ResolveAsync(IAppDbContext db, Guid? itemId, CancellationToken cancellationToken)
    {
        if (Only is not null)
        {
            return Only;
        }

        if (itemId is not { } id || Options.All(o => o.Id != id))
        {
            return null;
        }

        var name = Options.Single(o => o.Id == id).Name;
        return await db.Services.AsNoTracking().AnyAsync(s => s.Id == id, cancellationToken)
            ? new ReviewItem(id, null, name)
            : new ReviewItem(null, id, name);
    }
}

/// <summary>The form of a new review, for a member who may write one (L2-238 AC2).</summary>
public sealed record GetReviewFormQuery(string Slug, string Subject, string MemberName) : IRequest<ReviewFormDto>;

public sealed class GetReviewFormQueryHandler(IAppDbContext db) : IRequestHandler<GetReviewFormQuery, ReviewFormDto>
{
    public async Task<ReviewFormDto> Handle(GetReviewFormQuery request, CancellationToken cancellationToken)
    {
        var listing = await ReviewRules.ListingAsync(db, request.Slug, new Viewer(request.Subject, false), cancellationToken);
        await ReviewRules.EnsureMayWriteAsync(db, listing, request.Subject, cancellationToken);
        var items = await ReviewItems.OfAsync(db, listing, cancellationToken);
        var category = Category.Find(listing.CategorySlug);
        return new ReviewFormDto(
            new ReviewFormListingDto(
                listing.Slug, listing.Name, listing.Kind.ToString().ToLowerInvariant(), category?.Name ?? string.Empty, listing.CategorySlug, listing.OwnerName),
            items.Options,
            items.Legend,
            Review.ShownName(request.MemberName));
    }
}

/// <summary>An eligible member posts a review (L2-228, L2-238 AC3, AC4, AC6).</summary>
public sealed record WriteReviewCommand(
    string Slug, string Subject, string MemberName, int? Rating, Guid? ItemId, string? Text, string? IdempotencyKey, bool UsedIt = false)
    : IRequest<ReviewDto>;

public sealed class WriteReviewCommandHandler(IAppDbContext db, TimeProvider clock, IDirectoryReadCache cache, AccountSettings settings)
    : IRequestHandler<WriteReviewCommand, ReviewDto>
{
    /// <summary>New reviews one member may post in a day (L2-238 AC6).</summary>
    public const int PerDay = 5;

    public async Task<ReviewDto> Handle(WriteReviewCommand request, CancellationToken cancellationToken)
    {
        var listing = await ReviewRules.ListingAsync(db, request.Slug, new Viewer(request.Subject, false), cancellationToken);
        var key = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? Guid.NewGuid().ToString() : request.IdempotencyKey.Trim();
        var earlier = await db.Reviews.AsNoTracking().SingleOrDefaultAsync(r => r.AuthorSubject == request.Subject && r.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            return ReviewDto.From(earlier, request.Subject);
        }

        await ReviewRules.EnsureMayWriteAsync(db, listing, request.Subject, cancellationToken);
        var items = await ReviewItems.OfAsync(db, listing, cancellationToken);
        var item = await items.ResolveAsync(db, request.ItemId, cancellationToken);
        var isPlatform = listing.Kind == ListingKind.Platform;
        var text = ReviewRules.Validate(request.Rating, request.Text, item is null, isPlatform && !request.UsedIt);

        var now = clock.GetUtcNow();
        var today = (await db.Reviews.AsNoTracking().Where(r => r.AuthorSubject == request.Subject).Select(r => r.CreatedAt).ToListAsync(cancellationToken))
            .Where(at => now - at < TimeSpan.FromDays(1)).Order().ToList();
        if (today.Count >= PerDay)
        {
            throw new RateLimitedException("rate_limited", today[today.Count - PerDay] + TimeSpan.FromDays(1) - now);
        }

        var review = Review.Write(listing.Id, item!, request.Subject, request.MemberName, request.Rating!.Value, text, key, now, isPlatform);
        db.Reviews.Add(review);
        await ReviewRules.RecountAsync(db, review, gone: false, productBefore: null, cancellationToken);
        await ReviewNotices.NewReviewAsync(db, settings, listing, review, now, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        cache.Invalidate();
        return ReviewDto.From(review, request.Subject);
    }
}

/// <summary>What members are told of reviews, in the app and by e-mail under "Request updates" (L2-235, ADR 0066).</summary>
public static class ReviewNotices
{
    public const string Kind = "review";

    public static async Task NewReviewAsync(
        IAppDbContext db, AccountSettings settings, Listing listing, Review review, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var title = $"New review of {listing.Name}";
        var detail = $"{review.AuthorName} gave it {review.Rating} of 5 stars for {review.ItemName}.";
        var target = $"/b/{listing.Slug}";
        NotificationRules.Tell(db, listing.OwnerId, Kind, title, detail, target, now, review.Id);
        await EmailAsync(db, settings, listing.OwnerId, title, detail, target, review.Id, now, cancellationToken);
    }

    public static async Task EmailAsync(
        IAppDbContext db, AccountSettings settings, string? subject, string title, string detail, string path, Guid reviewId, DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(subject, out var id))
        {
            return;
        }

        var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (member is not null && member.EmailStatus == EmailStatus.Confirmed)
        {
            EmailPolicy.Queue(
                db,
                member,
                EmailCategories.Requests,
                title,
                $"Hi {member.FirstName},\n\n{detail}\n\nSee it: {settings.PublicBaseUrl.TrimEnd('/')}{path}\n\nJubilee · Toronto's Christian marketplace\n",
                now,
                null,
                reviewId);
        }
    }
}
