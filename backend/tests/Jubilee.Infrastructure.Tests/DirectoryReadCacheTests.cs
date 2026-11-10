using Jubilee.Infrastructure.Caching;
using Jubilee.Tests.Shared;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Jubilee.Infrastructure.Tests;

public class DirectoryReadCacheTests
{
    private readonly FakeTimeProvider _clock = new(ListingMother.Now);
    private readonly DistributedDirectoryReadCache _cache;
    private int _builds;

    public DirectoryReadCacheTests()
    {
        var store = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        _cache = new DistributedDirectoryReadCache(store, _clock, NullLogger<DistributedDirectoryReadCache>.Instance);
    }

    private sealed record Payload(int Build, IReadOnlyList<string> Names);

    private Task<Payload> Read(string key = "welcome") => _cache.GetOrCreateAsync(
        key,
        _ => Task.FromResult(new Payload(++_builds, ["a", "b"])),
        CancellationToken.None);

    [Fact]
    public async Task L2_156_AC2_an_entry_is_served_from_the_cache_for_sixty_seconds()
    {
        var first = await Read();
        _clock.Advance(TimeSpan.FromSeconds(59));
        var second = await Read();

        Assert.Equal(1, first.Build);
        Assert.Equal(1, second.Build);
        Assert.Equal(["a", "b"], second.Names);
    }

    [Fact]
    public async Task L2_156_AC2_an_entry_older_than_sixty_seconds_is_rebuilt()
    {
        await Read();
        _clock.Advance(TimeSpan.FromSeconds(60));

        Assert.Equal(2, (await Read()).Build);
    }

    [Fact]
    public async Task L2_156_AC2_invalidating_drops_every_entry()
    {
        await Read("welcome");
        await Read("home");

        _cache.Invalidate();

        Assert.Equal(3, (await Read("welcome")).Build);
        Assert.Equal(4, (await Read("home")).Build);
    }

    [Fact]
    public async Task Entries_are_kept_apart_by_key()
    {
        var welcome = await Read("welcome");
        var home = await Read("home");

        Assert.NotEqual(welcome.Build, home.Build);
        Assert.Equal(welcome.Build, (await Read("welcome")).Build);
    }

    [Fact]
    public async Task L2_118_a_cache_store_that_is_down_does_not_fail_the_read()
    {
        var cache = new DistributedDirectoryReadCache(
            new BrokenCache(), _clock, NullLogger<DistributedDirectoryReadCache>.Instance);

        var value = await cache.GetOrCreateAsync("welcome", _ => Task.FromResult(new Payload(7, [])), CancellationToken.None);
        cache.Invalidate();

        Assert.Equal(7, value.Build);
    }

    private sealed class BrokenCache : IDistributedCache
    {
        public byte[]? Get(string key) => throw new InvalidOperationException("down");

        public Task<byte[]?> GetAsync(string key, CancellationToken token = default) => throw new InvalidOperationException("down");

        public void Refresh(string key) => throw new InvalidOperationException("down");

        public Task RefreshAsync(string key, CancellationToken token = default) => throw new InvalidOperationException("down");

        public void Remove(string key) => throw new InvalidOperationException("down");

        public Task RemoveAsync(string key, CancellationToken token = default) => throw new InvalidOperationException("down");

        public void Set(string key, byte[] value, DistributedCacheEntryOptions options) => throw new InvalidOperationException("down");

        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default) =>
            throw new InvalidOperationException("down");
    }
}
