using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Share and report a listing: L2-028 AC3, L2-038 AC4, L2-039, L2-126, L2-128, L2-132, L2-133.
public sealed class ReportListingTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Joanna = "member|joanna";
    private const string David = "member|david";
    private const string Owner = "member|owner";
    private const string Reason = "misleading";
    private const string Detail = "The office address on the listing is closed; they moved last spring.";

    private readonly JubileeApiFactory _factory;

    public ReportListingTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient AsJoanna() => _factory.CreateMemberClient("Joanna Adeyemi", Joanna);

    private HttpClient AsDavid() => _factory.CreateMemberClient("David Chen", David);

    private HttpClient AsOwner() => _factory.CreateMemberClient("Miriam Owner", Owner);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private async Task<T> Read<T>(Func<Infrastructure.Persistence.AppDbContext, Task<T>> work)
    {
        T result = default!;
        await _factory.WithDb(async db => result = await work(db));
        return result;
    }

    private static Task<HttpResponseMessage> Report(
        HttpClient client, string slug = "legacy-financial", string? reason = Reason, string? description = Detail, string? key = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/listings/{slug}/reports")
        {
            Content = JsonContent.Create(new { reason, description }),
        };
        if (key is not null)
        {
            request.Headers.Add("Idempotency-Key", key);
        }

        return client.SendAsync(request);
    }

    private Task ArrangeListing(string slug = "legacy-financial", string? owner = null)
    {
        var listing = ListingMother.Public(slug, "financial-insurance", "Legacy Financial");
        if (owner is not null)
        {
            listing.AssignOwner(owner);
        }

        return _factory.Arrange(listing);
    }

    // L2-039 AC3
    [Fact]
    public async Task L2_039_AC3_a_valid_report_is_stored_for_the_verification_team()
    {
        await ArrangeListing();

        var response = await Report(AsJoanna());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.True((await Json(response)).TryGetProperty("id", out _));
        var report = await Read(db => db.ListingReports.Include(r => r.Entries).SingleAsync());
        Assert.Equal(Joanna, report.ReporterSubject);
        Assert.Equal(ReportStatus.Open, report.Status);
        var entry = Assert.Single(report.Entries);
        Assert.Equal(ReportReason.Misleading, entry.Reason);
        Assert.Equal(Detail, entry.Description);
    }

    // L2-039 AC2, L2-126
    [Fact]
    public async Task L2_039_AC2_a_report_without_a_reason_or_a_description_names_each_field()
    {
        await ArrangeListing();

        var response = await Report(AsJoanna(), reason: null, description: "  ");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REASON_REQUIRED", errors.GetProperty("reason").GetString());
        Assert.Equal("DESCRIPTION_REQUIRED", errors.GetProperty("description").GetString());
        Assert.Equal(0, await Read(db => db.ListingReports.CountAsync()));
    }

    [Fact]
    public async Task L2_039_a_reason_that_is_not_offered_is_refused()
    {
        await ArrangeListing();

        var response = await Report(AsJoanna(), reason: "spam");

        Assert.Equal("REASON_REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("reason").GetString());
    }

    // L2-039 AC4
    [Fact]
    public async Task L2_039_AC4_a_description_over_2000_characters_is_refused_and_2000_is_kept()
    {
        await ArrangeListing();

        var tooLong = await Report(AsJoanna(), description: new string('a', 2001));
        var longest = await Report(AsJoanna(), description: new string('a', 2000));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, tooLong.StatusCode);
        Assert.Equal("DESCRIPTION_TOO_LONG", (await Json(tooLong)).GetProperty("errors").GetProperty("description").GetString());
        Assert.Equal(HttpStatusCode.Created, longest.StatusCode);
    }

    // L2-039 AC5
    [Fact]
    public async Task L2_039_AC5_a_second_report_within_24_hours_is_added_to_the_first()
    {
        await ArrangeListing();
        var client = AsJoanna();
        var first = await Json(await Report(client));
        _factory.Clock.Advance(TimeSpan.FromHours(23));

        var second = await Json(await Report(client, reason: "other", description: "One more thing."));

        Assert.Equal(first.GetProperty("id").GetGuid(), second.GetProperty("id").GetGuid());
        var report = await Read(db => db.ListingReports.Include(r => r.Entries).SingleAsync());
        Assert.Equal(2, report.Entries.Count);
    }

    [Fact]
    public async Task L2_039_AC5_a_report_after_24_hours_or_from_another_member_is_a_new_report()
    {
        await ArrangeListing();
        var client = AsJoanna();
        await Report(client);
        await Report(AsDavid());
        _factory.Clock.Advance(TimeSpan.FromHours(25));

        await Report(client);

        Assert.Equal(3, await Read(db => db.ListingReports.CountAsync()));
    }

    // L2-132
    [Fact]
    public async Task L2_132_the_same_key_creates_one_entry_and_gives_the_same_answer()
    {
        await ArrangeListing();
        var client = AsJoanna();

        var first = await Report(client, key: "key-1");
        var again = await Report(client, key: "key-1");

        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
        Assert.Equal((await Json(first)).GetProperty("id").GetGuid(), (await Json(again)).GetProperty("id").GetGuid());
        Assert.Equal(1, await Read(db => db.ListingReportEntries.CountAsync()));

        await Report(client, key: "key-2");
        Assert.Equal(2, await Read(db => db.ListingReportEntries.CountAsync()));
    }

    // L2-039 AC6, L2-133
    [Fact]
    public async Task L2_133_a_visitor_cannot_report()
    {
        await ArrangeListing();

        var response = await Report(_factory.CreateClient());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // The owner is not offered the action, and the server refuses it too.
    [Fact]
    public async Task L2_133_the_owner_of_a_listing_cannot_report_it()
    {
        await ArrangeListing(owner: Owner);

        var response = await Report(AsOwner());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(0, await Read(db => db.ListingReports.CountAsync()));
    }

    // L2-028 AC3
    [Fact]
    public async Task L2_028_a_listing_that_is_not_public_or_does_not_exist_is_not_found()
    {
        await _factory.Arrange(ListingMother.NonPublic(NonPublicState.Paused, "paused-one"));

        Assert.Equal(HttpStatusCode.NotFound, (await Report(AsJoanna(), "paused-one")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Report(AsJoanna(), "nobody")).StatusCode);
    }

    [Fact]
    public async Task L2_127_a_member_who_sends_many_reports_is_slowed_down()
    {
        await ArrangeListing();
        var client = AsJoanna();
        for (var i = 0; i < 10; i++)
        {
            Assert.Equal(HttpStatusCode.Created, (await Report(client, key: $"k{i}")).StatusCode);
        }

        var response = await Report(client, key: "one-too-many");

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.True(response.Headers.RetryAfter is not null);
    }

    // L2-118
    [Fact]
    public async Task L2_118_a_report_that_cannot_be_stored_names_JB_REP_503()
    {
        await ArrangeListing();
        _factory.Database.Unavailable = true;

        var response = await Report(AsJoanna());

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-REP-503", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-038 AC4
    [Fact]
    public async Task L2_038_AC4_the_link_preview_carries_the_Open_Graph_tags_of_the_listing()
    {
        await ArrangeListing();

        var response = await _factory.CreateClient().GetAsync("/api/listings/legacy-financial/social-preview");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.StartsWith("text/html", response.Content.Headers.ContentType?.MediaType + "/");
        var html = await response.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:title\" content=\"Legacy Financial · Jubilee\"", html);
        Assert.Contains("<meta property=\"og:description\" content=\"Tagline of legacy-financial\"", html);
        Assert.Contains("<meta property=\"og:url\" content=\"https://jubilee.test/b/legacy-financial\"", html);
        Assert.Contains("<meta property=\"og:image\" content=\"https://jubilee.test/", html);
        Assert.Contains("<link rel=\"canonical\" href=\"https://jubilee.test/b/legacy-financial\"", html);
    }

    [Fact]
    public async Task L2_038_the_preview_escapes_the_name_and_is_not_given_for_a_listing_that_is_not_public()
    {
        var odd = ListingMother.Public("odd", "financial-insurance", "Bob\"s <script>alert(1)</script>");
        await _factory.Arrange(odd, ListingMother.NonPublic(NonPublicState.Paused, "paused-one"));

        var html = await (await _factory.CreateClient().GetAsync("/api/listings/odd/social-preview")).Content.ReadAsStringAsync();
        var hidden = await _factory.CreateClient().GetAsync("/api/listings/paused-one/social-preview");

        Assert.DoesNotContain("<script>alert(1)", html);
        Assert.Contains("&lt;script&gt;", html);
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
    }
}
