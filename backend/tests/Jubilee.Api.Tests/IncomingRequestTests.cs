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

// Respond to customer requests: L2-043, L2-051 to L2-054, L2-129, L2-133 and L2-182. Naomi owns Luzandre.com.
// "Today" is Tuesday 10 November 2026, 10:00 in Toronto (ListingMother.Now).
public sealed class IncomingRequestTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string NaomiId = "member|naomi";

    private readonly JubileeApiFactory _factory;
    private Listing _listing = null!;
    private Product _tee = null!;
    private Member _samuel = null!;
    private Request _samuelsOrder = null!;
    private Request _ruthsOrder = null!;
    private Request _davidsQuote = null!;

    public IncomingRequestTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        _listing.AssignOwner(NaomiId);
        _tee = Product.Create(_listing.Id, "custom-church-team-tee", "Custom church team tee", 2200, true, TileTint.Gold, TileIcon.Shirt, ListingMother.Now.AddDays(-30));
        _tee.SetStock(30);
        _samuel = Member.Join(EmailAddress.TryParse("samuel@example.com")!, "Samuel", "Park", null, "hash", ListingMother.Now);
        _samuel.ConfirmEmail();
        _samuelsOrder = Order(_samuel.Id.ToString(), "Samuel Park", 24, ListingMother.Now.AddMinutes(-105), "For Agincourt Community Church youth retreat");
        _ruthsOrder = Order("member|ruth", "Ruth Mensah", 2, ListingMother.Now.AddDays(-1), null);
        _davidsQuote = Request.AskForQuote(
            "member|david", "David Chen", _listing.Id, null, "Church merch package", "150 tees and 60 mugs for a 25th anniversary",
            null, null, null, Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-2));
        await _factory.Arrange(_listing, _tee, _samuel, _samuelsOrder, _ruthsOrder, _davidsQuote);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private Request Order(string subject, string name, int quantity, DateTimeOffset at, string? note) =>
        Request.AskForOrder(
            subject, name, _listing.Id, _tee.Id, _tee.Name, null, quantity, new OrderAmounts(2200, 2200 * quantity, 0), "Pickup in Leslieville",
            null, note, Guid.NewGuid().ToString(), at);

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", NaomiId);

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private Task<HttpResponseMessage> Confirm(HttpClient client, Request request) =>
        client.PostAsync($"/api/my-business/requests/{request.Id}/confirm", null);

    private Task<HttpResponseMessage> Decline(HttpClient client, Request request, object? body = null) =>
        client.PostAsJsonAsync($"/api/my-business/requests/{request.Id}/decline", body ?? new
        {
            reason = "cant-meet-the-date",
            message = "I'm sorry, Samuel. I can't print 24 by the 27th; the earliest is 4 December.",
        });

    private async Task<Request> Reload(Request request)
    {
        Request? found = null;
        await _factory.WithDb(async db => found = await db.Requests.AsNoTracking().Include(r => r.Transitions).SingleAsync(r => r.Id == request.Id));
        return found!;
    }

    private async Task<int> StockOfTee()
    {
        var stock = 0;
        await _factory.WithDb(async db => stock = (await db.Products.AsNoTracking().SingleAsync(p => p.Id == _tee.Id)).Stock ?? -1);
        return stock;
    }

    // L2-051 AC1
    [Fact]
    public async Task L2_051_AC1_the_page_counts_the_requests_per_tab()
    {
        var done = Order("member|esther", "Esther Mensah", 1, ListingMother.Now.AddDays(-3), null);
        done.Confirm(NaomiId, ListingMother.Now.AddDays(-2));
        await _factory.Arrange(done);

        var page = await _factory.GetJson("/api/my-business/requests", Naomi());

        Assert.Equal("Luzandre.com", page.GetProperty("listing").GetProperty("name").GetString());
        var counts = page.GetProperty("counts");
        Assert.Equal(3, counts.GetProperty("new").GetInt32());
        Assert.Equal(1, counts.GetProperty("confirmed").GetInt32());
        Assert.Equal(0, counts.GetProperty("declined").GetInt32());
        Assert.Equal(4, counts.GetProperty("all").GetInt32());
        Assert.Equal("new", page.GetProperty("tab").GetString());
    }

    // L2-051 AC2
    [Fact]
    public async Task L2_051_AC2_a_new_request_row_has_the_customer_title_type_time_and_note()
    {
        var page = await _factory.GetJson("/api/my-business/requests?tab=new", Naomi());

        var rows = page.GetProperty("rows").EnumerateArray().ToList();
        Assert.Equal(["Samuel Park", "Ruth Mensah", "David Chen"], rows.Select(r => r.GetProperty("customerName").GetString()));
        var samuel = rows[0];
        Assert.Equal("SP", samuel.GetProperty("customerInitials").GetString());
        Assert.Equal("Custom church team tee × 24", samuel.GetProperty("title").GetString());
        Assert.Equal("order", samuel.GetProperty("kind").GetString());
        Assert.Equal("Order", samuel.GetProperty("kindLabel").GetString());
        Assert.Equal("new", samuel.GetProperty("status").GetString());
        Assert.Equal("New", samuel.GetProperty("statusLabel").GetString());
        Assert.Equal(_samuelsOrder.CreatedAt, samuel.GetProperty("sentAt").GetDateTimeOffset());
        Assert.Contains("For Agincourt Community Church youth retreat", samuel.GetProperty("detail").GetString());
        Assert.Equal("$528.00 + tax", samuel.GetProperty("total").GetString());
        Assert.Equal(JsonValueKind.Null, rows[2].GetProperty("total").ValueKind);
        Assert.Equal("Pickup in Leslieville", rows[1].GetProperty("detail").GetString());
        Assert.Equal("Church merch package", rows[2].GetProperty("title").GetString());
        Assert.Equal("quote", rows[2].GetProperty("kind").GetString());
        Assert.Equal("150 tees and 60 mugs for a 25th anniversary", rows[2].GetProperty("detail").GetString());
    }

    [Fact]
    public async Task L2_051_the_confirmed_and_all_tabs_list_their_requests_newest_first()
    {
        await Confirm(Naomi(), _ruthsOrder);

        var confirmed = await _factory.GetJson("/api/my-business/requests?tab=confirmed", Naomi());
        var all = await _factory.GetJson("/api/my-business/requests?tab=all", Naomi());

        Assert.Equal(["Ruth Mensah"], confirmed.GetProperty("rows").EnumerateArray().Select(r => r.GetProperty("customerName").GetString()));
        Assert.Equal(["Samuel Park", "Ruth Mensah", "David Chen"], all.GetProperty("rows").EnumerateArray().Select(r => r.GetProperty("customerName").GetString()));
    }

    // L2-051 AC4
    [Fact]
    public async Task L2_051_AC4_declined_requests_are_kept_for_90_days()
    {
        await Decline(Naomi(), _davidsQuote, new { reason = "something-else", message = "Not something we do." });
        _factory.Clock.Advance(TimeSpan.FromDays(89));
        var kept = await _factory.GetJson("/api/my-business/requests?tab=declined", Naomi());
        _factory.Clock.Advance(TimeSpan.FromDays(2));
        var gone = await _factory.GetJson("/api/my-business/requests?tab=declined", Naomi());

        Assert.Equal(1, kept.GetProperty("counts").GetProperty("declined").GetInt32());
        Assert.Single(kept.GetProperty("rows").EnumerateArray());
        Assert.Equal(0, gone.GetProperty("counts").GetProperty("declined").GetInt32());
        Assert.Empty(gone.GetProperty("rows").EnumerateArray());
    }

    // L2-051 AC6, L2-133 AC3
    [Fact]
    public async Task L2_051_AC6_a_member_who_owns_no_listing_is_refused()
    {
        var response = await Joanna().GetAsync("/api/my-business/requests");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("FORBIDDEN", (await Json(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_133_AC3_an_owner_cannot_read_another_business_s_requests()
    {
        var other = ListingMother.Public("wise-plumbing", "home-property", "Wise Plumbing");
        other.AssignOwner("member|wise");
        await _factory.Arrange(other);

        var response = await Naomi().GetAsync("/api/my-business/requests?listing=wise-plumbing");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task L2_133_AC3_an_owner_cannot_answer_another_business_s_request()
    {
        var other = ListingMother.Public("wise-plumbing", "home-property", "Wise Plumbing");
        other.AssignOwner("member|wise");
        var theirs = Request.AskForQuote("member|joanna", "Joanna Adeyemi", other.Id, null, null, "A leak", null, null, null, "k", ListingMother.Now);
        await _factory.Arrange(other, theirs);

        var confirm = await Confirm(Naomi(), theirs);
        var decline = await Decline(Naomi(), theirs);

        Assert.Equal(HttpStatusCode.Forbidden, confirm.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, decline.StatusCode);
        Assert.Equal(RequestStatus.New, (await Reload(theirs)).Status);
    }

    [Fact]
    public async Task L2_133_a_visitor_is_told_to_sign_in_and_an_unknown_request_is_404()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/my-business/requests")).StatusCode);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await Naomi().PostAsync($"/api/my-business/requests/{Guid.NewGuid()}/confirm", null)).StatusCode);
    }

    [Fact]
    public async Task L2_051_a_list_that_cannot_load_carries_the_reference_JB_REQ_503()
    {
        _factory.Database.Unavailable = true;

        var response = await Naomi().GetAsync("/api/my-business/requests");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-REQ-503", (await Json(response)).GetProperty("reference").GetString());
    }

    [Fact]
    public async Task L2_051_the_top_bar_counts_the_owners_new_requests()
    {
        var navigation = await _factory.GetJson("/api/me/navigation", Naomi());

        Assert.Equal(3, navigation.GetProperty("newRequestCount").GetInt32());
    }

    // L2-052 AC2
    [Fact]
    public async Task L2_052_AC2_confirming_tells_the_customer_and_opens_the_undo_window()
    {
        var response = await Confirm(Naomi(), _samuelsOrder);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("confirmed", body.GetProperty("status").GetString());
        Assert.Equal("Confirmed", body.GetProperty("statusLabel").GetString());
        Assert.Equal("Samuel", body.GetProperty("customerFirstName").GetString());
        Assert.Equal(ListingMother.Now.AddSeconds(8), body.GetProperty("undoUntil").GetDateTimeOffset());
        var saved = await Reload(_samuelsOrder);
        Assert.Equal(RequestStatus.Confirmed, saved.Status);
        var transition = Assert.Single(saved.Transitions);
        Assert.Equal((RequestStatus.New, RequestStatus.Confirmed, NaomiId, ListingMother.Now), (transition.From, transition.To, transition.Actor, transition.At));
        await _factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "samuel@example.com");
            Assert.Contains("confirmed", mail.Subject);
            Assert.Contains("Luzandre.com", mail.TextBody);
            Assert.True(mail.NextAttemptAt >= ListingMother.Now.AddSeconds(8));
            var message = await db.Messages.AsNoTracking().SingleAsync();
            Assert.True(message.FromOwner);
            Assert.Contains("Custom church team tee × 24", message.Body);
        });
    }

    private HttpClient Samuel() => _factory.CreateMemberClient("Samuel Park", _samuel.Id.ToString());

    private async Task<List<JsonElement>> NotificationsOf(HttpClient client) =>
        [.. (await _factory.GetJson("/api/notifications", client)).GetProperty("items").EnumerateArray()];

    // L2-052 AC2: the customer is notified in the app
    [Fact]
    public async Task L2_052_AC2_confirming_notifies_the_customer_in_the_app_with_a_link_to_the_request_and_nobody_else()
    {
        Assert.Equal(HttpStatusCode.OK, (await Confirm(Naomi(), _samuelsOrder)).StatusCode);

        var told = Assert.Single(await NotificationsOf(Samuel()));
        Assert.Equal("request", told.GetProperty("kind").GetString());
        Assert.Equal("Luzandre.com confirmed your order", told.GetProperty("title").GetString());
        Assert.Equal("Custom church team tee × 24", told.GetProperty("detail").GetString());
        Assert.Equal($"/requests/{_samuelsOrder.Id}", told.GetProperty("target").GetString());
        Assert.False(told.GetProperty("read").GetBoolean());
        Assert.Equal(1, (await _factory.GetJson("/api/me/navigation", Samuel())).GetProperty("unreadNotificationCount").GetInt32());
        Assert.Empty(await NotificationsOf(Naomi()));
        Assert.Empty(await NotificationsOf(Joanna()));
    }

    // L2-053 AC3: the customer is notified
    [Fact]
    public async Task L2_053_AC3_declining_notifies_the_customer_in_the_app_with_a_link_to_the_request_and_nobody_else()
    {
        Assert.Equal(HttpStatusCode.OK, (await Decline(Naomi(), _samuelsOrder)).StatusCode);

        var told = Assert.Single(await NotificationsOf(Samuel()));
        Assert.Equal("request", told.GetProperty("kind").GetString());
        Assert.Equal("Luzandre.com declined your order", told.GetProperty("title").GetString());
        Assert.Equal("Custom church team tee × 24", told.GetProperty("detail").GetString());
        Assert.Equal($"/requests/{_samuelsOrder.Id}", told.GetProperty("target").GetString());
        Assert.False(told.GetProperty("read").GetBoolean());
        Assert.Empty(await NotificationsOf(Naomi()));
        Assert.Empty(await NotificationsOf(Joanna()));
    }

    // L2-053 AC6, L2-043 AC6
    [Fact]
    public async Task L2_053_AC6_a_request_the_customer_cancelled_is_not_declined_and_nobody_is_told()
    {
        await _factory.WithDb(async db =>
        {
            (await db.Requests.SingleAsync(r => r.Id == _samuelsOrder.Id)).Cancel(_samuelsOrder.MemberSubject, ListingMother.Now);
            await db.SaveChangesAsync();
        });

        var response = await Decline(Naomi(), _samuelsOrder);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("INVALID_TRANSITION", body.GetProperty("code").GetString());
        Assert.Equal("cancelled", body.GetProperty("requestStatus").GetString());
        Assert.Equal("Samuel Park cancelled this request.", body.GetProperty("detail").GetString());
        var saved = await Reload(_samuelsOrder);
        Assert.Equal(RequestStatus.Cancelled, saved.Status);
        Assert.Null(saved.DeclineMessage);
        Assert.Empty(await NotificationsOf(Samuel()));
        await _factory.WithDb(async db =>
        {
            Assert.Empty(await db.Messages.AsNoTracking().ToListAsync());
            Assert.Empty(await db.OutboxMessages.AsNoTracking().ToListAsync());
        });
    }

    private Task<HttpResponseMessage> Fulfil(HttpClient client, Request request) =>
        client.PostAsync($"/api/my-business/requests/{request.Id}/fulfil", null);

    // L2-225 AC3, L2-043 AC5
    [Fact]
    public async Task L2_225_AC3_marking_a_confirmed_order_fulfilled_completes_it_and_tells_the_customer_in_the_app_and_by_e_mail()
    {
        Assert.Equal(HttpStatusCode.OK, (await Confirm(Naomi(), _samuelsOrder)).StatusCode);
        _factory.Clock.Advance(TimeSpan.FromDays(1));

        var response = await Fulfil(Naomi(), _samuelsOrder);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("completed", body.GetProperty("status").GetString());
        Assert.Equal("Samuel", body.GetProperty("customerFirstName").GetString());
        var saved = await Reload(_samuelsOrder);
        Assert.Equal(RequestStatus.Completed, saved.Status);
        var last = saved.Transitions.OrderBy(t => t.At).Last();
        Assert.Equal((RequestStatus.Confirmed, RequestStatus.Completed, NaomiId), (last.From, last.To, last.Actor));
        var told = (await NotificationsOf(Samuel())).Single(n => n.GetProperty("title").GetString() == "Luzandre.com marked your order fulfilled");
        Assert.Equal("request", told.GetProperty("kind").GetString());
        Assert.Equal("Custom church team tee × 24", told.GetProperty("detail").GetString());
        Assert.Equal($"/requests/{_samuelsOrder.Id}", told.GetProperty("target").GetString());
        Assert.Empty(await NotificationsOf(Naomi()));
        await _factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "samuel@example.com" && m.Subject.Contains("fulfilled"));
            Assert.Equal("Luzandre.com marked your order fulfilled", mail.Subject);
            Assert.Contains($"/requests/{_samuelsOrder.Id}", mail.TextBody);
        });
        var detail = await _factory.GetJson($"/api/requests/{_samuelsOrder.Id}", Samuel());
        Assert.Equal("Completed", detail.GetProperty("statusLabel").GetString());
        Assert.Equal("Luzandre.com marked this order as fulfilled.", detail.GetProperty("callout").GetProperty("text").GetString());
        var step = detail.GetProperty("timeline").EnumerateArray().Last();
        Assert.Equal(("Completed", "complete"), (step.GetProperty("title").GetString(), step.GetProperty("state").GetString()));
    }

    // L2-225 AC5, L2-043 AC6
    [Fact]
    public async Task L2_225_AC5_an_order_the_customer_cancelled_is_not_fulfilled_and_nobody_is_told()
    {
        await Confirm(Naomi(), _samuelsOrder);
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await Samuel().PostAsync($"/api/requests/{_samuelsOrder.Id}/cancel", null);
        var before = (await NotificationsOf(Samuel())).Count;

        var response = await Fulfil(Naomi(), _samuelsOrder);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("INVALID_TRANSITION", body.GetProperty("code").GetString());
        Assert.Equal("Samuel Park cancelled this request.", body.GetProperty("detail").GetString());
        Assert.Equal(RequestStatus.Cancelled, (await Reload(_samuelsOrder)).Status);
        Assert.Equal(before, (await NotificationsOf(Samuel())).Count);
    }

    // L2-225 AC5: only an order is fulfilled
    [Fact]
    public async Task L2_225_AC5_a_confirmed_quote_is_not_fulfilled()
    {
        await Confirm(Naomi(), _davidsQuote);

        var response = await Fulfil(Naomi(), _davidsQuote);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("INVALID_TRANSITION", (await Json(response)).GetProperty("code").GetString());
        Assert.Equal(RequestStatus.Confirmed, (await Reload(_davidsQuote)).Status);
    }

    // L2-052 AC4
    [Fact]
    public async Task L2_052_AC4_confirming_an_order_reduces_the_stock_by_the_quantity()
    {
        await Confirm(Naomi(), _samuelsOrder);

        Assert.Equal(6, await StockOfTee());
    }

    [Fact]
    public async Task L2_052_an_order_for_more_than_the_stock_cannot_be_confirmed()
    {
        await _factory.WithDb(async db =>
        {
            (await db.Products.SingleAsync(p => p.Id == _tee.Id)).SetStock(10);
            await db.SaveChangesAsync();
        });

        var response = await Confirm(Naomi(), _samuelsOrder);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("INSUFFICIENT_STOCK", (await Json(response)).GetProperty("code").GetString());
        Assert.Equal(RequestStatus.New, (await Reload(_samuelsOrder)).Status);
        Assert.Equal(10, await StockOfTee());
    }

    // L2-052 AC3
    [Fact]
    public async Task L2_052_AC3_undo_within_8_seconds_returns_the_request_to_new_and_withdraws_what_was_not_sent()
    {
        await Confirm(Naomi(), _samuelsOrder);
        _factory.Clock.Advance(TimeSpan.FromSeconds(7));

        var response = await Naomi().PostAsync($"/api/my-business/requests/{_samuelsOrder.Id}/confirm/undo", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("new", (await Json(response)).GetProperty("status").GetString());
        var saved = await Reload(_samuelsOrder);
        Assert.Equal(RequestStatus.New, saved.Status);
        Assert.Equal(2, saved.Transitions.Count);
        Assert.Equal(30, await StockOfTee());
        await _factory.WithDb(async db =>
        {
            Assert.Empty(await db.OutboxMessages.Where(m => m.ToAddress == "samuel@example.com").ToListAsync());
            Assert.Empty(await db.Messages.ToListAsync());
        });
    }

    [Fact]
    public async Task L2_052_AC3_undo_after_the_window_is_refused()
    {
        await Confirm(Naomi(), _samuelsOrder);
        _factory.Clock.Advance(TimeSpan.FromSeconds(9));

        var response = await Naomi().PostAsync($"/api/my-business/requests/{_samuelsOrder.Id}/confirm/undo", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("INVALID_TRANSITION", (await Json(response)).GetProperty("code").GetString());
        Assert.Equal(RequestStatus.Confirmed, (await Reload(_samuelsOrder)).Status);
        Assert.Equal(6, await StockOfTee());
    }

    // L2-052 AC6, L2-043 AC6
    [Fact]
    public async Task L2_052_AC6_a_request_the_customer_cancelled_is_not_confirmed()
    {
        await _factory.WithDb(async db =>
        {
            (await db.Requests.SingleAsync(r => r.Id == _samuelsOrder.Id)).Cancel(_samuelsOrder.MemberSubject, ListingMother.Now);
            await db.SaveChangesAsync();
        });

        var response = await Confirm(Naomi(), _samuelsOrder);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("INVALID_TRANSITION", body.GetProperty("code").GetString());
        Assert.Equal("cancelled", body.GetProperty("requestStatus").GetString());
        Assert.Equal("Samuel Park cancelled this request.", body.GetProperty("detail").GetString());
        Assert.Equal(RequestStatus.Cancelled, (await Reload(_samuelsOrder)).Status);
        Assert.Equal(30, await StockOfTee());
    }

    [Fact]
    public async Task L2_043_AC6_a_transition_the_lifecycle_does_not_allow_is_a_409_and_changes_nothing()
    {
        await Decline(Naomi(), _davidsQuote, new { reason = "something-else", message = "No." });
        await Confirm(Naomi(), _samuelsOrder);

        var confirmDeclined = await Confirm(Naomi(), _davidsQuote);
        var declineConfirmed = await Decline(Naomi(), _samuelsOrder);
        var confirmAgain = await Confirm(Naomi(), _samuelsOrder);

        Assert.All([confirmDeclined, declineConfirmed, confirmAgain], r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
        Assert.Equal("INVALID_TRANSITION", (await Json(declineConfirmed)).GetProperty("code").GetString());
        Assert.Equal(RequestStatus.Declined, (await Reload(_davidsQuote)).Status);
        Assert.Equal(RequestStatus.Confirmed, (await Reload(_samuelsOrder)).Status);
        Assert.Equal(6, await StockOfTee());
    }

    // L2-053 AC3
    [Fact]
    public async Task L2_053_AC3_declining_with_a_message_tells_the_customer_in_the_request_and_the_conversation()
    {
        var response = await Decline(Naomi(), _samuelsOrder);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("declined", body.GetProperty("status").GetString());
        var saved = await Reload(_samuelsOrder);
        Assert.Equal(RequestStatus.Declined, saved.Status);
        Assert.Equal("cant-meet-the-date", saved.DeclineReason);
        Assert.Equal("I'm sorry, Samuel. I can't print 24 by the 27th; the earliest is 4 December.", saved.DeclineMessage);
        Assert.Equal(30, await StockOfTee());
        await _factory.WithDb(async db =>
        {
            var message = await db.Messages.AsNoTracking().SingleAsync();
            Assert.True(message.FromOwner);
            Assert.Contains("I'm sorry, Samuel.", message.Body);
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "samuel@example.com");
            Assert.Contains("declined", mail.Subject);
            Assert.Contains("I'm sorry, Samuel.", mail.TextBody);
        });
    }

    // L2-053 AC2
    [Fact]
    public async Task L2_053_AC2_an_empty_message_is_refused_and_nothing_changes()
    {
        var response = await Decline(Naomi(), _samuelsOrder, new { reason = "out-of-stock", message = "   " });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("message").GetString());
        Assert.Equal(RequestStatus.New, (await Reload(_samuelsOrder)).Status);
    }

    // L2-053 AC5
    [Fact]
    public async Task L2_053_AC5_a_message_over_1000_characters_is_refused()
    {
        var response = await Decline(Naomi(), _samuelsOrder, new { reason = "out-of-stock", message = new string('x', 1001) });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("TOO_LONG", (await Json(response)).GetProperty("errors").GetProperty("message").GetString());
    }

    [Fact]
    public async Task L2_053_AC1_the_reason_must_be_one_of_the_four()
    {
        var response = await Decline(Naomi(), _samuelsOrder, new { reason = "because", message = "No." });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("INVALID", (await Json(response)).GetProperty("errors").GetProperty("reason").GetString());
    }

    // L2-133 AC4
    [Fact]
    public async Task L2_133_AC4_a_decline_that_sets_a_field_the_caller_may_not_set_is_refused()
    {
        var response = await Decline(Naomi(), _samuelsOrder, new { reason = "out-of-stock", message = "No.", status = "confirmed", totalCents = 1 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(RequestStatus.New, (await Reload(_samuelsOrder)).Status);
    }

    // L2-054, L2-182
    [Fact]
    public async Task L2_054_AC1_a_median_first_response_under_a_day_over_at_least_3_responses_earns_replies_fast()
    {
        await AnswerQuickly();
        _factory.Clock.Advance(TimeSpan.FromHours(1));

        Assert.Equal(1, await Recompute());

        var page = await _factory.GetJson("/api/my-business/requests", Naomi());
        Assert.True(page.GetProperty("repliesFast").GetBoolean());
    }

    /// <summary>Three customers asked 1, 2 and 3 hours ago; the owner answers them now.</summary>
    private async Task AnswerQuickly()
    {
        var quick = new[] { 1, 2, 3 }.Select(h => Order($"member|quick{h}", $"Quick {h}", 1, ListingMother.Now.AddHours(-h), null)).ToList();
        await _factory.Arrange(quick.Cast<object>().ToArray());
        foreach (var request in quick)
        {
            Assert.Equal(HttpStatusCode.OK, (await Confirm(Naomi(), request)).StatusCode);
        }
    }

    [Fact]
    public async Task L2_054_AC1_fewer_than_3_responses_is_not_enough()
    {
        await Confirm(Naomi(), _samuelsOrder);
        await Confirm(Naomi(), _ruthsOrder);

        await Recompute();

        Assert.False((await _factory.GetJson("/api/my-business/requests", Naomi())).GetProperty("repliesFast").GetBoolean());
    }

    [Fact]
    public async Task L2_054_AC2_a_median_of_a_day_or_more_removes_the_badge()
    {
        await AnswerQuickly();
        await Recompute();
        Assert.True((await _factory.GetJson("/api/my-business/requests", Naomi())).GetProperty("repliesFast").GetBoolean());

        // Three slow answers: each customer waited three days.
        await _factory.WithDb(async db =>
        {
            foreach (var slow in new[] { Order("member|a", "A Customer", 1, ListingMother.Now.AddMinutes(1), null), Order("member|b", "B Customer", 1, ListingMother.Now.AddMinutes(2), null), Order("member|c", "C Customer", 1, ListingMother.Now.AddMinutes(3), null) })
            {
                db.Requests.Add(slow);
                slow.Confirm(NaomiId, slow.CreatedAt.AddDays(3));
            }

            await db.SaveChangesAsync();
        });
        _factory.Clock.Advance(TimeSpan.FromHours(2));
        await Recompute();

        Assert.False((await _factory.GetJson("/api/my-business/requests", Naomi())).GetProperty("repliesFast").GetBoolean());
    }

    [Fact]
    public async Task L2_054_a_reply_in_the_conversation_counts_as_a_first_response()
    {
        var conversation = Conversation.Start(_listing.Id, "member|joanna", "Joanna Adeyemi", ListingMother.Now.AddHours(-5));
        var asked = Message.Send(conversation.Id, "member|joanna", "Joanna Adeyemi", false, "Do you ship to Ottawa?", "m1", null, false, ListingMother.Now.AddHours(-5));
        var answered = Message.Send(conversation.Id, NaomiId, "Naomi Laurent", true, "Yes!", "m2", null, false, ListingMother.Now.AddHours(-4));
        await _factory.Arrange(conversation, asked, answered);
        await Confirm(Naomi(), _samuelsOrder);
        await Confirm(Naomi(), _ruthsOrder);

        await Recompute();

        Assert.True((await _factory.GetJson("/api/my-business/requests", Naomi())).GetProperty("repliesFast").GetBoolean());
    }

    // L2-054 AC1, AC3: members see the badge on the listing page and on the business card
    [Fact]
    public async Task L2_054_AC1_a_business_that_replies_fast_says_so_on_its_listing_page_and_its_card_and_AC3_another_does_not()
    {
        await _factory.Arrange(ListingMother.Public("christian-bookstores", "shops", "Christian Bookstores"));
        await AnswerQuickly();
        await Recompute();

        var page = await _factory.GetJson("/api/listings/luzandre-com");
        var neighbour = await _factory.GetJson("/api/listings/christian-bookstores");
        var cards = (await _factory.GetJson("/api/categories/shops/listings")).GetProperty("businesses").EnumerateArray()
            .ToDictionary(card => card.GetProperty("slug").GetString()!, card => card.GetProperty("repliesFast").GetBoolean());

        Assert.True(page.GetProperty("repliesFast").GetBoolean());
        Assert.False(neighbour.GetProperty("repliesFast").GetBoolean());
        var related = Assert.Single(neighbour.GetProperty("related").EnumerateArray());
        Assert.Equal("luzandre-com", related.GetProperty("slug").GetString());
        Assert.True(related.GetProperty("repliesFast").GetBoolean());
        Assert.True(cards["luzandre-com"]);
        Assert.False(cards["christian-bookstores"]);
    }

    // L2-054 AC2: once the median is a day or more, members no longer see it
    [Fact]
    public async Task L2_054_AC2_the_badge_leaves_the_listing_page_when_the_median_reaches_a_day()
    {
        await AnswerQuickly();
        await Recompute();
        await _factory.WithDb(async db =>
        {
            foreach (var minute in new[] { 1, 2, 3, 4 })
            {
                var slow = Order($"member|slow{minute}", "Slow Customer", 1, ListingMother.Now.AddMinutes(minute), null);
                db.Requests.Add(slow);
                slow.Confirm(NaomiId, slow.CreatedAt.AddDays(3));
            }

            await db.SaveChangesAsync();
        });
        _factory.Clock.Advance(TimeSpan.FromHours(2));
        await Recompute();

        Assert.False((await _factory.GetJson("/api/listings/luzandre-com")).GetProperty("repliesFast").GetBoolean());
    }

    private async Task<int> Recompute()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(new RecomputeResponseTimesCommand());
    }
}
