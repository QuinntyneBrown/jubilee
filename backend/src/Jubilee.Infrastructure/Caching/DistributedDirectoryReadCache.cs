using System.Text.Json;
using Jubilee.Application.Directory;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Jubilee.Infrastructure.Caching;

/// <summary>
/// <see cref="IDirectoryReadCache"/> over <see cref="IDistributedCache"/> (Redis in production,
/// memory otherwise). Entries are keyed under a version; invalidating replaces the version, which
/// orphans every entry at once and lets them expire. A store that is down never fails a read: the
/// value is built from the database instead.
/// </summary>
public sealed class DistributedDirectoryReadCache(
    IDistributedCache store,
    TimeProvider clock,
    ILogger<DistributedDirectoryReadCache> logger) : IDirectoryReadCache
{
    private const string VersionKey = "directory:version";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> build, CancellationToken cancellationToken)
        where T : class
    {
        string? entryKey = null;
        try
        {
            var version = await store.GetStringAsync(VersionKey, cancellationToken) ?? "0";
            entryKey = $"directory:{version}:{key}";
            var cached = await store.GetAsync(entryKey, cancellationToken);
            if (cached is not null
                && JsonSerializer.Deserialize<Entry<T>>(cached, Json) is { Value: not null } entry
                && clock.GetUtcNow() < entry.ExpiresAt)
            {
                return entry.Value;
            }
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Directory read cache is unavailable; reading {Key} from the database.", key);
            entryKey = null;
        }

        var value = await build(cancellationToken);

        if (entryKey is not null)
        {
            try
            {
                var fresh = new Entry<T>(clock.GetUtcNow() + IDirectoryReadCache.TimeToLive, value);
                await store.SetAsync(
                    entryKey,
                    JsonSerializer.SerializeToUtf8Bytes(fresh, Json),
                    new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = IDirectoryReadCache.TimeToLive },
                    cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Directory read cache could not store {Key}.", key);
            }
        }

        return value;
    }

    public void Invalidate()
    {
        try
        {
            store.SetString(VersionKey, Guid.NewGuid().ToString("N"));
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Directory read cache could not be invalidated; entries expire within 60 s.");
        }
    }

    public async Task InvalidateAsync(CancellationToken cancellationToken)
    {
        try
        {
            await store.SetStringAsync(VersionKey, Guid.NewGuid().ToString("N"), cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Directory read cache could not be invalidated; entries expire within 60 s.");
        }
    }

    /// <summary>
    /// The expiry travels with the value so the injected clock decides freshness; the store's own
    /// expiry only reclaims space.
    /// </summary>
    private sealed record Entry<T>(DateTimeOffset ExpiresAt, T Value);
}
