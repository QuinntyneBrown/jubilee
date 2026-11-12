using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Bug reports, kudos, screenshots and check-ins: L2-214 AC2 to AC7, AC9.
public sealed partial class FeedbackTests
{
    private const string Happened = "Pressed Send request on the journaling Bible and the button spun forever.\nTried twice.";

    private static Task<HttpResponseMessage> ReportBug(HttpClient client, object? body = null, string? key = null) =>
        Post(client, "bug-reports", body ?? new { happened = Happened }, key);

    private static Task<HttpResponseMessage> SendKudos(HttpClient client, object? body = null, string? key = null) =>
        Post(client, "kudos", body ?? new { chips = new[] { "trust" } }, key);

    private static Task<HttpResponseMessage> CheckIn(HttpClient client, Guid id, object? body = null) =>
        client.PutAsJsonAsync($"/api/feedback/check-ins/{id}", body ?? new { moment = "request-sent", score = 5 });

    private static byte[] Jpeg() =>
    [
        0xFF, 0xD8,
        0xFF, 0xE1, 0x00, 0x0A, (byte)'E', (byte)'x', (byte)'i', (byte)'f', 0, 0, 1, 2,
        0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
        0xFF, 0xD9,
    ];

    private static Task<HttpResponseMessage> Upload(HttpClient client, byte[] bytes)
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(file, "file", "screen.jpg");
        return client.PostAsync("/api/feedback/screenshots", content);
    }

    private async Task<Guid> Uploaded(HttpClient client) =>
        (await Json(await Upload(client, Jpeg()))).GetProperty("id").GetGuid();

    /// <summary>A public business the member has written to, so kudos may name it.</summary>
    private async Task<Listing> Contacted(string subject, string slug = "legacy-financial", string name = "Legacy Financial")
    {
        var listing = ListingMother.Public(slug, "financial-insurance", name);
        await _factory.Arrange(listing, Conversation.Start(listing.Id, subject, "Joanna Adeyemi", ListingMother.Now));
        return listing;
    }

    // ---- bug reports -------------------------------------------------------------------------

    // L2-214 AC2
    [Fact]
    public async Task L2_200_AC2_a_bug_report_is_stored_with_its_context_and_a_reference()
    {
        var client = AsJoanna();
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (iPhone) Safari/604.1");

        var response = await ReportBug(client, new
        {
            where = "business",
            happened = Happened,
            expected = "A confirmation that my request was sent.",
            frequency = "every-time",
            screen = "product",
            version = "1.0.0",
            mayContact = true,
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await Json(response);
        var stored = Assert.Single(await Stored());
        Assert.Equal("bug-report", item.GetProperty("kind").GetString());
        Assert.Equal("Pressed Send request on the journaling Bible and the button spun forever.", item.GetProperty("summary").GetString());
        Assert.Matches("^FB-[2-9A-HJKMNP-Z]{6}$", item.GetProperty("reference").GetString());
        Assert.Equal(item.GetProperty("reference").GetString(), stored.Reference);
        Assert.Equal(FeedbackKind.BugReport, stored.Kind);
        Assert.Equal("business", stored.Place);
        Assert.Equal(Happened, stored.Happened);
        Assert.Equal("A confirmation that my request was sent.", stored.Expected);
        Assert.Equal(BugFrequency.EveryTime, stored.Frequency);
        Assert.Equal("product", stored.Screen);
        Assert.Equal("1.0.0", stored.AppVersion);
        Assert.Equal("Mozilla/5.0 (iPhone) Safari/604.1", stored.UserAgent);
        Assert.True(stored.MayContact);
    }

    [Fact]
    public async Task L2_200_AC2_what_happened_is_enough_and_each_report_has_its_own_reference()
    {
        var client = AsJoanna();

        var first = await Json(await ReportBug(client));
        var second = await Json(await ReportBug(client));

        Assert.NotEqual(first.GetProperty("reference").GetString(), second.GetProperty("reference").GetString());
        Assert.All(await Stored(), f => Assert.Null(f.Place));
    }

    [Fact]
    public async Task L2_199_AC1_a_long_first_line_is_shortened_to_80_characters_in_the_list()
    {
        var client = AsJoanna();
        await ReportBug(client, new { happened = new string('a', 120) });

        var item = (await _factory.GetJson("/api/feedback", client))[0];

        Assert.Equal(new string('a', 79) + "…", item.GetProperty("summary").GetString());
        Assert.False(item.TryGetProperty("userAgent", out _));
        Assert.False(item.TryGetProperty("happened", out _));
    }

    // L2-214 AC5
    [Fact]
    public async Task L2_200_AC5_a_bug_report_names_each_invalid_field()
    {
        var response = await ReportBug(AsJoanna(), new
        {
            where = "basement",
            happened = "  ",
            expected = new string('a', 2001),
            frequency = "daily",
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("PLACE_UNKNOWN", await Error(response, "where"));
        Assert.Equal("HAPPENED_REQUIRED", await Error(response, "happened"));
        Assert.Equal("EXPECTED_TOO_LONG", await Error(response, "expected"));
        Assert.Equal("FREQUENCY_UNKNOWN", await Error(response, "frequency"));
        Assert.Empty(await Stored());
    }

    [Fact]
    public async Task L2_200_AC5_what_happened_is_held_to_2000_characters()
    {
        var tooLong = await ReportBug(AsJoanna(), new { happened = new string('a', 2001) });
        var longest = await ReportBug(AsJoanna(), new { happened = new string('a', 2000) });

        Assert.Equal("HAPPENED_TOO_LONG", await Error(tooLong, "happened"));
        Assert.Equal(HttpStatusCode.Created, longest.StatusCode);
    }

    // ---- screenshots -------------------------------------------------------------------------

    // L2-214 AC6, L2-138
    [Fact]
    public async Task L2_200_AC6_a_screenshot_is_cleaned_and_stored_and_a_report_carries_it()
    {
        var client = AsJoanna();
        var upload = await Upload(client, Jpeg());
        Assert.Equal(HttpStatusCode.Created, upload.StatusCode);
        var id = (await Json(upload)).GetProperty("id").GetGuid();

        var report = await Json(await ReportBug(client, new { happened = Happened, screenshotIds = new[] { id } }));

        var screenshot = await _factory.Query(db => db.FeedbackScreenshots.AsNoTracking().SingleAsync());
        Assert.Equal(report.GetProperty("id").GetGuid(), screenshot.FeedbackId);
        Assert.Equal(Joanna, screenshot.UploaderSubject);
        Assert.Equal("image/jpeg", screenshot.ContentType);
        Assert.DoesNotContain("Exif"u8.ToArray(), screenshot.Content);
    }

    [Fact]
    public async Task L2_200_AC6_a_file_that_is_not_a_picture_or_is_too_large_is_refused()
    {
        var client = AsJoanna();

        var text = await Upload(client, "not a picture"u8.ToArray());
        var large = await Upload(client, [.. Jpeg(), .. new byte[5 * 1024 * 1024]]);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, text.StatusCode);
        Assert.Equal("INVALID_IMAGE", (await Json(text)).GetProperty("code").GetString());
        Assert.Equal("TOO_LARGE", (await Json(large)).GetProperty("code").GetString());
        Assert.Equal(0, await _factory.Query(db => db.FeedbackScreenshots.CountAsync()));
    }

    // L2-214 AC5, L2-133
    [Fact]
    public async Task L2_200_AC5_a_report_takes_three_screenshots_at_most_each_the_members_own_and_unused()
    {
        var joanna = AsJoanna();
        var four = new[] { await Uploaded(joanna), await Uploaded(joanna), await Uploaded(joanna), await Uploaded(joanna) };
        var davids = await Uploaded(AsDavid());

        var tooMany = await ReportBug(joanna, new { happened = Happened, screenshotIds = four });
        var notMine = await ReportBug(joanna, new { happened = Happened, screenshotIds = new[] { davids } });
        var used = await ReportBug(joanna, new { happened = Happened, screenshotIds = four[..3] });
        var again = await ReportBug(joanna, new { happened = Happened, screenshotIds = four[..1] });

        Assert.Equal("TOO_MANY_SCREENSHOTS", await Error(tooMany, "screenshots"));
        Assert.Equal("SCREENSHOT_NOT_FOUND", await Error(notMine, "screenshots"));
        Assert.Equal(HttpStatusCode.Created, used.StatusCode);
        Assert.Equal("SCREENSHOT_NOT_FOUND", await Error(again, "screenshots"));
        Assert.Single(await Stored());
    }

    [Fact]
    public async Task L2_200_AC6_no_address_serves_a_screenshot_and_a_visitor_cannot_upload_one()
    {
        var joanna = AsJoanna();
        var id = await Uploaded(joanna);

        Assert.Equal(HttpStatusCode.NotFound, (await joanna.GetAsync($"/api/feedback/screenshots/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Upload(_factory.CreateClient(), Jpeg())).StatusCode);
    }

    // ---- kudos -------------------------------------------------------------------------------

    // L2-214 AC3
    [Fact]
    public async Task L2_200_AC3_kudos_for_the_team_are_stored_with_their_chips_and_note()
    {
        var response = await SendKudos(AsJoanna(), new { chips = new[] { "quick-replies", "trust" }, note = "Found a plumber in a day." });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await Json(response);
        var stored = Assert.Single(await Stored());
        Assert.Equal("kudos", item.GetProperty("kind").GetString());
        Assert.Equal(JsonValueKind.Null, item.GetProperty("business").ValueKind);
        Assert.Equal(FeedbackKind.Kudos, stored.Kind);
        Assert.Equal(["trust", "quick-replies"], stored.ChipList);
        Assert.Equal("Found a plumber in a day.", stored.Note);
        Assert.Null(stored.ListingId);
        Assert.False(stored.ShowOnPage);
    }

    [Fact]
    public async Task L2_200_AC3_kudos_for_a_business_keep_the_business_and_the_consent()
    {
        var listing = await Contacted(Joanna);

        var response = await SendKudos(AsJoanna(), new { business = "legacy-financial", note = "Patient and kind.", showOnPage = true });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("Legacy Financial", (await Json(response)).GetProperty("business").GetString());
        var stored = Assert.Single(await Stored());
        Assert.Equal(listing.Id, stored.ListingId);
        Assert.Equal("Legacy Financial", stored.BusinessName);
        Assert.True(stored.ShowOnPage);
    }

    [Fact]
    public async Task L2_200_AC3_the_consent_to_show_kudos_means_nothing_without_a_business()
    {
        await SendKudos(AsJoanna(), new { chips = new[] { "trust" }, showOnPage = true });

        Assert.False(Assert.Single(await Stored()).ShowOnPage);
    }

    // L2-214 AC4
    [Fact]
    public async Task L2_200_AC4_kudos_name_only_a_public_business_the_member_has_contacted()
    {
        await Contacted(David, "davids-plumber", "WaterWorks Plumbing & Drains");
        var paused = ListingMother.NonPublic(NonPublicState.Paused, "paused-one");
        await _factory.Arrange(paused, Conversation.Start(paused.Id, Joanna, "Joanna Adeyemi", ListingMother.Now));

        var notContacted = await SendKudos(AsJoanna(), new { business = "davids-plumber", note = "Great." });
        var notPublic = await SendKudos(AsJoanna(), new { business = "paused-one", note = "Great." });
        var unknown = await SendKudos(AsJoanna(), new { business = "nobody", note = "Great." });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, notContacted.StatusCode);
        Assert.Equal("BUSINESS_NOT_CONTACTED", await Error(notContacted, "business"));
        Assert.Equal("BUSINESS_NOT_CONTACTED", await Error(notPublic, "business"));
        Assert.Equal("BUSINESS_NOT_CONTACTED", await Error(unknown, "business"));
        Assert.Empty(await Stored());
    }

    [Fact]
    public async Task L2_200_AC4_the_businesses_a_member_may_name_are_those_they_sent_a_request_or_a_message_to()
    {
        var messaged = await Contacted(Joanna, "waterworks", "WaterWorks Plumbing & Drains");
        var asked = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        var stranger = ListingMother.Public("stranger", "financial-insurance", "Stranger & Co");
        await _factory.Arrange(asked, stranger,
            Request.AskForQuote(Joanna, "Joanna Adeyemi", asked.Id, null, null, "A will for two.", null, null, null, "k1", ListingMother.Now),
            Conversation.Start(messaged.Id, Joanna, "Joanna Adeyemi", ListingMother.Now.AddMinutes(1)));

        var list = await _factory.GetJson("/api/feedback/businesses", AsJoanna());
        var davids = await _factory.GetJson("/api/feedback/businesses", AsDavid());

        Assert.Equal(["Legacy Financial", "WaterWorks Plumbing & Drains"], list.EnumerateArray().Select(b => b.GetProperty("name").GetString()));
        Assert.Equal("legacy-financial", list[0].GetProperty("slug").GetString());
        Assert.Equal(0, davids.GetArrayLength());
    }

    // L2-214 AC5
    [Fact]
    public async Task L2_200_AC5_kudos_need_a_chip_or_a_note_and_only_offered_chips()
    {
        var nothing = await SendKudos(AsJoanna(), new { chips = Array.Empty<string>(), note = " " });
        var unknown = await SendKudos(AsJoanna(), new { chips = new[] { "cheap" } });
        var longNote = await SendKudos(AsJoanna(), new { note = new string('a', 1001) });

        Assert.Equal("KUDOS_REQUIRED", await Error(nothing, "chips"));
        Assert.Equal("CHIP_UNKNOWN", await Error(unknown, "chips"));
        Assert.Equal("NOTE_TOO_LONG", await Error(longNote, "note"));
        Assert.Empty(await Stored());
    }

    [Fact]
    public async Task L2_200_AC8_AC9_bug_reports_and_kudos_share_the_key_and_the_hourly_limit_with_ratings()
    {
        var client = AsJoanna();
        var first = await ReportBug(client, key: "bug-1");
        var again = await ReportBug(client, key: "bug-1");
        Assert.Equal((await Json(first)).GetProperty("reference").GetString(), (await Json(again)).GetProperty("reference").GetString());
        for (var i = 0; i < 9; i++)
        {
            Assert.Equal(HttpStatusCode.Created, (await SendKudos(client)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await ReportBug(client)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await SendKudos(client)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Rate(client)).StatusCode);
    }

    // ---- check-ins ---------------------------------------------------------------------------

    // L2-214 AC7, L2-211 AC3 to AC5
    [Fact]
    public async Task L2_200_AC7_a_check_in_is_created_by_its_id_and_replaced_by_the_same_member()
    {
        var client = AsJoanna();
        var id = Guid.NewGuid();

        var created = await CheckIn(client, id, new { moment = "listing-submitted", score = 2 });
        var replaced = await CheckIn(client, id, new { moment = "listing-submitted", score = 3, note = "The photo step lost my place." });

        Assert.Equal(HttpStatusCode.NoContent, created.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, replaced.StatusCode);
        var stored = Assert.Single(await Stored());
        Assert.Equal(id, stored.Id);
        Assert.Equal(FeedbackKind.CheckIn, stored.Kind);
        Assert.Equal(CheckInMoment.ListingSubmitted, stored.Moment);
        Assert.Equal(3, stored.Rating);
        Assert.Equal("The photo step lost my place.", stored.Note);
        Assert.Equal(Joanna, stored.MemberSubject);
    }

    [Fact]
    public async Task L2_200_AC7_a_check_in_of_another_member_is_not_found_and_is_left_alone()
    {
        var id = Guid.NewGuid();
        await CheckIn(AsJoanna(), id);

        var response = await CheckIn(AsDavid(), id, new { moment = "request-sent", score = 1 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(5, Assert.Single(await Stored()).Rating);
    }

    [Fact]
    public async Task L2_200_AC7_an_id_that_is_other_feedback_of_the_member_is_not_a_check_in()
    {
        var client = AsJoanna();
        var rating = (await Json(await Rate(client))).GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.NotFound, (await CheckIn(client, rating)).StatusCode);
    }

    [Fact]
    public async Task L2_200_AC5_a_check_in_names_each_invalid_field()
    {
        var response = await CheckIn(AsJoanna(), Guid.NewGuid(), new { moment = "birthday", score = 6, note = new string('a', 1001) });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("MOMENT_UNKNOWN", await Error(response, "moment"));
        Assert.Equal("SCORE_REQUIRED", await Error(response, "score"));
        Assert.Equal("NOTE_TOO_LONG", await Error(response, "note"));
        Assert.Empty(await Stored());
    }

    // L2-213 AC6, L2-214 AC9
    [Fact]
    public async Task L2_199_AC6_check_ins_are_not_listed_and_do_not_count_towards_the_hourly_limit_of_feedback()
    {
        var client = AsJoanna();
        for (var i = 0; i < 12; i++)
        {
            Assert.Equal(HttpStatusCode.NoContent, (await CheckIn(client, Guid.NewGuid())).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Created, (await Rate(client)).StatusCode);
        Assert.Equal(1, (await _factory.GetJson("/api/feedback", client)).GetArrayLength());
    }

    [Fact]
    public async Task L2_200_AC9_more_than_thirty_new_check_ins_or_screenshots_in_an_hour_are_slowed_down()
    {
        var client = AsJoanna();
        var last = Guid.Empty;
        for (var i = 0; i < 30; i++)
        {
            last = Guid.NewGuid();
            Assert.Equal(HttpStatusCode.NoContent, (await CheckIn(client, last)).StatusCode);
            Assert.Equal(HttpStatusCode.Created, (await Upload(client, Jpeg())).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await CheckIn(client, Guid.NewGuid())).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Upload(client, Jpeg())).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await CheckIn(client, last, new { moment = "request-sent", score = 1 })).StatusCode);
    }

    [Fact]
    public async Task L2_200_AC11_a_visitor_reaches_no_feedback_endpoint()
    {
        var visitor = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await ReportBug(visitor)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await SendKudos(visitor)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await CheckIn(visitor, Guid.NewGuid())).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync("/api/feedback/businesses")).StatusCode);
    }
}
