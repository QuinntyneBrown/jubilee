namespace Jubilee.Application.Content;

/// <summary>
/// The published text of each policy page, kept in the distributed cache so a member's read does not
/// reach the database (L2-247 AC11, ADR 0067). A publish removes its page; an entry is kept at most
/// <see cref="TimeToLive"/>, so a change made behind the app shows within that time. A store that is
/// down never fails a read: the text comes from the database.
/// </summary>
public interface IContentReadCache
{
    static readonly TimeSpan TimeToLive = TimeSpan.FromMinutes(10);

    /// <summary>Returns the cached page for <paramref name="slug"/>, building and caching it on a miss.</summary>
    Task<ContentDto> GetOrCreateAsync(string slug, Func<CancellationToken, Task<ContentDto>> build, CancellationToken cancellationToken);

    /// <summary>Drops the cached page, so the next read is the version just published.</summary>
    Task RemoveAsync(string slug, CancellationToken cancellationToken);
}
