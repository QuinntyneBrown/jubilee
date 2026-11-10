using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Infrastructure.Tests;

public class PublicListingFilterTests : IDisposable
{
    private readonly InMemoryDatabase _database = new();

    public void Dispose() => _database.Dispose();

    // L2-028: the filter the database runs and the rule the domain states are one definition.
    [Fact]
    public async Task L2_028_the_translated_filter_agrees_with_the_domain_rule_for_every_state()
    {
        var listings = new List<Listing>();
        var n = 0;
        foreach (var stage in Enum.GetValues<ListingStage>())
        {
            foreach (var approved in new[] { false, true })
            {
                foreach (var paused in new[] { false, true })
                {
                    foreach (var deleted in new[] { false, true })
                    {
                        foreach (var held in new[] { false, true })
                        {
                            if (stage == ListingStage.Live && !approved)
                            {
                                continue; // Not reachable: a listing becomes live only by approval.
                            }

                            var listing = Listing.Create($"l-{n++}", "Name", "Tagline", "media", ListingMother.Now);
                            if (approved)
                            {
                                listing.Approve("verifier", ListingMother.Now);
                            }

                            if (stage != ListingStage.Live)
                            {
                                listing.MoveTo(stage);
                            }

                            if (paused)
                            {
                                listing.Pause();
                            }

                            if (deleted)
                            {
                                listing.Delete(ListingMother.Now);
                            }

                            if (held)
                            {
                                listing.PlaceModerationHold();
                            }

                            listings.Add(listing);
                        }
                    }
                }
            }
        }

        await _database.WithDb(db =>
        {
            db.AddRange(listings);
            return db.SaveChangesAsync();
        });

        var publicInDatabase = await _database.WithDb(db => db.Listings.WherePublic().Select(l => l.Slug).ToListAsync());
        var verifiedInDatabase = await _database.WithDb(db =>
            db.Listings.Where(VerifiedListingSpecification.Criteria).Select(l => l.Slug).ToListAsync());

        Assert.Equal(88, listings.Count);
        Assert.Equal(listings.Where(l => l.IsPublic()).Select(l => l.Slug).Order(), publicInDatabase.Order());
        Assert.Equal(listings.Where(l => l.IsVerified).Select(l => l.Slug).Order(), verifiedInDatabase.Order());
        Assert.Single(publicInDatabase);
        Assert.Equal(8, verifiedInDatabase.Count);
    }

    [Fact]
    public async Task L2_025_AC2_approval_times_order_in_the_database()
    {
        await _database.WithDb(db =>
        {
            db.AddRange(
                ListingMother.Public("older", approvedAt: ListingMother.Now.AddDays(-9)),
                ListingMother.Public("newer", approvedAt: ListingMother.Now.AddHours(-1)),
                ListingMother.Public("middle", approvedAt: ListingMother.Now.AddDays(-2)));
            return db.SaveChangesAsync();
        });

        var newest = await _database.WithDb(db =>
            ListingSortPolicy.Apply(db.Listings, ListingSort.Newest).Select(l => l.Slug).ToListAsync());
        var reloaded = await _database.WithDb(db => db.Listings.SingleAsync(l => l.Slug == "newer"));

        Assert.Equal(["newer", "middle", "older"], newest);
        Assert.Equal(ListingMother.Now.AddHours(-1), reloaded.ApprovedAt);
    }
}
