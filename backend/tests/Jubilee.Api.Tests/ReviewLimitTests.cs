using System.Net;
using System.Net.Http.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.AspNetCore.Hosting;

namespace Jubilee.Api.Tests;

public sealed class ThreeReviewChangesPerHourFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(IWebHostBuilder builder) =>
        builder.UseSetting("RateLimits:ReviewChangesPerHour", "3");
}

// L2-238 AC6: edits and replies share one budget per member an hour (30 by default; 3 here).
public sealed class ReviewLimitTests(ThreeReviewChangesPerHourFactory factory) : IClassFixture<ThreeReviewChangesPerHourFactory>
{
    [Fact]
    public async Task L2_234_AC6_edits_and_replies_beyond_the_limit_are_slowed_down()
    {
        await factory.Reset();
        var listing = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        listing.AssignOwner("member|trevor");
        var review = Review.Write(
            listing.Id, new ReviewItem(null, null, "Their service"), "member|joanna", "Joanna Adeyemi", 5,
            "Trevor took the time to understand what we needed. Clear and honest.", "k1", ListingMother.Now);
        await factory.Arrange(listing, review);
        var joanna = factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");
        var body = new { rating = 4, itemId = (Guid?)null, text = "Trevor took the time to understand what we needed. Clear and honest." };

        var answers = new List<HttpStatusCode>();
        for (var i = 0; i < 4; i++)
        {
            answers.Add((await joanna.PutAsJsonAsync($"/api/reviews/{review.Id}", body)).StatusCode);
        }

        var reply = await factory.CreateMemberClient("Trevor Chew", "member|trevor").PutAsJsonAsync($"/api/reviews/{review.Id}/reply", new { text = "Thank you." });
        var refused = await joanna.PutAsJsonAsync($"/api/reviews/{review.Id}", body);

        Assert.Equal([HttpStatusCode.OK, HttpStatusCode.OK, HttpStatusCode.OK, HttpStatusCode.TooManyRequests], answers);
        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        Assert.NotNull(refused.Headers.RetryAfter);
    }
}
