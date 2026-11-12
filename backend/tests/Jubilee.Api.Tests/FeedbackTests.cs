using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Member feedback: L2-214, with L2-132, L2-133, L2-136, L2-137 and what L2-213 reads.
public sealed partial class FeedbackTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Joanna = "member|joanna";
    private const string David = "member|david";

    private readonly JubileeApiFactory _factory;

    public FeedbackTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient AsJoanna() => _factory.CreateMemberClient("Joanna Adeyemi", Joanna);

    private HttpClient AsDavid() => _factory.CreateMemberClient("David Chen", David);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static async Task<string?> Error(HttpResponseMessage response, string field) =>
        (await Json(response)).GetProperty("errors").TryGetProperty(field, out var code) ? code.GetString() : null;

    private static Task<HttpResponseMessage> Post(HttpClient client, string path, object body, string? key = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/feedback/{path}") { Content = JsonContent.Create(body) };
        if (key is not null)
        {
            request.Headers.Add("Idempotency-Key", key);
        }

        return client.SendAsync(request);
    }

    private static Task<HttpResponseMessage> Rate(HttpClient client, object? body = null, string? key = null) =>
        Post(client, "ratings", body ?? new { rating = 4 }, key);

    private Task<List<Feedback>> Stored() => _factory.Query(db => db.Feedback.AsNoTracking().ToListAsync());

    // L2-214 AC1
    [Fact]
    public async Task L2_200_AC1_a_rating_is_stored_for_the_member_with_its_note_areas_and_consent()
    {
        var response = await Rate(AsJoanna(), new
        {
            rating = 4,
            note = "  Search is quick.  ",
            areas = new { finding = 5, messaging = 3 },
            mayContact = true,
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await Json(response);
        Assert.Equal("rating", item.GetProperty("kind").GetString());
        Assert.Equal(4, item.GetProperty("rating").GetInt32());
        Assert.Equal("received", item.GetProperty("status").GetString());
        var stored = Assert.Single(await Stored());
        Assert.Equal(item.GetProperty("id").GetGuid(), stored.Id);
        Assert.Equal(Joanna, stored.MemberSubject);
        Assert.Equal(FeedbackKind.Rating, stored.Kind);
        Assert.Equal(FeedbackStatus.Received, stored.Status);
        Assert.Equal(4, stored.Rating);
        Assert.Equal("Search is quick.", stored.Note);
        Assert.Equal(5, stored.FindingScore);
        Assert.Null(stored.ListingScore);
        Assert.Equal(3, stored.MessagingScore);
        Assert.Null(stored.TrustScore);
        Assert.True(stored.MayContact);
        Assert.Equal(ListingMother.Now, stored.CreatedAt);
    }

    [Fact]
    public async Task L2_200_AC1_a_rating_alone_is_enough_and_consent_is_not_assumed()
    {
        Assert.Equal(HttpStatusCode.Created, (await Rate(AsJoanna())).StatusCode);

        var stored = Assert.Single(await Stored());
        Assert.Null(stored.Note);
        Assert.False(stored.MayContact);
    }

    // L2-214 AC5, L2-136
    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public async Task L2_200_AC5_a_rating_outside_1_to_5_is_refused(int rating)
    {
        var response = await Rate(AsJoanna(), new { rating });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("RATING_REQUIRED", await Error(response, "rating"));
        Assert.Empty(await Stored());
    }

    [Fact]
    public async Task L2_200_AC5_a_missing_rating_an_area_score_out_of_range_and_a_long_note_each_name_their_field()
    {
        var response = await Rate(AsJoanna(), new { note = new string('a', 1001), areas = new { trust = 9 } });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("RATING_REQUIRED", await Error(response, "rating"));
        Assert.Equal("NOTE_TOO_LONG", await Error(response, "note"));
        Assert.Equal("SCORE_OUT_OF_RANGE", await Error(response, "areas"));
        Assert.Empty(await Stored());
    }

    [Fact]
    public async Task L2_200_AC5_a_note_of_1000_characters_is_kept()
    {
        var response = await Rate(AsJoanna(), new { rating = 2, note = new string('a', 1000) });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // L2-214 AC8, L2-132
    [Fact]
    public async Task L2_200_AC8_the_same_key_stores_one_rating_and_gives_the_same_answer()
    {
        var client = AsJoanna();

        var first = await Rate(client, key: "key-1");
        var again = await Rate(client, new { rating = 1 }, key: "key-1");

        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
        Assert.Equal((await Json(first)).GetProperty("id").GetGuid(), (await Json(again)).GetProperty("id").GetGuid());
        Assert.Equal(4, Assert.Single(await Stored()).Rating);
    }

    [Fact]
    public async Task L2_200_AC8_another_member_may_use_the_same_key()
    {
        await Rate(AsJoanna(), key: "key-1");
        await Rate(AsDavid(), key: "key-1");

        Assert.Equal(2, (await Stored()).Count);
    }

    // L2-214 AC9, L2-137
    [Fact]
    public async Task L2_200_AC9_a_member_who_sends_more_than_ten_in_an_hour_is_slowed_down()
    {
        var client = AsJoanna();
        for (var i = 0; i < 10; i++)
        {
            Assert.Equal(HttpStatusCode.Created, (await Rate(client)).StatusCode);
        }

        var response = await Rate(client);

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.True(response.Headers.RetryAfter is not null);
        _factory.Clock.Advance(TimeSpan.FromMinutes(61));
        Assert.Equal(HttpStatusCode.Created, (await Rate(client)).StatusCode);
    }

    // L2-214 AC10, L2-213 AC1, AC7, L2-133
    [Fact]
    public async Task L2_200_AC10_a_member_lists_their_own_feedback_newest_first_and_nobody_elses()
    {
        var joanna = AsJoanna();
        await Rate(joanna, new { rating = 2, note = "Slow on my phone." });
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        await Rate(joanna, new { rating = 5 });
        await Rate(AsDavid(), new { rating = 1 });

        var list = await _factory.GetJson("/api/feedback", joanna);

        Assert.Equal(2, list.GetArrayLength());
        Assert.Equal(5, list[0].GetProperty("rating").GetInt32());
        Assert.Equal(2, list[1].GetProperty("rating").GetInt32());
        Assert.Equal("rating", list[0].GetProperty("kind").GetString());
        Assert.Equal("received", list[0].GetProperty("status").GetString());
        Assert.Equal(ListingMother.Now.AddMinutes(5), list[0].GetProperty("createdAt").GetDateTimeOffset());
        Assert.False(list[1].TryGetProperty("note", out _));
        Assert.Equal(JsonValueKind.Null, list[0].GetProperty("reply").ValueKind);
    }

    // L2-214 AC13, L2-213 AC1, AC2
    [Fact]
    public async Task L2_200_AC13_a_status_and_a_reply_set_on_feedback_show_in_the_list()
    {
        var joanna = AsJoanna();
        var id = (await Json(await Rate(joanna))).GetProperty("id").GetGuid();
        await _factory.WithDb(async db =>
        {
            var feedback = await db.Feedback.SingleAsync(f => f.Id == id);
            feedback.MarkRead();
            feedback.ReplyWith("Thanks, Joanna. We are on it.");
            await db.SaveChangesAsync();
        });

        var item = (await _factory.GetJson("/api/feedback", joanna))[0];

        Assert.Equal("read", item.GetProperty("status").GetString());
        Assert.Equal("Thanks, Joanna. We are on it.", item.GetProperty("reply").GetString());
    }

    // L2-214 AC11
    [Fact]
    public async Task L2_200_AC11_a_visitor_can_neither_send_nor_list_feedback()
    {
        var visitor = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await Rate(visitor)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync("/api/feedback")).StatusCode);
        Assert.Empty(await Stored());
    }

    // L2-118
    [Fact]
    public async Task L2_118_feedback_that_cannot_be_stored_names_JB_FBK_503()
    {
        _factory.Database.Unavailable = true;

        var response = await Rate(AsJoanna());

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-FBK-503", (await Json(response)).GetProperty("reference").GetString());
    }
}
