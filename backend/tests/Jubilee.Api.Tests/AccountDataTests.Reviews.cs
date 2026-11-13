using System.Net;
using System.Text.Json;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// A member's reviews are theirs: they are in the download and go with the account (L2-239 AC2, AC3, ADR 0066).
public sealed partial class AccountDataTests
{
    private const string ReviewText = "Trevor took the time to understand what we needed. Clear, honest and no pressure.";

    /// <summary>Legacy Financial, owned by Trevor, with a review by Joanna and one by David; Joanna reports David's.</summary>
    private async Task<(Listing Listing, Review Joannas, Review Davids)> ReviewsOf(Member joanna)
    {
        var listing = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        listing.AssignOwner("member|trevor");
        var joannas = Review.Write(listing.Id, new ReviewItem(null, null, "Their service"), joanna.Id.ToString(), "Joanna Adeyemi", 5, ReviewText, "k1", ListingMother.Now);
        var davids = Review.Write(listing.Id, new ReviewItem(null, null, "Their service"), "member|david", "David Chen", 3, ReviewText, "k2", ListingMother.Now);
        joannas.ReplyWith("Trevor Chew", "Thank you, Joanna.", ListingMother.Now);
        listing.CountStars(new StarCounts(1, 0, 1, 0, 0));
        await _factory.Arrange(listing, joannas, davids);
        await _factory.Arrange(
            ReviewReport.Open(davids, joanna.Id.ToString(), "Joanna Adeyemi", ReviewReportReason.Other, "Not about them.", "r1", ListingMother.Now),
            ReviewReport.Open(joannas, "member|ruth", "Ruth Mensah", ReviewReportReason.Advertising, null, "r2", ListingMother.Now));
        return (listing, joannas, davids);
    }

    // L2-239 AC3
    [Fact]
    public async Task L2_235_AC3_Deleting_the_account_deletes_the_member_s_reviews_and_reports_and_recounts_the_stars()
    {
        var (client, member) = await Joanna();
        var (listing, _, davids) = await ReviewsOf(member);

        var response = await client.SendAsync(Delete("DELETE"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(davids.Id, (await Read(db => db.Reviews.SingleAsync())).Id);
        Assert.Empty(await Read(db => db.ReviewReports.ToListAsync()));
        var stored = await Read(db => db.Listings.SingleAsync(l => l.Id == listing.Id));
        Assert.Equal((0, 1), (stored.Stars5, stored.Stars3));
    }

    // L2-239 AC2
    [Fact]
    public async Task L2_235_AC2_The_archive_holds_the_member_s_reviews_and_reports()
    {
        var (client, member) = await Joanna();
        await ReviewsOf(member);
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();

        var archive = JsonDocument.Parse(await (await client.GetAsync($"/api/account/data-exports/{await LinkTokenFor(member)}")).Content.ReadAsStringAsync()).RootElement;

        var review = Assert.Single(archive.GetProperty("reviews").EnumerateArray());
        Assert.Equal("Legacy Financial", review.GetProperty("business").GetString());
        Assert.Equal(5, review.GetProperty("rating").GetInt32());
        Assert.Equal(ReviewText, review.GetProperty("text").GetString());
        Assert.Equal("Thank you, Joanna.", review.GetProperty("reply").GetString());
        var report = Assert.Single(archive.GetProperty("reviewReports").EnumerateArray());
        Assert.Equal("Other", report.GetProperty("reason").GetString());
        Assert.Equal("Not about them.", report.GetProperty("note").GetString());
    }
}
