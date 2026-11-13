using Jubilee.Application.Reviews;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// A review taken down is kept 12 months for the record, then deleted (L2-239 AC4, ADR 0066).
public sealed partial class ReviewTests
{
    // L2-239 AC4
    [Fact]
    public async Task L2_235_AC4_a_review_taken_down_twelve_months_ago_is_deleted_with_its_reports()
    {
        var now = _factory.Clock.GetUtcNow();
        var old = ReviewBy("member|grace", "Grace Adebayo", 1, _discovery, 400);
        old.TakeDown("It named another family.", now.AddDays(-366));
        var recent = ReviewBy("member|marcus", "Marcus Thompson", 1, _discovery, 200);
        recent.TakeDown("It carried an advertisement.", now.AddDays(-100));
        var shown = ReviewBy(David, "David Chen", 4, _estate, 400);
        await _factory.Arrange(old, recent, shown);
        await _factory.Arrange(ReviewReport.Open(old, Joanna, "Joanna Adeyemi", ReviewReportReason.PrivateDetails, null, "r1", now.AddDays(-367)));

        using var scope = _factory.Services.CreateScope();
        var deleted = await scope.ServiceProvider.GetRequiredService<ISender>().Send(new PurgeTakenDownReviewsCommand());

        Assert.Equal(1, deleted);
        var kept = await Read(db => db.Reviews.Select(r => r.Id).ToListAsync());
        Assert.Equal(new[] { recent.Id, shown.Id }.Order(), kept.Order());
        Assert.Empty(await Read(db => db.ReviewReports.ToListAsync()));
    }
}
