using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Jubilee.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Listing> Listings => Set<Listing>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<Service> Services => Set<Service>();

    public DbSet<StockAlert> StockAlerts => Set<StockAlert>();

    public DbSet<SavedItem> SavedItems => Set<SavedItem>();

    public DbSet<ConsentRecord> ConsentRecords => Set<ConsentRecord>();

    public DbSet<ContentVersion> ContentVersions => Set<ContentVersion>();

    public DbSet<MaintenanceWindow> MaintenanceWindows => Set<MaintenanceWindow>();

    public DbSet<AccessRequest> AccessRequests => Set<AccessRequest>();

    public DbSet<ListingSlug> ListingSlugs => Set<ListingSlug>();

    public DbSet<Feedback> Feedback => Set<Feedback>();

    public DbSet<FeedbackScreenshot> FeedbackScreenshots => Set<FeedbackScreenshot>();

    public DbSet<ListingReport> ListingReports => Set<ListingReport>();

    public DbSet<ListingReportEntry> ListingReportEntries => Set<ListingReportEntry>();

    public DbSet<Review> Reviews => Set<Review>();

    public DbSet<ReviewReport> ReviewReports => Set<ReviewReport>();

    public DbSet<ListingView> ListingViews => Set<ListingView>();

    public DbSet<ListingPhoto> ListingPhotos => Set<ListingPhoto>();

    public DbSet<RecentSearch> RecentSearches => Set<RecentSearch>();

    public DbSet<Notification> Notifications => Set<Notification>();

    public DbSet<Member> Members => Set<Member>();

    public DbSet<LinkToken> LinkTokens => Set<LinkToken>();

    public DbSet<PasswordResetRequest> PasswordResetRequests => Set<PasswordResetRequest>();

    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    public DbSet<MemberSession> Sessions => Set<MemberSession>();

    public DbSet<SignInFailure> SignInFailures => Set<SignInFailure>();

    public DbSet<StaffMember> StaffMembers => Set<StaffMember>();

    public DbSet<LaunchSubscriber> LaunchSubscribers => Set<LaunchSubscriber>();

    public DbSet<BusinessPreRegistration> BusinessPreRegistrations => Set<BusinessPreRegistration>();

    public DbSet<FeaturedSlot> FeaturedSlots => Set<FeaturedSlot>();

    public DbSet<Conversation> Conversations => Set<Conversation>();

    public DbSet<Message> Messages => Set<Message>();

    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();

    public DbSet<ConversationReport> ConversationReports => Set<ConversationReport>();

    public DbSet<ReportAction> ReportActions => Set<ReportAction>();

    public DbSet<DataExport> DataExports => Set<DataExport>();

    public DbSet<Request> Requests => Set<Request>();

    public DbSet<RequestTransition> RequestTransitions => Set<RequestTransition>();

    public DbSet<DeliveryMethod> DeliveryMethods => Set<DeliveryMethod>();

    public DbSet<ListingDraft> ListingDrafts => Set<ListingDraft>();

    public DbSet<ListingSubmission> ListingSubmissions => Set<ListingSubmission>();

    public DbSet<StatementAgreement> StatementAgreements => Set<StatementAgreement>();

    public DbSet<ReviewTick> ReviewTicks => Set<ReviewTick>();

    public DbSet<ListingDecision> ListingDecisions => Set<ListingDecision>();

    public DbSet<AuditRecord> AuditRecords => Set<AuditRecord>();

    public DbSet<ResponseTimeStat> ResponseTimeStats => Set<ResponseTimeStat>();

    public DbSet<JobRun> JobRuns => Set<JobRun>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        if (Database.IsSqlite())
        {
            // SQLite cannot order or compare DateTimeOffset; store UTC ticks so "Newest" and the
            // featured fallback sort in the database as they do on SQL Server.
            configurationBuilder.Properties<DateTimeOffset>().HaveConversion<DateTimeOffsetToUtcTicksConverter>();
        }
    }

    private sealed class DateTimeOffsetToUtcTicksConverter() : ValueConverter<DateTimeOffset, long>(
        value => value.UtcTicks,
        ticks => new DateTimeOffset(ticks, TimeSpan.Zero));
}
