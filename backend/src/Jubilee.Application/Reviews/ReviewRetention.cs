using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Reviews;

/// <summary>
/// The daily retention rule of reviews: a review taken down is kept for the record for
/// <see cref="Review.TakenDownKeptFor"/>, then deleted with its reports (L2-238 AC4, ADR 0058). Answers how many.
/// </summary>
public sealed record PurgeTakenDownReviewsCommand : IRequest<int>;

public sealed class PurgeTakenDownReviewsCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<PurgeTakenDownReviewsCommand, int>
{
    public async Task<int> Handle(PurgeTakenDownReviewsCommand request, CancellationToken cancellationToken)
    {
        var before = clock.GetUtcNow() - Review.TakenDownKeptFor;
        var due = (await db.Reviews.Where(r => r.TakenDownAt != null).ToListAsync(cancellationToken))
            .Where(r => r.TakenDownAt <= before).ToList();
        var ids = due.Select(r => r.Id).ToList();
        db.ReviewReports.RemoveRange(await db.ReviewReports.Where(r => ids.Contains(r.ReviewId)).ToListAsync(cancellationToken));
        db.Reviews.RemoveRange(due);
        await db.SaveChangesAsync(cancellationToken);
        return due.Count;
    }
}
