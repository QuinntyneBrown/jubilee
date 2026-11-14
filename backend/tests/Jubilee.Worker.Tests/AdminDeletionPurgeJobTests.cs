using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Jubilee.Worker.Tests;

// Acceptance Test
// Traces to: L2-281 (AC4)
// Description: the daily job erases the records deleted from the admin application more than 30 days ago.
public sealed class AdminDeletionPurgeJobTests
{
    private readonly string _store = $"jubilee-worker-{Guid.NewGuid():N}";

    private AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(_store, Infrastructure.DependencyInjection.InMemoryRoot)
        .Options);

    /// <summary>Keeps what the job logs, to be read by the test.</summary>
    private sealed class Captured : ILogger<AdminDeletionPurgeJob>
    {
        public List<string> Lines { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            lock (Lines)
            {
                Lines.Add(formatter(state, exception));
            }
        }
    }

    // L2-281 AC4
    // Given a feedback deleted 31 days ago, a saved item deleted 29 days ago and a feedback in use,
    // when the daily job runs, then only the one deleted 31 days ago is erased.
    [Fact]
    public async Task L2_281_AC4_the_daily_job_erases_what_was_deleted_more_than_30_days_ago()
    {
        var now = DateTimeOffset.UtcNow;
        var old = Feedback.Rate("member|ruth", "Ruth Chen", 4, "Old.", new AreaScores(null, null, null, null), false, "key-1", now.AddDays(-60));
        old.AdminDelete(now.AddDays(-31));
        var recent = SavedItem.Business("member|ruth", Guid.NewGuid(), now.AddDays(-40));
        recent.AdminDelete(now.AddDays(-29));
        var kept = Feedback.Rate("member|ruth", "Ruth Chen", 5, "Kept.", new AreaScores(null, null, null, null), false, "key-2", now.AddDays(-60));
        await using (var db = Db())
        {
            db.AddRange(old, recent, kept);
            await db.SaveChangesAsync();
        }

        using var host = WorkerHost.CreateBuilder(
            [$"--Database:Provider={Infrastructure.DependencyInjection.InMemoryProvider}", $"--ConnectionStrings:Jubilee={_store}"]).Build();
        var logger = new Captured();
        using var job = new AdminDeletionPurgeJob(host.Services.GetRequiredService<IServiceScopeFactory>(), logger);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        await job.StartAsync(timeout.Token);
        while (logger.Lines.Count == 0 && !timeout.IsCancellationRequested)
        {
            await Task.Delay(20, timeout.Token);
        }

        await job.StopAsync(timeout.Token);

        Assert.Contains("Admin deletions: erased 1 records deleted more than 30 days ago.", logger.Lines);
        await using var after = Db();
        Assert.Equal("Kept.", Assert.Single(await after.Feedback.IgnoreQueryFilters().ToListAsync()).Note);
        Assert.NotNull(Assert.Single(await after.SavedItems.IgnoreQueryFilters().ToListAsync()).AdminDeletedAt);
    }
}
