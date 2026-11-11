using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<Listing> Listings { get; }

    DbSet<Product> Products { get; }

    DbSet<Service> Services { get; }

    DbSet<FeaturedSlot> FeaturedSlots { get; }

    DbSet<StockAlert> StockAlerts { get; }

    DbSet<SavedItem> SavedItems { get; }

    DbSet<ConsentRecord> ConsentRecords { get; }

    DbSet<ContentVersion> ContentVersions { get; }

    DbSet<ListingReport> ListingReports { get; }

    DbSet<ListingReportEntry> ListingReportEntries { get; }

    DbSet<ListingView> ListingViews { get; }

    DbSet<ListingPhoto> ListingPhotos { get; }

    DbSet<RecentSearch> RecentSearches { get; }

    DbSet<Notification> Notifications { get; }

    DbSet<Member> Members { get; }

    DbSet<LinkToken> LinkTokens { get; }

    DbSet<PasswordResetRequest> PasswordResetRequests { get; }

    DbSet<OutboxMessage> OutboxMessages { get; }

    DbSet<Conversation> Conversations { get; }

    DbSet<Message> Messages { get; }

    DbSet<MessageAttachment> MessageAttachments { get; }

    DbSet<ConversationReport> ConversationReports { get; }

    DbSet<Request> Requests { get; }

    DbSet<RequestTransition> RequestTransitions { get; }

    DbSet<DeliveryMethod> DeliveryMethods { get; }

    DbSet<ListingDraft> ListingDrafts { get; }

    DbSet<ListingSubmission> ListingSubmissions { get; }

    DbSet<ReferenceLink> ReferenceLinks { get; }

    DbSet<ReferenceAnswer> ReferenceAnswers { get; }

    DbSet<ReviewTick> ReviewTicks { get; }

    DbSet<ListingDecision> ListingDecisions { get; }

    DbSet<AuditRecord> AuditRecords { get; }

    DbSet<ResponseTimeStat> ResponseTimeStats { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
