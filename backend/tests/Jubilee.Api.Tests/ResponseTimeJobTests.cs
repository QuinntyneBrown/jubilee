using Jubilee.Api.Tests.Support;
using Jubilee.Application.Jobs;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// The response-time job's guarantees: L2-182 AC1. Each scope stands for one instance of the worker.
public sealed class ResponseTimeJobTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;
    private Listing _listing = null!;

    public ResponseTimeJobTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        _listing.AssignOwner("member|naomi");
        await _factory.Arrange(_listing);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>One instance of the worker reaches the job's tick.</summary>
    private async Task<int?> Tick()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(new RunResponseTimeBadgeJobCommand());
    }

    private async Task<DateTimeOffset> ComputedAt()
    {
        DateTimeOffset at = default;
        await _factory.WithDb(async db => at = (await db.ResponseTimeStats.AsNoTracking().SingleAsync(s => s.ListingId == _listing.Id)).ComputedAt);
        return at;
    }

    private async Task<List<JobRun>> Runs()
    {
        List<JobRun> runs = [];
        await _factory.WithDb(async db => runs = [.. (await db.JobRuns.AsNoTracking().ToListAsync()).OrderBy(r => r.Occurrence)]);
        return runs;
    }

    private DateTimeOffset Hour() => JobRun.OccurrenceOf(_factory.Clock.GetUtcNow(), TimeSpan.FromHours(1));

    // L2-182 AC1: at most once per schedule across instances
    [Fact]
    public async Task L2_182_AC1_two_instances_that_reach_the_same_hour_recompute_the_badges_once()
    {
        var hour = Hour();
        var first = _factory.Clock.GetUtcNow();

        var ran = await Tick();
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        var again = await Tick();

        Assert.Equal(1, ran);
        Assert.Null(again);
        Assert.Equal(first, await ComputedAt());
        var run = Assert.Single(await Runs());
        Assert.Equal((RunResponseTimeBadgeJobCommand.Job, hour), (run.Job, run.Occurrence));
    }

    // L2-182 AC1: records its last success
    [Fact]
    public async Task L2_182_AC1_the_job_records_its_last_success()
    {
        var now = _factory.Clock.GetUtcNow();

        await Tick();

        var run = Assert.Single(await Runs());
        Assert.Equal(now, run.ClaimedAt);
        Assert.Equal(now, run.SucceededAt);
        await using var scope = _factory.Services.CreateAsyncScope();
        var jobs = scope.ServiceProvider.GetRequiredService<ScheduledJobs>();
        Assert.Equal(now, await jobs.LastSuccessAsync(RunResponseTimeBadgeJobCommand.Job, default));
        Assert.Null(await jobs.LastSuccessAsync("another-job", default));
    }

    // L2-054 AC2: recomputed at least hourly
    [Fact]
    public async Task L2_054_AC2_the_next_hour_recomputes_again_and_moves_the_last_success()
    {
        await Tick();
        _factory.Clock.Advance(TimeSpan.FromHours(1));
        var later = _factory.Clock.GetUtcNow();

        var ran = await Tick();

        Assert.Equal(1, ran);
        Assert.Equal(later, await ComputedAt());
        var runs = await Runs();
        Assert.Equal(2, runs.Count);
        Assert.Equal(later, runs[^1].SucceededAt);
    }

    // L2-182 AC1: a run that fails records no success
    [Fact]
    public async Task L2_182_AC1_a_run_that_fails_records_no_success_and_the_next_hour_runs()
    {
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var jobs = scope.ServiceProvider.GetRequiredService<ScheduledJobs>();
            await Assert.ThrowsAsync<InvalidOperationException>(() => jobs.RunOnceAsync(
                RunResponseTimeBadgeJobCommand.Job, RunResponseTimeBadgeJobCommand.Every, _ => throw new InvalidOperationException("The database went away."), default));
            Assert.Null(await jobs.LastSuccessAsync(RunResponseTimeBadgeJobCommand.Job, default));
        }

        Assert.Null(Assert.Single(await Runs()).SucceededAt);
        _factory.Clock.Advance(TimeSpan.FromHours(1));
        Assert.Equal(1, await Tick());
    }
}
