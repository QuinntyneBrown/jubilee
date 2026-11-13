using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Reporting a review and taking it down: L2-235 AC3; L2-236 AC4, AC5, AC6; L2-237; L2-238 AC5, AC6.
public sealed partial class ReviewTests
{
    private const string TeamNote = "Checked the review against the review rules.";
    private const string TakeDownReason = "Your review named another family and their street.";

    private HttpClient AsMiriam() => _factory.CreateStaffClient("Miriam Castillo", "member|miriam", "moderator");

    private static Task<HttpResponseMessage> ReportReview(HttpClient client, Guid review, string? reason = "private-details", string? note = "It names the family next door.", string? key = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/reviews/{review}/reports") { Content = JsonContent.Create(new { reason, note }) };
        request.Headers.Add("Idempotency-Key", key ?? Guid.NewGuid().ToString());
        return client.SendAsync(request);
    }

    private static Task<HttpResponseMessage> Act(HttpClient client, Guid report, string kind, string? text = null) =>
        client.PostAsJsonAsync($"/api/admin/reports/{report}/actions", new { kind, resolutionNote = TeamNote, messageText = text });

    // L2-236 AC3, AC5, L2-238 AC5
    [Fact]
    public async Task L2_232_AC3_a_member_reports_a_review_and_it_stays_shown()
    {
        var review = await JoannasReview();

        var response = await ReportReview(AsDavid(), review.Id, key: "same");
        var again = await ReportReview(AsDavid(), review.Id, key: "same");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal((await Json(response)).GetProperty("id").GetGuid(), (await Json(again)).GetProperty("id").GetGuid());
        var report = await Read(db => db.ReviewReports.SingleAsync());
        Assert.Equal(ReviewReportReason.PrivateDetails, report.Reason);
        Assert.Equal("David Chen", report.ReporterName);
        Assert.Single((await Reviews()).GetProperty("items").EnumerateArray());
    }

    // L2-236 AC4, AC2, L2-238 AC7
    [Fact]
    public async Task L2_232_AC4_an_author_cannot_report_their_own_review_and_a_reason_is_needed()
    {
        var review = await JoannasReview();

        var own = await ReportReview(AsJoanna(), review.Id);
        var visitor = await ReportReview(_factory.CreateClient(), review.Id);
        var noReason = await ReportReview(AsDavid(), review.Id, reason: null);
        var tooLong = await ReportReview(AsDavid(), review.Id, note: new string('a', 1001));
        var owner = await ReportReview(AsTrevor(), review.Id, reason: "other", note: null);

        Assert.Equal(HttpStatusCode.Forbidden, own.StatusCode);
        Assert.Equal("OWN_REVIEW", (await Json(own)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized, visitor.StatusCode);
        Assert.Equal("REASON_REQUIRED", (await Json(noReason)).GetProperty("errors").GetProperty("reason").GetString());
        Assert.Equal("TOO_LONG", (await Json(tooLong)).GetProperty("errors").GetProperty("note").GetString());
        Assert.Equal(HttpStatusCode.Created, owner.StatusCode);
    }

    // L2-236 AC6, L2-238 AC6
    [Fact]
    public async Task L2_232_AC6_more_than_ten_reports_in_a_day_are_slowed_down()
    {
        var review = await JoannasReview();

        var answers = new List<HttpStatusCode>();
        for (var i = 0; i < 11; i++)
        {
            answers.Add((await ReportReview(AsDavid(), review.Id)).StatusCode);
        }

        Assert.All(answers.Take(10), a => Assert.Equal(HttpStatusCode.Created, a));
        Assert.Equal(HttpStatusCode.TooManyRequests, answers[10]);
    }

    // L2-237 AC1, AC2
    [Fact]
    public async Task L2_233_AC1_a_review_report_joins_the_reports_and_opens_with_the_review()
    {
        var review = await JoannasReview();
        var id = (await Json(await ReportReview(AsDavid(), review.Id))).GetProperty("id").GetGuid();
        await ReportReview(_factory.CreateMemberClient("Ruth Mensah", "member|ruth"), review.Id, reason: "advertising", note: null);

        var list = await Json(await AsMiriam().GetAsync("/api/admin/reports"));
        var opened = await AsMiriam().PostAsync($"/api/admin/reports/{id}/open", null);

        var item = list.GetProperty("items").EnumerateArray().First(i => i.GetProperty("id").GetGuid() == id);
        Assert.Equal("review", item.GetProperty("type").GetString());
        Assert.Equal("Legacy Financial", item.GetProperty("listing").GetProperty("name").GetString());
        Assert.Equal("It shares private details", item.GetProperty("reason").GetString());
        Assert.Equal("It names the family next door.", item.GetProperty("description").GetString());
        Assert.Equal("David Chen", item.GetProperty("reporterName").GetString());
        var detail = await Json(opened);
        Assert.Equal("in-review", detail.GetProperty("status").GetString());
        var shown = detail.GetProperty("review");
        Assert.Equal("Joanna A.", shown.GetProperty("author").GetString());
        Assert.Equal(5, shown.GetProperty("rating").GetInt32());
        Assert.Equal("Discovery meeting", shown.GetProperty("itemName").GetString());
        Assert.Equal(2, detail.GetProperty("entries").GetArrayLength());
        Assert.Equal(1, await Read(db => db.AuditRecords.CountAsync(a => a.Action == "report.opened")));
    }

    // L2-237 AC3, AC5, L2-235 AC3, L2-231 AC5
    [Fact]
    public async Task L2_233_AC3_the_team_takes_a_review_down_with_a_reason_the_author_reads()
    {
        var review = await JoannasReview();
        var first = (await Json(await ReportReview(AsDavid(), review.Id))).GetProperty("id").GetGuid();
        var second = (await Json(await ReportReview(_factory.CreateMemberClient("Ruth Mensah", "member|ruth"), review.Id))).GetProperty("id").GetGuid();

        var noReason = await Act(AsMiriam(), first, "take-down");
        var response = await Act(AsMiriam(), first, "take-down", TakeDownReason);

        Assert.Equal("REQUIRED", (await Json(noReason)).GetProperty("errors").GetProperty("messageText").GetString());
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("resolved", (await Json(response)).GetProperty("status").GetString());
        Assert.All(await Read(db => db.ReviewReports.ToListAsync()), r => Assert.Equal(ReportStatus.Resolved, r.Status));
        Assert.Empty((await Reviews(AsJoanna())).GetProperty("items").EnumerateArray());
        Assert.NotEqual("written", (await Reviews(AsJoanna())).GetProperty("writing").GetString());
        Assert.Equal(StarCounts.None, await ListingStars());
        var told = await Read(db => db.Notifications.SingleAsync(n => n.MemberSubject == Joanna));
        Assert.Equal("We took down your review of Legacy Financial", told.Title);
        Assert.Equal(TakeDownReason, told.Detail);
        Assert.Equal(0, await Read(db => db.Notifications.CountAsync(n => n.MemberSubject == David)));
        var audit = await Read(db => db.AuditRecords.SingleAsync(a => a.Action == "review.taken-down"));
        Assert.Equal(("review", review.Id.ToString()), (audit.TargetType, audit.TargetId));
        Assert.Equal(TakeDownReason, audit.After);
        Assert.Equal(TeamNote, audit.Reason);
        Assert.NotEqual(Guid.Empty, second);
    }

    // L2-237 AC4
    [Fact]
    public async Task L2_233_AC4_dismissing_a_review_report_leaves_the_review()
    {
        var review = await JoannasReview();
        var id = (await Json(await ReportReview(AsDavid(), review.Id))).GetProperty("id").GetGuid();

        var response = await Act(AsMiriam(), id, "dismiss");

        Assert.Equal("resolved", (await Json(response)).GetProperty("status").GetString());
        Assert.Single((await Reviews()).GetProperty("items").EnumerateArray());
        Assert.Equal(0, await Read(db => db.Notifications.CountAsync()));
    }

    // L2-237 AC2: the listing actions do not apply to a review report
    [Theory]
    [InlineData("hold")]
    [InlineData("remove")]
    [InlineData("message-owner")]
    public async Task L2_233_AC2_a_review_report_takes_only_its_own_actions(string kind)
    {
        var review = await JoannasReview();
        var id = (await Json(await ReportReview(AsDavid(), review.Id))).GetProperty("id").GetGuid();

        var response = await Act(AsMiriam(), id, kind, "A message.");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("INVALID", (await Json(response)).GetProperty("errors").GetProperty("kind").GetString());
    }

    // L2-237 AC6
    [Fact]
    public async Task L2_233_AC6_a_moderator_does_not_handle_a_report_of_their_own_listing()
    {
        var review = await JoannasReview();
        var id = (await Json(await ReportReview(AsDavid(), review.Id))).GetProperty("id").GetGuid();

        var response = await _factory.CreateStaffClient("Trevor Chew", Trevor, "moderator").PostAsync($"/api/admin/reports/{id}/open", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(response)).GetProperty("code").GetString());
    }
}
