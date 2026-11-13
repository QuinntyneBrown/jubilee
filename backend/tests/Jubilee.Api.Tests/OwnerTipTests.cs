using System.Net;
using System.Net.Http.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Jubilee.Application.Notifications;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Tips for business owners (L2-223, L2-149 AC1). Naomi owns Luzandre.com, which is public, and turned
// the tips on; Joanna turned them on and owns nothing. The tests start on Tuesday 10 November 2026,
// after November's tips went out; the next are due on 1 December at 7:00 a.m. in Toronto.
public sealed class OwnerTipTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private static readonly DateTimeOffset DecemberFirstSeven = new(2026, 12, 1, 12, 0, 0, TimeSpan.Zero);

    private readonly JubileeApiFactory _factory;
    private Member _naomi = null!;
    private Member _joanna = null!;

    public OwnerTipTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _naomi = Confirmed("naomi@example.com", "Naomi", "Laurent");
        _joanna = Confirmed("joanna@example.com", "Joanna", "Adeyemi");
        var listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        listing.AssignOwner(_naomi.Id.ToString());
        await _factory.Arrange(_naomi, _joanna, listing);
        await Tick();
        await TurnOn(_naomi);
        await TurnOn(_joanna);
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
        (await Client(member).PatchAsJsonAsync("/api/account/notification-preferences", new { setting = "tips", enabled = true })).IsSuccessStatusCode);

    /// <summary>One instance of the worker reaches the tips job's tick, then the outbox is sent.</summary>
    private async Task<int?> Tick()
    {
        int? queued;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            queued = await scope.ServiceProvider.GetRequiredService<ISender>().Send(new SendOwnerTipsCommand());
        }

        using var dispatch = _factory.Services.CreateScope();
        await dispatch.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
        return queued;
    }

    private void GoTo(DateTimeOffset instant) => _factory.Clock.Advance(instant - _factory.Clock.GetUtcNow());

    private List<SentEmail> TipsTo(Member member) =>
        [.. _factory.Emails.Sent.Where(e => e.To == member.Email && e.Subject.StartsWith("A tip for your Jubilee listing: ", StringComparison.Ordinal))];

    // L2-223 AC1 and AC3, L2-149 AC1
    [Fact]
    public async Task L2_223_AC1_on_the_first_of_the_month_at_seven_an_owner_who_opted_in_gets_the_first_tip_with_the_address_and_an_unsubscribe()
    {
        GoTo(DecemberFirstSeven.AddMinutes(-1));
        Assert.Null(await Tick());
        Assert.Empty(TipsTo(_naomi));

        GoTo(DecemberFirstSeven);
        Assert.Equal(1, await Tick());

        var tip = Assert.Single(TipsTo(_naomi));
        Assert.Equal("A tip for your Jubilee listing: show your work with photos", tip.Subject);
        Assert.Contains("Add photos to Luzandre.com", tip.Body);
        Assert.Contains("Add photos: https://jubilee.test/my-business/listing", tip.Body);
        Assert.Contains("This is tip 1 of 4. We send one a month.", tip.Body);
        Assert.Contains("Jubilee, 1 Example Street, Toronto, ON M5H 0A1", tip.Body);
        Assert.Contains("Unsubscribe: https://jubilee.test/unsubscribe/", tip.Body);

        var done = await _factory.CreateClient().PostAsync(tip.UnsubscribeUrl, new FormUrlEncodedContent([new("List-Unsubscribe", "One-Click")]));
        Assert.Equal(HttpStatusCode.OK, done.StatusCode);
        Member stored = null!;
        await _factory.WithDb(async db => stored = await db.Members.AsNoTracking().SingleAsync(m => m.Id == _naomi.Id));
        Assert.False(stored.EmailTips);
    }

    // L2-223 AC1 and AC2: one a month, each once, and none after the last
    [Fact]
    public async Task L2_223_AC1_each_month_brings_the_next_tip_once_and_after_the_last_none()
    {
        for (var month = 0; month < 6; month++)
        {
            GoTo(DecemberFirstSeven.AddMonths(month).AddHours(2));
            await Tick();
            _factory.Clock.Advance(TimeSpan.FromDays(10));
            await Tick();
        }

        var tips = TipsTo(_naomi);
        Assert.Equal(4, tips.Count);
        Assert.Equal(4, tips.Select(t => t.Subject).Distinct().Count());
        Assert.Contains("This is tip 4 of 4.", tips[^1].Body);
    }

    // L2-223 AC2
    [Fact]
    public async Task L2_223_AC2_a_member_with_no_public_listing_and_an_owner_with_the_switch_off_get_no_tip()
    {
        var ruth = Confirmed("ruth@example.com", "Ruth", "Mensah");
        var hers = ListingMother.Public("ruth-bakes", "shops", "Ruth Bakes");
        hers.AssignOwner(ruth.Id.ToString());
        var draft = ListingMother.NonPublic(NonPublicState.Draft, "joanna-designs", "shops");
        draft.AssignOwner(_joanna.Id.ToString());
        await _factory.Arrange(ruth, hers, draft);

        GoTo(DecemberFirstSeven);
        Assert.Equal(1, await Tick());

        Assert.Single(TipsTo(_naomi));
        Assert.Empty(TipsTo(_joanna));
        Assert.Empty(TipsTo(ruth));
    }

    // L2-223 AC3: whatever "How often" says
    [Fact]
    public async Task L2_223_AC3_a_tip_is_sent_to_an_owner_on_the_daily_summary_too()
    {
        await Client(_naomi).PatchAsJsonAsync("/api/account/notification-preferences", new { setting = "frequency", frequency = "daily-summary" });

        GoTo(DecemberFirstSeven);
        await Tick();

        Assert.Single(TipsTo(_naomi));
    }

    // L2-223 AC4, L2-182 AC1
    [Fact]
    public async Task L2_223_AC4_two_instances_that_reach_the_first_send_one_tip_and_the_run_records_its_success()
    {
        GoTo(DecemberFirstSeven);

        var ran = await Tick();
        _factory.Clock.Advance(TimeSpan.FromMinutes(30));
        var again = await Tick();

        Assert.Equal(1, ran);
        Assert.Null(again);
        Assert.Single(TipsTo(_naomi));
        JobRun run = null!;
        await _factory.WithDb(async db => run = (await db.JobRuns.AsNoTracking().Where(r => r.Job == SendOwnerTipsCommand.Job).ToListAsync()).MaxBy(r => r.Occurrence)!);
        Assert.Equal(DecemberFirstSeven, run.Occurrence);
        Assert.NotNull(run.SucceededAt);
    }
}
