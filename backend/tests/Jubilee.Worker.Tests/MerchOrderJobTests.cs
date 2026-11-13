using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Jubilee.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Jubilee.Worker.Tests;

// Acceptance Test
// Traces to: L2-270 (AC5, AC6), L2-148 (AC5, AC7)
// Description: the worker expires merchandise orders never paid and deletes them after 30 days, logging counts only.
public sealed class MerchOrderJobTests
{
    private readonly string _store = $"jubilee-worker-{Guid.NewGuid():N}";

    private AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(_store, Infrastructure.DependencyInjection.InMemoryRoot)
        .Options);

    private sealed class Captured : ILogger<MerchOrderJob>
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

    [Fact]
    public async Task L2_270_AC6_the_job_expires_a_lapsed_order_and_deletes_one_never_paid_for_30_days()
    {
        var now = DateTimeOffset.UtcNow;
        Guid lapsed;
        await using (var db = Db())
        {
            var product = MerchCatalogue.PurposeTee(now.AddDays(-60));
            db.MerchProducts.Add(product);
            var mensL = product.Variants.Single(v => v.Sku == "mens-L");
            var old = MerchOrder.Start(product, [(mensL, 1)], MerchDelivery.Ship, now.AddDays(-40));
            var recent = MerchOrder.Start(product, [(mensL, 1)], MerchDelivery.Ship, now.AddHours(-1));
            lapsed = recent.Id;
            db.MerchOrders.AddRange(old, recent);
            await db.SaveChangesAsync();
        }

        using var host = WorkerHost.CreateBuilder(
            [$"--Database:Provider={Infrastructure.DependencyInjection.InMemoryProvider}", $"--ConnectionStrings:Jubilee={_store}"]).Build();
        var logger = new Captured();
        using var job = new MerchOrderJob(host.Services.GetRequiredService<IServiceScopeFactory>(), TimeProvider.System, logger);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        await job.StartAsync(timeout.Token);
        while (!logger.Lines.Any(l => l.StartsWith("Retention:", StringComparison.Ordinal)) && !timeout.IsCancellationRequested)
        {
            await Task.Delay(20, timeout.Token);
        }

        await job.StopAsync(timeout.Token);

        Assert.Contains("Expired 2 merchandise orders that were never paid.", logger.Lines);
        Assert.Contains("Retention: deleted 1 merchandise orders never paid and erased the buyer of 0 paid 6 years ago.", logger.Lines);
        await using var after = Db();
        var left = Assert.Single(await after.MerchOrders.ToListAsync());
        Assert.Equal(lapsed, left.Id);
        Assert.Equal(MerchOrderStatus.Expired, left.Status);
    }
}
