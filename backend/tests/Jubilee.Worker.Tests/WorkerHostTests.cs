using Jubilee.Worker;
using Microsoft.Extensions.Hosting;

namespace Jubilee.Worker.Tests;

public class WorkerHostTests
{
    [Fact]
    public async Task The_worker_host_starts_and_stops_cleanly()
    {
        using var host = WorkerHost.CreateBuilder([]).Build();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        await host.StartAsync(timeout.Token);
        await host.StopAsync(timeout.Token);

        var jobs = host.Services.GetService(typeof(IEnumerable<IHostedService>)) as IEnumerable<IHostedService>;
        Assert.NotNull(jobs);
        Assert.All(jobs.OfType<BackgroundService>(), job => Assert.True(job.ExecuteTask?.IsCompleted));
    }
}
