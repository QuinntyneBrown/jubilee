using Jubilee.Application;
using Jubilee.Application.Accounts;
using Jubilee.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jubilee.Worker;

/// <summary>
/// The background jobs host. It runs the outbox dispatch (e-mail sending) and the scheduled jobs.
/// Search has no job here: it reads the listings themselves, so nothing is indexed (ADR 0011).
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
        builder.Services.AddHostedService<ResponseTimeBadgeJob>();
        builder.Services.AddHostedService<BookingCompletionJob>();
        builder.Services.AddHostedService<MeetingReminderJob>();
        builder.Services.AddHostedService<DailySummaryJob>();
        builder.Services.AddHostedService<NewBusinessNoteJob>();
        builder.Services.AddHostedService<UnansweredRequestJob>();
        builder.Services.AddHostedService<MaintenanceWatcherJob>();
        builder.Services.AddHostedService<DataExportJob>();
        builder.Services.AddHostedService<AccountErasureJob>();
        builder.Services.AddHostedService<LaunchRetentionJob>();
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
/// Recomputes each live listing's median first response and its "Replies fast" badge once an hour
/// (L2-054, L2-182 AC1). The tick is every ten minutes so an instance that starts late in an hour
/// still serves the next one on time; <see cref="Jubilee.Application.Jobs.ScheduledJobs"/> lets
/// only one instance run each hour and records its success.
/// </summary>
public sealed class ResponseTimeBadgeJob(IServiceScopeFactory scopes, ILogger<ResponseTimeBadgeJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(10));
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var updated = await scope.ServiceProvider.GetRequiredService<MediatR.ISender>()
                        .Send(new Jubilee.Application.Jobs.RunResponseTimeBadgeJobCommand(), stoppingToken);
                    if (updated is { } count)
                    {
                        logger.LogInformation("Recomputed the response time of {Count} listings.", count);
                    }
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

/// <summary>
/// Every few seconds: builds the data archives members asked for and mails their links; once an hour, deletes the files
/// of the links that no longer work (L2-018, L2-182). A build that fails is tried again, up to 5 times.
/// </summary>
public sealed class DataExportJob(IServiceScopeFactory scopes, ILogger<DataExportJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
        var lastCleanup = DateTimeOffset.MinValue;
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var builder = scope.ServiceProvider.GetRequiredService<DataExportBuilder>();
                    await builder.BuildDueAsync(stoppingToken);
                    if (DateTimeOffset.UtcNow - lastCleanup > TimeSpan.FromHours(1))
                    {
                        await builder.ExpireAsync(stoppingToken);
                        lastCleanup = DateTimeOffset.UtcNow;
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Data exports could not be processed. They will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
        }
    }
}

/// <summary>Once an hour: erases the personal data of the accounts deleted 30 days ago (L2-017 AC6, L2-148).</summary>
public sealed class AccountErasureJob(IServiceScopeFactory scopes, ILogger<AccountErasureJob> logger) : BackgroundService
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
                    var erased = await scope.ServiceProvider.GetRequiredService<AccountErasure>().EraseDueAsync(stoppingToken);
                    if (erased > 0)
                    {
                        logger.LogInformation("Erased the personal data of {Count} deleted accounts.", erased);
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Deleted accounts could not be erased. They will be tried again.");
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
/// Once a day: deletes the launch notification sign-ups and the business pre-registrations that are
/// 12 months old and logs how many, counts only (L2-148 AC5, AC6; L2-218 AC6).
/// </summary>
public sealed class LaunchRetentionJob(IServiceScopeFactory scopes, ILogger<LaunchRetentionJob> logger) : BackgroundService
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
                    var purged = await scope.ServiceProvider.GetRequiredService<MediatR.ISender>()
                        .Send(new Jubilee.Application.Launch.PurgeLaunchDataCommand(), stoppingToken);
                    logger.LogInformation(
                        "Retention: deleted {Subscribers} launch notification sign-ups and {PreRegistrations} business pre-registrations.",
                        purged.Subscribers,
                        purged.PreRegistrations);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "The launch sign-ups could not be checked for retention. They will be tried again.");
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
/// Every five minutes: once it is 7:00 a.m. in Toronto, sends each member who chose "One daily summary"
/// one e-mail of what was held for them (L2-016 AC6). <see cref="Jubilee.Application.Jobs.ScheduledJobs"/>
/// lets one instance send a day's summaries and records its success (L2-182 AC1 and AC3).
/// </summary>
public sealed class DailySummaryJob(IServiceScopeFactory scopes, ILogger<DailySummaryJob> logger) : BackgroundService
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
                    var sent = await scope.ServiceProvider.GetRequiredService<MediatR.ISender>()
                        .Send(new Jubilee.Application.Notifications.SendDailySummariesCommand(), stoppingToken);
                    if (sent is { } count)
                    {
                        logger.LogInformation("Queued {Count} daily summaries.", count);
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "The daily summaries could not be sent. They will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("The daily summary job is stopping.");
        }
    }
}

/// <summary>
/// Every ten minutes: once it is Monday 7:00 a.m. in Toronto, sends each member who turned on "New
/// businesses" one note of the businesses verified that week in the categories they browsed (L2-222).
/// One instance sends a week's notes and records its success (L2-182 AC1 and AC3).
/// </summary>
public sealed class NewBusinessNoteJob(IServiceScopeFactory scopes, ILogger<NewBusinessNoteJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(10));
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var sent = await scope.ServiceProvider.GetRequiredService<MediatR.ISender>()
                        .Send(new Jubilee.Application.Notifications.SendNewBusinessNotesCommand(), stoppingToken);
                    if (sent is { } count)
                    {
                        logger.LogInformation("Queued {Count} weekly notes of new businesses.", count);
                    }
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "The weekly notes of new businesses could not be sent. They will be tried again.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("The new business note job is stopping.");
        }
    }
}
