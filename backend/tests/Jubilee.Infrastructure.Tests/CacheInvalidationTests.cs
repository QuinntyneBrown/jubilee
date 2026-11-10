using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Infrastructure.Tests;

public class CacheInvalidationTests : IDisposable
{
    private readonly SqliteDatabase _database = new();
    private int _builds;

    public void Dispose() => _database.Dispose();

    private Task<string> Read() => _database.Cache.GetOrCreateAsync(
        "welcome", _ => Task.FromResult($"build {++_builds}"), CancellationToken.None);

    private Task<int> Save(Action<Persistence.AppDbContext> change) => _database.WithDb(db =>
    {
        change(db);
        return db.SaveChangesAsync();
    });

    [Fact]
    public async Task L2_156_AC2_saving_a_listing_product_or_featured_slot_invalidates_the_directory_cache()
    {
        var listing = ListingMother.Public("shop", "shops");
        Assert.Equal("build 1", await Read());

        await Save(db => db.Add(listing));
        Assert.Equal("build 2", await Read());

        await Save(db => db.Add(Product.Create(listing.Id, "mug", "Mug", 2400, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now)));
        Assert.Equal("build 3", await Read());

        await Save(db => db.Add(FeaturedSlot.Create(listing.Id, 1, new DateOnly(2026, 11, 10))));
        Assert.Equal("build 4", await Read());

        await Save(db => db.Listings.Single().Pause());
        Assert.Equal("build 5", await Read());

        await Save(db => db.Remove(db.FeaturedSlots.Single()));
        Assert.Equal("build 6", await Read());
    }

    [Fact]
    public async Task L2_156_AC2_a_save_that_changes_nothing_keeps_the_cache()
    {
        await Save(db => db.Add(ListingMother.Public("shop", "shops")));
        Assert.Equal("build 1", await Read());

        await Save(db => _ = db.Listings.Single());

        Assert.Equal("build 1", await Read());
    }

    [Fact]
    public async Task L2_156_AC2_a_save_that_fails_keeps_the_cache()
    {
        await Save(db => db.Add(ListingMother.Public("shop", "shops")));
        Assert.Equal("build 1", await Read());

        await Assert.ThrowsAsync<DbUpdateException>(() => Save(db => db.Add(ListingMother.Public("shop", "shops"))));

        Assert.Equal("build 1", await Read());
    }
}
