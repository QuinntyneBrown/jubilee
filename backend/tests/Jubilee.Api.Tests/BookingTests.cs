using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Book a meeting: L2-043, L2-044, L2-050, L2-132 (and L2-005 AC2 for the restricted action).
// "Today" is Tuesday 10 November 2026, 10:00 in Toronto (ListingMother.Now).
public sealed class BookingTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string TrevorId = "member|trevor";

    private readonly JubileeApiFactory _factory;
    private Guid _discovery;
    private Guid _review;
    private Guid _otherBusinessService;

    public BookingTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var legacy = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        legacy.AssignOwner(TrevorId);
        legacy.Describe(new ListingProfile("Trevor Chew, CKA®", [], null, "2 Sheppard Ave E, North York", null, null, null, null));
        legacy.SetMeetingArea("North York");
        var discovery = Service.Create(legacy.Id, 1, "Discovery meeting", "30 min · Video or in person", ServicePrice.Free, ServiceAction.Book);
        var review = Service.Create(legacy.Id, 2, "Retirement & RRSP review", "60 min", ServicePrice.Free, ServiceAction.Book);
        var estate = Service.Create(legacy.Id, 3, "Estate & legacy plan", "Ask", ServicePrice.Ask, ServiceAction.Ask);
        var other = ListingMother.Public("wise-plumbing", "home-property", "Wise Plumbing");
        var otherService = Service.Create(other.Id, 1, "Estimate", "30 min", ServicePrice.Free, ServiceAction.Book);
        await _factory.Arrange(legacy, discovery, review, estate, other, otherService);
        _discovery = discovery.Id;
        _review = review.Id;
        _otherBusinessService = otherService.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private Task<HttpResponseMessage> Book(
        HttpClient client,
        string? day = "2026-11-12",
        string? time = "10:00",
        string mode = "video",
        string? note = null,
        Guid? service = null,
        string slug = "legacy-financial",
        string? key = null) =>
        client.PostAsJsonAsync("/api/requests/bookings", new
        {
            listingSlug = slug,
            serviceId = service ?? _discovery,
            day,
            time,
            mode,
            note,
            idempotencyKey = key ?? Guid.NewGuid().ToString(),
        });

    private async Task<int> RequestCount()
    {
        var count = 0;
        await _factory.WithDb(async db => count = await db.Requests.CountAsync());
        return count;
    }

    // L2-044 AC1
    [Fact]
    public async Task L2_044_AC1_the_options_name_the_bookable_services_the_days_and_the_area()
    {
        var options = await _factory.GetJson("/api/listings/legacy-financial/booking", Joanna());

        Assert.Equal("Legacy Financial", options.GetProperty("business").GetProperty("name").GetString());
        Assert.Equal("Trevor", options.GetProperty("ownerFirstName").GetString());
        Assert.Equal("Monday to Friday", options.GetProperty("meetsOn").GetString());
        Assert.Equal("North York", options.GetProperty("area").GetString());
        Assert.Equal(180, options.GetProperty("maxDaysAhead").GetInt32());
        var services = options.GetProperty("services").EnumerateArray().ToList();
        Assert.Equal(["Discovery meeting", "Retirement & RRSP review"], services.Select(s => s.GetProperty("name").GetString()));
        Assert.Equal(_discovery, services[0].GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task L2_044_a_business_that_is_not_public_has_no_booking_options()
    {
        await _factory.Arrange(ListingMother.NonPublic(NonPublicState.Paused, "paused-shop"));

        var response = await Joanna().GetAsync("/api/listings/paused-shop/booking");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // L2-044 AC1, AC3
    [Fact]
    public async Task L2_044_AC1_a_working_day_offers_the_slots_and_today_only_the_slots_still_ahead()
    {
        var thursday = await _factory.GetJson($"/api/listings/legacy-financial/availability?serviceId={_discovery}&day=2026-11-12", Joanna());
        var today = await _factory.GetJson($"/api/listings/legacy-financial/availability?serviceId={_discovery}&day=2026-11-10", Joanna());

        Assert.True(thursday.GetProperty("available").GetBoolean());
        Assert.Equal(["09:00", "10:00", "13:30", "16:00", "19:00"], thursday.GetProperty("slots").EnumerateArray().Select(s => s.GetString()));
        Assert.Equal(["13:30", "16:00", "19:00"], today.GetProperty("slots").EnumerateArray().Select(s => s.GetString()));
    }

    [Theory]
    [InlineData("2026-11-09")] // the past
    [InlineData("2026-11-14")] // a Saturday: closed
    [InlineData("2027-05-12")] // more than 180 days ahead
    public async Task L2_044_AC3_a_past_closed_or_distant_day_is_unavailable(string day)
    {
        var answer = await _factory.GetJson($"/api/listings/legacy-financial/availability?serviceId={_discovery}&day={day}", Joanna());

        Assert.False(answer.GetProperty("available").GetBoolean());
        Assert.Empty(answer.GetProperty("slots").EnumerateArray());
    }

    [Fact]
    public async Task L2_044_the_last_day_offered_is_180_days_ahead()
    {
        // 2027-05-08 is a Saturday; the Friday before is 179 days ahead and 2027-05-10 (Monday) is 181.
        var inside = await _factory.GetJson($"/api/listings/legacy-financial/availability?serviceId={_discovery}&day=2027-05-07", Joanna());
        var outside = await _factory.GetJson($"/api/listings/legacy-financial/availability?serviceId={_discovery}&day=2027-05-10", Joanna());

        Assert.True(inside.GetProperty("available").GetBoolean());
        Assert.False(outside.GetProperty("available").GetBoolean());
    }

    // L2-044 AC4, AC5; L2-043 AC1
    [Fact]
    public async Task L2_044_AC4_L2_043_AC1_a_valid_booking_creates_a_new_request_and_tells_the_owner()
    {
        var response = await Book(Joanna(), note: "I'd like to talk about RRSPs and a giving plan.", mode: "in-person");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await Json(response);
        Assert.Equal("new", created.GetProperty("status").GetString());
        Request request = default!;
        await _factory.WithDb(async db => request = await db.Requests.AsNoTracking().SingleAsync());
        Assert.Equal(created.GetProperty("id").GetGuid(), request.Id);
        Assert.Equal(RequestStatus.New, request.Status);
        Assert.Equal("member|joanna", request.MemberSubject);
        Assert.Equal(new DateTimeOffset(2026, 11, 12, 10, 0, 0, TimeSpan.FromHours(-5)), request.StartsAt);
        Assert.Equal(request.StartsAt!.Value.AddMinutes(30), request.EndsAt);
        Assert.Equal(MeetingMode.InPerson, request.Mode);
        Assert.Equal("I'd like to talk about RRSPs and a giving plan.", request.Note);
        Assert.Equal("North York", request.Location);
        Assert.Equal("Awaiting reply", created.GetProperty("memberStatus").GetString());
    }

    [Fact]
    public async Task L2_044_AC5_the_owner_gets_an_e_mail_with_the_request()
    {
        var trevor = Member.Join(EmailAddress.TryParse("trevor@legacy.example")!, "Trevor", "Chew", null, "hash", ListingMother.Now);
        await _factory.WithDb(async db =>
        {
            db.Members.Add(trevor);
            var listing = await db.Listings.SingleAsync(l => l.Slug == "legacy-financial");
            listing.AssignOwner(trevor.Id.ToString());
            await db.SaveChangesAsync();
        });

        await Book(Joanna());

        OutboxMessage mail = default!;
        await _factory.WithDb(async db => mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "trevor@legacy.example"));
        Assert.Contains("Joanna", mail.Subject);
        Assert.Contains("Thu 12 Nov", mail.TextBody);
        Assert.Contains("10:00", mail.TextBody);
        Assert.Contains("Discovery meeting", mail.TextBody);
    }

    // L2-044 AC4, AC5: the owner is told in the app when the request arrives, the member when it is confirmed
    [Fact]
    public async Task L2_044_AC5_the_owner_gets_an_in_app_notification_and_the_member_gets_one_when_it_is_confirmed()
    {
        var trevor = _factory.CreateMemberClient("Trevor Chew", TrevorId);
        var booked = await Json(await Book(Joanna()));

        var owners = (await Json(await trevor.GetAsync("/api/notifications"))).GetProperty("items");
        var told = Assert.Single(owners.EnumerateArray());
        Assert.Equal("New booking request from Joanna Adeyemi", told.GetProperty("title").GetString());
        Assert.Equal("Discovery meeting · Thu 12 Nov, 10:00", told.GetProperty("detail").GetString());
        Assert.Equal("request", told.GetProperty("kind").GetString());
        Assert.Equal("/my-business/requests", told.GetProperty("target").GetString());
        Assert.Empty((await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray());

        Assert.Equal(HttpStatusCode.OK, (await trevor.PostAsync($"/api/my-business/requests/{booked.GetProperty("id").GetGuid()}/confirm", null)).StatusCode);

        var members = (await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items");
        var confirmed = Assert.Single(members.EnumerateArray());
        Assert.Contains("confirmed", confirmed.GetProperty("title").GetString());
        Assert.Equal($"/requests/{booked.GetProperty("id").GetGuid()}", confirmed.GetProperty("target").GetString());
    }

    [Fact]
    public async Task L2_044_a_note_of_exactly_1000_characters_is_kept()
    {
        var response = await Book(Joanna(), note: new string('n', 1000));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // L2-044 AC2, AC3, AC6
    [Theory]
    [InlineData(null, "10:00", "day", "REQUIRED")]
    [InlineData("2026-11-12", null, "time", "REQUIRED")]
    [InlineData("2026-11-09", "10:00", "day", "DAY_UNAVAILABLE")]
    [InlineData("2026-11-14", "10:00", "day", "DAY_UNAVAILABLE")]
    [InlineData("2027-05-12", "10:00", "day", "DAY_UNAVAILABLE")]
    [InlineData("not-a-day", "10:00", "day", "DAY_UNAVAILABLE")]
    [InlineData("2026-11-12", "11:07", "time", "TIME_UNAVAILABLE")]
    [InlineData("2026-11-10", "09:00", "time", "TIME_UNAVAILABLE")]
    public async Task L2_044_AC2_AC3_an_invalid_booking_is_refused_with_a_field_code_and_nothing_is_created(
        string? day, string? time, string field, string code)
    {
        var response = await Book(Joanna(), day, time);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty(field).GetString());
        Assert.Equal(0, await RequestCount());
    }

    [Fact]
    public async Task L2_044_AC6_a_note_over_1000_characters_is_refused()
    {
        var response = await Book(Joanna(), note: new string('n', 1001));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("TOO_LONG", (await Json(response)).GetProperty("errors").GetProperty("note").GetString());
    }

    [Fact]
    public async Task L2_044_a_slot_that_is_already_taken_by_the_same_member_is_still_a_separate_request_but_a_second_member_may_ask_too()
    {
        await Book(Joanna());
        var second = await Book(_factory.CreateMemberClient("Sam Stranger", "member|sam"));

        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
        Assert.Equal(2, await RequestCount());
    }

    [Fact]
    public async Task L2_044_the_service_must_be_one_this_business_offers_to_book()
    {
        var elsewhere = await Book(Joanna(), service: _otherBusinessService);
        var unknown = await Book(Joanna(), service: Guid.NewGuid());
        var quoteOnly = Guid.Empty;
        await _factory.WithDb(async db => quoteOnly = (await db.Services.AsNoTracking().SingleAsync(s => s.Action == ServiceAction.Ask)).Id);
        var ask = await Book(Joanna(), service: quoteOnly);

        Assert.Equal(HttpStatusCode.NotFound, elsewhere.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, ask.StatusCode);
    }

    [Fact]
    public async Task L2_044_a_business_that_is_not_public_cannot_be_booked_and_the_owner_cannot_book_themselves()
    {
        await _factory.Arrange(ListingMother.NonPublic(NonPublicState.Paused, "paused-shop"));

        Assert.Equal(HttpStatusCode.NotFound, (await Book(Joanna(), slug: "paused-shop")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Book(Joanna(), slug: "no-such-business")).StatusCode);
        var own = await Book(_factory.CreateMemberClient("Trevor Chew", TrevorId));
        Assert.Equal(HttpStatusCode.Conflict, own.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(own)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_044_a_visitor_is_told_to_sign_in()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Book(_factory.CreateClient())).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/listings/legacy-financial/booking")).StatusCode);
    }

    // L2-005 AC2
    [Fact]
    public async Task L2_005_AC2_a_member_with_an_unconfirmed_e_mail_cannot_book()
    {
        await _factory.CreateClient().PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Una", lastName = "Confirmed", email = "una@example.com", password = "correct horse 13",
            homeChurch = (string?)null, agreementAccepted = true,
        });
        Member member = default!;
        await _factory.WithDb(async db => member = await db.Members.AsNoTracking().SingleAsync(m => m.EmailKey == "una@example.com"));

        var response = await Book(_factory.CreateMemberClient("Una Confirmed", member.Id.ToString()));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("EMAIL_UNCONFIRMED", (await Json(response)).GetProperty("code").GetString());
    }

    // L2-132
    [Fact]
    public async Task L2_132_a_repeated_idempotency_key_returns_the_original_and_creates_no_duplicate()
    {
        var joanna = Joanna();
        var first = await Book(joanna, key: "booking-1");
        var again = await Book(joanna, key: "booking-1");

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal((await Json(first)).GetProperty("id").GetGuid(), (await Json(again)).GetProperty("id").GetGuid());
        Assert.Equal(1, await RequestCount());
    }

    // L2-050
    private async Task<Guid> ArrangeBooking(Action<Request>? change = null)
    {
        var created = await Json(await Book(Joanna(), mode: "in-person"));
        var id = created.GetProperty("id").GetGuid();
        await _factory.WithDb(async db =>
        {
            var request = await db.Requests.SingleAsync(r => r.Id == id);
            change?.Invoke(request);
            await db.SaveChangesAsync();
        });
        return id;
    }

    [Fact]
    public async Task L2_050_AC1_a_confirmed_booking_downloads_a_calendar_file()
    {
        var id = await ArrangeBooking(r => r.Confirm("member|trevor", ListingMother.Now));

        var response = await Joanna().GetAsync($"/api/requests/{id}/calendar.ics");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/calendar", response.Content.Headers.ContentType!.MediaType);
        var ics = await response.Content.ReadAsStringAsync();
        Assert.Contains("BEGIN:VCALENDAR", ics);
        Assert.Contains("SUMMARY:Discovery meeting with Legacy Financial", ics);
        Assert.Contains("DTSTART;TZID=America/Toronto:20261112T100000", ics);
        Assert.Contains("DTEND;TZID=America/Toronto:20261112T103000", ics);
        Assert.Contains("LOCATION:North York", ics);
        Assert.Contains($"UID:{id}@jubilee", ics);
        Assert.Contains("STATUS:CONFIRMED", ics);
        Assert.Contains($"https://jubilee.test/requests/{id}", ics);
        Assert.Contains("\r\n", ics);
    }

    [Fact]
    public async Task L2_050_a_video_booking_says_Video_for_its_location()
    {
        var created = await Json(await Book(Joanna(), mode: "video"));
        var id = created.GetProperty("id").GetGuid();
        await _factory.WithDb(async db =>
        {
            (await db.Requests.SingleAsync()).Confirm("member|trevor", ListingMother.Now);
            await db.SaveChangesAsync();
        });

        var ics = await (await Joanna().GetAsync($"/api/requests/{id}/calendar.ics")).Content.ReadAsStringAsync();

        Assert.Contains("LOCATION:Video", ics);
    }

    [Fact]
    public async Task L2_050_AC2_after_it_is_cancelled_the_same_link_carries_STATUS_CANCELLED()
    {
        var id = await ArrangeBooking(r =>
        {
            r.Confirm("member|trevor", ListingMother.Now);
            r.Cancel("member|joanna", ListingMother.Now);
        });

        var ics = await (await Joanna().GetAsync($"/api/requests/{id}/calendar.ics")).Content.ReadAsStringAsync();

        Assert.Contains("STATUS:CANCELLED", ics);
        Assert.Contains($"UID:{id}@jubilee", ics);
    }

    [Fact]
    public async Task L2_050_a_booking_that_nobody_confirmed_or_somebody_elses_has_no_calendar_file()
    {
        var waiting = await ArrangeBooking();
        var confirmed = await ArrangeBooking(r => r.Confirm("member|trevor", ListingMother.Now));

        Assert.Equal(HttpStatusCode.NotFound, (await Joanna().GetAsync($"/api/requests/{waiting}/calendar.ics")).StatusCode);
        var stranger = _factory.CreateMemberClient("Sam Stranger", "member|sam");
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/requests/{confirmed}/calendar.ics")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync($"/api/requests/{confirmed}/calendar.ics")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Joanna().GetAsync($"/api/requests/{Guid.NewGuid()}/calendar.ics")).StatusCode);
    }

    // L2-043 AC6, AC7: the lifecycle is part of the domain, proved through what it keeps.
    [Fact]
    public async Task L2_043_AC7_every_transition_is_recorded_with_actor_time_and_previous_status()
    {
        var id = await ArrangeBooking(r =>
        {
            r.Confirm("member|trevor", ListingMother.Now.AddMinutes(5));
            r.Cancel("member|joanna", ListingMother.Now.AddMinutes(9));
        });

        List<RequestTransition> transitions = [];
        await _factory.WithDb(async db => transitions = await db.RequestTransitions.AsNoTracking().Where(t => t.RequestId == id).OrderBy(t => t.At).ToListAsync());

        Assert.Equal(
            [(RequestStatus.New, RequestStatus.Confirmed, "member|trevor"), (RequestStatus.Confirmed, RequestStatus.Cancelled, "member|joanna")],
            transitions.Select(t => (t.From, t.To, t.Actor)));
    }

    [Fact]
    public async Task L2_043_AC6_a_transition_that_is_not_allowed_is_refused_and_changes_nothing()
    {
        var id = await ArrangeBooking(r => r.Cancel("member|joanna", ListingMother.Now));

        await _factory.WithDb(async db =>
        {
            var request = await db.Requests.SingleAsync(r => r.Id == id);
            Assert.Throws<InvalidTransitionException>(() => request.Confirm("member|trevor", ListingMother.Now));
            Assert.Throws<InvalidTransitionException>(() => request.Complete("member|trevor", ListingMother.Now));
            Assert.Equal(RequestStatus.Cancelled, request.Status);
            await Task.CompletedTask;
        });
    }
}
