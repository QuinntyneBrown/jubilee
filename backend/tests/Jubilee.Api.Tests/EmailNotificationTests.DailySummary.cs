using System.Net;
using System.Net.Http.Json;
using Jubilee.Application.Jobs;
using Jubilee.Application.Notifications;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// The daily summary: L2-016 AC6 to AC8, L2-068 AC1 and L2-182 AC1 and AC3. The tests start on
// Tuesday 10 November 2026 at 10:00 a.m. in Toronto; the next summary is Wednesday's, at 7:00 a.m.
public sealed partial class EmailNotificationTests
{
    private static readonly TimeSpan UntilSevenTomorrow = TimeSpan.FromHours(21);

    private Task ChooseDailySummary(HttpClient client) =>
        client.PatchAsJsonAsync("/api/account/notification-preferences", new { setting = "frequency", frequency = "daily-summary" });

    /// <summary>One instance of the worker reaches the summary job's tick; true when it ran.</summary>
    private async Task<bool> SummaryTick()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(new SendDailySummariesCommand()) is not null;
    }

    private async Task SendSummaries()
    {
        await SummaryTick();
        await Dispatch();
    }

    // L2-016 AC6, L2-068 AC1
    [Fact]
    public async Task L2_016_AC6_a_member_on_the_daily_summary_gets_one_e_mail_at_seven_the_next_morning_and_nothing_before()
    {
        await ChooseDailySummary(Naomi());
        await AskForQuote();
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await Ask();

        _factory.Clock.Advance(TimeSpan.FromMinutes(19));
        await Dispatch();
        Assert.Empty(EmailsTo(_naomi));

        _factory.Clock.Advance(UntilSevenTomorrow - TimeSpan.FromMinutes(21));
        await SendSummaries();
        Assert.Empty(EmailsTo(_naomi));

        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await SendSummaries();

        var email = Assert.Single(EmailsTo(_naomi));
        Assert.Equal("Your Jubilee summary for Wednesday 11 November", email.Subject);
        Assert.Contains("• New quote request from Joanna", email.Body);
        Assert.Contains("• New message from Joanna", email.Body);
        Assert.True(email.Body.IndexOf("New quote request", StringComparison.Ordinal) < email.Body.IndexOf("New message", StringComparison.Ordinal));
        Assert.Contains("See what happened: https://jubilee.test/notifications", email.Body);

        // The in-app notifications were not held.
        Assert.Equal(2, (await Json(await Naomi().GetAsync("/api/notifications"))).GetProperty("items").GetArrayLength());
    }

    // L2-016 AC6: at most one a day
    [Fact]
    public async Task L2_016_AC6_a_later_tick_the_same_day_sends_no_second_summary_and_the_next_day_carries_what_came_since()
    {
        await ChooseDailySummary(Naomi());
        await AskForQuote();
        _factory.Clock.Advance(UntilSevenTomorrow);
        await SendSummaries();

        await AskForQuote();
        _factory.Clock.Advance(TimeSpan.FromHours(3));
        await SendSummaries();
        Assert.Single(EmailsTo(_naomi));

        _factory.Clock.Advance(TimeSpan.FromHours(21));
        await SendSummaries();
        Assert.Equal(2, EmailsTo(_naomi).Count());
        Assert.Equal("Your Jubilee summary for Thursday 12 November", EmailsTo(_naomi).Last().Subject);
    }

    // L2-016 AC7
    [Fact]
    public async Task L2_016_AC7_a_member_with_nothing_to_be_told_gets_no_summary()
    {
        await ChooseDailySummary(Naomi());

        _factory.Clock.Advance(UntilSevenTomorrow);
        await SendSummaries();

        Assert.Empty(_factory.Emails.Sent);
    }

    // L2-016 AC7
    [Fact]
    public async Task L2_016_AC7_an_event_whose_category_was_turned_off_since_is_left_out()
    {
        await ChooseDailySummary(Naomi());
        await AskForQuote();
        await Ask();
        await TurnOff(_naomi, "requests");

        _factory.Clock.Advance(UntilSevenTomorrow);
        await SendSummaries();

        var email = Assert.Single(EmailsTo(_naomi));
        Assert.DoesNotContain("quote", email.Body);
        Assert.Contains("• New message from Joanna", email.Body);
    }

    // L2-016 AC6: the exceptions
    [Fact]
    public async Task L2_016_AC6_a_meeting_reminder_is_sent_at_once_whatever_the_frequency()
    {
        await ChooseDailySummary(Joanna());
        await Meeting(ListingMother.Now.AddMinutes(90));

        _factory.Clock.Advance(TimeSpan.FromMinutes(30));
        await RunReminders();
        await Dispatch();

        Assert.Contains("Your meeting starts in 1 hour", Assert.Single(EmailsTo(_joanna)).Subject);
    }

    // L2-016 AC6: the member who did not choose it
    [Fact]
    public async Task L2_016_AC6_a_member_on_as_it_happens_is_e_mailed_within_two_minutes_and_gets_no_summary()
    {
        await AskForQuote();
        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Dispatch();
        Assert.Single(EmailsTo(_naomi));

        _factory.Clock.Advance(UntilSevenTomorrow);
        await SendSummaries();

        Assert.Single(EmailsTo(_naomi));
    }

    // L2-016 AC8, L2-068 AC3
    [Fact]
    public async Task L2_016_AC8_the_unsubscribe_of_a_summary_turns_off_new_messages_and_request_updates()
    {
        await ChooseDailySummary(Naomi());
        await AskForQuote();
        _factory.Clock.Advance(UntilSevenTomorrow);
        await SendSummaries();
        var link = Assert.Single(EmailsTo(_naomi)).UnsubscribeUrl;

        var done = await _factory.CreateClient().PostAsync(link, new FormUrlEncodedContent([new("List-Unsubscribe", "One-Click")]));

        Assert.Equal(HttpStatusCode.OK, done.StatusCode);
        Assert.Equal("summary", (await Json(done)).GetProperty("category").GetString());
        Member stored = null!;
        await _factory.WithDb(async db => stored = await db.Members.AsNoTracking().SingleAsync(m => m.Id == _naomi.Id));
        Assert.False(stored.EmailRequests);
        Assert.False(stored.EmailMessages);
        Assert.True(stored.EmailReminders);
    }

    // L2-182 AC1
    [Fact]
    public async Task L2_182_AC1_two_instances_that_reach_seven_send_one_summary_and_the_run_records_its_success()
    {
        await ChooseDailySummary(Naomi());
        await AskForQuote();
        _factory.Clock.Advance(UntilSevenTomorrow);

        var ran = await SummaryTick();
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        var again = await SummaryTick();
        await Dispatch();

        Assert.True(ran);
        Assert.False(again);
        Assert.Single(EmailsTo(_naomi));
        JobRun run = null!;
        await _factory.WithDb(async db => run = await db.JobRuns.AsNoTracking().SingleAsync(r => r.Job == SendDailySummariesCommand.Job));
        Assert.Equal(new DateTimeOffset(2026, 11, 11, 12, 0, 0, TimeSpan.Zero), run.Occurrence);
        Assert.NotNull(run.SucceededAt);
    }

    // L2-182 AC3: 7:00 a.m. is 12:00 UTC in winter and 11:00 UTC in summer.
    [Theory]
    [InlineData("2027-03-13T11:59:00Z", "2027-03-13T12:00:00Z")] // Saturday, standard time
    [InlineData("2027-03-14T10:59:00Z", "2027-03-14T11:00:00Z")] // Sunday, the clocks went forward at 2:00 a.m.
    [InlineData("2027-11-06T10:59:00Z", "2027-11-06T11:00:00Z")] // Saturday, daylight time
    [InlineData("2027-11-07T11:59:00Z", "2027-11-07T12:00:00Z")] // Sunday, the clocks went back at 2:00 a.m.
    public async Task L2_182_AC3_seven_in_the_morning_is_toronto_time_on_either_side_of_a_clock_change(string before, string at)
    {
        await ChooseDailySummary(Naomi());
        _factory.Clock.Advance(DateTimeOffset.Parse(before, null) - TimeSpan.FromDays(1) - _factory.Clock.GetUtcNow());
        await SendSummaries();
        await AskForQuote();

        _factory.Clock.Advance(DateTimeOffset.Parse(before, null) - _factory.Clock.GetUtcNow());
        await SendSummaries();
        Assert.Empty(EmailsTo(_naomi));

        _factory.Clock.Advance(DateTimeOffset.Parse(at, null) - _factory.Clock.GetUtcNow());
        await SendSummaries();
        Assert.Single(EmailsTo(_naomi));
    }
}
