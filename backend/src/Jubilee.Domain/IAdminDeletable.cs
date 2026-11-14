namespace Jubilee.Domain;

/// <summary>
/// A record the Jubilee team may delete from the admin application (L2-281, ADR 0075). Deleting keeps the row with the
/// time it was deleted: a query filter keeps it out of every screen and query until "Undo" restores it or the worker
/// erases it 30 days later.
/// </summary>
public interface IAdminDeletable
{
    /// <summary>When a staff member deleted it; null while it is in use.</summary>
    DateTimeOffset? AdminDeletedAt { get; }

    void AdminDelete(DateTimeOffset now);

    void AdminRestore();
}
