using Jubilee.Application.Content;
using Jubilee.Infrastructure.Caching;
using Jubilee.Tests.Shared;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Jubilee.Infrastructure.Tests;

// The read cache of the published policy pages: L2-226 AC11, ADR 0066.
public class ContentReadCacheTests
{
    private readonly FakeTimeProvider _clock = new(ListingMother.Now);
    private readonly DistributedContentReadCache _cache;
    private int _builds;

    public ContentReadCacheTests()
    {
        var store = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        _cache = new DistributedContentReadCache(store, _clock, NullLogger<DistributedContentReadCache>.Instance);
    }

    private Task<ContentDto> Build(string slug) =>
        Task.FromResult(new ContentDto(slug, "Privacy", "Lead.", ++_builds, _clock.GetUtcNow(), []));

    private Task<ContentDto> Read(string slug = "privacy") => _cache.GetOrCreateAsync(slug, _ => Build(slug), CancellationToken.None);

    [Fact]
    public async Task L2_226_AC11_a_page_is_kept_for_ten_minutes_and_then_read_again()
    {
        await Read();
        _clock.Advance(TimeSpan.FromMinutes(10) - TimeSpan.FromSeconds(1));
        Assert.Equal(1, (await Read()).Version);

        _clock.Advance(TimeSpan.FromSeconds(1));
        Assert.Equal(2, (await Read()).Version);
    }

    [Fact]
    public async Task L2_226_AC11_removing_a_page_drops_only_that_page()
    {
        await Read("privacy");
        await Read("terms");

        await _cache.RemoveAsync("privacy", CancellationToken.None);

        Assert.Equal(3, (await Read("privacy")).Version);
        Assert.Equal(2, (await Read("terms")).Version);
    }

    [Fact]
    public async Task L2_226_AC11_a_cache_store_that_is_down_never_fails_a_read_or_a_publish()
    {
        var cache = new DistributedContentReadCache(new BrokenCache(), _clock, NullLogger<DistributedContentReadCache>.Instance);

        var page = await cache.GetOrCreateAsync("privacy", _ => Build("privacy"), CancellationToken.None);
        await cache.RemoveAsync("privacy", CancellationToken.None);

        Assert.Equal("privacy", page.Slug);
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
