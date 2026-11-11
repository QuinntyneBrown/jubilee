using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static Jubilee.Infrastructure.Seed.DemoCatalogue;

namespace Jubilee.Infrastructure.Seed;

/// <summary>
/// Seeds the demo directory. Safe to re-run: rows that exist are left as they are, and the
/// featured slots are restarted today so the demo data stays "Featured this week".
/// </summary>
public sealed class DemoDataSeeder(AppDbContext db, TimeProvider clock)
{
    public const string SeededBy = "Miriam Castillo";

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var now = clock.GetUtcNow();
        var listings = await db.Listings.ToDictionaryAsync(l => l.Slug, cancellationToken);

        // Every public demo listing is equally complete, so recency decides the Recommended
        // order: each listing is approved a day before the one above it in the catalogue.
        for (var i = 0; i < PublicListings.Length; i++)
        {
            var demo = PublicListings[i];
            if (!listings.ContainsKey(demo.Slug))
            {
                var approvedAt = now.AddDays(-(i + 1));
                var createdAt = Profiles.TryGetValue(demo.Slug, out var joined) ? joined.JoinedOn : approvedAt.AddDays(-14);
                var listing = Draft(demo, createdAt);
                listing.Approve(SeededBy, approvedAt);
                listing.RefreshRecommendedScore(now);
                listings[demo.Slug] = listing;
                db.Listings.Add(listing);
            }
        }

        // Spaces are newer than every business: each is approved an hour before the one above it.
        for (var i = 0; i < Spaces.Length; i++)
        {
            var demo = Spaces[i];
            if (!listings.ContainsKey(demo.Slug))
            {
                var approvedAt = now.AddHours(-(i + 1));
                var listing = Listing.Create(demo.Slug, demo.Name, demo.Tagline, Category.RoomsSlug, approvedAt.AddDays(-14));
                listing.Describe(new ListingProfile(demo.Host, [], demo.About, null, null, null, null, null));
                listing.DescribeSpace(demo.Details());
                listing.Approve(SeededBy, approvedAt);
                listing.RefreshRecommendedScore(now);
                if (Owners.TryGetValue(demo.Slug, out var owner))
                {
                    listing.AssignOwner(owner);
                }

                listings[demo.Slug] = listing;
                db.Listings.Add(listing);
            }
        }

        foreach (var hidden in HiddenListings)
        {
            if (!listings.ContainsKey(hidden.Listing.Slug))
            {
                var listing = Hidden(hidden, now);
                listings[hidden.Listing.Slug] = listing;
                db.Listings.Add(listing);
            }
        }

        // A listing page the mocks describe is filled in once; an owner's later edits stay.
        var describedListings = await db.Services.Select(s => s.ListingId).Distinct().ToListAsync(cancellationToken);
        foreach (var (slug, demo) in Profiles)
        {
            var listing = listings[slug];
            if (listing.OwnerId is null && Owners.TryGetValue(slug, out var owner))
            {
                listing.AssignOwner(owner);
            }

            if (slug == "legacy-financial" && listing.MeetingArea is null)
            {
                listing.SetMeetingArea("North York");
            }

            if (slug == "luzandre" && !await db.DeliveryMethods.AnyAsync(d => d.ListingId == listing.Id, cancellationToken))
            {
                listing.SetFreeShippingOver(7500);
                db.DeliveryMethods.Add(DeliveryMethod.Create(listing.Id, 1, DeliveryKind.Ship, "Ship to me", 900, "Canada Post, $9 flat · 3–6 business days"));
                db.DeliveryMethods.Add(DeliveryMethod.Create(listing.Id, 2, DeliveryKind.Pickup, "Pick up in Leslieville", 0, "Free · Naomi sends the address when it’s ready"));
            }

            if (listing.About is null && listing.OwnerName is null)
            {
                listing.Describe(demo.Profile);
                listing.SetMedianResponseMinutes(demo.MedianReplyMinutes);
                listing.RefreshRecommendedScore(now);
            }

            if (!describedListings.Contains(listing.Id))
            {
                for (var i = 0; i < demo.Services.Length; i++)
                {
                    var service = demo.Services[i];
                    db.Services.Add(Service.Create(listing.Id, i + 1, service.Name, service.Detail, service.Price, service.Action));
                }
            }
        }

        // Details are given once, to a product that has none, so an edited demo product is kept.
        foreach (var product in await db.Products.Where(p => p.Description == null).ToListAsync(cancellationToken))
        {
            Detail(product);
        }

        var existingProducts = await db.Products.Select(p => new { p.ListingId, p.Slug }).ToListAsync(cancellationToken);
        for (var i = 0; i < Products.Length; i++)
        {
            var demo = Products[i];
            var shop = listings[demo.ShopSlug];
            if (!existingProducts.Any(p => p.ListingId == shop.Id && p.Slug == demo.Slug))
            {
                var product = Product.Create(
                    shop.Id, demo.Slug, demo.Name, demo.PriceCents, demo.PerUnit, demo.Tint, demo.Icon,
                    now.AddMinutes(-(i + 1)));
                Detail(product);
                db.Products.Add(product);
            }
        }

        var today = TorontoClock.Today(now);
        var slots = await db.FeaturedSlots.ToListAsync(cancellationToken);
        for (var i = 0; i < FeaturedSlugs.Length; i++)
        {
            var listing = listings[FeaturedSlugs[i]];
            var position = i + 1;
            var slot = slots.FirstOrDefault(s => s.ListingId == listing.Id && s.Position == position);
            if (slot is null)
            {
                db.FeaturedSlots.Add(FeaturedSlot.Create(listing.Id, position, today));
            }
            else
            {
                slot.RestartOn(today);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static void Detail(Product product)
    {
        if (ProductDetails.TryGetValue(product.Slug, out var describe))
        {
            describe(product);
        }
    }

    private static Listing Draft(DemoListing demo, DateTimeOffset createdAt)
    {
        var listing = Listing.Create(demo.Slug, demo.Name, demo.Tagline, demo.Category, createdAt);
        listing.SetHighlight(demo.Highlight);
        listing.SetOffers(demo.Offers);
        listing.SetAreasServed(demo.Areas);
        return listing;
    }

    private static Listing Hidden(DemoHiddenListing hidden, DateTimeOffset now)
    {
        var listing = Draft(hidden.Listing, now.AddDays(-3));
        switch (hidden.Because)
        {
            case HiddenBecause.PendingReference:
                listing.MoveTo(ListingStage.PendingReference);
                break;
            case HiddenBecause.ChangesRequested:
                listing.MoveTo(ListingStage.ChangesRequested);
                break;
            case HiddenBecause.Paused:
                listing.Approve(SeededBy, now.AddHours(-2));
                listing.Pause();
                break;
            case HiddenBecause.UnderModerationHold:
                listing.Approve(SeededBy, now.AddHours(-1));
                listing.PlaceModerationHold();
                break;
        }

        return listing;
    }
}
