using System.Runtime.CompilerServices;
using Jubilee.Application.Directory;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Jubilee.Infrastructure.Caching;

/// <summary>
/// Drops the cached directory entries after a save that added, changed or removed a listing, a
/// product, a service or a featured slot, so a state change shows on the next request (L2-156 AC2).
/// </summary>
public sealed class DirectoryCacheInvalidationInterceptor(IDirectoryReadCache cache) : SaveChangesInterceptor
{
    private static readonly object Marker = new();
    private readonly ConditionalWeakTable<DbContext, object> _pending = [];

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Remember(eventData.Context);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Remember(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        if (Forget(eventData.Context))
        {
            cache.Invalidate();
        }

        return result;
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        if (Forget(eventData.Context))
        {
            await cache.InvalidateAsync(cancellationToken);
        }

        return result;
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData) => Forget(eventData.Context);

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        Forget(eventData.Context);
        return Task.CompletedTask;
    }

    private void Remember(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var changesDirectory = context.ChangeTracker.Entries().Any(entry =>
            entry.Entity is Listing or Product or Service or FeaturedSlot
            && entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted);
        if (changesDirectory)
        {
            _pending.AddOrUpdate(context, Marker);
        }
    }

    private bool Forget(DbContext? context) => context is not null && _pending.Remove(context);
}
