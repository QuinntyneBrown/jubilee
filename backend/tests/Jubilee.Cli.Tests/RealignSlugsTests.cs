using Jubilee.Cli;
using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Cli.Tests;

// Acceptance Test
// Traces to: L2-241 AC5
// Description: `jubilee migrate` gives a listing that existed before the address rules a slug that keeps them, and
// keeps its old slug so its old links redirect (L2-113 AC2); a listing whose slug keeps the rules keeps it (ADR 0067).
public sealed class RealignSlugsTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 15, 0, 0, TimeSpan.Zero);
    private readonly string _store = $"jubilee-cli-{Guid.NewGuid():N}";
    private readonly StringWriter _output = new();

    private Task<int> Migrate() => JubileeCli.RunAsync(
        ["migrate", $"--Database:Provider={Infrastructure.DependencyInjection.InMemoryProvider}", $"--ConnectionStrings:Jubilee={_store}"], _output);

    private async Task<T> Db<T>(Func<AppDbContext, Task<T>> work)
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(_store, Infrastructure.DependencyInjection.InMemoryRoot)
            .Options);
        return await work(db);
    }

    private Task<int> Arrange(params Listing[] listings) => Db(db =>
    {
        db.Listings.AddRange(listings);
        return db.SaveChangesAsync();
    });

    private static Listing Listed(string slug, string name) => Listing.Create(slug, name, "A tagline", "shops", Now);

    [Fact]
    public async Task L2_241_AC5_a_listing_whose_slug_breaks_a_rule_receives_a_new_one_and_keeps_the_old()
    {
        var longSlug = "abundant-life-renovations-and-plumbing-services-of-toronto-east";
        var tooLong = Listed(longSlug, "Abundant Life Renovations and Plumbing Services of Toronto East");
        var reserved = Listed("admin", "Admin");
        var shaped = Listed("Grace_Bakery", "Grace Bakery");
        var fine = Listed("luzandre-com", "Luzandre.com");
        await Arrange(tooLong, reserved, shaped, fine);

        Assert.Equal(0, await Migrate());

        var slugs = await Db(db => db.Listings.AsNoTracking().ToDictionaryAsync(l => l.Id, l => l.Slug));
        Assert.Equal("abundant-life-renovations-and-plumbing-s", slugs[tooLong.Id]);
        Assert.Equal("admin-2", slugs[reserved.Id]);
        Assert.Equal("grace-bakery", slugs[shaped.Id]);
        Assert.Equal("luzandre-com", slugs[fine.Id]);
        var kept = await Db(db => db.ListingSlugs.AsNoTracking().ToDictionaryAsync(s => s.Slug, s => s.ListingId));
        Assert.Equal(3, kept.Count);
        Assert.Equal(tooLong.Id, kept[longSlug]);
        Assert.Equal(reserved.Id, kept["admin"]);
        Assert.Equal(shaped.Id, kept["Grace_Bakery"]);
        Assert.Contains("3 listings received a new address.", _output.ToString());
    }

    [Fact]
    public async Task L2_241_AC5_a_second_run_changes_nothing()
    {
        await Arrange(Listed("admin", "Admin"), Listed("luzandre-com", "Luzandre.com"));
        await Migrate();
        var first = await Db(db => db.Listings.AsNoTracking().OrderBy(l => l.Slug).Select(l => l.Slug).ToListAsync());
        _output.GetStringBuilder().Clear();

        Assert.Equal(0, await Migrate());

        Assert.Equal(first, await Db(db => db.Listings.AsNoTracking().OrderBy(l => l.Slug).Select(l => l.Slug).ToListAsync()));
        Assert.Equal(1, await Db(db => db.ListingSlugs.CountAsync()));
        Assert.DoesNotContain("new address", _output.ToString());
    }

    [Fact]
    public async Task L2_241_AC5_two_listings_that_would_take_the_same_new_slug_each_take_their_own()
    {
        var first = Listed("Grace_Bakery", "Grace Bakery");
        var second = Listed("grace bakery", "Grace Bakery");
        await Arrange(first, second);

        await Migrate();

        var slugs = await Db(db => db.Listings.AsNoTracking().Select(l => l.Slug).OrderBy(s => s).ToListAsync());
        Assert.Equal(["grace-bakery", "grace-bakery-2"], slugs);
    }
}
