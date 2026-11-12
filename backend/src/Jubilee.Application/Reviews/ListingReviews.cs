using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Reviews;

/// <summary>The average, the count and the counts of 5, 4, 3, 2 and 1 stars (L2-228 AC2).</summary>
public sealed record RatingSummaryDto(decimal Average, int Count, IReadOnlyList<int> Breakdown)
{
    public static RatingSummaryDto From(StarCounts stars) => new(stars.Average, stars.Count, stars.Stars);
}

/// <summary>A rating on a card (L2-230 AC4): null below <see cref="StarCounts.CardMinimum"/> reviews.</summary>
public sealed record CardRatingDto(decimal Average, int Count)
{
    public static CardRatingDto? From(StarCounts stars) => stars.Count >= StarCounts.CardMinimum ? new(stars.Average, stars.Count) : null;
}

public sealed record ReviewReplyDto(string From, string Text, DateTimeOffset At, DateTimeOffset? EditedAt);

/// <summary>One review as anyone reads it: never the author's account, only first name and last initial (L2-238 AC1).</summary>
public sealed record ReviewDto(
    Guid Id, string Author, string Initials, int Rating, Guid? ItemId, string ItemName, string Text, DateTimeOffset CreatedAt,
    DateTimeOffset? EditedAt, bool Mine, ReviewReplyDto? Reply)
{
    public static ReviewDto From(Review review, string? viewer) => new(
        review.Id,
        review.AuthorName,
        review.Initials,
        review.Rating,
        review.ServiceId ?? review.ProductId,
        review.ItemName,
        review.Text,
        review.CreatedAt,
        review.EditedAt,
        viewer is not null && review.AuthorSubject == viewer,
        review.RepliedAt is { } at ? new ReviewReplyDto(review.ReplyFrom ?? string.Empty, review.ReplyText ?? string.Empty, at, review.ReplyEditedAt) : null);
}

/// <summary>The reviews of a listing or of one of its products, and what the caller may do (L2-237 AC1).</summary>
public sealed record ListingReviewsDto(RatingSummaryDto Summary, string Viewer, string Writing, IReadOnlyList<ReviewDto> Items);

/// <summary>Anyone reads the reviews of a public listing; <paramref name="Product"/> narrows them to one product (L2-231 AC4).</summary>
public sealed record GetListingReviewsQuery(string Slug, string? Product, Viewer Viewer) : IRequest<ListingReviewsDto>;

public sealed class GetListingReviewsQueryHandler(IAppDbContext db) : IRequestHandler<GetListingReviewsQuery, ListingReviewsDto>
{
    public async Task<ListingReviewsDto> Handle(GetListingReviewsQuery request, CancellationToken cancellationToken)
    {
        var listing = await ReviewRules.ListingAsync(db, request.Slug, request.Viewer, cancellationToken);
        var shown = db.Reviews.AsNoTracking().Where(r => r.ListingId == listing.Id && r.TakenDownAt == null);
        if (!string.IsNullOrWhiteSpace(request.Product))
        {
            var slug = request.Product.Trim().ToLowerInvariant();
            var product = await db.Products.AsNoTracking().SingleOrDefaultAsync(p => p.ListingId == listing.Id && p.Slug == slug && !p.IsDeleted, cancellationToken)
                ?? throw new NotFoundException("product_not_found", "There is no such product.");
            shown = shown.Where(r => r.ProductId == product.Id);
        }

        var reviews = (await shown.ToListAsync(cancellationToken)).OrderByDescending(r => r.CreatedAt).ToList();
        var subject = request.Viewer.Subject;
        var viewer = subject is null ? "visitor" : listing.OwnerId == subject ? "owner" : "member";
        return new ListingReviewsDto(
            RatingSummaryDto.From(StarCounts.Of(reviews.Select(r => r.Rating))),
            viewer,
            await ReviewRules.WritingAsync(db, listing, request.Viewer, cancellationToken),
            [.. reviews.Select(r => ReviewDto.From(r, subject))]);
    }
}
