using System.Net;
using System.Net.Http.Json;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Editing, removing and replying: L2-232 AC5, AC6, AC7; L2-233 AC5, AC6; L2-234 AC2, AC4; L2-237 AC5, AC7, AC9.
public sealed partial class ReviewTests
{
    private async Task<Review> JoannasReview(int rating = 5)
    {
        var review = ReviewBy(Joanna, "Joanna Adeyemi", rating, _discovery, 1);
        await _factory.Arrange(review);
        await _factory.WithDb(async db =>
        {
            db.Listings.Single(l => l.Id == _listing.Id).CountStars(StarCounts.Of([rating]));
            await db.SaveChangesAsync();
        });
        return review;
    }

    private Task<StarCounts> ListingStars() => Read(db => db.Listings.Where(l => l.Id == _listing.Id).Select(l => new StarCounts(l.Stars5, l.Stars4, l.Stars3, l.Stars2, l.Stars1)).SingleAsync());

    // L2-237 AC5, L2-232 AC7, L2-234 AC4, L2-237 AC9
    [Fact]
    public async Task L2_234_AC5_the_author_changes_their_review_and_the_reply_stays()
    {
        var review = await JoannasReview();
        await _factory.WithDb(async db =>
        {
            db.Reviews.Single(r => r.Id == review.Id).ReplyWith("Trevor Chew", "Thank you, Joanna.", ListingMother.Now);
            await db.SaveChangesAsync();
        });

        var response = await AsJoanna().PutAsJsonAsync($"/api/reviews/{review.Id}", new { rating = 3, itemId = _estate.Id, text = "  " + GoodText + "  " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await Json(response);
        Assert.Equal(3, json.GetProperty("rating").GetInt32());
        Assert.Equal("Estate & legacy plan", json.GetProperty("itemName").GetString());
        Assert.NotEqual(System.Text.Json.JsonValueKind.Null, json.GetProperty("editedAt").ValueKind);
        Assert.Equal("Thank you, Joanna.", json.GetProperty("reply").GetProperty("text").GetString());
        Assert.Equal(GoodText, (await Read(db => db.Reviews.SingleAsync())).Text);
        Assert.Equal(new StarCounts(0, 0, 1, 0, 0), await ListingStars());
        Assert.Equal(0, await Read(db => db.Notifications.CountAsync()));
    }

    // L2-232 AC2, L2-237 AC4
    [Fact]
    public async Task L2_229_AC2_a_change_is_held_to_the_same_rules()
    {
        var review = await JoannasReview();

        var response = await AsJoanna().PutAsJsonAsync($"/api/reviews/{review.Id}", new { rating = 0, itemId = _discovery.Id, text = "Too short." });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("RATING_REQUIRED", errors.GetProperty("rating").GetString());
        Assert.Equal("TOO_SHORT", errors.GetProperty("text").GetString());
        Assert.Equal(5, (await Read(db => db.Reviews.SingleAsync())).Rating);
    }

    // L2-232 AC6, L2-237 AC7
    [Fact]
    public async Task L2_229_AC6_nobody_but_the_author_changes_or_removes_a_review()
    {
        var review = await JoannasReview();
        var body = new { rating = 1, itemId = _discovery.Id, text = GoodText };

        var answers = new[]
        {
            (await AsDavid().PutAsJsonAsync($"/api/reviews/{review.Id}", body)).StatusCode,
            (await AsTrevor().PutAsJsonAsync($"/api/reviews/{review.Id}", body)).StatusCode,
            (await AsDavid().DeleteAsync($"/api/reviews/{review.Id}")).StatusCode,
            (await AsTrevor().DeleteAsync($"/api/reviews/{review.Id}")).StatusCode,
            (await AsJoanna().DeleteAsync($"/api/reviews/{Guid.NewGuid()}")).StatusCode,
        };
        var visitor = await _factory.CreateClient().DeleteAsync($"/api/reviews/{review.Id}");

        Assert.All(answers, a => Assert.Equal(HttpStatusCode.NotFound, a));
        Assert.Equal(HttpStatusCode.Unauthorized, visitor.StatusCode);
        Assert.Equal(5, (await Read(db => db.Reviews.SingleAsync())).Rating);
    }

    // L2-232 AC5, L2-237 AC9
    [Fact]
    public async Task L2_229_AC5_the_author_removes_their_review_with_its_reports()
    {
        var review = await JoannasReview();
        await _factory.Arrange(ReviewReport.Open(review, David, "David Chen", ReviewReportReason.Other, null, "r1", ListingMother.Now));

        var response = await AsJoanna().DeleteAsync($"/api/reviews/{review.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(0, await Read(db => db.Reviews.CountAsync()));
        Assert.Equal(0, await Read(db => db.ReviewReports.CountAsync()));
        Assert.Equal(StarCounts.None, await ListingStars());
    }

    // L2-233 AC5, L2-234 AC2
    [Fact]
    public async Task L2_230_AC5_the_owner_replies_once_and_the_author_is_told_of_the_first()
    {
        var review = await JoannasReview();
        var long_ = "Thank you for trusting us with your family's plan, Joanna. " + new string('x', 100);

        var first = await AsTrevor().PutAsJsonAsync($"/api/reviews/{review.Id}/reply", new { text = long_ });
        var second = await AsTrevor().PutAsJsonAsync($"/api/reviews/{review.Id}/reply", new { text = "Thank you, Joanna." });

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var reply = (await Json(second)).GetProperty("reply");
        Assert.Equal("Thank you, Joanna.", reply.GetProperty("text").GetString());
        Assert.NotEqual(System.Text.Json.JsonValueKind.Null, reply.GetProperty("editedAt").ValueKind);
        var notification = await Read(db => db.Notifications.SingleAsync());
        Assert.Equal(Joanna, notification.MemberSubject);
        Assert.Equal("review", notification.Kind);
        Assert.Equal("Legacy Financial replied to your review", notification.Title);
        Assert.Equal(long_[..120], notification.Detail);
        Assert.Equal("/b/legacy-financial", notification.Target);
    }

    // L2-233 AC6
    [Fact]
    public async Task L2_230_AC6_only_the_owner_replies_and_a_reply_is_held_to_1000_characters()
    {
        var review = await JoannasReview();

        var author = await AsJoanna().PutAsJsonAsync($"/api/reviews/{review.Id}/reply", new { text = "Thanks!" });
        var other = await AsDavid().PutAsJsonAsync($"/api/reviews/{review.Id}/reply", new { text = "Thanks!" });
        var empty = await AsTrevor().PutAsJsonAsync($"/api/reviews/{review.Id}/reply", new { text = "   " });
        var tooLong = await AsTrevor().PutAsJsonAsync($"/api/reviews/{review.Id}/reply", new { text = new string('a', 1001) });

        Assert.Equal(HttpStatusCode.Forbidden, author.StatusCode);
        Assert.Equal("NOT_OWNER", (await Json(author)).GetProperty("code").GetString());
        Assert.Equal("NOT_OWNER", (await Json(other)).GetProperty("code").GetString());
        Assert.Equal("TEXT_REQUIRED", (await Json(empty)).GetProperty("errors").GetProperty("text").GetString());
        Assert.Equal("TOO_LONG", (await Json(tooLong)).GetProperty("errors").GetProperty("text").GetString());
        Assert.Null((await Read(db => db.Reviews.SingleAsync())).ReplyText);
    }
}
