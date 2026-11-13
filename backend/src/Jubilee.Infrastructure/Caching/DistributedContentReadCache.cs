using System.Text.Json;
using Jubilee.Application.Content;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Jubilee.Infrastructure.Caching;

/// <summary>
/// <see cref="IContentReadCache"/> over <see cref="IDistributedCache"/> (Redis in production, memory
/// otherwise), one entry per page under <c>content:{slug}</c>. A store that is down never fails a
/// read or a publish: the page is read from the database instead.
/// </summary>
public sealed class DistributedContentReadCache(
    IDistributedCache store,
    TimeProvider clock,
    ILogger<DistributedContentReadCache> logger) : IContentReadCache
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private static string Key(string slug) => $"content:{slug}";

    public async Task<ContentDto> GetOrCreateAsync(
        string slug, Func<CancellationToken, Task<ContentDto>> build, CancellationToken cancellationToken)
    {
        var reachable = true;
        try
        {
            var cached = await store.GetAsync(Key(slug), cancellationToken);
            if (cached is not null
                && JsonSerializer.Deserialize<Entry>(cached, Json) is { Value: not null } entry
                && clock.GetUtcNow() < entry.ExpiresAt)
            {
                return entry.Value;
            }
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Content read cache is unavailable; reading {Slug} from the database.", slug);
            reachable = false;
        }

        var value = await build(cancellationToken);

        if (reachable)
        {
            try
            {
                var fresh = new Entry(clock.GetUtcNow() + IContentReadCache.TimeToLive, value);
                await store.SetAsync(
                    Key(slug),
                    JsonSerializer.SerializeToUtf8Bytes(fresh, Json),
                    new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = IContentReadCache.TimeToLive },
                    cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Content read cache could not store {Slug}.", slug);
            }
        }

        return value;
    }

    public async Task RemoveAsync(string slug, CancellationToken cancellationToken)
    {
        try
        {
            await store.RemoveAsync(Key(slug), cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Content read cache could not drop {Slug}; it expires within 10 minutes.", slug);
        }
    }

    /// <summary>
    /// The expiry travels with the value so the injected clock decides freshness; the store's own
    /// expiry only reclaims space.
    /// </summary>
    private sealed record Entry(DateTimeOffset ExpiresAt, ContentDto Value);
}
