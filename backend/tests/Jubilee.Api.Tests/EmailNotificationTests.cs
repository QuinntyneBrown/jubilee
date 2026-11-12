using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// E-mail notifications and meeting reminders: L2-068, L2-069, L2-061 AC1 and L2-179 AC2.
// Naomi owns Luzandre.com and Joanna writes to it; both are real members so they have addresses.
public sealed partial class EmailNotificationTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;
    private Listing _listing = null!;
    private Member _naomi = null!;
    private Member _joanna = null!;

    public EmailNotificationTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _naomi = Member.Join(EmailAddress.TryParse("naomi@example.com")!, "Naomi", "Laurent", null, "hash", ListingMother.Now);
        _naomi.ConfirmEmail();
        _joanna = Member.Join(EmailAddress.TryParse("joanna@example.com")!, "Joanna", "Adeyemi", null, "hash", ListingMother.Now);
        _joanna.ConfirmEmail();
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        _listing.AssignOwner(_naomi.Id.ToString());
        await _factory.Arrange(_naomi, _joanna, _listing);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString());

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", _joanna.Id.ToString());

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private async Task Dispatch()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
    }

    private Task TurnOff(Member member, string category) => _factory.WithDb(async db =>
    {
        var stored = await db.Members.SingleAsync(m => m.Id == member.Id);
        stored.SetEmailPreference(category, false);
        await db.SaveChangesAsync();
    });

    private Task<HttpResponseMessage> AskForQuote() =>
        Joanna().PostAsJsonAsync("/api/requests/quotes", new
        {
            listingSlug = "luzandre-com", description = "150 tees for a retreat", neededBy = (string?)null, budget = (string?)null,
            idempotencyKey = Guid.NewGuid().ToString(),
        });

    private async Task<string> Ask(string question = "Do you ship to Ottawa?")
    {
        var started = await Joanna().PostAsJsonAsync("/api/conversations", new { listingSlug = "luzandre-com", body = question, idempotencyKey = Guid.NewGuid().ToString() });
        return (await Json(started)).GetProperty("conversationId").GetString()!;
    }

    private Task<HttpResponseMessage> Reply(string conversation, string body) =>
        Naomi().PostAsJsonAsync($"/api/conversations/{conversation}/messages", new { body, idempotencyKey = Guid.NewGuid().ToString() });

    private IEnumerable<SentEmail> EmailsTo(Member member) => _factory.Emails.Sent.Where(e => e.To == member.Email);

    // L2-068 AC1
    [Fact]
    public async Task L2_068_AC1_an_event_the_member_has_on_is_e_mailed_within_two_minutes()
    {
        await AskForQuote();

        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();

        var email = Assert.Single(EmailsTo(_naomi));
        Assert.Contains("New quote request from Joanna", email.Subject);
    }

    // L2-068 AC2
    [Fact]
    public async Task L2_068_AC2_an_event_the_member_turned_off_sends_no_e_mail_but_still_notifies_in_the_app()
    {
        await TurnOff(_naomi, "requests");

        await AskForQuote();
        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();

        Assert.Empty(EmailsTo(_naomi));
        var items = (await Json(await Naomi().GetAsync("/api/notifications"))).GetProperty("items");
        Assert.Single(items.EnumerateArray());
    }

    // L2-179 AC2
    [Fact]
    public async Task L2_179_AC2_an_address_that_bounced_gets_no_further_notification_e_mail()
    {
        await _factory.WithDb(async db =>
        {
            (await db.Members.SingleAsync(m => m.Id == _naomi.Id)).MarkEmailBounced();
            await db.SaveChangesAsync();
        });

        await AskForQuote();
        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();

        Assert.Empty(EmailsTo(_naomi));
    }

    // L2-068 AC3
    [Fact]
    public async Task L2_068_AC3_a_notification_e_mail_carries_a_one_click_unsubscribe_that_turns_off_that_category_without_signing_in()
    {
        await AskForQuote();
        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();
        var link = Assert.Single(EmailsTo(_naomi)).UnsubscribeUrl;
        Assert.StartsWith("https://jubilee.test/api/email/unsubscribe/", link);

        var anonymous = _factory.CreateClient();
        var done = await anonymous.PostAsync(link, new FormUrlEncodedContent([new("List-Unsubscribe", "One-Click")]));

        Assert.Equal(HttpStatusCode.OK, done.StatusCode);
        await AskForQuote();
        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();
        Assert.Single(EmailsTo(_naomi));
        Member stored = null!;
        await _factory.WithDb(async db => stored = await db.Members.AsNoTracking().SingleAsync(m => m.Id == _naomi.Id));
        Assert.False(stored.EmailRequests);
        Assert.True(stored.EmailMessages);
    }

    [Fact]
    public async Task L2_068_AC3_a_forged_unsubscribe_link_is_refused_and_changes_nothing()
    {
        var response = await _factory.CreateClient().PostAsync("/api/email/unsubscribe/not-a-token", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task L2_068_AC6_transactional_e_mail_has_no_unsubscribe_and_ignores_preferences()
    {
        await TurnOff(_joanna, "requests");
        await TurnOff(_joanna, "messages");
        await _factory.WithDb(async db =>
        {
            db.OutboxMessages.Add(OutboxMessage.Email(_joanna.Id, _joanna.Email, "Confirm your e-mail", "Link", ListingMother.Now));
            await db.SaveChangesAsync();
        });

        await Dispatch();

        var email = Assert.Single(EmailsTo(_joanna));
        Assert.Null(email.UnsubscribeUrl);
    }

    // L2-068 AC1 for messages
    [Fact]
    public async Task L2_068_a_new_message_is_e_mailed_to_the_other_participant()
    {
        var conversation = await Ask();
        _factory.Clock.Advance(TimeSpan.FromMinutes(3)); // the sender has left the page
        await Reply(conversation, "Yes, across Canada.");

        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();

        Assert.Contains("New message from Luzandre.com", Assert.Single(EmailsTo(_joanna)).Subject);
        Assert.Contains("New message from Joanna", Assert.Single(EmailsTo(_naomi)).Subject);
    }

    // L2-061 AC1
    [Fact]
    public async Task L2_061_AC1_a_muted_conversation_sends_no_e_mail_but_the_unread_count_still_updates()
    {
        var conversation = await Ask();
        _factory.Clock.Advance(TimeSpan.FromMinutes(3)); // the sender has left the page
        Assert.Equal(HttpStatusCode.NoContent, (await Joanna().PutAsJsonAsync($"/api/conversations/{conversation}/mute", new { muted = true })).StatusCode);

        await Reply(conversation, "Yes, across Canada.");
        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();

        Assert.Empty(EmailsTo(_joanna));
        Assert.Equal(1, (await Json(await Joanna().GetAsync("/api/me/navigation"))).GetProperty("unreadNotificationCount").GetInt32());
        Assert.Equal(1, (await Json(await Joanna().GetAsync("/api/me/navigation"))).GetProperty("unreadConversationCount").GetInt32());
    }

    // L2-061 AC2
    [Fact]
    public async Task L2_061_AC2_after_unmute_the_next_reply_is_e_mailed_again()
    {
        var conversation = await Ask();
        _factory.Clock.Advance(TimeSpan.FromMinutes(3));
        await Joanna().PutAsJsonAsync($"/api/conversations/{conversation}/mute", new { muted = true });
        await Reply(conversation, "Yes, across Canada.");
        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();
        Assert.Empty(EmailsTo(_joanna));

        Assert.Equal(HttpStatusCode.NoContent, (await Joanna().PutAsJsonAsync($"/api/conversations/{conversation}/mute", new { muted = false })).StatusCode);
        _factory.Clock.Advance(TimeSpan.FromMinutes(20));
        await Reply(conversation, "Shipping is free over $50.");
        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();

        Assert.Contains("New message from Luzandre.com", Assert.Single(EmailsTo(_joanna)).Subject);
    }

    // L2-068 AC4
    [Fact]
    public async Task L2_068_AC4_a_message_to_someone_reading_the_conversation_right_now_sends_no_e_mail()
    {
        var conversation = await Ask();
        _factory.Clock.Advance(TimeSpan.FromSeconds(30));
        Assert.Equal(HttpStatusCode.OK, (await Joanna().GetAsync($"/api/conversations/{conversation}")).StatusCode); // opens it: read now
        _factory.Clock.Advance(TimeSpan.FromSeconds(30));

        await Reply(conversation, "Yes, across Canada.");
        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();

        Assert.Empty(EmailsTo(_joanna));
        Assert.Single((await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray());
    }

    // L2-068 AC5
    [Fact]
    public async Task L2_068_AC5_several_messages_close_together_are_combined_into_one_e_mail()
    {
        var conversation = await Ask();
        _factory.Clock.Advance(TimeSpan.FromMinutes(3)); // the sender has left the page
        await Reply(conversation, "First.");
        _factory.Clock.Advance(TimeSpan.FromSeconds(20));
        await Reply(conversation, "Second.");
        _factory.Clock.Advance(TimeSpan.FromSeconds(20));
        await Reply(conversation, "Third.");

        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();
        Assert.Single(EmailsTo(_joanna));

        // Within 10 minutes of that e-mail the next messages wait and go out together.
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await Reply(conversation, "Fourth.");
        await Reply(conversation, "Fifth.");
        _factory.Clock.Advance(TimeSpan.FromMinutes(3));
        await Dispatch();
        Assert.Single(EmailsTo(_joanna));
        _factory.Clock.Advance(TimeSpan.FromMinutes(8));
        await Dispatch();
        Assert.Equal(2, EmailsTo(_joanna).Count());
    }

    // L2-069
    private async Task<Request> Meeting(DateTimeOffset startsAt, bool confirm = true)
    {
        var service = Service.Create(_listing.Id, 1, "Design consultation", "30 min", ServicePrice.Free, ServiceAction.Book);
        var request = Request.Book(
            _joanna.Id.ToString(), "Joanna Adeyemi", _listing.Id, service.Id, service.Name, startsAt, TimeSpan.FromMinutes(30), MeetingMode.Video, null, null,
            Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-1));
        if (confirm)
        {
            request.Confirm(_naomi.Id.ToString(), ListingMother.Now.AddHours(-20));
        }

        await _factory.Arrange(service, request);
        return request;
    }

    private async Task RunReminders()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<Jubilee.Application.Notifications.MeetingReminders>().SendDueAsync(CancellationToken.None);
    }

    [Fact]
    public async Task L2_069_AC1_both_sides_are_reminded_an_hour_before_with_a_notification_and_an_e_mail()
    {
        await Meeting(ListingMother.Now.AddHours(3));

        _factory.Clock.Advance(TimeSpan.FromMinutes(119));
        await RunReminders();
        Assert.Empty((await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray());

        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await RunReminders();
        await Dispatch();

        foreach (var (client, member) in new[] { (Joanna(), _joanna), (Naomi(), _naomi) })
        {
            var item = Assert.Single((await Json(await client.GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray());
            Assert.Equal("Your meeting starts in 1 hour", item.GetProperty("title").GetString());
            Assert.Equal("reminder", item.GetProperty("kind").GetString());
            Assert.Contains("Your meeting starts in 1 hour", Assert.Single(EmailsTo(member)).Subject);
        }

        // It is sent once.
        await RunReminders();
        Assert.Single((await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task L2_069_the_e_mail_follows_the_meeting_reminders_switch_but_the_notification_does_not()
    {
        await TurnOff(_joanna, "reminders");
        await Meeting(ListingMother.Now.AddMinutes(90));

        _factory.Clock.Advance(TimeSpan.FromMinutes(30));
        await RunReminders();
        await Dispatch();

        Assert.Empty(EmailsTo(_joanna));
        Assert.Single(EmailsTo(_naomi));
        Assert.Single((await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray());
    }

    // L2-069 AC2
    [Fact]
    public async Task L2_069_AC2_a_booking_cancelled_before_the_reminder_time_gets_no_reminder()
    {
        var request = await Meeting(ListingMother.Now.AddHours(3));
        Assert.Equal(HttpStatusCode.OK, (await Joanna().PostAsync($"/api/requests/{request.Id}/cancel", null)).StatusCode);
        var before = (await Json(await Naomi().GetAsync("/api/notifications"))).GetProperty("items").GetArrayLength();

        _factory.Clock.Advance(TimeSpan.FromHours(2));
        await RunReminders();

        Assert.Equal(before, (await Json(await Naomi().GetAsync("/api/notifications"))).GetProperty("items").GetArrayLength());
        Assert.DoesNotContain((await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray(), i => i.GetProperty("kind").GetString() == "reminder");
    }

    // L2-069 AC3
    [Fact]
    public async Task L2_069_AC3_a_booking_confirmed_less_than_an_hour_before_gets_its_reminder_at_once()
    {
        var service = Service.Create(_listing.Id, 1, "Design consultation", "30 min", ServicePrice.Free, ServiceAction.Book);
        var request = Request.Book(
            _joanna.Id.ToString(), "Joanna Adeyemi", _listing.Id, service.Id, service.Name, ListingMother.Now.AddMinutes(40), TimeSpan.FromMinutes(30), MeetingMode.Video,
            null, null, Guid.NewGuid().ToString(), ListingMother.Now.AddMinutes(-5));
        await _factory.Arrange(service, request);

        Assert.Equal(HttpStatusCode.OK, (await Naomi().PostAsync($"/api/my-business/requests/{request.Id}/confirm", null)).StatusCode);

        var items = (await Json(await Joanna().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray().Select(i => i.GetProperty("kind").GetString()).ToList();
        Assert.Contains("reminder", items);
        Assert.Contains("request", items);
    }
}
