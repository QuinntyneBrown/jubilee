namespace Jubilee.Application.Directory;

/// <summary>
/// Short-lived read cache for the public directory responses (L2-156 AC2). An entry lives for at
/// most <see cref="TimeToLive"/>, which bounds how long a paused listing can stay visible
/// (L2-028 AC2); every entry is dropped when a listing, product or featured slot changes.
/// </summary>
public interface IDirectoryReadCache
{
    static readonly TimeSpan TimeToLive = TimeSpan.FromSeconds(60);

    /// <summary>Returns the cached value for <paramref name="key"/>, building and caching it on a miss.</summary>
    Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> build, CancellationToken cancellationToken)
        where T : class;

    /// <summary>Drops every cached directory entry.</summary>
    void Invalidate();

    /// <inheritdoc cref="Invalidate"/>
    Task InvalidateAsync(CancellationToken cancellationToken);
}
