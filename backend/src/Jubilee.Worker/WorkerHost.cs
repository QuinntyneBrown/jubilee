using Jubilee.Application;
using Jubilee.Application.Accounts;
using Jubilee.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jubilee.Worker;

/// <summary>
/// The background jobs host. It runs the outbox dispatch (e-mail sending); search indexing is added
/// when a search engine replaces the database index (ADR 0011).
/// </summary>
public static class WorkerHost
{
    public static HostApplicationBuilder CreateBuilder(string[] args)
    {
        var builder = Host.CreateApplicationBuilder(args);
        builder.Services.AddApplication();
        builder.Services.AddInfrastructure(builder.Configuration);
        builder.Services.AddHostedService<OutboxDispatcherJob>();
        builder.Services.AddHostedService<ListingDraftExpiryJob>();
        return builder;
    }
}

/// <summary>
/// Sends the e-mails in the outbox every few seconds (L2-068 AC1: within 2 minutes). A failed send is
/// retried with back-off by the dispatcher; a failure of the job's own pass is logged and tried again.
/// </summary>
public sealed class OutboxDispatcherJob(IServiceScopeFactory scopes, IConfiguration configuration, ILogger<OutboxDispatcherJob> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(int.TryParse(configuration["Worker:OutboxIntervalSeconds"], out var seconds) ? seconds : 10);
        logger.LogInformation("Jubilee Worker started. Dispatching the outbox every {Interval}.", interval);
        using var timer = new PeriodicTimer(interval);
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var sent = await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(stoppingToken);
                    if (sent > 0)
                    {
                        logger.LogInformation("Sent {Count} e-mails.", sent);
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "The outbox could not be dispatched. It will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Jubilee Worker stopping.");
        }
    }
}

/// <summary>
/// Once a day: e-mails the owner of a draft untouched for 180 days and deletes it 14 days later
/// (L2-077 AC5). The sweep is idempotent, so a repeat or a second instance changes nothing.
/// </summary>
public sealed class ListingDraftExpiryJob(IServiceScopeFactory scopes, ILogger<ListingDraftExpiryJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var changed = await scope.ServiceProvider.GetRequiredService<MediatR.ISender>()
                        .Send(new Jubilee.Application.Onboarding.ExpireListingDraftsCommand(), stoppingToken);
                    if (changed > 0)
                    {
                        logger.LogInformation("Handled {Count} idle listing drafts.", changed);
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Idle listing drafts could not be handled. They will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("The draft expiry job is stopping.");
        }
    }
}
