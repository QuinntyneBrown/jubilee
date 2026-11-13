using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Directory;
using Jubilee.Application.Errors;
using Jubilee.Application.Notifications;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Reviews;

/// <summary>Finding a shown review for whoever may act on it; anyone else is answered as if it did not exist (L2-133 AC2).</summary>
internal static class ReviewLookup
{
    public const string NotFoundCode = "review_not_found";

    public static async Task<Review> AuthorsAsync(IAppDbContext db, Guid id, string subject, CancellationToken cancellationToken) =>
        await db.Reviews.SingleOrDefaultAsync(r => r.Id == id && r.AuthorSubject == subject && r.TakenDownAt == null, cancellationToken)
        ?? throw NotFound();

    public static async Task<Review> ShownAsync(IAppDbContext db, Guid id, CancellationToken cancellationToken) =>
        await db.Reviews.SingleOrDefaultAsync(r => r.Id == id && r.TakenDownAt == null, cancellationToken) ?? throw NotFound();

    public static Task<Listing> ListingAsync(IAppDbContext db, Review review, CancellationToken cancellationToken) =>
        db.Listings.AsNoTracking().SingleAsync(l => l.Id == review.ListingId, cancellationToken);

    private static NotFoundException NotFound() => new(NotFoundCode, "There is no such review.");
}

/// <summary>The author changes their review; the reply stays and nobody is told (L2-233 AC3, AC7, L2-235 AC4).</summary>
public sealed record EditReviewCommand(Guid Id, string Subject, int? Rating, Guid? ItemId, string? Text) : IRequest<ReviewDto>;

public sealed class EditReviewCommandHandler(IAppDbContext db, TimeProvider clock, IDirectoryReadCache cache) : IRequestHandler<EditReviewCommand, ReviewDto>
{
    public async Task<ReviewDto> Handle(EditReviewCommand request, CancellationToken cancellationToken)
    {
        var review = await ReviewLookup.AuthorsAsync(db, request.Id, request.Subject, cancellationToken);
        var listing = await ReviewLookup.ListingAsync(db, review, cancellationToken);
        var items = await ReviewItems.OfAsync(db, listing, cancellationToken);
        var item = await items.ResolveAsync(db, request.ItemId, cancellationToken);
        var text = ReviewRules.Validate(request.Rating, request.Text, item is null);

        var productBefore = review.ProductId;
        review.Edit(item!, request.Rating!.Value, text, clock.GetUtcNow());
        await ReviewRules.RecountAsync(db, review, gone: false, productBefore, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        cache.Invalidate();
        return ReviewDto.From(review, request.Subject);
    }
}

/// <summary>The author removes their review, with its reply and its reports (L2-233 AC5).</summary>
public sealed record RemoveReviewCommand(Guid Id, string Subject) : IRequest;

public sealed class RemoveReviewCommandHandler(IAppDbContext db, IDirectoryReadCache cache) : IRequestHandler<RemoveReviewCommand>
{
    public async Task Handle(RemoveReviewCommand request, CancellationToken cancellationToken)
    {
        var review = await ReviewLookup.AuthorsAsync(db, request.Id, request.Subject, cancellationToken);
        db.ReviewReports.RemoveRange(await db.ReviewReports.Where(r => r.ReviewId == review.Id).ToListAsync(cancellationToken));
        db.Reviews.Remove(review);
        await ReviewRules.RecountAsync(db, review, gone: true, productBefore: null, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        cache.Invalidate();
    }
}

/// <summary>The owner's one public reply; the first tells the author, a change tells nobody (L2-234, L2-235 AC2).</summary>
public sealed record ReplyToReviewCommand(Guid Id, string Subject, string? Text) : IRequest<ReviewDto>;

public sealed class ReplyToReviewCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings) : IRequestHandler<ReplyToReviewCommand, ReviewDto>
{
    public const string NotOwnerCode = "NOT_OWNER";

    /// <summary>How much of the reply the author's notification carries (L2-235 AC2).</summary>
    public const int NoticeLength = 120;

    public async Task<ReviewDto> Handle(ReplyToReviewCommand request, CancellationToken cancellationToken)
    {
        var review = await ReviewLookup.ShownAsync(db, request.Id, cancellationToken);
        var listing = await ReviewLookup.ListingAsync(db, review, cancellationToken);
        if (listing.OwnerId != request.Subject)
        {
            throw new ForbiddenException(NotOwnerCode, "Only the owner of the business replies to its reviews.");
        }

        var text = request.Text?.Trim() ?? string.Empty;
        if (text.Length == 0 || text.Length > Review.MaxReplyLength)
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["text"] = text.Length == 0 ? "TEXT_REQUIRED" : "TOO_LONG" });
        }

        var now = clock.GetUtcNow();
        if (review.ReplyWith(ReviewRules.ReplyFrom(listing), text, now))
        {
            var title = $"{listing.Name} replied to your review";
            var detail = text.Length > NoticeLength ? text[..NoticeLength] : text;
            var target = $"/b/{listing.Slug}";
            NotificationRules.Tell(db, review.AuthorSubject, ReviewNotices.Kind, title, detail, target, now, review.Id);
            await ReviewNotices.EmailAsync(db, settings, review.AuthorSubject, title, detail, target, review.Id, now, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return ReviewDto.From(review, request.Subject);
    }
}
