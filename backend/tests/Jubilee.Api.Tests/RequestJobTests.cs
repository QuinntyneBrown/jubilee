using Jubilee.Api.Tests.Support;
using Jubilee.Application.Jobs;
using Jubilee.Application.Requests;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// The guarantees of the two request jobs: L2-182 AC1, for L2-043 AC5 and AC8. Each scope stands for one
// instance of the worker. Joanna booked Legacy Financial for Thursday 12 November, 10:00 to 10:30 in
// Toronto, and asked WaterWorks for a quote nobody answered. "Today" is ListingMother.Now.
public sealed class RequestJobTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string JoannaId = "member|joanna";

    private readonly JubileeApiFactory _factory;
    private Request _meeting = null!;
    private Request _drain = null!;

    public RequestJobTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var wanda = Member.Join(EmailAddress.TryParse("wanda@example.com")!, "Wanda", "Reid", null, "hash", ListingMother.Now);
        wanda.ConfirmEmail();
        var legacy = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        legacy.AssignOwner("member|trevor");
        var water = ListingMother.Public("waterworks", "home-property", "WaterWorks Plumbing & Drains");
        water.AssignOwner(wanda.Id.ToString());
        _meeting = Request.Book(
            JoannaId, "Joanna Adeyemi", legacy.Id, Guid.NewGuid(), "Discovery meeting", TorontoClock.At(new DateOnly(2026, 11, 12), new TimeOnly(10, 0)),
            TimeSpan.FromMinutes(30), MeetingMode.Video, null, null, Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-1));
        _meeting.Confirm("member|trevor", ListingMother.Now.AddHours(-1));
        _drain = Request.AskForQuote(
            JoannaId, "Joanna Adeyemi", water.Id, null, null, "Kitchen drain is slow and gurgling.", null, null, null, Guid.NewGuid().ToString(),
            ListingMother.Now.AddDays(-1));
        await _factory.Arrange(wanda, legacy, water, _meeting, _drain);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>One instance of the worker reaches the job's tick.</summary>
    private async Task<int?> Tick(IRequest<int?> command)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(command);
    }

    private async Task<List<JobRun>> Runs(string job)
    {
        List<JobRun> runs = [];
        await _factory.WithDb(async db => runs = [.. (await db.JobRuns.AsNoTracking().Where(r => r.Job == job).ToListAsync()).OrderBy(r => r.Occurrence)]);
        return runs;
    }

    private async Task<RequestStatus> StatusOf(Request request)
    {
        var status = RequestStatus.New;
        await _factory.WithDb(async db => status = (await db.Requests.AsNoTracking().SingleAsync(r => r.Id == request.Id)).Status);
        return status;
    }

    private async Task<int> RemindersToWanda()
    {
        var count = 0;
        await _factory.WithDb(async db => count = await db.OutboxMessages.AsNoTracking().CountAsync(m => m.ToAddress == "wanda@example.com"));
        return count;
    }

    // L2-182 AC1: at most once per schedule across instances, and its last success recorded
    [Fact]
    public async Task L2_182_AC1_two_instances_in_the_same_five_minutes_complete_finished_bookings_once_and_record_the_success()
    {
        // The meeting ended on Thursday at 10:30.
        _factory.Clock.Advance(TimeSpan.FromDays(2).Add(TimeSpan.FromMinutes(31)));
        var now = _factory.Clock.GetUtcNow();

        var ran = await Tick(new RunBookingCompletionJobCommand());
        _factory.Clock.Advance(TimeSpan.FromSeconds(30));
        var again = await Tick(new RunBookingCompletionJobCommand());

        Assert.Equal(1, ran);
        Assert.Null(again);
        Assert.Equal(RequestStatus.Completed, await StatusOf(_meeting));
        var run = Assert.Single(await Runs(RunBookingCompletionJobCommand.Job));
        Assert.Equal(JobRun.OccurrenceOf(now, TimeSpan.FromMinutes(5)), run.Occurrence);
        Assert.Equal(now, run.SucceededAt);
        await using var scope = _factory.Services.CreateAsyncScope();
        Assert.Equal(now, await scope.ServiceProvider.GetRequiredService<ScheduledJobs>().LastSuccessAsync(RunBookingCompletionJobCommand.Job, default));
    }

    // L2-182 AC1: idempotent, and the next occurrence runs again
    [Fact]
    public async Task L2_182_AC1_the_next_five_minutes_run_again_and_complete_nothing_twice()
    {
        Assert.Equal(0, await Tick(new RunBookingCompletionJobCommand()));
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));

        var next = await Tick(new RunBookingCompletionJobCommand());

        Assert.Equal(0, next);
        Assert.Equal(RequestStatus.Confirmed, await StatusOf(_meeting));
        Assert.Equal(2, (await Runs(RunBookingCompletionJobCommand.Job)).Count);
    }

    // L2-182 AC1, L2-043 AC8: the owner is reminded once, by one instance, and the run is recorded
    [Fact]
    public async Task L2_182_AC1_two_instances_in_the_same_hour_remind_the_owner_of_an_unanswered_request_once()
    {
        _factory.Clock.Advance(TimeSpan.FromDays(6).Add(TimeSpan.FromMinutes(1)));
        var now = _factory.Clock.GetUtcNow();

        var ran = await Tick(new RunUnansweredRequestJobCommand());
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        var again = await Tick(new RunUnansweredRequestJobCommand());

        Assert.Equal(1, ran);
        Assert.Null(again);
        Assert.Equal(1, await RemindersToWanda());
        var run = Assert.Single(await Runs(RunUnansweredRequestJobCommand.Job));
        Assert.Equal(JobRun.OccurrenceOf(now, TimeSpan.FromHours(1)), run.Occurrence);
        Assert.Equal(now, run.SucceededAt);
    }

    // L2-182 AC1: idempotent across occurrences
    [Fact]
    public async Task L2_182_AC1_the_next_hour_runs_again_and_reminds_nobody_twice()
    {
        _factory.Clock.Advance(TimeSpan.FromDays(6).Add(TimeSpan.FromMinutes(1)));
        await Tick(new RunUnansweredRequestJobCommand());
        _factory.Clock.Advance(TimeSpan.FromHours(1));

        var next = await Tick(new RunUnansweredRequestJobCommand());

        Assert.Equal(0, next);
        Assert.Equal(1, await RemindersToWanda());
        Assert.Equal(2, (await Runs(RunUnansweredRequestJobCommand.Job)).Count);
    }
}
