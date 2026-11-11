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

    public DbSet<ListingView> ListingViews => Set<ListingView>();

    public DbSet<RecentSearch> RecentSearches => Set<RecentSearch>();

    public DbSet<Member> Members => Set<Member>();

    public DbSet<LinkToken> LinkTokens => Set<LinkToken>();

    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    public DbSet<FeaturedSlot> FeaturedSlots => Set<FeaturedSlot>();

    public DbSet<Conversation> Conversations => Set<Conversation>();

    public DbSet<Message> Messages => Set<Message>();

    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();

    public DbSet<ConversationReport> ConversationReports => Set<ConversationReport>();

    public DbSet<Request> Requests => Set<Request>();

    public DbSet<RequestTransition> RequestTransitions => Set<RequestTransition>();

    public DbSet<DeliveryMethod> DeliveryMethods => Set<DeliveryMethod>();

    public DbSet<ListingDraft> ListingDrafts => Set<ListingDraft>();

    public DbSet<ListingSubmission> ListingSubmissions => Set<ListingSubmission>();

    public DbSet<ReferenceLink> ReferenceLinks => Set<ReferenceLink>();

    public DbSet<ReferenceAnswer> ReferenceAnswers => Set<ReferenceAnswer>();

    public DbSet<ReviewTick> ReviewTicks => Set<ReviewTick>();

    public DbSet<ListingDecision> ListingDecisions => Set<ListingDecision>();

    public DbSet<AuditRecord> AuditRecords => Set<AuditRecord>();

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
