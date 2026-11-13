using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Requests;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Track and cancel requests: L2-043, L2-047 to L2-049, L2-133 and L2-182. Joanna's requests are to
// Legacy Financial (Trevor), WaterWorks Plumbing & Drains (Wanda) and Christian Bookstores (Ben).
// "Today" is Tuesday 10 November 2026, 10:00 in Toronto (ListingMother.Now).
public sealed class MemberRequestTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string JoannaId = "member|joanna";

    private readonly JubileeApiFactory _factory;
    private Member _trevor = null!;
    private Member _wanda = null!;
    private Listing _legacy = null!;
    private Listing _water = null!;
    private Listing _books = null!;
    private Request _meeting = null!;
    private Request _drain = null!;
    private Request _bible = null!;
    private Request _flowers = null!;

    public MemberRequestTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _trevor = Owner("Trevor", "Okafor", "trevor@example.com");
        _wanda = Owner("Wanda", "Reid", "wanda@example.com");
        var ben = Owner("Ben", "Ito", "ben@example.com");
        _legacy = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        _legacy.AssignOwner(_trevor.Id.ToString());
        _water = ListingMother.Public("waterworks", "home-property", "WaterWorks Plumbing & Drains");
        _water.AssignOwner(_wanda.Id.ToString());
        _books = ListingMother.Public("christian-bookstores", "shops", "Christian Bookstores");
        _books.AssignOwner(ben.Id.ToString());

        // Booked on Monday evening for Thursday 12 November, 10:00 to 10:30 in Toronto; confirmed this morning.
        _meeting = Request.Book(
            JoannaId, "Joanna Adeyemi", _legacy.Id, Guid.NewGuid(), "Discovery meeting", TorontoClock.At(new DateOnly(2026, 11, 12), new TimeOnly(10, 0)),
            TimeSpan.FromMinutes(30), MeetingMode.Video, null, "I'd like to talk about RRSPs and a giving plan.", Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-1));
        _meeting.Confirm(_trevor.Id.ToString(), ListingMother.Now.AddHours(-1));
        _drain = Request.AskForQuote(
            JoannaId, "Joanna Adeyemi", _water.Id, null, null, "Kitchen drain is slow and gurgling. Tried a plunger. Semi-detached, 1950s pipes.",
            new DateOnly(2026, 11, 13), null, "4165550142", Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-1).AddHours(2));
        _bible = Order(_books, "Leather journaling Bible, ESV", 1, 6400, "Pickup Fri 13 Nov", ListingMother.Now.AddDays(-2));
        _bible.Confirm(ben.Id.ToString(), ListingMother.Now.AddDays(-1));
        _flowers = Order(_books, "Autumn table arrangement", 1, 8500, "Delivered Wed 28 Oct", ListingMother.Now.AddDays(-13));
        _flowers.Confirm(ben.Id.ToString(), ListingMother.Now.AddDays(-12));
        _flowers.Complete("system", ListingMother.Now.AddDays(-11));
        var other = Request.AskForQuote(
            "member|someone", "Someone Else", _water.Id, null, null, "A private ask.", null, null, null, Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-1));
        await _factory.Arrange(_trevor, _wanda, ben, _legacy, _water, _books, _meeting, _drain, _bible, _flowers, other);
        Other = other;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private Request Other { get; set; } = null!;

    private static Member Owner(string first, string last, string email)
    {
        var member = Member.Join(EmailAddress.TryParse(email)!, first, last, null, "hash", ListingMother.Now);
        member.ConfirmEmail();
        return member;
    }

    private static Request Order(Listing shop, string product, int quantity, int unitCents, string delivery, DateTimeOffset at) =>
        Request.AskForOrder(
            JoannaId, "Joanna Adeyemi", shop.Id, Guid.NewGuid(), product, null, quantity, new OrderAmounts(unitCents, unitCents * quantity, 0), delivery,
            null, null, Guid.NewGuid().ToString(), at);

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", JoannaId);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static IEnumerable<string?> Titles(JsonElement page) =>
        page.GetProperty("rows").EnumerateArray().Select(r => r.GetProperty("title").GetString());

    private async Task<Request> Reload(Request request)
    {
        Request? found = null;
        await _factory.WithDb(async db => found = await db.Requests.AsNoTracking().Include(r => r.Transitions).SingleAsync(r => r.Id == request.Id));
        return found!;
    }

    private Task<HttpResponseMessage> Cancel(Request request, HttpClient? client = null) =>
        (client ?? Joanna()).PostAsync($"/api/requests/{request.Id}/cancel", null);

    private Task<HttpResponseMessage> Undo(Request request, HttpClient? client = null) =>
        (client ?? Joanna()).PostAsync($"/api/requests/{request.Id}/cancel/undo", null);

    // L2-047 AC1
    [Fact]
    public async Task L2_047_AC1_the_page_counts_what_is_open_and_awaiting_and_each_tab()
    {
        var page = await _factory.GetJson("/api/requests", Joanna());

        Assert.Equal(3, page.GetProperty("open").GetInt32());
        Assert.Equal(1, page.GetProperty("awaiting").GetInt32());
        var counts = page.GetProperty("counts");
        Assert.Equal(4, counts.GetProperty("all").GetInt32());
        Assert.Equal(1, counts.GetProperty("bookings").GetInt32());
        Assert.Equal(1, counts.GetProperty("quotes").GetInt32());
        Assert.Equal(2, counts.GetProperty("orders").GetInt32());
        Assert.Equal(0, counts.GetProperty("declined").GetInt32());
        Assert.Equal("all", page.GetProperty("tab").GetString());
    }

    // L2-047 AC2
    [Fact]
    public async Task L2_047_AC2_each_row_has_a_title_the_type_and_business_a_detail_line_and_a_status()
    {
        var page = await _factory.GetJson("/api/requests", Joanna());

        var rows = page.GetProperty("rows").EnumerateArray().ToDictionary(r => r.GetProperty("title").GetString()!);
        var meeting = rows["Discovery meeting"];
        Assert.Equal("Booking", meeting.GetProperty("kindLabel").GetString());
        Assert.Equal("Legacy Financial", meeting.GetProperty("business").GetString());
        Assert.Equal("Thu 12 Nov, 10:00 a.m. · Video", meeting.GetProperty("detail").GetString());
        Assert.Equal("Confirmed", meeting.GetProperty("statusLabel").GetString());
        var drain = rows["Kitchen drain is slow and gurgling"];
        Assert.Equal("Quote", drain.GetProperty("kindLabel").GetString());
        Assert.Equal("WaterWorks Plumbing & Drains", drain.GetProperty("business").GetString());
        Assert.Equal(JsonValueKind.Null, drain.GetProperty("detail").ValueKind);
        Assert.Equal(_drain.CreatedAt, drain.GetProperty("sentAt").GetDateTimeOffset());
        Assert.Equal("Awaiting reply", drain.GetProperty("statusLabel").GetString());
        var bible = rows["Leather journaling Bible, ESV × 1"];
        Assert.Equal("Order", bible.GetProperty("kindLabel").GetString());
        Assert.Equal("Pickup Fri 13 Nov · $64.00 + tax", bible.GetProperty("detail").GetString());
        Assert.Equal("Completed", rows["Autumn table arrangement × 1"].GetProperty("statusLabel").GetString());
    }

    // L2-047 AC3
    [Fact]
    public async Task L2_047_AC3_open_requests_come_first_by_the_soonest_date_then_closed_ones_newest_first()
    {
        var page = await _factory.GetJson("/api/requests", Joanna());

        // The quote is needed by 13 Nov, the meeting is 12 Nov and the Bible order was sent on 8 Nov.
        Assert.Equal(
            ["Leather journaling Bible, ESV × 1", "Discovery meeting", "Kitchen drain is slow and gurgling", "Autumn table arrangement × 1"],
            Titles(page));
    }

    // L2-047 AC4
    [Fact]
    public async Task L2_047_AC4_a_tab_lists_only_its_own_requests_and_an_empty_one_lists_none()
    {
        var orders = await _factory.GetJson("/api/requests?tab=orders", Joanna());
        var declined = await _factory.GetJson("/api/requests?tab=declined", Joanna());

        Assert.Equal(["Leather journaling Bible, ESV × 1", "Autumn table arrangement × 1"], Titles(orders));
        Assert.Equal("orders", orders.GetProperty("tab").GetString());
        Assert.Empty(declined.GetProperty("rows").EnumerateArray());
        Assert.Equal(4, declined.GetProperty("counts").GetProperty("all").GetInt32());
    }

    // L2-047 AC5
    [Fact]
    public async Task L2_047_AC5_a_member_with_no_requests_gets_an_empty_page()
    {
        var page = await _factory.GetJson("/api/requests", _factory.CreateMemberClient("Newcomer", "member|new"));

        Assert.Equal(0, page.GetProperty("counts").GetProperty("all").GetInt32());
        Assert.Empty(page.GetProperty("rows").EnumerateArray());
    }

    // L2-047 AC6
    [Fact]
    public async Task L2_047_AC6_the_list_loads_20_at_a_time_and_offers_the_next_page()
    {
        var more = Enumerable.Range(0, 24)
            .Select(i => Order(_books, $"Candle {i:00}", 1, 1000, "Pickup", ListingMother.Now.AddHours(-i - 1)))
            .ToArray<object>();
        await _factory.Arrange(more);

        var first = await _factory.GetJson("/api/requests?tab=orders", Joanna());
        var cursor = first.GetProperty("nextCursor").GetString();
        var second = await _factory.GetJson($"/api/requests?tab=orders&cursor={cursor}", Joanna());

        Assert.Equal(20, first.GetProperty("rows").GetArrayLength());
        Assert.NotNull(cursor);
        Assert.Equal(6, second.GetProperty("rows").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
        Assert.Equal(26, first.GetProperty("counts").GetProperty("orders").GetInt32());
        var all = Titles(first).Concat(Titles(second)).ToList();
        Assert.Equal(26, all.Distinct().Count());
    }

    [Fact]
    public async Task L2_133_AC2_a_list_never_holds_another_member_s_request()
    {
        var page = await _factory.GetJson("/api/requests", Joanna());

        Assert.DoesNotContain("A private ask", string.Join(" ", Titles(page)));
        Assert.Equal(4, page.GetProperty("counts").GetProperty("all").GetInt32());
    }

    [Fact]
    public async Task L2_047_a_list_that_cannot_load_carries_the_reference_JB_REQ_501()
    {
        _factory.Database.Unavailable = true;

        var response = await Joanna().GetAsync("/api/requests");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-REQ-501", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-048 AC1
    [Fact]
    public async Task L2_048_AC1_a_quote_awaiting_reply_shows_the_callout_the_details_and_the_progress()
    {
        var detail = await _factory.GetJson($"/api/requests/{_drain.Id}", Joanna());

        Assert.Equal("Kitchen drain is slow and gurgling", detail.GetProperty("title").GetString());
        Assert.Equal("Quote", detail.GetProperty("kindLabel").GetString());
        Assert.Equal("WaterWorks Plumbing & Drains", detail.GetProperty("business").GetString());
        Assert.Equal("Awaiting reply", detail.GetProperty("statusLabel").GetString());
        var callout = detail.GetProperty("callout");
        Assert.Equal("Waiting for WaterWorks Plumbing & Drains to reply", callout.GetProperty("title").GetString());
        Assert.Equal("They usually answer within a day. We’ll notify you the moment they do.", callout.GetProperty("text").GetString());
        var lines = detail.GetProperty("details").EnumerateArray().ToDictionary(l => l.GetProperty("label").GetString()!, l => l.GetProperty("value").GetString());
        Assert.Contains("Kitchen drain is slow", lines["What you need"]);
        Assert.Equal("Needed by Fri 13 Nov", lines["When"]);
        Assert.Equal("Message on Jubilee, or 416-555-0142", lines["Contact"]);
        Assert.True(detail.GetProperty("canCancel").GetBoolean());
        Assert.Equal("Cancel request", detail.GetProperty("cancelLabel").GetString());
        var steps = detail.GetProperty("timeline").EnumerateArray().ToList();
        Assert.Equal(["You asked", "WaterWorks Plumbing & Drains replies", "You accept and arrange a visit"], steps.Select(s => s.GetProperty("title").GetString()));
        Assert.Equal(["complete", "current", "upcoming"], steps.Select(s => s.GetProperty("state").GetString()));
    }

    // L2-048 AC2
    [Fact]
    public async Task L2_048_AC2_a_confirmed_booking_says_who_confirmed_when_and_how_and_offers_the_calendar()
    {
        var detail = await _factory.GetJson($"/api/requests/{_meeting.Id}", Joanna());

        var callout = detail.GetProperty("callout");
        Assert.Equal("Trevor confirmed your meeting", callout.GetProperty("title").GetString());
        Assert.Equal(
            "Thu 12 Nov, 10:00–10:30 a.m. by video. The link is in your messages and we’ll remind you an hour before.",
            callout.GetProperty("text").GetString());
        Assert.True(detail.GetProperty("canAddToCalendar").GetBoolean());
        Assert.Equal("Cancel booking", detail.GetProperty("cancelLabel").GetString());
        Assert.False(detail.GetProperty("shortNotice").GetBoolean());
        Assert.Equal(
            ["You asked", "Legacy Financial confirmed", "Meeting", "Completed"],
            detail.GetProperty("timeline").EnumerateArray().Select(s => s.GetProperty("title").GetString()));
    }

    // L2-048 AC3
    [Fact]
    public async Task L2_048_AC3_a_declined_request_shows_the_business_s_message_and_where_to_find_others()
    {
        var refused = Request.AskForQuote(
            JoannaId, "Joanna Adeyemi", _water.Id, null, null, "Replace the water heater.", null, null, null, Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-2));
        refused.Decline(_wanda.Id.ToString(), ListingMother.Now.AddHours(-2), "something-else", "WaterWorks can't take this job; we're booked until December.");
        await _factory.Arrange(refused);

        var detail = await _factory.GetJson($"/api/requests/{refused.Id}", Joanna());

        Assert.Equal("Declined", detail.GetProperty("statusLabel").GetString());
        var callout = detail.GetProperty("callout");
        Assert.Equal("WaterWorks Plumbing & Drains can’t take this job", callout.GetProperty("title").GetString());
        Assert.Equal("WaterWorks can't take this job; we're booked until December.", callout.GetProperty("quote").GetString());
        Assert.Equal("home-property", detail.GetProperty("categorySlug").GetString());
        Assert.False(string.IsNullOrWhiteSpace(detail.GetProperty("categoryWord").GetString()));
        Assert.False(detail.GetProperty("canCancel").GetBoolean());
        Assert.True(detail.GetProperty("canAskAgain").GetBoolean());
    }

    // L2-048 AC4
    [Fact]
    public async Task L2_048_AC4_a_cancelled_request_says_so_and_offers_no_cancel()
    {
        await Cancel(_drain);

        var detail = await _factory.GetJson($"/api/requests/{_drain.Id}", Joanna());

        Assert.Equal("Cancelled", detail.GetProperty("statusLabel").GetString());
        Assert.Equal("You cancelled this request", detail.GetProperty("callout").GetProperty("title").GetString());
        Assert.Equal("WaterWorks Plumbing & Drains has been told. Nothing more will happen with it.", detail.GetProperty("callout").GetProperty("text").GetString());
        Assert.False(detail.GetProperty("canCancel").GetBoolean());
        Assert.Equal(["You asked", "You cancelled"], detail.GetProperty("timeline").EnumerateArray().Select(s => s.GetProperty("title").GetString()));
    }

    // L2-048 AC5, L2-133 AC2
    [Fact]
    public async Task L2_048_AC5_another_member_s_request_is_not_found()
    {
        var response = await Joanna().GetAsync($"/api/requests/{Other.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task L2_048_an_unknown_request_is_not_found()
    {
        var response = await Joanna().GetAsync($"/api/requests/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // L2-048 AC6
    [Fact]
    public async Task L2_048_AC6_a_request_that_cannot_load_carries_the_reference_JB_REQ_502()
    {
        _factory.Database.Unavailable = true;

        var response = await Joanna().GetAsync($"/api/requests/{_drain.Id}");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-REQ-502", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-043 AC8
    [Fact]
    public async Task L2_043_AC8_a_request_nobody_answered_for_a_week_offers_cancel_or_ask_again()
    {
        _factory.Clock.Advance(TimeSpan.FromDays(7));

        var detail = await _factory.GetJson($"/api/requests/{_drain.Id}", Joanna());

        Assert.True(detail.GetProperty("unanswered").GetBoolean());
        Assert.True(detail.GetProperty("canAskAgain").GetBoolean());
        Assert.True(detail.GetProperty("canCancel").GetBoolean());
        Assert.Contains("over a week", detail.GetProperty("callout").GetProperty("text").GetString());
    }

    // L2-049 AC2
    [Fact]
    public async Task L2_049_AC2_cancelling_an_open_request_cancels_it_and_tells_the_business_at_once()
    {
        var response = await Cancel(_drain);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var decision = await Json(response);
        Assert.Equal("cancelled", decision.GetProperty("status").GetString());
        Assert.Equal("WaterWorks Plumbing & Drains", decision.GetProperty("business").GetString());
        Assert.Equal(_factory.Clock.GetUtcNow().AddSeconds(8), decision.GetProperty("undoUntil").GetDateTimeOffset());
        var request = await Reload(_drain);
        Assert.Equal(RequestStatus.Cancelled, request.Status);
        var last = request.Transitions.OrderBy(t => t.At).Last();
        Assert.Equal((RequestStatus.New, RequestStatus.Cancelled, JoannaId), (last.From, last.To, last.Actor));
        await _factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "wanda@example.com");
            Assert.Contains("cancelled", mail.Subject);
            Assert.Equal(_factory.Clock.GetUtcNow(), mail.NextAttemptAt);
        });
    }

    private async Task<List<JsonElement>> NotificationsOf(HttpClient client) =>
        [.. (await _factory.GetJson("/api/notifications", client)).GetProperty("items").EnumerateArray()];

    private HttpClient Wanda() => _factory.CreateMemberClient("Wanda Reid", _wanda.Id.ToString());

    // L2-049 AC2: the business is notified in the app
    [Fact]
    public async Task L2_049_AC2_cancelling_notifies_the_owner_in_the_app_with_a_link_to_their_requests_and_nobody_else()
    {
        Assert.Equal(HttpStatusCode.OK, (await Cancel(_drain)).StatusCode);

        var told = Assert.Single(await NotificationsOf(Wanda()));
        Assert.Equal("request", told.GetProperty("kind").GetString());
        Assert.Equal("Joanna Adeyemi cancelled a quote request", told.GetProperty("title").GetString());
        Assert.Equal("Kitchen drain is slow and gurgling", told.GetProperty("detail").GetString());
        Assert.Equal("/my-business/requests", told.GetProperty("target").GetString());
        Assert.False(told.GetProperty("read").GetBoolean());
        Assert.Equal(1, (await _factory.GetJson("/api/me/navigation", Wanda())).GetProperty("unreadNotificationCount").GetInt32());
        Assert.Empty(await NotificationsOf(Joanna()));
        Assert.Empty(await NotificationsOf(_factory.CreateMemberClient("Trevor Okafor", _trevor.Id.ToString())));
    }

    // L2-049 AC3: the business is told in the app that the cancellation was withdrawn
    [Fact]
    public async Task L2_049_AC3_undo_tells_the_owner_in_the_app_that_the_cancellation_was_withdrawn()
    {
        await Cancel(_drain);
        _factory.Clock.Advance(TimeSpan.FromSeconds(3));

        Assert.Equal(HttpStatusCode.OK, (await Undo(_drain)).StatusCode);

        var titles = (await NotificationsOf(Wanda())).Select(n => n.GetProperty("title").GetString()).ToList();
        Assert.Equal(["Joanna Adeyemi withdrew the cancellation", "Joanna Adeyemi cancelled a quote request"], titles);
        Assert.All(await NotificationsOf(Wanda()), n => Assert.Equal("/my-business/requests", n.GetProperty("target").GetString()));
        Assert.Empty(await NotificationsOf(Joanna()));
    }

    [Fact]
    public async Task L2_049_a_confirmed_booking_can_be_cancelled()
    {
        var response = await Cancel(_meeting);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(RequestStatus.Cancelled, (await Reload(_meeting)).Status);
    }

    // L2-049 AC3
    [Fact]
    public async Task L2_049_AC3_undo_within_8_seconds_returns_the_request_to_its_previous_status_and_tells_the_business()
    {
        await Cancel(_meeting);
        _factory.Clock.Advance(TimeSpan.FromSeconds(7));

        var response = await Undo(_meeting);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("confirmed", (await Json(response)).GetProperty("status").GetString());
        Assert.Equal(RequestStatus.Confirmed, (await Reload(_meeting)).Status);
        await _factory.WithDb(async db =>
        {
            var mails = await db.OutboxMessages.AsNoTracking().Where(m => m.ToAddress == "trevor@example.com").ToListAsync();
            Assert.Equal(2, mails.Count);
            Assert.Contains(mails, m => m.Subject.Contains("withdrew", StringComparison.Ordinal));
        });
    }

    [Fact]
    public async Task L2_049_AC3_undo_of_a_new_request_returns_it_to_new_and_the_undone_cancel_leaves_the_progress()
    {
        await Cancel(_drain);
        _factory.Clock.Advance(TimeSpan.FromSeconds(2));
        await Undo(_drain);

        var detail = await _factory.GetJson($"/api/requests/{_drain.Id}", Joanna());

        Assert.Equal("new", detail.GetProperty("status").GetString());
        Assert.DoesNotContain("You cancelled", detail.GetProperty("timeline").EnumerateArray().Select(s => s.GetProperty("title").GetString()));
    }

    [Fact]
    public async Task L2_049_AC3_undo_after_8_seconds_is_refused()
    {
        await Cancel(_drain);
        _factory.Clock.Advance(TimeSpan.FromSeconds(9));

        var response = await Undo(_drain);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("INVALID_TRANSITION", (await Json(response)).GetProperty("code").GetString());
        Assert.Equal(RequestStatus.Cancelled, (await Reload(_drain)).Status);
    }

    [Fact]
    public async Task L2_049_undo_of_a_cancel_that_was_never_made_is_refused()
    {
        var response = await Undo(_drain);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(RequestStatus.New, (await Reload(_drain)).Status);
    }

    // L2-043 AC6
    [Fact]
    public async Task L2_043_AC6_a_request_that_is_closed_cannot_be_cancelled()
    {
        var completed = await Cancel(_flowers);
        await Cancel(_drain);
        var twice = await Cancel(_drain);

        Assert.Equal(HttpStatusCode.Conflict, completed.StatusCode);
        Assert.Equal("INVALID_TRANSITION", (await Json(completed)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Conflict, twice.StatusCode);
        Assert.Equal(RequestStatus.Completed, (await Reload(_flowers)).Status);
    }

    // L2-049 AC5
    [Fact]
    public async Task L2_049_AC5_a_booking_less_than_a_day_away_is_marked_short_notice()
    {
        _factory.Clock.Advance(TimeSpan.FromDays(1.2));

        var detail = await _factory.GetJson($"/api/requests/{_meeting.Id}", Joanna());

        Assert.True(detail.GetProperty("shortNotice").GetBoolean());
    }

    // L2-133 AC2
    [Fact]
    public async Task L2_133_AC2_another_member_cannot_cancel_or_undo_a_request_and_nothing_changes()
    {
        var stranger = _factory.CreateMemberClient("Someone Else", "member|someone2");

        var cancel = await Cancel(_drain, stranger);
        var undo = await Undo(_drain, stranger);

        Assert.Equal(HttpStatusCode.NotFound, cancel.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, undo.StatusCode);
        Assert.Equal(RequestStatus.New, (await Reload(_drain)).Status);
    }

    [Fact]
    public async Task L2_133_a_visitor_is_refused_every_member_request_endpoint()
    {
        var visitor = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync("/api/requests")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync($"/api/requests/{_drain.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.PostAsync($"/api/requests/{_drain.Id}/cancel", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.PostAsync($"/api/requests/{_drain.Id}/cancel/undo", null)).StatusCode);
    }

    // L2-043 AC5
    [Fact]
    public async Task L2_043_AC5_the_owner_marks_a_confirmed_order_fulfilled()
    {
        var owner = _factory.CreateMemberClient("Ben Ito", await OwnerSubject(_books));

        var response = await owner.PostAsync($"/api/my-business/requests/{_bible.Id}/fulfil", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(RequestStatus.Completed, (await Reload(_bible)).Status);
    }

    [Fact]
    public async Task L2_043_AC6_an_order_that_is_not_confirmed_cannot_be_fulfilled_and_another_business_cannot_try()
    {
        var order = Order(_books, "Pen", 1, 500, "Pickup", ListingMother.Now);
        await _factory.Arrange(order);
        var owner = _factory.CreateMemberClient("Ben Ito", await OwnerSubject(_books));
        var other = _factory.CreateMemberClient("Wanda Reid", _wanda.Id.ToString());

        var notConfirmed = await owner.PostAsync($"/api/my-business/requests/{order.Id}/fulfil", null);
        var wrongBusiness = await other.PostAsync($"/api/my-business/requests/{_bible.Id}/fulfil", null);

        Assert.Equal(HttpStatusCode.Conflict, notConfirmed.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, wrongBusiness.StatusCode);
        Assert.Equal(RequestStatus.Confirmed, (await Reload(_bible)).Status);
    }

    // L2-043 AC5, L2-182
    [Fact]
    public async Task L2_043_AC5_L2_182_a_confirmed_booking_completes_after_its_meeting_ends_once()
    {
        Assert.Equal(0, await Send(new CompleteFinishedBookingsCommand()));
        _factory.Clock.Advance(TimeSpan.FromDays(2).Add(TimeSpan.FromMinutes(31)));

        var first = await Send(new CompleteFinishedBookingsCommand());
        var second = await Send(new CompleteFinishedBookingsCommand());

        Assert.Equal(1, first);
        Assert.Equal(0, second);
        var meeting = await Reload(_meeting);
        Assert.Equal(RequestStatus.Completed, meeting.Status);
        Assert.Equal("system", meeting.Transitions.OrderBy(t => t.At).Last().Actor);
    }

    // L2-043 AC8, L2-182
    [Fact]
    public async Task L2_043_AC8_L2_182_the_owner_of_a_request_nobody_answered_is_reminded_once()
    {
        Assert.Equal(0, await Send(new RemindUnansweredRequestsCommand()));
        _factory.Clock.Advance(TimeSpan.FromDays(7));

        var first = await Send(new RemindUnansweredRequestsCommand());
        var second = await Send(new RemindUnansweredRequestsCommand());

        // Joanna's drain quote and the stranger's private ask both wait on WaterWorks.
        Assert.Equal(2, first);
        Assert.Equal(0, second);
        await _factory.WithDb(async db =>
        {
            var mails = await db.OutboxMessages.AsNoTracking().Where(m => m.ToAddress == "wanda@example.com").ToListAsync();
            Assert.Equal(2, mails.Count);
            Assert.All(mails, m => Assert.Contains("still waiting", m.Subject));
        });
    }

    private async Task<string> OwnerSubject(Listing listing)
    {
        var subject = string.Empty;
        await _factory.WithDb(async db => subject = (await db.Listings.AsNoTracking().SingleAsync(l => l.Id == listing.Id)).OwnerId!);
        return subject;
    }

    private async Task<int> Send(IRequest<int> command)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(command);
    }
}
