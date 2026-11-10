using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jubilee.Worker;

/// <summary>
/// The background jobs host. It is a skeleton for now: outbox dispatch, e-mail sending and
/// search indexing are added by the journeys that need them.
/// </summary>
public static class WorkerHost
{
    public static HostApplicationBuilder CreateBuilder(string[] args)
    {
        var builder = Host.CreateApplicationBuilder(args);
        builder.Services.AddHostedService<IdleWorker>();
        return builder;
    }
}

/// <summary>Keeps the host alive and logs its lifetime until real jobs exist.</summary>
public sealed class IdleWorker(ILogger<IdleWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Jubilee Worker started. No background jobs are registered yet.");
        try
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Jubilee Worker stopping.");
        }
    }
}
