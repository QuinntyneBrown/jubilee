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
        builder.Property(l => l.OwnerId).HasMaxLength(200);
        builder.HasIndex(l => l.OwnerId);
        builder.PrimitiveCollection(l => l.Credentials).IsRequired();
        builder.Property(l => l.About).HasMaxLength(2000);
        builder.Property(l => l.Where).HasMaxLength(200);
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
