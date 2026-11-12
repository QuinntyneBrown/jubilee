using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>
/// A member requests a space (L2-206), the owner answers it (L2-207), and the exact address reaches
/// only the renter whose request the owner accepted (L2-208).
/// </summary>
public class SpaceRequestTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Paul = "member|paul";
    private const string SuiteAddress = "48 Galley Ave, Toronto ON M6R 1G9";
    private const string BasementAddress = "112 Brunswick Ave, Toronto ON M5S 2L7";
    private readonly JubileeApiFactory _factory;

    public SpaceRequestTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var suite = ListingMother.Space(
            "roncesvalles-suite", SpaceTerm.ShortStay, 120, "Roncesvalles", name: "Guest suite near Roncesvalles", address: SuiteAddress, minimumStay: 2);
        suite.Describe(new ListingProfile("Paul Kowalski", [], null, null, null, null, null, null));
        suite.AssignOwner(Paul);
        var basement = ListingMother.Space(
            "annex-basement", SpaceTerm.LongTerm, 1850, "The Annex", name: "Bright basement apartment in the Annex", address: BasementAddress, minimumStay: 6);
        basement.Describe(new ListingProfile("Grace Okafor", [], null, null, null, null, null, null));
        basement.AssignOwner("member|grace");
        await _factory.Arrange(suite, basement);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private HttpClient Samuel() => _factory.CreateMemberClient("Samuel Osei", "member|samuel");

    private HttpClient Owner() => _factory.CreateMemberClient("Paul Kowalski", Paul);

    private DateOnly Today => TorontoClock.Today(_factory.Clock.GetUtcNow());

    private static string Day(DateOnly day) => day.ToString("yyyy-MM-dd");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private Task<HttpResponseMessage> Stay(HttpClient client, int fromDays = 10, int nights = 2, object? extra = null) =>
        client.PostAsJsonAsync("/api/requests/spaces", new
        {
            listingSlug = "roncesvalles-suite",
            checkIn = Day(Today.AddDays(fromDays)),
            checkOut = Day(Today.AddDays(fromDays + nights)),
            note = "Visiting family for the weekend.",
            totalCents = 1, // A price from the client is ignored (L2-206 AC8).
            idempotencyKey = Guid.NewGuid().ToString(),
        });

    private Task<HttpResponseMessage> Viewing(HttpClient client, int fromDays = 20, int months = 12) =>
        client.PostAsJsonAsync("/api/requests/spaces", new
        {
            listingSlug = "annex-basement",
            moveIn = Day(Today.AddDays(fromDays)),
            stayMonths = months,
            idempotencyKey = Guid.NewGuid().ToString(),
        });

    private static string Detail(JsonElement detail, string label) =>
        detail.GetProperty("details").EnumerateArray()
            .Single(d => d.GetProperty("label").GetString() == label)
            .GetProperty("value").GetString()!;

    private async Task<Guid> Sent(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task L2_206_AC3_AC7_AC8_a_short_stay_request_is_new_with_its_nights_and_a_total_from_the_stored_rent()
    {
        var id = await Sent(await Stay(Joanna()));

        var detail = await _factory.GetJson($"/api/requests/{id}", Joanna());

        Assert.Equal("space", detail.GetProperty("kind").GetString());
        Assert.Equal("Space", detail.GetProperty("kindLabel").GetString());
        Assert.Equal("new", detail.GetProperty("status").GetString());
        Assert.Equal("Request to book · Guest suite near Roncesvalles", detail.GetProperty("title").GetString());
        Assert.EndsWith("· 2 nights", Detail(detail, "When"));
        Assert.Equal("$240", Detail(detail, "Total"));
        Assert.Equal("Shared once Paul accepts.", Detail(detail, "Address"));
    }

    [Fact]
    public async Task L2_206_AC4_a_long_term_request_has_a_move_in_and_a_stay_and_no_total()
    {
        var id = await Sent(await Viewing(Joanna()));

        var detail = await _factory.GetJson($"/api/requests/{id}", Joanna());

        Assert.Equal("Request a viewing · Bright basement apartment in the Annex", detail.GetProperty("title").GetString());
        Assert.StartsWith("Move in ", Detail(detail, "When"));
        Assert.EndsWith("· 12 months", Detail(detail, "When"));
        Assert.DoesNotContain(detail.GetProperty("details").EnumerateArray(), d => d.GetProperty("label").GetString() == "Total");
    }

    [Theory]
    [InlineData(-1, 2, "checkIn", "IN_THE_PAST")]
    [InlineData(5, 0, "checkOut", "NOT_AFTER_CHECK_IN")]
    [InlineData(400, 2, "checkIn", "TOO_FAR")]
    [InlineData(5, 1, "checkOut", "BELOW_MINIMUM_STAY")]
    public async Task L2_206_AC5_AC6_bad_dates_and_a_stay_below_the_minimum_are_refused(int fromDays, int nights, string field, string code)
    {
        var response = await Stay(Joanna(), fromDays, nights);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty(field).GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.Requests.CountAsync()));
    }

    [Fact]
    public async Task L2_206_AC6_a_monthly_stay_below_the_minimum_is_refused()
    {
        var response = await Viewing(Joanna(), months: 4);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("BELOW_MINIMUM_STAY", (await Json(response)).GetProperty("errors").GetProperty("stayMonths").GetString());
    }

    [Fact]
    public async Task L2_206_AC10_an_owner_cannot_request_their_own_space()
    {
        var response = await Stay(Owner());

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_206_AC9_the_page_knows_the_members_open_request_and_no_one_elses()
    {
        var id = await Sent(await Stay(Joanna()));

        var mine = await _factory.GetJson("/api/listings/roncesvalles-suite", Joanna());
        var theirs = await _factory.GetJson("/api/listings/roncesvalles-suite", Samuel());
        var visitor = await _factory.GetJson("/api/listings/roncesvalles-suite");

        Assert.Equal(id, mine.GetProperty("openRequestId").GetGuid());
        Assert.Equal(JsonValueKind.Null, theirs.GetProperty("openRequestId").ValueKind);
        Assert.Equal(JsonValueKind.Null, visitor.GetProperty("openRequestId").ValueKind);
    }

    [Fact]
    public async Task L2_206_AC9_a_second_open_request_for_the_same_space_is_refused()
    {
        await Sent(await Stay(Joanna()));

        var again = await Stay(Joanna(), fromDays: 40);

        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal("ALREADY_REQUESTED", (await Json(again)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Created, (await Stay(Samuel())).StatusCode);
    }

    [Fact]
    public async Task L2_206_AC7_the_owner_is_told_and_the_request_is_in_the_members_requests()
    {
        var id = await Sent(await Stay(Joanna()));

        var requests = await _factory.GetJson("/api/requests", Joanna());
        var row = requests.GetProperty("rows")[0];

        Assert.Equal(id, row.GetProperty("id").GetGuid());
        Assert.Equal("Space", row.GetProperty("kindLabel").GetString());
        Assert.Equal(1, requests.GetProperty("counts").GetProperty("all").GetInt32());
        await _factory.WithDb(async db => Assert.True(await db.Notifications.AnyAsync(n => n.MemberSubject == Paul)));
    }

    [Fact]
    public async Task L2_207_AC1_the_owner_sees_the_space_request_with_its_dates_and_total()
    {
        await Sent(await Stay(Joanna()));

        var incoming = await _factory.GetJson("/api/my-business/requests", Owner());
        var row = incoming.GetProperty("rows")[0];

        Assert.Equal("space", row.GetProperty("kind").GetString());
        Assert.Equal("Space", row.GetProperty("kindLabel").GetString());
        Assert.Equal("Request to book · Guest suite near Roncesvalles", row.GetProperty("title").GetString());
        Assert.Equal("$240", row.GetProperty("total").GetString());
        Assert.Contains("2 nights", row.GetProperty("when").GetString());
        Assert.Contains("2 nights · $240", row.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task L2_208_AC2_AC3_AC4_the_address_reaches_only_the_accepted_renter_and_only_while_confirmed()
    {
        var joannas = await Sent(await Stay(Joanna()));
        var samuels = await Sent(await Stay(Samuel(), fromDays: 30));

        var before = await Joanna().GetStringAsync($"/api/requests/{joannas}");
        Assert.DoesNotContain(SuiteAddress, before, StringComparison.Ordinal);

        Assert.Equal(HttpStatusCode.OK, (await Owner().PostAsync($"/api/my-business/requests/{joannas}/confirm", null)).StatusCode);

        var accepted = await _factory.GetJson($"/api/requests/{joannas}", Joanna());
        Assert.Equal(SuiteAddress, Detail(accepted, "Address"));
        Assert.Contains(SuiteAddress, accepted.GetProperty("callout").GetProperty("text").GetString());

        // Another renter of the same space, and every public page, never carry it.
        Assert.DoesNotContain(SuiteAddress, await Samuel().GetStringAsync($"/api/requests/{samuels}"), StringComparison.Ordinal);
        Assert.DoesNotContain(SuiteAddress, await Samuel().GetStringAsync("/api/listings/roncesvalles-suite"), StringComparison.Ordinal);
        Assert.DoesNotContain(SuiteAddress, await Joanna().GetStringAsync("/api/listings/roncesvalles-suite"), StringComparison.Ordinal);
        Assert.DoesNotContain(SuiteAddress, await Owner().GetStringAsync("/api/my-business/requests"), StringComparison.Ordinal);

        // Another member cannot open the accepted request at all.
        Assert.Equal(HttpStatusCode.NotFound, (await Samuel().GetAsync($"/api/requests/{joannas}")).StatusCode);

        // A cancelled request no longer shows it.
        await Joanna().PostAsync($"/api/requests/{joannas}/cancel", null);
        Assert.DoesNotContain(SuiteAddress, await Joanna().GetStringAsync($"/api/requests/{joannas}"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task L2_207_AC3_a_declined_space_request_never_shows_the_address()
    {
        var id = await Sent(await Stay(Joanna()));

        var declined = await Owner().PostAsJsonAsync(
            $"/api/my-business/requests/{id}/decline", new { reason = "cant-meet-the-date", message = "Booked that weekend, sorry." });

        Assert.Equal(HttpStatusCode.OK, declined.StatusCode);
        var detail = await _factory.GetJson($"/api/requests/{id}", Joanna());
        Assert.Equal("declined", detail.GetProperty("status").GetString());
        Assert.Equal("Shared once Paul accepts.", Detail(detail, "Address"));
    }
}
