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
        builder.HasIndex(p => new { p.ListingId, p.Slug }).IsUnique();
        builder.HasOne<Listing>().WithMany().HasForeignKey(p => p.ListingId).OnDelete(DeleteBehavior.Cascade);
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
