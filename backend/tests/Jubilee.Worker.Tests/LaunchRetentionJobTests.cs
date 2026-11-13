using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Jubilee.Worker.Tests;

// Acceptance Test
// Traces to: L2-218 (AC6), L2-148 (AC5, AC6)
// Description: the daily job deletes the launch sign-ups and pre-registrations 12 months old and logs counts only.
public sealed class LaunchRetentionJobTests
{
    private readonly string _store = $"jubilee-worker-{Guid.NewGuid():N}";

    private AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(_store, Infrastructure.DependencyInjection.InMemoryRoot)
        .Options);

    /// <summary>Keeps what the job logs, to be read by the test.</summary>
    private sealed class Captured : ILogger<LaunchRetentionJob>
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

    // L2-218 AC6
    // Given a sign-up and a pre-registration sent 13 months ago and one of each sent last month,
    // when the daily job runs, then the old ones are deleted and the log says how many, with no personal data.
    [Fact]
    public async Task L2_218_AC6_the_daily_job_deletes_what_is_12_months_old_and_logs_the_counts_only()
    {
        var now = DateTimeOffset.UtcNow;
        await using (var db = Db())
        {
            db.LaunchSubscribers.Add(LaunchSubscriber.SignUp(EmailAddress.TryParse("old@example.com")!, "Ruth", now.AddMonths(-13)));
            db.LaunchSubscribers.Add(LaunchSubscriber.SignUp(EmailAddress.TryParse("new@example.com")!, null, now.AddMonths(-1)));
            db.BusinessPreRegistrations.Add(BusinessPreRegistration.Send(
                "Old Bakery", "Eve", EmailAddress.TryParse("eve@example.com")!, null, Category.Find("shops")!, "Scarborough", null, "Bread.", now.AddMonths(-13)));
            db.BusinessPreRegistrations.Add(BusinessPreRegistration.Send(
                "New Bakery", "Ada", EmailAddress.TryParse("ada@example.com")!, null, Category.Find("shops")!, "Leslieville", null, "Cakes.", now.AddMonths(-1)));
            await db.SaveChangesAsync();
        }

        using var host = WorkerHost.CreateBuilder(
            [$"--Database:Provider={Infrastructure.DependencyInjection.InMemoryProvider}", $"--ConnectionStrings:Jubilee={_store}"]).Build();
        var logger = new Captured();
        using var job = new LaunchRetentionJob(host.Services.GetRequiredService<IServiceScopeFactory>(), logger);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        await job.StartAsync(timeout.Token);
        while (logger.Lines.Count == 0 && !timeout.IsCancellationRequested)
        {
            await Task.Delay(20, timeout.Token);
        }

        await job.StopAsync(timeout.Token);

        var line = Assert.Single(logger.Lines);
        Assert.Equal("Retention: deleted 1 launch notification sign-ups and 1 business pre-registrations.", line);
        await using var after = Db();
        Assert.Equal("new@example.com", Assert.Single(await after.LaunchSubscribers.ToListAsync()).Email);
        Assert.Equal("New Bakery", Assert.Single(await after.BusinessPreRegistrations.ToListAsync()).BusinessName);
    }
}
