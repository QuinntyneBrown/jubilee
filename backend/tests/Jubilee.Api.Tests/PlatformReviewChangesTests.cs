using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>
/// Once written, a review of a platform is a review like any other (L2-260 AC4 to AC6, L2-261 AC3, AC4): its
/// author edits or removes it, the founder replies, a member reports it and the Jubilee team takes it down.
/// </summary>
public sealed class PlatformReviewChangesTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Founder = "member|abigail";
    private const string Joanna = "member|joanna";
    private const string David = "member|david";
    private const string GoodText = "We log every book the children finish. The weekly goal keeps all of us reading.";

    private readonly JubileeApiFactory _factory;
    private Listing _lanternread = null!;

    public PlatformReviewChangesTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _lanternread = ListingMother.Platform("lanternread", "Lanternread");
        _lanternread.AssignOwner(Founder);
        _lanternread.Describe(new ListingProfile("Abigail Thornton", [], null, null, null, null, null, null));
        await _factory.Arrange(_lanternread);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient AsJoanna() => _factory.CreateMemberClient("Joanna Adeyemi", Joanna);

    private HttpClient AsDavid() => _factory.CreateMemberClient("David Chen", David);

    private HttpClient AsAbigail() => _factory.CreateMemberClient("Abigail Thornton", Founder);

    private HttpClient AsMiriam() => _factory.CreateStaffClient("Miriam Castillo", "member|miriam", "moderator");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Task<HttpResponseMessage> Post(HttpClient client, object body, string slug = "lanternread")
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/listings/{slug}/reviews") { Content = JsonContent.Create(body) };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        return client.SendAsync(request);
    }

    private async Task<Guid> JoannasReview()
    {
        var response = await Post(AsJoanna(), new { rating = 5, text = GoodText, usedIt = true });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    private Task<JsonElement> Reviews(HttpClient? client = null) => _factory.GetJson("/api/listings/lanternread/reviews", client);

    [Fact]
    public async Task L2_260_AC4_the_author_edits_without_stating_use_again_and_the_statement_stands()
    {
        var id = await JoannasReview();
        var stated = (await _factory.Query(db => db.Reviews.AsNoTracking().SingleAsync())).StatedUseAt;

        var response = await AsJoanna().PutAsJsonAsync(
            $"/api/reviews/{id}", new { rating = 3, itemId = (Guid?)null, text = GoodText + " The school side took us a while." });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var edited = await Json(response);
        Assert.Equal(3, edited.GetProperty("rating").GetInt32());
        Assert.Equal("Their platform", edited.GetProperty("itemName").GetString());
        var stored = await _factory.Query(db => db.Reviews.AsNoTracking().SingleAsync());
        Assert.Equal(stated, stored.StatedUseAt);
        Assert.NotNull(stored.EditedAt);
    }

    [Fact]
    public async Task L2_260_AC4_removing_the_review_frees_the_place_and_the_statement_goes_with_it()
    {
        var id = await JoannasReview();

        var removed = await AsJoanna().DeleteAsync($"/api/reviews/{id}");

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Empty(await _factory.Query(db => db.Reviews.AsNoTracking().ToListAsync()));
        Assert.Equal("eligible", (await Reviews(AsJoanna())).GetProperty("writing").GetString());
    }

    [Fact]
    public async Task L2_260_AC5_the_founder_replies_under_their_own_name_and_nobody_else_can()
    {
        var id = await JoannasReview();

        var other = await AsDavid().PutAsJsonAsync($"/api/reviews/{id}/reply", new { text = "Thanks!" });
        var reply = await AsAbigail().PutAsJsonAsync($"/api/reviews/{id}/reply", new { text = "Thank you, Joanna." });

        Assert.Equal(HttpStatusCode.Forbidden, other.StatusCode);
        Assert.Equal(HttpStatusCode.OK, reply.StatusCode);
        var shown = (await Reviews()).GetProperty("items")[0].GetProperty("reply");
        Assert.Equal("Abigail Thornton", shown.GetProperty("from").GetString());
        Assert.Equal("Thank you, Joanna.", shown.GetProperty("text").GetString());
    }

    [Fact]
    public async Task L2_260_AC6_a_member_reports_a_review_and_the_team_takes_it_down()
    {
        var id = await JoannasReview();
        var report = new HttpRequestMessage(HttpMethod.Post, $"/api/reviews/{id}/reports")
        {
            Content = JsonContent.Create(new { reason = "not-a-real-dealing", note = "They told me they never opened it." }),
        };
        report.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var filed = await AsDavid().SendAsync(report);
        var reportId = (await Json(filed)).GetProperty("id").GetGuid();
        var stillShown = (await Reviews()).GetProperty("items").GetArrayLength();
        var acted = await AsMiriam().PostAsJsonAsync(
            $"/api/admin/reports/{reportId}/actions",
            new { kind = "take-down", resolutionNote = "The author did not use the platform.", messageText = "A review must be about what happened to you." });

        Assert.Equal(HttpStatusCode.Created, filed.StatusCode);
        Assert.Equal(1, stillShown);
        Assert.Equal(HttpStatusCode.OK, acted.StatusCode);
        Assert.Empty((await Reviews()).GetProperty("items").EnumerateArray());
        Assert.Equal(0, (await Reviews()).GetProperty("summary").GetProperty("count").GetInt32());
        Assert.Equal("eligible", (await Reviews(AsJoanna())).GetProperty("writing").GetString());
        var stored = await _factory.Query(db => db.ReviewReports.AsNoTracking().SingleAsync());
        Assert.Equal(ReviewReportReason.NotARealDealing, stored.Reason);
    }

    [Fact]
    public async Task L2_261_AC3_five_new_reviews_a_day_bound_a_member_whatever_the_kind_of_listing()
    {
        var slugs = new[] { "gatherboard", "ledgerleaf", "pagewise", "choirloft", "hymnshelf" };
        foreach (var slug in slugs)
        {
            await _factory.Arrange(ListingMother.Platform(slug, slug, website: $"https://{slug}.example"));
        }

        foreach (var slug in slugs)
        {
            Assert.Equal(HttpStatusCode.Created, (await Post(AsJoanna(), new { rating = 4, text = GoodText, usedIt = true }, slug)).StatusCode);
        }

        var sixth = await Post(AsJoanna(), new { rating = 4, text = GoodText, usedIt = true });

        Assert.Equal(HttpStatusCode.TooManyRequests, sixth.StatusCode);
        Assert.True(sixth.Headers.Contains("Retry-After"));
        Assert.Equal(5, (await _factory.Query(db => db.Reviews.AsNoTracking().ToListAsync())).Count);
    }
}
