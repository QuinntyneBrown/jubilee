using Jubilee.Cli;
using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Cli.Tests;

public sealed class CliTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), $"jubilee-cli-{Guid.NewGuid():N}");
    private readonly string _connectionString;
    private readonly StringWriter _output = new();

    public CliTests()
    {
        Directory.CreateDirectory(_directory);
        _connectionString = $"DataSource={Path.Combine(_directory, "jubilee.db")};Pooling=False";
    }

    public void Dispose() => Directory.Delete(_directory, recursive: true);

    private Task<int> Run(string command) => JubileeCli.RunAsync(
        [command, "--Database:Provider=Sqlite", $"--ConnectionStrings:Jubilee={_connectionString}"], _output);

    private async Task<T> Query<T>(Func<AppDbContext, Task<T>> query)
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connectionString).Options);
        return await query(db);
    }

    private Task<(int Listings, int Products, int Slots)> RowCounts() => Query(async db =>
        (await db.Listings.CountAsync(), await db.Products.CountAsync(), await db.FeaturedSlots.CountAsync()));

    [Fact]
    public async Task Seed_creates_the_demo_directory_of_47_public_businesses()
    {
        Assert.Equal(0, await Run("seed"));

        var publicByCategory = await Query(db => db.Listings.WherePublic()
            .GroupBy(l => l.CategorySlug)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Count));
        Assert.Equal(47, publicByCategory.Values.Sum());
        Assert.Equal(
            new Dictionary<string, int>
            {
                ["shops"] = 3,
                ["financial-insurance"] = 3,
                ["legal-immigration"] = 6,
                ["home-property"] = 10,
                ["real-estate-living"] = 4,
                ["health-family"] = 4,
                ["business-tech"] = 5,
                ["learning"] = 2,
                ["media"] = 7,
                ["community"] = 3,
            }.OrderBy(p => p.Key),
            publicByCategory.OrderBy(p => p.Key));
    }

    [Fact]
    public async Task L2_028_seed_includes_listings_that_are_not_public_so_the_demo_proves_they_never_show()
    {
        await Run("seed");

        var hidden = await Query(db => db.Listings.ToListAsync());
        var notPublic = hidden.Where(l => !l.IsPublic()).ToList();

        Assert.Equal(5, notPublic.Count);
        Assert.Contains(notPublic, l => l.Stage == ListingStage.Draft);
        Assert.Contains(notPublic, l => l.Stage == ListingStage.PendingReference);
        Assert.Contains(notPublic, l => l.Stage == ListingStage.ChangesRequested);
        Assert.Contains(notPublic, l => l.IsVerified && l.IsPaused);
        Assert.Contains(notPublic, l => l.IsVerified && l.IsUnderModerationHold);
    }

    [Fact]
    public async Task Seed_is_safe_to_run_twice()
    {
        Assert.Equal(0, await Run("seed"));
        var first = await RowCounts();

        Assert.Equal(0, await Run("seed"));
        var second = await RowCounts();

        Assert.Equal(first, second);
        Assert.Equal((52, 6, 5), second);
        Assert.Equal(47, await Query(db => db.Listings.WherePublic().CountAsync()));
    }

    [Fact]
    public async Task Reset_then_seed_gives_a_fresh_demo_directory()
    {
        await Run("seed");
        await Query(async db =>
        {
            db.Add(Listing.Create("leftover", "Leftover", "From an earlier run", "media", DateTimeOffset.UtcNow));
            return await db.SaveChangesAsync();
        });

        Assert.Equal(0, await Run("reset"));
        Assert.Equal(0, await Run("seed"));

        Assert.Equal((52, 6, 5), await RowCounts());
        Assert.False(await Query(db => db.Listings.AnyAsync(l => l.Slug == "leftover")));
    }

    [Fact]
    public async Task Migrate_prepares_an_empty_database()
    {
        Assert.Equal(0, await Run("migrate"));

        Assert.Equal((0, 0, 0), await RowCounts());
    }

    [Theory]
    [InlineData("explode")]
    [InlineData("")]
    public async Task An_unknown_command_prints_usage_and_fails(string command)
    {
        var exitCode = await JubileeCli.RunAsync(command.Length == 0 ? [] : [command], _output);

        Assert.Equal(1, exitCode);
        Assert.Contains("migrate", _output.ToString());
        Assert.Contains("seed", _output.ToString());
        Assert.Contains("reset", _output.ToString());
    }
}
