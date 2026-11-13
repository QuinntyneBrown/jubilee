using Jubilee.Application.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Jubilee.Application.Accounts;

/// <summary>One deletion as the ledger keeps it: the account's id and when it was deleted, nothing else (ADR 0069).</summary>
public sealed record DeletedAccount(Guid MemberId, DateTimeOffset DeletedAt);

/// <summary>
/// The deletion ledger (L2-017 AC7, ADR 0069): every account deletion, kept outside the database so that a database
/// restored from a backup can be told which accounts to delete again. Append-only.
/// </summary>
public interface IDeletionLedger
{
    Task Record(DeletedAccount entry, CancellationToken cancellationToken);

    Task<IReadOnlyList<DeletedAccount>> ReadAll(CancellationToken cancellationToken);
}

/// <summary>
/// The worker's side of the ledger: deletes again every account the ledger names and a restored database does not show
/// as deleted, and writes to the ledger any deletion it is missing (L2-017 AC7).
/// </summary>
public sealed class DeletionLedgerReplay(IAppDbContext db, IDeletionLedger ledger, TimeProvider clock, ILogger<DeletionLedgerReplay> logger)
{
    public async Task<int> ReapplyAsync(CancellationToken cancellationToken)
    {
        var entries = await ledger.ReadAll(cancellationToken);
        var recorded = entries.Select(e => e.MemberId).ToHashSet();

        // Deleted again: an account the ledger names that the database, restored from a backup, holds as not deleted.
        var ids = recorded.ToList();
        var restored = await db.Members.Where(m => ids.Contains(m.Id) && m.DeletedAt == null).ToListAsync(cancellationToken);
        foreach (var member in restored)
        {
            var deletedAt = entries.Where(e => e.MemberId == member.Id).Min(e => e.DeletedAt);
            await AccountDeletion.ApplyAsync(db, member, deletedAt, clock.GetUtcNow(), "account.deletion-reapplied", cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
        }

        // Written to the ledger: a deletion whose entry could not be written when it was made.
        var missing = (await db.Members.AsNoTracking().Where(m => m.DeletedAt != null).Select(m => new { m.Id, m.DeletedAt }).ToListAsync(cancellationToken))
            .Where(m => !recorded.Contains(m.Id)).ToList();
        foreach (var member in missing)
        {
            await ledger.Record(new DeletedAccount(member.Id, member.DeletedAt!.Value), cancellationToken);
        }

        if (restored.Count > 0 || missing.Count > 0)
        {
            logger.LogWarning(
                "Deletion ledger: {Reapplied} deletions re-applied after a restore, {Recorded} written to the ledger.", restored.Count, missing.Count);
        }

        return restored.Count;
    }
}
