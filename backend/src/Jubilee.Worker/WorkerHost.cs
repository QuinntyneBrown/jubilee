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
        builder.Services.AddHostedService<PasswordResetJob>();
        builder.Services.AddHostedService<ListingDraftExpiryJob>();
        builder.Services.AddHostedService<ReferenceExpiryJob>();
        builder.Services.AddHostedService<ReferenceRetentionJob>();
        builder.Services.AddHostedService<ResponseTimeBadgeJob>();
        builder.Services.AddHostedService<BookingCompletionJob>();
        builder.Services.AddHostedService<MeetingReminderJob>();
        builder.Services.AddHostedService<UnansweredRequestJob>();
        builder.Services.AddHostedService<MaintenanceWatcherJob>();
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
/// Every few seconds: turns the password reset requests the API recorded into links and e-mails. Only this job reads
/// the account for a request, so the API answers the same for any address (L2-141 AC1).
/// </summary>
public sealed class PasswordResetJob(IServiceScopeFactory scopes, ILogger<PasswordResetJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    await scope.ServiceProvider.GetRequiredService<PasswordResetLinks>().IssueAsync(stoppingToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Password reset requests could not be processed. They will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
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

/// <summary>
/// Once a day: e-mails an owner whose church reference did not answer within 14 days, once per link
/// (L2-084 AC4). The sweep is idempotent, so a repeat or a second instance changes nothing.
/// </summary>
public sealed class ReferenceExpiryJob(IServiceScopeFactory scopes, ILogger<ReferenceExpiryJob> logger) : BackgroundService
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
                    var sent = await scope.ServiceProvider.GetRequiredService<MediatR.ISender>()
                        .Send(new Jubilee.Application.Reference.NotifyExpiredReferencesCommand(), stoppingToken);
                    if (sent > 0)
                    {
                        logger.LogInformation("Told {Count} owners that their reference link expired.", sent);
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Expired reference links could not be handled. They will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("The reference expiry job is stopping.");
        }
    }
}

/// <summary>
/// Once a day: deletes a church reference's answer, name, role, note and e-mail 90 days after the
/// listing was approved or declined (L2-146, L2-101 AC5, L2-104 AC2). Safe to repeat.
/// </summary>
public sealed class ReferenceRetentionJob(IServiceScopeFactory scopes, ILogger<ReferenceRetentionJob> logger) : BackgroundService
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
                    var deleted = await scope.ServiceProvider.GetRequiredService<MediatR.ISender>()
                        .Send(new Jubilee.Application.Verification.DeleteDecidedReferenceDataCommand(), stoppingToken);
                    if (deleted > 0)
                    {
                        logger.LogInformation("Deleted the reference data of {Count} decided listings.", deleted);
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Reference data could not be deleted. It will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("The reference retention job is stopping.");
        }
    }
}

/// <summary>
/// Every hour: recomputes each live listing's median first response and its "Replies fast" badge
/// (L2-054, L2-182). Safe to repeat.
/// </summary>
public sealed class ResponseTimeBadgeJob(IServiceScopeFactory scopes, ILogger<ResponseTimeBadgeJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var updated = await scope.ServiceProvider.GetRequiredService<MediatR.ISender>()
                        .Send(new Jubilee.Application.Requests.RecomputeResponseTimesCommand(), stoppingToken);
                    logger.LogInformation("Recomputed the response time of {Count} listings.", updated);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Response times could not be recomputed. They will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("The response-time job is stopping.");
        }
    }
}

/// <summary>
/// Every minute: reminds both sides of each confirmed meeting that starts within the hour (L2-069). Safe to repeat.
/// </summary>
public sealed class MeetingReminderJob(IServiceScopeFactory scopes, ILogger<MeetingReminderJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var reminded = await scope.ServiceProvider.GetRequiredService<Jubilee.Application.Notifications.MeetingReminders>()
                        .SendDueAsync(stoppingToken);
                    if (reminded > 0)
                    {
                        logger.LogInformation("Reminded {Count} meetings.", reminded);
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Meeting reminders could not be sent. They will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("The meeting reminder job is stopping.");
        }
    }
}

/// <summary>
/// Every five minutes: completes each confirmed booking whose meeting has ended (L2-043 AC5, L2-182).
/// Safe to repeat.
/// </summary>
public sealed class BookingCompletionJob(IServiceScopeFactory scopes, ILogger<BookingCompletionJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var completed = await scope.ServiceProvider.GetRequiredService<MediatR.ISender>()
                        .Send(new Jubilee.Application.Requests.CompleteFinishedBookingsCommand(), stoppingToken);
                    if (completed > 0)
                    {
                        logger.LogInformation("Completed {Count} finished bookings.", completed);
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Finished bookings could not be completed. They will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("The booking completion job is stopping.");
        }
    }
}

/// <summary>
/// Every hour: reminds an owner once of a request nobody answered in a week (L2-043 AC8, L2-182).
/// Safe to repeat: a request is reminded of once.
/// </summary>
public sealed class UnansweredRequestJob(IServiceScopeFactory scopes, ILogger<UnansweredRequestJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var reminded = await scope.ServiceProvider.GetRequiredService<MediatR.ISender>()
                        .Send(new Jubilee.Application.Requests.RemindUnansweredRequestsCommand(), stoppingToken);
                    if (reminded > 0)
                    {
                        logger.LogInformation("Reminded the owners of {Count} unanswered requests.", reminded);
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Unanswered requests could not be reminded of. They will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("The unanswered request job is stopping.");
        }
    }
}

/// <summary>
/// Watches the maintenance switch (L2-117 AC2). When it turns on a window opens; when it turns off the window closes and the
/// e-mailed links that were valid when it began are extended by its length, once.
/// </summary>
public sealed class MaintenanceWatcherJob(IServiceScopeFactory scopes, ILogger<MaintenanceWatcherJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    await scope.ServiceProvider.GetRequiredService<Jubilee.Application.Maintenance.MaintenanceWindowService>()
                        .ObserveAsync(stoppingToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "The maintenance switch could not be observed. It will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            // The host is stopping.
        }
    }
}
