using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Meeting hours: L2-220. Trevor owns Legacy Financial; Joanna is a member.
// "Today" is Tuesday 10 November 2026, 10:00 in Toronto (ListingMother.Now).
public sealed class MeetingHoursTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string TrevorId = "member|trevor";

    private readonly JubileeApiFactory _factory;
    private Guid _discovery;
    private Guid _review;

    public MeetingHoursTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var legacy = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        legacy.AssignOwner(TrevorId);
        legacy.Describe(new ListingProfile("Trevor Chew, CKA®", [], null, "2 Sheppard Ave E, North York", null, null, null, null));
        var discovery = Service.Create(legacy.Id, 1, "Discovery meeting", "30 min · Video or in person", ServicePrice.Free, ServiceAction.Book);
        var review = Service.Create(legacy.Id, 2, "Retirement & RRSP review", "60 min", ServicePrice.Free, ServiceAction.Book);
        var other = ListingMother.Public("wise-plumbing", "home-property", "Wise Plumbing");
        other.AssignOwner("member|wendy");
        var estimate = Service.Create(other.Id, 1, "Estimate", "30 min", ServicePrice.Free, ServiceAction.Book);
        await _factory.Arrange(legacy, discovery, review, other, estimate);
        _discovery = discovery.Id;
        _review = review.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Trevor() => _factory.CreateMemberClient("Trevor Chew", TrevorId);

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Task<HttpResponseMessage> Save(HttpClient client, int[] days, string opensAt, string closesAt, int slotMinutes) =>
        client.PutAsJsonAsync("/api/my-business/meeting-hours", new { days, opensAt, closesAt, slotMinutes });

    private static Task<HttpResponseMessage> SaveRaw(HttpClient client, string json) =>
        client.PutAsync("/api/my-business/meeting-hours", new StringContent(json, Encoding.UTF8, "application/json"));

    private async Task<string[]> Slots(string day, Guid? service = null)
    {
        var answer = await _factory.GetJson($"/api/listings/legacy-financial/availability?serviceId={service ?? _discovery}&day={day}", Joanna());
        return [.. answer.GetProperty("slots").EnumerateArray().Select(s => s.GetString()!)];
    }

    private Task<HttpResponseMessage> Book(string day, string time) =>
        Joanna().PostAsJsonAsync("/api/requests/bookings", new
        {
            listingSlug = "legacy-financial", serviceId = _discovery, day, time, mode = "video", note = (string?)null,
            idempotencyKey = Guid.NewGuid().ToString(),
        });

    private static int[] Days(JsonElement hours) => [.. hours.GetProperty("days").EnumerateArray().Select(d => d.GetInt32())];

    // L2-220 AC1
    [Fact]
    public async Task L2_220_AC1_an_owner_who_never_saved_hours_is_shown_Monday_to_Friday_nine_to_five_every_30_minutes()
    {
        var hours = (await _factory.GetJson("/api/my-business/services", Trevor())).GetProperty("meetingHours");

        Assert.Equal([1, 2, 3, 4, 5], Days(hours));
        Assert.Equal("09:00", hours.GetProperty("opensAt").GetString());
        Assert.Equal("17:00", hours.GetProperty("closesAt").GetString());
        Assert.Equal(30, hours.GetProperty("slotMinutes").GetInt32());
        Assert.Equal("Monday to Friday", hours.GetProperty("meetsOn").GetString());
        Assert.False(hours.GetProperty("ownerSet").GetBoolean());
        Assert.Equal(["09:00", "10:00", "13:30", "16:00", "19:00"], await Slots("2026-11-12"));
    }

    // L2-220 AC1, AC3
    [Fact]
    public async Task L2_220_AC3_saved_hours_are_the_hours_in_force_and_a_member_is_offered_only_the_times_inside_them()
    {
        var saved = await Save(Trevor(), [2, 4, 6], "09:00", "11:00", 30);

        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        var answer = await Json(saved);
        Assert.True(answer.GetProperty("ownerSet").GetBoolean());
        Assert.Equal("Tuesday, Thursday and Saturday", answer.GetProperty("meetsOn").GetString());
        var listed = (await _factory.GetJson("/api/my-business/services", Trevor())).GetProperty("meetingHours");
        Assert.Equal([2, 4, 6], Days(listed));
        Assert.Equal("09:00", listed.GetProperty("opensAt").GetString());
        Assert.Equal("11:00", listed.GetProperty("closesAt").GetString());
        Assert.Equal(30, listed.GetProperty("slotMinutes").GetInt32());
        Assert.Equal(["09:00", "09:30", "10:00", "10:30"], await Slots("2026-11-12"));
        Assert.Empty(await Slots("2026-11-13"));
        Assert.Equal(["09:00", "09:30", "10:00", "10:30"], await Slots("2026-11-14"));
        var options = await _factory.GetJson("/api/listings/legacy-financial/booking", Joanna());
        Assert.Equal("Tuesday, Thursday and Saturday", options.GetProperty("meetsOn").GetString());
    }

    // L2-220 AC3
    [Fact]
    public async Task L2_220_AC3_a_time_is_offered_only_if_a_meeting_of_the_services_length_ends_by_the_closing_time()
    {
        await Save(Trevor(), [1, 2, 3, 4, 5], "09:00", "11:00", 30);

        Assert.Equal(["09:00", "09:30", "10:00"], await Slots("2026-11-12", _review));
    }

    // L2-220 AC4
    [Fact]
    public async Task L2_220_AC4_today_offers_only_the_times_still_ahead_in_Toronto()
    {
        await Save(Trevor(), [1, 2, 3, 4, 5], "09:00", "12:00", 60);

        Assert.Equal(["11:00"], await Slots("2026-11-10"));
    }

    // L2-220 AC4
    [Fact]
    public async Task L2_220_AC4_the_hours_are_Toronto_times_of_day_on_either_side_of_a_clock_change()
    {
        await Save(Trevor(), [1, 2, 3, 4, 5], "09:00", "10:00", 30);

        Assert.Equal(HttpStatusCode.Created, (await Book("2026-11-12", "09:00")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Book("2027-03-15", "09:00")).StatusCode);

        var starts = await _factory.Query(db => db.Requests.AsNoTracking().OrderBy(r => r.CreatedAt).Select(r => r.StartsAt).ToListAsync());
        Assert.Contains(new DateTimeOffset(2026, 11, 12, 9, 0, 0, TimeSpan.FromHours(-5)), starts);
        Assert.Contains(new DateTimeOffset(2027, 3, 15, 9, 0, 0, TimeSpan.FromHours(-4)), starts);
    }

    // L2-220 AC5
    [Fact]
    public async Task L2_220_AC5_requests_already_sent_keep_their_times_and_only_later_ones_follow_the_new_hours()
    {
        var created = await Json(await Book("2026-11-12", "10:00"));
        var confirmedId = (await Json(await Book("2026-11-13", "16:00"))).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await Trevor().PostAsync($"/api/my-business/requests/{confirmedId}/confirm", null)).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await Save(Trevor(), [1], "13:00", "15:00", 60)).StatusCode);

        var requests = await _factory.Query(db => db.Requests.AsNoTracking().ToListAsync());
        var waiting = requests.Single(r => r.Id == created.GetProperty("id").GetGuid());
        Assert.Equal(RequestStatus.New, waiting.Status);
        Assert.Equal(new DateTimeOffset(2026, 11, 12, 10, 0, 0, TimeSpan.FromHours(-5)), waiting.StartsAt);
        var confirmed = requests.Single(r => r.Id == confirmedId);
        Assert.Equal(RequestStatus.Confirmed, confirmed.Status);
        Assert.Equal(new DateTimeOffset(2026, 11, 13, 16, 0, 0, TimeSpan.FromHours(-5)), confirmed.StartsAt);
        Assert.Equal(HttpStatusCode.OK, (await Trevor().PostAsync($"/api/my-business/requests/{waiting.Id}/confirm", null)).StatusCode);

        var closedDay = await Book("2026-11-12", "10:00");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, closedDay.StatusCode);
        Assert.Equal("DAY_UNAVAILABLE", (await Json(closedDay)).GetProperty("errors").GetProperty("day").GetString());
        var closedTime = await Book("2026-11-16", "10:00");
        Assert.Equal("TIME_UNAVAILABLE", (await Json(closedTime)).GetProperty("errors").GetProperty("time").GetString());
        Assert.Equal(HttpStatusCode.Created, (await Book("2026-11-16", "13:00")).StatusCode);
    }

    // L2-220 AC2
    [Theory]
    [InlineData("""{"days":[],"opensAt":"09:00","closesAt":"17:00","slotMinutes":30}""", "days", "REQUIRED")]
    [InlineData("""{"opensAt":"09:00","closesAt":"17:00","slotMinutes":30}""", "days", "REQUIRED")]
    [InlineData("""{"days":[1,7],"opensAt":"09:00","closesAt":"17:00","slotMinutes":30}""", "days", "INVALID")]
    [InlineData("""{"days":[1],"closesAt":"17:00","slotMinutes":30}""", "opensAt", "REQUIRED")]
    [InlineData("""{"days":[1],"opensAt":"9am","closesAt":"17:00","slotMinutes":30}""", "opensAt", "INVALID")]
    [InlineData("""{"days":[1],"opensAt":"09:00","slotMinutes":30}""", "closesAt", "REQUIRED")]
    [InlineData("""{"days":[1],"opensAt":"09:00","closesAt":"25:00","slotMinutes":30}""", "closesAt", "INVALID")]
    [InlineData("""{"days":[1],"opensAt":"09:00","closesAt":"09:00","slotMinutes":30}""", "closesAt", "BEFORE_OPENS")]
    [InlineData("""{"days":[1],"opensAt":"13:00","closesAt":"09:00","slotMinutes":30}""", "closesAt", "BEFORE_OPENS")]
    [InlineData("""{"days":[1],"opensAt":"09:00","closesAt":"09:20","slotMinutes":30}""", "slotMinutes", "TOO_SHORT")]
    [InlineData("""{"days":[1],"opensAt":"09:00","closesAt":"17:00","slotMinutes":20}""", "slotMinutes", "INVALID")]
    [InlineData("""{"days":[1],"opensAt":"09:00","closesAt":"17:00"}""", "slotMinutes", "REQUIRED")]
    public async Task L2_220_AC2_invalid_hours_are_refused_with_a_code_under_their_field_and_nothing_is_saved(string body, string field, string code)
    {
        var response = await SaveRaw(Trevor(), body);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty(field).GetString());
        var hours = (await _factory.GetJson("/api/my-business/services", Trevor())).GetProperty("meetingHours");
        Assert.False(hours.GetProperty("ownerSet").GetBoolean());
        Assert.Equal(["09:00", "10:00", "13:30", "16:00", "19:00"], await Slots("2026-11-12"));
    }

    // L2-220 AC8
    [Fact]
    public async Task L2_220_AC8_only_the_owner_sets_the_hours_and_only_of_their_own_listing()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Save(_factory.CreateClient(), [1], "09:00", "10:00", 30)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Save(Joanna(), [1], "09:00", "10:00", 30)).StatusCode);
        var unknown = await SaveRaw(Trevor(), """{"days":[1],"opensAt":"09:00","closesAt":"10:00","slotMinutes":30,"listingId":"wise-plumbing"}""");
        Assert.Equal(HttpStatusCode.BadRequest, unknown.StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await Save(Trevor(), [6], "09:00", "10:00", 30)).StatusCode);

        var other = await _factory.Query(db => db.Listings.AsNoTracking().SingleAsync(l => l.Slug == "wise-plumbing"));
        Assert.Equal(Listing.WeekdayBits, other.MeetingDays);
        Assert.Null(other.MeetingSlotMinutes);
    }
}
