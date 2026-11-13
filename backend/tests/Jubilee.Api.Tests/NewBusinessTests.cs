using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Jubilee.Application.Jobs;
using Jubilee.Application.Notifications;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// New businesses (L2-222, L2-064 AC6, L2-149 AC1). Joanna turned "New businesses" on and opened the
// page of Legacy Financial, so she browsed "Financial & insurance"; Naomi is about to publish
// Cornerstone Bookkeeping in that category, and it is new the moment she does (ADR 0057). The tests start on Tuesday 10 November 2026.
public sealed class NewBusinessTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private static readonly DateTimeOffset MondaySeven = new(2026, 11, 16, 12, 0, 0, TimeSpan.Zero);

    private readonly JubileeApiFactory _factory;
    private Member _joanna = null!;
    private Member _naomi = null!;
    private Member _peter = null!;
    private Listing _waiting = null!;

    public NewBusinessTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _joanna = Confirmed("joanna@example.com", "Joanna", "Adeyemi");
        _naomi = Confirmed("naomi@example.com", "Naomi", "Laurent");
        _peter = Confirmed("peter@example.com", "Peter", "Okafor");
        var legacy = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial", ListingMother.Now.AddDays(-60));
        // What Naomi will publish; it is not in the directory until she does.
        _waiting = ListingMother.NonPublic(NonPublicState.Draft, "cornerstone-bookkeeping", "financial-insurance");
        await _factory.Arrange(_joanna, _naomi, _peter, legacy);
        await TurnOn(_joanna);
        await Browse(_joanna, "legacy-financial");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static Member Confirmed(string email, string first, string last)
    {
        var member = Member.Join(EmailAddress.TryParse(email)!, first, last, null, "hash", ListingMother.Now);
        member.ConfirmEmail();
        return member;
    }

    private HttpClient Client(Member member) => _factory.CreateMemberClient($"{member.FirstName} {member.LastName}", member.Id.ToString());

    private async Task TurnOn(Member member) => Assert.True(
        (await Client(member).PatchAsJsonAsync("/api/account/notification-preferences", new { setting = "new-businesses", enabled = true })).IsSuccessStatusCode);

    private async Task Browse(Member member, string slug) =>
        Assert.True((await Client(member).PostAsync($"/api/listings/{slug}/views", null)).IsSuccessStatusCode);

    /// <summary>Naomi lists the business and publishes it: it is live at once (L2-078).</summary>
    private async Task Publish(Listing listing)
    {
        var naomi = Client(_naomi);
        var body = new Dictionary<string, object?>
        {
            ["kind"] = listing.CategorySlug == "shops" ? "products" : "services",
            ["name"] = listing.Name,
            ["tagline"] = listing.Tagline,
            ["categorySlug"] = listing.CategorySlug,
            ["highlight"] = null,
            ["place"] = "Toronto",
            ["agreed"] = true,
            ["items"] = Array.Empty<object>(),
            ["idempotencyKey"] = Guid.NewGuid().ToString(),
        };
        var draft = JsonDocument.Parse(await (await naomi.PostAsJsonAsync("/api/listing-drafts", body)).Content.ReadAsStringAsync()).RootElement;
        var published = await naomi.PostAsJsonAsync($"/api/listing-drafts/{draft.GetProperty("id").GetGuid()}/publish", body);
        Assert.True(published.IsSuccessStatusCode, await published.Content.ReadAsStringAsync());
    }

    private async Task<List<JsonElement>> Notifications(Member member)
    {
        var response = await Client(member).GetAsync("/api/notifications");
        return [.. JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("items").EnumerateArray()
            .Where(i => i.GetProperty("kind").GetString() == "business")];
    }

    /// <summary>One instance of the worker reaches the weekly job's tick, then the outbox is sent.</summary>
    private async Task<int?> NoteTick()
    {
        int? queued;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            queued = await scope.ServiceProvider.GetRequiredService<ISender>().Send(new SendNewBusinessNotesCommand());
        }

        using var dispatch = _factory.Services.CreateScope();
        await dispatch.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
        return queued;
    }

    private void GoTo(DateTimeOffset instant) => _factory.Clock.Advance(instant - _factory.Clock.GetUtcNow());

    private IEnumerable<SentEmail> NotesTo(Member member) =>
        _factory.Emails.Sent.Where(e => e.To == member.Email && e.Subject == "New on Jubilee this week");

    // L2-222 AC1, L2-064 AC6
    [Fact]
    public async Task L2_222_AC1_a_member_who_opted_in_and_browsed_the_category_is_told_of_a_newly_published_business()
    {
        await Publish(_waiting);

        var item = Assert.Single(await Notifications(_joanna));
        Assert.Equal($"New in Financial & insurance: {_waiting.Name}", item.GetProperty("title").GetString());
        Assert.Equal(_waiting.Tagline, item.GetProperty("detail").GetString());
        Assert.Equal("/b/cornerstone-bookkeeping", item.GetProperty("target").GetString());
        Assert.False(item.GetProperty("read").GetBoolean());
    }

    // L2-222 AC1: who is not told
    [Fact]
    public async Task L2_222_AC1_the_owner_a_member_who_did_not_browse_and_a_member_with_the_switch_off_are_not_told()
    {
        // Naomi owns the listing: opted in and browsed. Peter opted in and browsed another category.
        await TurnOn(_naomi);
        await Browse(_naomi, "legacy-financial");
        await TurnOn(_peter);
        await _factory.Arrange(ListingMother.Public("luzandre-com", "shops", "Luzandre.com", ListingMother.Now.AddDays(-60)));
        await Browse(_peter, "luzandre-com");
        // Ruth browsed the category and never turned the switch on.
        var ruth = Confirmed("ruth@example.com", "Ruth", "Mensah");
        await _factory.Arrange(ruth);
        await Browse(ruth, "legacy-financial");

        await Publish(_waiting);

        Assert.Empty(await Notifications(_naomi));
        Assert.Empty(await Notifications(_peter));
        Assert.Empty(await Notifications(ruth));
        Assert.Single(await Notifications(_joanna));
    }

    // L2-222 AC1: browsed means in the last 90 days
    [Fact]
    public async Task L2_222_AC1_a_category_last_browsed_more_than_90_days_ago_is_not_browsed()
    {
        _factory.Clock.Advance(TimeSpan.FromDays(91));

        await Publish(_waiting);

        Assert.Empty(await Notifications(_joanna));
    }

    // L2-222 AC2 and AC3, L2-149 AC1
    [Fact]
    public async Task L2_222_AC2_on_monday_at_seven_the_member_gets_one_note_of_the_weeks_new_businesses_with_the_address_and_an_unsubscribe()
    {
        await NoteTick(); // The week that has begun is served; the next note is Monday's.
        await Publish(_waiting);

        GoTo(MondaySeven.AddMinutes(-1));
        Assert.Null(await NoteTick());
        Assert.Empty(NotesTo(_joanna));

        GoTo(MondaySeven);
        Assert.Equal(1, await NoteTick());

        var note = Assert.Single(NotesTo(_joanna));
        Assert.Contains("These businesses joined Jubilee this week in categories you’ve browsed.", note.Body);
        Assert.Contains($"{_waiting.Name} (Financial & insurance)\nhttps://jubilee.test/b/cornerstone-bookkeeping", note.Body);
        Assert.Contains("Jubilee, 1 Example Street, Toronto, ON M5H 0A1", note.Body);
        Assert.Contains("Jubilee, 1 Example Street, Toronto, ON M5H 0A1", note.Html);
        Assert.Contains("Unsubscribe: https://jubilee.test/unsubscribe/", note.Body);
        Assert.Empty(NotesTo(_naomi));
        Assert.Empty(NotesTo(_peter));

        var done = await _factory.CreateClient().PostAsync(note.UnsubscribeUrl, new FormUrlEncodedContent([new("List-Unsubscribe", "One-Click")]));
        Assert.Equal(HttpStatusCode.OK, done.StatusCode);
        Member stored = null!;
        await _factory.WithDb(async db => stored = await db.Members.AsNoTracking().SingleAsync(m => m.Id == _joanna.Id));
        Assert.False(stored.EmailNewBusinesses);
    }

    // L2-222 AC2: nothing to hear of
    [Fact]
    public async Task L2_222_AC2_a_week_with_no_new_business_in_a_browsed_category_sends_no_note()
    {
        await NoteTick();
        var elsewhere = ListingMother.NonPublic(NonPublicState.Draft, "olive-print", "shops");
        await Publish(elsewhere);

        GoTo(MondaySeven);
        Assert.Equal(0, await NoteTick());

        Assert.DoesNotContain(_factory.Emails.Sent, e => e.Subject == "New on Jubilee this week");
    }

    // L2-222 AC3: whatever "How often" says
    [Fact]
    public async Task L2_222_AC3_the_note_is_sent_to_a_member_on_the_daily_summary_too()
    {
        await NoteTick();
        await Client(_joanna).PatchAsJsonAsync("/api/account/notification-preferences", new { setting = "frequency", frequency = "daily-summary" });
        await Publish(_waiting);

        GoTo(MondaySeven);
        await NoteTick();

        Assert.Single(NotesTo(_joanna));
    }

    // L2-149 AC1: no promotional e-mail without a mailing address
    [Fact]
    public async Task L2_149_AC1_without_a_mailing_address_no_note_is_sent()
    {
        await NoteTick();
        await Publish(_waiting);
        GoTo(MondaySeven);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var services = scope.ServiceProvider;
            var handler = new SendNewBusinessNotesCommandHandler(
                services.GetRequiredService<ScheduledJobs>(), services.GetRequiredService<Application.Abstractions.IAppDbContext>(),
                services.GetRequiredService<TimeProvider>(), services.GetRequiredService<AccountSettings>(), new EmailSettings(" "));
            Assert.Equal(0, await handler.Handle(new SendNewBusinessNotesCommand(), CancellationToken.None));
        }

        Assert.Null(await NoteTick());
        Assert.Empty(NotesTo(_joanna));
    }

    // L2-222 AC4, L2-182 AC1
    [Fact]
    public async Task L2_222_AC4_two_instances_that_reach_monday_send_one_note_and_the_run_records_its_success()
    {
        await NoteTick();
        await Publish(_waiting);
        GoTo(MondaySeven);

        var ran = await NoteTick();
        _factory.Clock.Advance(TimeSpan.FromMinutes(10));
        var again = await NoteTick();

        Assert.Equal(1, ran);
        Assert.Null(again);
        Assert.Single(NotesTo(_joanna));
        JobRun run = null!;
        await _factory.WithDb(async db => run = (await db.JobRuns.AsNoTracking().Where(r => r.Job == SendNewBusinessNotesCommand.Job).ToListAsync()).MaxBy(r => r.Occurrence)!);
        Assert.Equal(MondaySeven, run.Occurrence);
        Assert.NotNull(run.SucceededAt);
    }
}
