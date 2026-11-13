using System.Collections.Concurrent;
using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Jubilee.Api.Tests.Support;

/// <summary>
/// Makes every use of the database fail while <see cref="Unavailable"/> is set. Tests run on EF
/// Core InMemory (ADR 0009), which issues no commands, so the outage is felt where the
/// application reaches the database: <see cref="IAppDbContext"/>.
/// </summary>
public sealed class DatabaseOutage
{
    public const string SecretDetail = "Login failed for user 'jubilee_app' on tcp:sql-prod-01";

    public bool Unavailable { get; set; }

    internal void ThrowIfUnavailable()
    {
        if (Unavailable)
        {
            throw new OutageException(SecretDetail);
        }
    }

    private sealed class OutageException(string message) : DbException(message);
}

/// <summary>The application's database, failing as <see cref="DatabaseOutage"/> says.</summary>
public sealed class OutageAwareDbContext(AppDbContext inner, DatabaseOutage outage) : IAppDbContext
{
    public DbSet<Listing> Listings => Use(inner.Listings);

    public DbSet<Product> Products => Use(inner.Products);

    public DbSet<Service> Services => Use(inner.Services);

    public DbSet<FeaturedSlot> FeaturedSlots => Use(inner.FeaturedSlots);

    public DbSet<StockAlert> StockAlerts => Use(inner.StockAlerts);

    public DbSet<SavedItem> SavedItems => Use(inner.SavedItems);

    public DbSet<ConsentRecord> ConsentRecords => Use(inner.ConsentRecords);

    public DbSet<Feedback> Feedback => Use(inner.Feedback);

    public DbSet<FeedbackScreenshot> FeedbackScreenshots => Use(inner.FeedbackScreenshots);

    public DbSet<ListingReport> ListingReports => Use(inner.ListingReports);

    public DbSet<ReportAction> ReportActions => Use(inner.ReportActions);

    public DbSet<DataExport> DataExports => Use(inner.DataExports);

    public DbSet<ContentVersion> ContentVersions => Use(inner.ContentVersions);

    public DbSet<MaintenanceWindow> MaintenanceWindows => Use(inner.MaintenanceWindows);

    public DbSet<AccessRequest> AccessRequests => Use(inner.AccessRequests);

    public DbSet<ListingSlug> ListingSlugs => Use(inner.ListingSlugs);

    public DbSet<ListingReportEntry> ListingReportEntries => Use(inner.ListingReportEntries);

    public DbSet<Review> Reviews => Use(inner.Reviews);

    public DbSet<ReviewReport> ReviewReports => Use(inner.ReviewReports);

    public DbSet<ListingView> ListingViews => Use(inner.ListingViews);

    public DbSet<ListingPhoto> ListingPhotos => Use(inner.ListingPhotos);

    public DbSet<ProductPhoto> ProductPhotos => Use(inner.ProductPhotos);

    public DbSet<RecentSearch> RecentSearches => Use(inner.RecentSearches);

    public DbSet<Notification> Notifications => Use(inner.Notifications);

    public DbSet<Member> Members => Use(inner.Members);

    public DbSet<LinkToken> LinkTokens => Use(inner.LinkTokens);

    public DbSet<PasswordResetRequest> PasswordResetRequests => Use(inner.PasswordResetRequests);

    public DbSet<SecurityAlert> SecurityAlerts => Use(inner.SecurityAlerts);

    public DbSet<OutboxMessage> OutboxMessages => Use(inner.OutboxMessages);

    public DbSet<Conversation> Conversations => Use(inner.Conversations);

    public DbSet<Message> Messages => Use(inner.Messages);

    public DbSet<MessageAttachment> MessageAttachments => Use(inner.MessageAttachments);

    public DbSet<ConversationReport> ConversationReports => Use(inner.ConversationReports);

    public DbSet<Request> Requests => Use(inner.Requests);

    public DbSet<RequestTransition> RequestTransitions => Use(inner.RequestTransitions);

    public DbSet<DeliveryMethod> DeliveryMethods => Use(inner.DeliveryMethods);

    public DbSet<ListingDraft> ListingDrafts => Use(inner.ListingDrafts);

    public DbSet<ListingSubmission> ListingSubmissions => Use(inner.ListingSubmissions);

    public DbSet<StatementAgreement> StatementAgreements => Use(inner.StatementAgreements);

    public DbSet<AuditRecord> AuditRecords => Use(inner.AuditRecords);

    public DbSet<ResponseTimeStat> ResponseTimeStats => Use(inner.ResponseTimeStats);

    public DbSet<JobRun> JobRuns => Use(inner.JobRuns);
    public DbSet<MemberSession> Sessions => Use(inner.Sessions);

    public DbSet<SignInFailure> SignInFailures => Use(inner.SignInFailures);

    public DbSet<StaffMember> StaffMembers => Use(inner.StaffMembers);

    public DbSet<LaunchSubscriber> LaunchSubscribers => Use(inner.LaunchSubscribers);

    public DbSet<BusinessPreRegistration> BusinessPreRegistrations => Use(inner.BusinessPreRegistrations);

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        outage.ThrowIfUnavailable();
        return inner.SaveChangesAsync(cancellationToken);
    }

    private T Use<T>(T set)
    {
        outage.ThrowIfUnavailable();
        return set;
    }
}

public sealed record CapturedLog(string Category, LogLevel Level, string Message, Exception? Exception);

/// <summary>Collects what the API logs so a test can look an error reference up, as support would.</summary>
public sealed class CapturedLogs : ILoggerProvider
{
    private readonly ConcurrentQueue<CapturedLog> _entries = new();

    public IReadOnlyCollection<CapturedLog> Entries => _entries;

    public void Clear() => _entries.Clear();

    public ILogger CreateLogger(string categoryName) => new Logger(categoryName, _entries);

    public void Dispose()
    {
    }

    private sealed class Logger(string category, ConcurrentQueue<CapturedLog> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            entries.Enqueue(new CapturedLog(category, logLevel, formatter(state, exception), exception));
    }
}

/// <summary>A test-only endpoint that fails outside the directory.</summary>
[ApiController]
[Route("api/test")]
[AllowAnonymous]
public sealed class FailingController : ControllerBase
{
    public const string SecretDetail = "NullReference in PaymentsService at line 42";

    [HttpGet("boom")]
    public IActionResult Boom() => throw new InvalidOperationException(SecretDetail);
}

/// <summary>The maintenance switch a test turns on and off without touching configuration.</summary>
public sealed class FakeMaintenance : Jubilee.Application.Maintenance.IMaintenanceState
{
    public bool Enabled { get; set; }

    public DateTimeOffset? BackBy { get; set; }

    public void Off()
    {
        Enabled = false;
        BackBy = null;
    }
}
