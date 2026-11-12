using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// The notification centre: L2-064, L2-065 AC1 and AC2, L2-133 AC2. Joanna is the member; Naomi owns Luzandre.com.
// "Today" is Tuesday 10 November 2026, 10:00 in Toronto (ListingMother.Now).
public sealed class NotificationTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string JoannaId = "member|joanna";
    private const string NaomiId = "member|naomi";

    private readonly JubileeApiFactory _factory;
    private Listing _listing = null!;

    public NotificationTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        _listing.AssignOwner(NaomiId);
        await _factory.Arrange(_listing);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", JoannaId);

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", NaomiId);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private Task Give(string subject, string title, DateTimeOffset at, bool read = false, string kind = "request", string target = "/requests/1") =>
        _factory.Arrange(Notification.Create(subject, kind, title, "Detail of " + title, target, at, read ? at : null));

    private static string[] Titles(JsonElement list) =>
        [.. list.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("title").GetString()!)];

    // L2-064 AC1
    [Fact]
    public async Task L2_064_AC1_the_list_is_newest_first_with_the_unread_count_and_each_item_has_title_detail_and_time()
    {
        var now = _factory.Clock.GetUtcNow();
        await Give(JoannaId, "Older", now.AddDays(-3), read: true);
        await Give(JoannaId, "Newest", now.AddMinutes(-5));
        await Give(JoannaId, "Middle", now.AddDays(-1));

        var list = await Json(await Joanna().GetAsync("/api/notifications"));

        Assert.Equal(["Newest", "Middle", "Older"], Titles(list));
        Assert.Equal(2, list.GetProperty("unread").GetInt32());
        var first = list.GetProperty("items")[0];
        Assert.Equal("Detail of Newest", first.GetProperty("detail").GetString());
        Assert.Equal("/requests/1", first.GetProperty("target").GetString());
        Assert.False(first.GetProperty("read").GetBoolean());
        Assert.True(list.GetProperty("items")[2].GetProperty("read").GetBoolean());
        Assert.Equal(now.AddMinutes(-5), first.GetProperty("at").GetDateTimeOffset());
    }

    // L2-064 AC5
    [Fact]
    public async Task L2_064_AC5_notifications_older_than_90_days_are_not_shown_and_not_counted()
    {
        var now = _factory.Clock.GetUtcNow();
        await Give(JoannaId, "Recent", now.AddDays(-89));
        await Give(JoannaId, "Old", now.AddDays(-91));

        var list = await Json(await Joanna().GetAsync("/api/notifications"));

        Assert.Equal(["Recent"], Titles(list));
        Assert.Equal(1, list.GetProperty("unread").GetInt32());
        Assert.Equal(1, (await Json(await Joanna().GetAsync("/api/me/navigation"))).GetProperty("unreadNotificationCount").GetInt32());
    }

    // L2-064 AC4
    [Fact]
    public async Task L2_064_AC4_a_member_with_none_gets_an_empty_list()
    {
        var list = await Json(await Joanna().GetAsync("/api/notifications"));

        Assert.Empty(Titles(list));
        Assert.Equal(0, list.GetProperty("unread").GetInt32());
    }

    // L2-064 AC2
    [Fact]
    public async Task L2_064_AC2_opening_an_item_marks_it_read_and_lowers_the_badge()
    {
        var now = _factory.Clock.GetUtcNow();
        await Give(JoannaId, "One", now.AddMinutes(-2));
        await Give(JoannaId, "Two", now.AddMinutes(-1));
        var id = (await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items")[0].GetProperty("id").GetGuid();

        var read = await Joanna().PostAsync($"/api/notifications/{id}/read", null);

        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
        Assert.Equal(1, (await Json(read)).GetProperty("unread").GetInt32());
        Assert.Equal(1, (await Json(await Joanna().GetAsync("/api/me/navigation"))).GetProperty("unreadNotificationCount").GetInt32());
        // Reading it again changes nothing.
        Assert.Equal(1, (await Json(await Joanna().PostAsync($"/api/notifications/{id}/read", null))).GetProperty("unread").GetInt32());
    }

    // L2-064 AC3
    [Fact]
    public async Task L2_064_AC3_mark_all_as_read_clears_the_count_and_only_the_callers_items()
    {
        var now = _factory.Clock.GetUtcNow();
        await Give(JoannaId, "One", now.AddMinutes(-2));
        await Give(JoannaId, "Two", now.AddMinutes(-1));
        await Give(NaomiId, "Hers", now.AddMinutes(-1));

        var done = await Joanna().PostAsync("/api/notifications/read-all", null);

        Assert.Equal(0, (await Json(done)).GetProperty("unread").GetInt32());
        Assert.All((await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray(), i => Assert.True(i.GetProperty("read").GetBoolean()));
        Assert.Equal(1, (await Json(await Naomi().GetAsync("/api/notifications"))).GetProperty("unread").GetInt32());
    }

    // L2-133 AC2
    [Fact]
    public async Task L2_133_AC2_another_members_notification_is_404_and_stays_unread()
    {
        await Give(NaomiId, "Hers", _factory.Clock.GetUtcNow().AddMinutes(-1));
        var id = (await Json(await Naomi().GetAsync("/api/notifications"))).GetProperty("items")[0].GetProperty("id").GetGuid();

        var response = await Joanna().PostAsync($"/api/notifications/{id}/read", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(1, (await Json(await Naomi().GetAsync("/api/notifications"))).GetProperty("unread").GetInt32());
    }

    [Fact]
    public async Task L2_133_a_visitor_is_refused()
    {
        var visitor = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync("/api/notifications")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.PostAsync("/api/notifications/read-all", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.PostAsync($"/api/notifications/{Guid.NewGuid()}/read", null)).StatusCode);
    }

    [Fact]
    public async Task L2_118_a_database_failure_answers_503_with_the_reference()
    {
        _factory.Database.Unavailable = true;

        var response = await Joanna().GetAsync("/api/notifications");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-NTF-503", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-064 AC6: request created (owner), confirmed and declined (the other party)
    private async Task<Request> AnOrder(string subject)
    {
        var tee = Product.Create(_listing.Id, "tee", "Faith tee", 2200, false, TileTint.Gold, TileIcon.Shirt, ListingMother.Now.AddDays(-30));
        tee.SetStock(30);
        var request = Request.AskForOrder(
            subject, "Joanna Adeyemi", _listing.Id, tee.Id, tee.Name, null, 2, new OrderAmounts(2200, 4400, 0), "Pickup in Leslieville",
            null, null, Guid.NewGuid().ToString(), ListingMother.Now.AddHours(-2));
        await _factory.Arrange(tee, request);
        return request;
    }

    [Fact]
    public async Task L2_064_AC6_a_new_request_notifies_the_owner_with_a_link_to_the_incoming_requests()
    {
        var sent = await Joanna().PostAsJsonAsync("/api/requests/quotes", new
        {
            listingSlug = "luzandre-com", description = "150 tees for a retreat", neededBy = (string?)null, budget = (string?)null,
            idempotencyKey = Guid.NewGuid().ToString(),
        });
        Assert.Equal(HttpStatusCode.Created, sent.StatusCode);

        var list = await Json(await Naomi().GetAsync("/api/notifications"));

        var item = Assert.Single(list.GetProperty("items").EnumerateArray());
        Assert.Contains("Joanna", item.GetProperty("title").GetString());
        Assert.Equal("request", item.GetProperty("kind").GetString());
        Assert.StartsWith("/my-business/requests", item.GetProperty("target").GetString());
        Assert.Empty(Titles(await Json(await Joanna().GetAsync("/api/notifications"))));
    }

    [Fact]
    public async Task L2_064_AC6_confirming_and_declining_notify_the_member_and_cancelling_notifies_the_owner()
    {
        var confirmed = await AnOrder(JoannaId);
        var declined = await AnOrder(JoannaId);
        var cancelled = await AnOrder(JoannaId);

        Assert.Equal(HttpStatusCode.OK, (await Naomi().PostAsync($"/api/my-business/requests/{confirmed.Id}/confirm", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Naomi().PostAsJsonAsync($"/api/my-business/requests/{declined.Id}/decline", new { reason = "cant-meet-the-date", message = "Sorry." })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Joanna().PostAsync($"/api/requests/{cancelled.Id}/cancel", null)).StatusCode);

        var members = (await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray().Select(i => i.GetProperty("title").GetString()!).ToList();
        Assert.Contains(members, t => t.Contains("confirmed"));
        Assert.Contains(members, t => t.Contains("declined"));
        var owners = (await Json(await Naomi().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray().Select(i => i.GetProperty("title").GetString()!).ToList();
        Assert.Contains(owners, t => t.Contains("cancelled"));
        Assert.DoesNotContain(owners, t => t.Contains("confirmed"));
    }

    // L2-064 AC6: a new message notifies the other participant, and L2-065 AC1 still counts the conversation
    [Fact]
    public async Task L2_064_AC6_a_new_message_notifies_the_other_participant_and_links_to_the_conversation()
    {
        var started = await Joanna().PostAsJsonAsync("/api/conversations", new { listingSlug = "luzandre-com", body = "Do you ship to Ottawa?", idempotencyKey = Guid.NewGuid().ToString() });
        var conversation = (await Json(started)).GetProperty("conversationId").GetString()!;
        Assert.Equal(HttpStatusCode.Created, (await Naomi().PostAsJsonAsync($"/api/conversations/{conversation}/messages", new { body = "Yes, across Canada.", idempotencyKey = Guid.NewGuid().ToString() })).StatusCode);

        var owner = (await Json(await Naomi().GetAsync("/api/notifications"))).GetProperty("items");
        var member = (await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items");

        Assert.Contains(owner.EnumerateArray(), i => i.GetProperty("kind").GetString() == "message" && i.GetProperty("detail").GetString()!.Contains("Ottawa"));
        var reply = Assert.Single(member.EnumerateArray());
        Assert.Equal("message", reply.GetProperty("kind").GetString());
        Assert.Equal($"/messages/{conversation}", reply.GetProperty("target").GetString());
        Assert.Contains("Luzandre.com", reply.GetProperty("title").GetString());
    }
    // L2-064 AC6: undoing a confirmation takes the notification back
    [Fact]
    public async Task L2_064_AC6_undoing_a_confirmation_withdraws_the_notification_that_was_not_yet_read()
    {
        var order = await AnOrder(JoannaId);
        Assert.Equal(HttpStatusCode.OK, (await Naomi().PostAsync($"/api/my-business/requests/{order.Id}/confirm", null)).StatusCode);
        Assert.Equal(1, (await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("unread").GetInt32());

        Assert.Equal(HttpStatusCode.OK, (await Naomi().PostAsync($"/api/my-business/requests/{order.Id}/confirm/undo", null)).StatusCode);

        Assert.Empty(Titles(await Json(await Joanna().GetAsync("/api/notifications"))));
    }

    // L2-064 AC6: listing verified, changes requested
    [Fact]
    public async Task L2_064_AC6_the_owner_is_told_when_the_listing_is_verified_and_when_changes_are_requested()
    {
        var verifier = _factory.CreateStaffClient("Esther Mensah", "member|esther", "verifier");
        var approved = ListingMother.NonPublic(NonPublicState.ReadyToReview, "ready-co", "shops");
        approved.AssignOwner(JoannaId);
        var changes = ListingMother.NonPublic(NonPublicState.ReadyToReview, "changes-co", "shops");
        changes.AssignOwner(JoannaId);
        await _factory.Arrange(
            approved,
            changes,
            ListingSubmission.Record(approved.Id, JoannaId, Guid.NewGuid().ToString(), [], ListingMother.Now),
            ListingSubmission.Record(changes.Id, JoannaId, Guid.NewGuid().ToString(), [], ListingMother.Now));

        var approve = await verifier.PostAsJsonAsync($"/api/admin/verifications/{approved.Id}/approve", new { note = "Reviewed with the owner." });
        var ask = await verifier.PostAsJsonAsync($"/api/admin/verifications/{changes.Id}/request-changes", new { areas = new[] { "tagline" }, message = "Remove the discount code." });

        Assert.True(approve.IsSuccessStatusCode, await approve.Content.ReadAsStringAsync());
        Assert.True(ask.IsSuccessStatusCode, await ask.Content.ReadAsStringAsync());
        var titles = Titles(await Json(await Joanna().GetAsync("/api/notifications")));
        Assert.Contains(titles, t => t.Contains("is verified and live"));
        Assert.Contains(titles, t => t.StartsWith("Changes needed for"));
    }
}
