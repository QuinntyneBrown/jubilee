using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Jubilee.Infrastructure.Persistence.Configurations;

public sealed class ListingConfiguration : IEntityTypeConfiguration<Listing>
{
    public void Configure(EntityTypeBuilder<Listing> builder)
    {
        builder.ToTable("Listings");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).ValueGeneratedNever();
        builder.Property(l => l.Slug).HasMaxLength(120).IsRequired();
        builder.HasIndex(l => l.Slug).IsUnique();
        builder.Property(l => l.Name).HasMaxLength(120).IsRequired();
        builder.Property(l => l.SortName).HasMaxLength(120).IsRequired();
        builder.Property(l => l.Tagline).HasMaxLength(200).IsRequired();
        builder.Property(l => l.Highlight).HasMaxLength(60);
        builder.Property(l => l.CategorySlug).HasMaxLength(40).IsRequired();
        builder.Property(l => l.ApprovedBy).HasMaxLength(120);
        builder.Ignore(l => l.IsVerified);
        builder.Ignore(l => l.ReplyTimeBand);
        builder.Property(l => l.Kind).HasConversion<string>().HasMaxLength(16);
        builder.Property(l => l.OwnerName).HasMaxLength(200);
        builder.Property(l => l.MeetingArea).HasMaxLength(100);
        builder.Property(l => l.OwnerId).HasMaxLength(200);
        builder.HasIndex(l => l.OwnerId);
        builder.PrimitiveCollection(l => l.Credentials).IsRequired();
        builder.Property(l => l.About).HasMaxLength(2000);
        builder.Property(l => l.Where).HasMaxLength(200);
        builder.Property(l => l.Website).HasMaxLength(300);
        builder.Property(l => l.Hours).HasMaxLength(200);
        builder.Property(l => l.Languages).HasMaxLength(200);
        builder.Property(l => l.Delivery).HasMaxLength(200);
        builder.Property(l => l.MadeToOrder).HasMaxLength(200);
        builder.HasIndex(l => new { l.CategorySlug, l.Stage });
    }
}

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedNever();
        builder.Property(p => p.Slug).HasMaxLength(120).IsRequired();
        builder.Property(p => p.Name).HasMaxLength(120).IsRequired();
        builder.Property(p => p.TileTint).HasConversion<string>().HasMaxLength(16);
        builder.Property(p => p.TileIcon).HasConversion<string>().HasMaxLength(16);
        builder.Property(p => p.Description).HasMaxLength(2000);
        builder.Property(p => p.DeliveryLine).HasMaxLength(200);
        builder.Property(p => p.OptionName).HasMaxLength(40);
        builder.Property(p => p.RestockNote).HasMaxLength(200);
        builder.Property(p => p.IdempotencyKey).HasMaxLength(64);
        builder.Property(p => p.MinimumQuantity).HasDefaultValue(1);
        builder.Ignore(p => p.IsSoldOut);
        builder.Ignore(p => p.MaxQuantity);
        builder.Ignore(p => p.OrderedOptions);
        builder.Ignore(p => p.OrderedAttributes);
        // Options and attributes are read and written with their product, in the owner's order.
        builder.OwnsMany(p => p.Options, o =>
        {
            o.ToJson();
            o.Property(x => x.Label).HasMaxLength(40);
            o.Ignore(x => x.MaxQuantity);
        });
        builder.OwnsMany(p => p.Attributes, a => a.ToJson());
        builder.HasIndex(p => new { p.ListingId, p.Slug }).IsUnique();
        builder.HasOne<Listing>().WithMany().HasForeignKey(p => p.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ListingViewConfiguration : IEntityTypeConfiguration<ListingView>
{
    public void Configure(EntityTypeBuilder<ListingView> builder)
    {
        builder.ToTable("ListingViews");
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).ValueGeneratedNever();
        builder.Property(v => v.VisitorKey).HasMaxLength(220).IsRequired();
        builder.HasIndex(v => new { v.ListingId, v.VisitorKey, v.ViewedAt });
        builder.HasOne<Listing>().WithMany().HasForeignKey(v => v.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class MaintenanceWindowConfiguration : IEntityTypeConfiguration<MaintenanceWindow>
{
    public void Configure(EntityTypeBuilder<MaintenanceWindow> builder)
    {
        builder.ToTable("MaintenanceWindows");
        builder.HasKey(w => w.Id);
        builder.Property(w => w.Id).ValueGeneratedNever();
        builder.HasIndex(w => w.EndedAt);
    }
}

public sealed class AccessRequestConfiguration : IEntityTypeConfiguration<AccessRequest>
{
    public void Configure(EntityTypeBuilder<AccessRequest> builder)
    {
        builder.ToTable("AccessRequests");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.Property(a => a.MemberSubject).HasMaxLength(100).IsRequired();
        builder.Property(a => a.Url).HasMaxLength(AccessRequest.MaxUrlLength).IsRequired();
        builder.Property(a => a.IdempotencyKey).HasMaxLength(100).IsRequired();
        builder.HasIndex(a => new { a.MemberSubject, a.IdempotencyKey }).IsUnique();
    }
}

public sealed class ContentVersionConfiguration : IEntityTypeConfiguration<ContentVersion>
{
    public void Configure(EntityTypeBuilder<ContentVersion> builder)
    {
        builder.ToTable("ContentVersions");
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).ValueGeneratedNever();
        builder.Property(v => v.Slug).HasMaxLength(40).IsRequired();
        builder.Property(v => v.Title).HasMaxLength(200).IsRequired();
        builder.Property(v => v.Lead).HasMaxLength(1000);
        builder.Property(v => v.PublishedBy).HasMaxLength(100).IsRequired();
        builder.HasIndex(v => new { v.Slug, v.Number }).IsUnique();
    }
}

public sealed class ListingReportConfiguration : IEntityTypeConfiguration<ListingReport>
{
    public void Configure(EntityTypeBuilder<ListingReport> builder)
    {
        builder.ToTable("ListingReports");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.ReporterSubject).HasMaxLength(100).IsRequired();
        builder.Property(r => r.ReporterName).HasMaxLength(200).IsRequired();
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(r => r.ResolutionNote).HasMaxLength(ReportAction.MaxNoteLength);
        builder.HasIndex(r => new { r.ListingId, r.ReporterSubject });
        builder.HasMany(r => r.Entries).WithOne().HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(r => r.Entries).UsePropertyAccessMode(PropertyAccessMode.Field);
        builder.HasOne<Listing>().WithMany().HasForeignKey(r => r.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ListingReportEntryConfiguration : IEntityTypeConfiguration<ListingReportEntry>
{
    public void Configure(EntityTypeBuilder<ListingReportEntry> builder)
    {
        builder.ToTable("ListingReportEntries");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.ReporterSubject).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Reason).HasConversion<string>().HasMaxLength(24);
        builder.Property(e => e.Description).HasMaxLength(ListingReport.MaxDescriptionLength).IsRequired();
        builder.Property(e => e.IdempotencyKey).HasMaxLength(100).IsRequired();
        builder.HasIndex(e => new { e.ReporterSubject, e.IdempotencyKey }).IsUnique();
    }
}

public sealed class ConsentRecordConfiguration : IEntityTypeConfiguration<ConsentRecord>
{
    public void Configure(EntityTypeBuilder<ConsentRecord> builder)
    {
        builder.ToTable("ConsentRecords");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.Category).HasMaxLength(32).IsRequired();
        builder.Property(r => r.Method).HasConversion<string>().HasMaxLength(24);
        builder.HasIndex(r => new { r.MemberId, r.OccurredAt });
        builder.HasOne<Member>().WithMany().HasForeignKey(r => r.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class SavedItemConfiguration : IEntityTypeConfiguration<SavedItem>
{
    public void Configure(EntityTypeBuilder<SavedItem> builder)
    {
        builder.ToTable("SavedItems");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).ValueGeneratedNever();
        builder.Property(i => i.MemberSubject).HasMaxLength(200).IsRequired();
        builder.Property(i => i.Kind).HasConversion<string>().HasMaxLength(16);
        builder.HasIndex(i => new { i.MemberSubject, i.Kind, i.TargetId }).IsUnique();
        builder.HasIndex(i => i.TargetId);
    }
}

public sealed class StockAlertConfiguration : IEntityTypeConfiguration<StockAlert>
{
    public void Configure(EntityTypeBuilder<StockAlert> builder)
    {
        builder.ToTable("StockAlerts");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.Property(a => a.MemberSubject).HasMaxLength(200).IsRequired();
        // One open alert per member and product (L2-036 AC2).
        builder.HasIndex(a => new { a.ProductId, a.MemberSubject })
            .IsUnique()
            .HasFilter("[NotifiedAt] IS NULL");
        builder.HasOne<Product>().WithMany().HasForeignKey(a => a.ProductId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ServiceConfiguration : IEntityTypeConfiguration<Service>
{
    public void Configure(EntityTypeBuilder<Service> builder)
    {
        builder.ToTable("Services");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.Name).HasMaxLength(120).IsRequired();
        builder.Property(s => s.Detail).HasMaxLength(200).IsRequired();
        builder.Property(s => s.PriceKind).HasConversion<string>().HasMaxLength(16);
        builder.Property(s => s.Action).HasConversion<string>().HasMaxLength(16);
        builder.Property(s => s.InPersonPlace).HasMaxLength(200);
        builder.Property(s => s.IdempotencyKey).HasMaxLength(64);
        builder.HasIndex(s => new { s.ListingId, s.Position });
        builder.HasOne<Listing>().WithMany().HasForeignKey(s => s.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class FeaturedSlotConfiguration : IEntityTypeConfiguration<FeaturedSlot>
{
    public void Configure(EntityTypeBuilder<FeaturedSlot> builder)
    {
        builder.ToTable("FeaturedSlots");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.HasIndex(s => s.StartsOn);
        builder.HasOne<Listing>().WithMany().HasForeignKey(s => s.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class RecentSearchConfiguration : IEntityTypeConfiguration<RecentSearch>
{
    public void Configure(EntityTypeBuilder<RecentSearch> builder)
    {
        builder.ToTable("RecentSearches");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.MemberSubject).HasMaxLength(200).IsRequired();
        builder.Property(r => r.Query).HasMaxLength(SearchQueryText.MaxLength).IsRequired();
        builder.HasIndex(r => new { r.MemberSubject, r.SearchedAt });
    }
}

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).ValueGeneratedNever();
        builder.Property(n => n.MemberSubject).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Kind).HasMaxLength(20).IsRequired();
        builder.Property(n => n.Title).HasMaxLength(Notification.MaxTitleLength).IsRequired();
        builder.Property(n => n.Detail).HasMaxLength(Notification.MaxDetailLength).IsRequired();
        builder.Property(n => n.Target).HasMaxLength(300).IsRequired();
        builder.HasIndex(n => new { n.MemberSubject, n.CreatedAt });
    }
}

public sealed class MemberConfiguration : IEntityTypeConfiguration<Member>
{
    public void Configure(EntityTypeBuilder<Member> builder)
    {
        builder.ToTable("Members");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).ValueGeneratedNever();
        builder.Property(m => m.Email).HasMaxLength(EmailAddress.MaxLength).IsRequired();
        builder.Property(m => m.EmailKey).HasMaxLength(EmailAddress.MaxLength).IsRequired();
        builder.HasIndex(m => m.EmailKey).IsUnique();
        builder.Property(m => m.FirstName).HasMaxLength(50).IsRequired();
        builder.Property(m => m.LastName).HasMaxLength(50).IsRequired();
        builder.Property(m => m.HomeChurch).HasMaxLength(100);
        builder.Property(m => m.Phone).HasMaxLength(10);
        builder.Property(m => m.PostalCode).HasMaxLength(7);
        builder.Property(m => m.Pronouns).HasMaxLength(40);
        builder.Property(m => m.PasswordHash).HasMaxLength(400);
        builder.Property(m => m.EmailStatus).HasConversion<string>().HasMaxLength(16);
        builder.Property(m => m.GoogleSubject).HasMaxLength(100);
        builder.HasIndex(m => m.GoogleSubject).IsUnique().HasFilter("[GoogleSubject] IS NOT NULL");
        builder.Ignore(m => m.DisplayName);
    }
}

public sealed class LinkTokenConfiguration : IEntityTypeConfiguration<LinkToken>
{
    public void Configure(EntityTypeBuilder<LinkToken> builder)
    {
        builder.ToTable("LinkTokens");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();
        builder.Property(t => t.Purpose).HasConversion<string>().HasMaxLength(32);
        builder.Property(t => t.TokenHash).HasMaxLength(64).IsRequired();
        builder.Property(t => t.TargetEmail).HasMaxLength(EmailAddress.MaxLength);
        builder.HasIndex(t => t.TokenHash).IsUnique();
        builder.HasOne<Member>().WithMany().HasForeignKey(t => t.MemberId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class PasswordResetRequestConfiguration : IEntityTypeConfiguration<PasswordResetRequest>
{
    public void Configure(EntityTypeBuilder<PasswordResetRequest> builder)
    {
        builder.ToTable("PasswordResetRequests");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.EmailKey).HasMaxLength(254).IsRequired();
        builder.HasIndex(r => new { r.EmailKey, r.RequestedAt });
        builder.HasIndex(r => r.ProcessedAt);
    }
}

public sealed class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("OutboxMessages");
        builder.Property(m => m.Category).HasMaxLength(20);
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).ValueGeneratedNever();
        builder.Property(m => m.ToAddress).HasMaxLength(EmailAddress.MaxLength).IsRequired();
        builder.Property(m => m.Subject).HasMaxLength(200).IsRequired();
        builder.Property(m => m.TextBody).HasMaxLength(4000).IsRequired();
        builder.HasIndex(m => new { m.SentAt, m.NextAttemptAt });
        builder.HasIndex(m => m.CorrelationId);
    }
}

public sealed class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> builder)
    {
        builder.ToTable("Conversations");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.Property(c => c.MemberSubject).HasMaxLength(200).IsRequired();
        builder.Property(c => c.MemberName).HasMaxLength(200).IsRequired();
        // One conversation per member and business (L2-055 AC3).
        builder.HasIndex(c => new { c.ListingId, c.MemberSubject }).IsUnique();
        builder.HasIndex(c => new { c.MemberSubject, c.LastMessageAt });
        builder.HasOne<Listing>().WithMany().HasForeignKey(c => c.ListingId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("Messages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).ValueGeneratedNever();
        builder.Property(m => m.SenderSubject).HasMaxLength(200).IsRequired();
        builder.Property(m => m.SenderName).HasMaxLength(200).IsRequired();
        builder.Property(m => m.Body).HasMaxLength(Message.MaxBodyLength).IsRequired();
        builder.Property(m => m.IdempotencyKey).HasMaxLength(100).IsRequired();
        builder.HasIndex(m => new { m.SenderSubject, m.IdempotencyKey }).IsUnique();
        builder.HasIndex(m => new { m.ConversationId, m.CreatedAt });
        builder.HasOne<Conversation>().WithMany().HasForeignKey(m => m.ConversationId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class MessageAttachmentConfiguration : IEntityTypeConfiguration<MessageAttachment>
{
    public void Configure(EntityTypeBuilder<MessageAttachment> builder)
    {
        builder.ToTable("MessageAttachments");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.Property(a => a.UploaderSubject).HasMaxLength(200).IsRequired();
        builder.Property(a => a.ContentType).HasMaxLength(50).IsRequired();
        builder.HasOne<Conversation>().WithMany().HasForeignKey(a => a.ConversationId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ConversationReportConfiguration : IEntityTypeConfiguration<ConversationReport>
{
    public void Configure(EntityTypeBuilder<ConversationReport> builder)
    {
        builder.ToTable("ConversationReports");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.ReporterSubject).HasMaxLength(200).IsRequired();
        builder.Property(r => r.Reason).HasMaxLength(1000).IsRequired();
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(r => r.ResolutionNote).HasMaxLength(ReportAction.MaxNoteLength);
        builder.HasOne<Conversation>().WithMany().HasForeignKey(r => r.ConversationId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ReportActionConfiguration : IEntityTypeConfiguration<ReportAction>
{
    public void Configure(EntityTypeBuilder<ReportAction> builder)
    {
        builder.ToTable("ReportActions");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.Property(a => a.Kind).HasConversion<string>().HasMaxLength(24);
        builder.Property(a => a.ResolutionNote).HasMaxLength(ReportAction.MaxNoteLength).IsRequired();
        builder.Property(a => a.MessageText).HasMaxLength(ReportAction.MaxMessageLength);
        builder.Property(a => a.Actor).HasMaxLength(200).IsRequired();
        builder.Property(a => a.ActorName).HasMaxLength(200).IsRequired();
        builder.HasIndex(a => a.ReportId);
    }
}

public sealed class DataExportConfiguration : IEntityTypeConfiguration<DataExport>
{
    public void Configure(EntityTypeBuilder<DataExport> builder)
    {
        builder.ToTable("DataExports");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(e => e.TokenHash).HasMaxLength(64);
        builder.HasIndex(e => e.MemberId);
        builder.HasIndex(e => e.TokenHash);
    }
}

public sealed class RequestConfiguration : IEntityTypeConfiguration<Request>
{
    public void Configure(EntityTypeBuilder<Request> builder)
    {
        builder.ToTable("Requests");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.MemberSubject).HasMaxLength(200).IsRequired();
        builder.Property(r => r.MemberName).HasMaxLength(200).IsRequired();
        builder.Property(r => r.IdempotencyKey).HasMaxLength(100).IsRequired();
        builder.Property(r => r.ServiceName).HasMaxLength(200);
        builder.Property(r => r.Location).HasMaxLength(200);
        builder.Property(r => r.Note).HasMaxLength(Request.MaxDescriptionLength);
        builder.Property(r => r.Budget).HasMaxLength(Request.MaxBudgetLength);
        builder.Property(r => r.Phone).HasMaxLength(10);
        builder.Property(r => r.OptionLabel).HasMaxLength(100);
        builder.Property(r => r.DeliveryLabel).HasMaxLength(200);
        builder.Property(r => r.ShippingAddress).HasMaxLength(500);
        builder.Property(r => r.DeclineReason).HasMaxLength(40);
        builder.Property(r => r.DeclineMessage).HasMaxLength(Request.MaxNoteLength);
        builder.Property(r => r.Kind).HasConversion<string>().HasMaxLength(16);
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(r => r.Mode).HasConversion<string>().HasMaxLength(16);
        builder.HasIndex(r => new { r.MemberSubject, r.IdempotencyKey }).IsUnique();
        builder.HasIndex(r => new { r.MemberSubject, r.CreatedAt });
        builder.HasIndex(r => new { r.ListingId, r.CreatedAt });
        builder.HasOne<Listing>().WithMany().HasForeignKey(r => r.ListingId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(r => r.Transitions).WithOne().HasForeignKey(t => t.RequestId).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(r => r.Transitions).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public sealed class RequestTransitionConfiguration : IEntityTypeConfiguration<RequestTransition>
{
    public void Configure(EntityTypeBuilder<RequestTransition> builder)
    {
        builder.ToTable("RequestTransitions");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();
        builder.Property(t => t.From).HasConversion<string>().HasMaxLength(16);
        builder.Property(t => t.To).HasConversion<string>().HasMaxLength(16);
        builder.Property(t => t.Actor).HasMaxLength(200).IsRequired();
    }
}

public sealed class DeliveryMethodConfiguration : IEntityTypeConfiguration<DeliveryMethod>
{
    public void Configure(EntityTypeBuilder<DeliveryMethod> builder)
    {
        builder.ToTable("DeliveryMethods");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).ValueGeneratedNever();
        builder.Property(d => d.Label).HasMaxLength(100).IsRequired();
        builder.Property(d => d.Estimate).HasMaxLength(200).IsRequired();
        builder.Property(d => d.Kind).HasConversion<string>().HasMaxLength(16);
        builder.HasIndex(d => new { d.ListingId, d.Position });
        builder.HasOne<Listing>().WithMany().HasForeignKey(d => d.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ListingDraftConfiguration : IEntityTypeConfiguration<ListingDraft>
{
    public void Configure(EntityTypeBuilder<ListingDraft> builder)
    {
        builder.ToTable("ListingDrafts");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).ValueGeneratedNever();
        builder.Property(d => d.OwnerSubject).HasMaxLength(200).IsRequired();
        builder.Property(d => d.Kind).HasConversion<string>().HasMaxLength(16);
        builder.Property(d => d.Name).HasMaxLength(ListingDraft.MaxNameLength);
        builder.Property(d => d.Tagline).HasMaxLength(ListingDraft.MaxTaglineLength);
        builder.Property(d => d.CategorySlug).HasMaxLength(60);
        builder.Property(d => d.Highlight).HasMaxLength(60);
        builder.Property(d => d.Place).HasMaxLength(200);
        builder.Property(d => d.Church).HasMaxLength(200);
        builder.Property(d => d.PastorEmail).HasMaxLength(254);
        builder.HasIndex(d => new { d.OwnerSubject, d.UpdatedAt });
        builder.HasIndex(d => d.UpdatedAt);
        builder.HasMany(d => d.Items).WithOne().HasForeignKey(i => i.ListingDraftId).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(d => d.Items).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public sealed class DraftItemConfiguration : IEntityTypeConfiguration<DraftItem>
{
    public void Configure(EntityTypeBuilder<DraftItem> builder)
    {
        builder.ToTable("DraftItems");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).ValueGeneratedNever();
        builder.Property(i => i.Name).HasMaxLength(DraftItem.MaxNameLength).IsRequired();
        builder.Property(i => i.Detail).HasMaxLength(DraftItem.MaxDetailLength);
        builder.Property(i => i.PriceKind).HasConversion<string>().HasMaxLength(16);
    }
}

public sealed class ListingSubmissionConfiguration : IEntityTypeConfiguration<ListingSubmission>
{
    public void Configure(EntityTypeBuilder<ListingSubmission> builder)
    {
        builder.ToTable("ListingSubmissions");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.OwnerSubject).HasMaxLength(200).IsRequired();
        builder.Property(s => s.Church).HasMaxLength(200).IsRequired();
        builder.Property(s => s.PastorEmail).HasMaxLength(254).IsRequired();
        builder.Property(s => s.PastorEmailKey).HasMaxLength(254).IsRequired();
        builder.Property(s => s.StatementVersion).HasMaxLength(20).IsRequired();
        builder.Property(s => s.IdempotencyKey).HasMaxLength(100).IsRequired();
        builder.Property(s => s.Flags).HasConversion(
            flags => string.Join(',', flags),
            text => text.Length == 0 ? new List<string>() : text.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
            new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
                (a, b) => a != null && b != null && a.SequenceEqual(b),
                list => list.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
                list => list.ToList()));
        builder.HasIndex(s => new { s.OwnerSubject, s.IdempotencyKey }).IsUnique();
        builder.HasIndex(s => new { s.PastorEmailKey, s.SubmittedAt });
        builder.HasIndex(s => s.ListingId).IsUnique();
        builder.HasOne<Listing>().WithMany().HasForeignKey(s => s.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ReferenceLinkConfiguration : IEntityTypeConfiguration<ReferenceLink>
{
    public void Configure(EntityTypeBuilder<ReferenceLink> builder)
    {
        builder.ToTable("ReferenceLinks");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).ValueGeneratedNever();
        builder.Property(l => l.TokenHash).HasMaxLength(64).IsRequired();
        builder.Property(l => l.ReferenceEmail).HasMaxLength(254).IsRequired();
        builder.Property(l => l.Church).HasMaxLength(200).IsRequired();
        builder.HasIndex(l => l.TokenHash).IsUnique();
        builder.HasIndex(l => new { l.ListingId, l.IssuedAt });
        builder.HasOne<Listing>().WithMany().HasForeignKey(l => l.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ReferenceAnswerConfiguration : IEntityTypeConfiguration<ReferenceAnswer>
{
    public void Configure(EntityTypeBuilder<ReferenceAnswer> builder)
    {
        builder.ToTable("ReferenceAnswers");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.Property(a => a.Name).HasMaxLength(200).IsRequired();
        builder.Property(a => a.Role).HasMaxLength(200).IsRequired();
        builder.Property(a => a.Note).HasMaxLength(1000);
        builder.HasIndex(a => a.ListingId);
        builder.HasOne<Listing>().WithMany().HasForeignKey(a => a.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal static class StringLists
{
    public static void Store(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<List<string>> property) =>
        property.HasConversion(
            list => string.Join(',', list),
            text => text.Length == 0 ? new List<string>() : text.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
            new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
                (a, b) => a != null && b != null && a.SequenceEqual(b),
                list => list.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
                list => list.ToList()));
}

public sealed class ReviewTickConfiguration : IEntityTypeConfiguration<ReviewTick>
{
    public void Configure(EntityTypeBuilder<ReviewTick> builder)
    {
        builder.ToTable("ReviewTicks");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();
        builder.Property(t => t.Item).HasMaxLength(40).IsRequired();
        builder.Property(t => t.TickedBy).HasMaxLength(200).IsRequired();
        builder.Property(t => t.TickedByName).HasMaxLength(200).IsRequired();
        builder.HasIndex(t => new { t.ListingId, t.Item }).IsUnique();
        builder.HasOne<Listing>().WithMany().HasForeignKey(t => t.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ListingDecisionConfiguration : IEntityTypeConfiguration<ListingDecision>
{
    public void Configure(EntityTypeBuilder<ListingDecision> builder)
    {
        builder.ToTable("ListingDecisions");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).ValueGeneratedNever();
        builder.Property(d => d.DecidedBy).HasMaxLength(200).IsRequired();
        builder.Property(d => d.DecidedByName).HasMaxLength(200).IsRequired();
        builder.Property(d => d.Note).HasMaxLength(2000);
        builder.Property(d => d.SnapshotName).HasMaxLength(200);
        builder.Property(d => d.SnapshotTagline).HasMaxLength(400);
        builder.Property(d => d.SnapshotCategory).HasMaxLength(60);
        StringLists.Store(builder.Property(d => d.Areas));
        StringLists.Store(builder.Property(d => d.Ticked));
        builder.HasIndex(d => new { d.ListingId, d.DecidedAt });
        builder.HasOne<Listing>().WithMany().HasForeignKey(d => d.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class AuditRecordConfiguration : IEntityTypeConfiguration<AuditRecord>
{
    public void Configure(EntityTypeBuilder<AuditRecord> builder)
    {
        builder.ToTable("AuditRecords");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();
        builder.Property(a => a.Actor).HasMaxLength(200).IsRequired();
        builder.Property(a => a.ActorName).HasMaxLength(200).IsRequired();
        builder.Property(a => a.Action).HasMaxLength(80).IsRequired();
        builder.Property(a => a.TargetType).HasMaxLength(40).IsRequired();
        builder.Property(a => a.TargetId).HasMaxLength(100).IsRequired();
        builder.Property(a => a.Before).HasMaxLength(4000);
        builder.Property(a => a.After).HasMaxLength(4000);
        builder.Property(a => a.Reason).HasMaxLength(2000);
        builder.HasIndex(a => a.At);
        builder.HasIndex(a => new { a.TargetType, a.TargetId });
        builder.HasIndex(a => a.Actor);
    }
}

public sealed class ResponseTimeStatConfiguration : IEntityTypeConfiguration<ResponseTimeStat>
{
    public void Configure(EntityTypeBuilder<ResponseTimeStat> builder)
    {
        builder.ToTable("ResponseTimeStats");
        builder.HasKey(s => s.ListingId);
        builder.Property(s => s.ListingId).ValueGeneratedNever();
        builder.HasOne<Listing>().WithMany().HasForeignKey(s => s.ListingId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ListingPhotoConfiguration : IEntityTypeConfiguration<ListingPhoto>
{
    public void Configure(EntityTypeBuilder<ListingPhoto> builder)
    {
        builder.ToTable("ListingPhotos");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedNever();
        builder.Property(p => p.Key).HasMaxLength(64).IsRequired();
        builder.Property(p => p.Alt).HasMaxLength(ListingPhoto.MaxAltLength);
        builder.HasIndex(p => new { p.ListingId, p.Position });
    }
}
