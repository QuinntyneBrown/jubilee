using System.Net;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

/// <summary>A deleted account stays deleted after the database is restored from a backup (L2-017 AC6, AC7; ADR 0069).</summary>
public sealed partial class AccountDataTests
{
    private Task ReapplyDeletions() => Run(s => s.GetRequiredService<DeletionLedgerReplay>().ReapplyAsync(CancellationToken.None));

    private async Task<IReadOnlyList<DeletedAccount>> Ledger()
    {
        IReadOnlyList<DeletedAccount> entries = [];
        await Run(async s => entries = await s.GetRequiredService<IDeletionLedger>().ReadAll(CancellationToken.None));
        return entries;
    }

    /// <summary>
    /// Puts rows back as a backup holds them: each tracked row takes the values of its copy read before the deletion.
    /// </summary>
    private Task Restore(params object[] backup) => _factory.WithDb(async db =>
    {
        foreach (var row in backup)
        {
            var key = db.Model.FindEntityType(row.GetType())!.FindPrimaryKey()!.Properties
                .Select(p => p.PropertyInfo!.GetValue(row)).ToArray();
            var current = await db.FindAsync(row.GetType(), key);
            db.Entry(current!).CurrentValues.SetValues(row);
        }

        await db.SaveChangesAsync();
    });

    private async Task<(Member Member, Listing Listing, Request Request, HttpClient Client)> JoannaWithAListingAndAnOpenRequest()
    {
        var (client, member) = await Joanna();
        var subject = member.Id.ToString();
        var mine = ListingMother.Public("joannas-bakery", "home-property", "Joanna’s Bakery");
        mine.AssignOwner(subject);
        var theirs = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        theirs.AssignOwner(Trevor);
        var request = Request.Book(
            subject, "Joanna Adeyemi", theirs.Id, Guid.NewGuid(), "Planning call", ListingMother.Now.AddDays(3), TimeSpan.FromMinutes(30),
            MeetingMode.Video, null, null, "b1", ListingMother.Now);
        await _factory.Arrange(mine, theirs, request);
        return (member, mine, request, client);
    }

    // L2-017 AC7: a restore from a backup taken before the deletion deletes the account again, with its original time.
    [Fact]
    public async Task L2_017_AC7_A_restored_database_deletes_the_account_again_from_the_ledger()
    {
        var (member, listing, request, client) = await JoannaWithAListingAndAnOpenRequest();
        var backup = new object[]
        {
            await Read(db => db.Members.AsNoTracking().SingleAsync(m => m.Id == member.Id)),
            await Read(db => db.Listings.AsNoTracking().SingleAsync(l => l.Id == listing.Id)),
            await Read(db => db.Requests.AsNoTracking().SingleAsync(r => r.Id == request.Id)),
            await Read(db => db.Sessions.AsNoTracking().SingleAsync(s => s.MemberId == member.Id)),
        };
        var deletedAt = _factory.Clock.GetUtcNow();
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(Delete("DELETE"))).StatusCode);

        _factory.Clock.Advance(TimeSpan.FromDays(2));
        await Restore(backup);
        Assert.Null((await Read(db => db.Members.SingleAsync(m => m.Id == member.Id))).DeletedAt);
        var mails = await Read(db => db.OutboxMessages.CountAsync());

        await ReapplyDeletions();

        var again = await Read(db => db.Members.SingleAsync(m => m.Id == member.Id));
        Assert.Equal(deletedAt, again.DeletedAt);
        Assert.Null(again.PasswordHash);
        Assert.NotNull((await Read(db => db.Sessions.SingleAsync(s => s.MemberId == member.Id))).EndedAt);
        Assert.Equal(RequestStatus.Cancelled, (await Read(db => db.Requests.SingleAsync())).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/joannas-bakery")).StatusCode);
        Assert.Equal(mails, await Read(db => db.OutboxMessages.CountAsync()));
        Assert.Equal(member.Id.ToString(), (await Read(db => db.AuditRecords.SingleAsync(a => a.Action == "account.deletion-reapplied"))).TargetId);

        // The erasure keeps the original date: 30 days after the deletion, not after the restore.
        _factory.Clock.Advance(TimeSpan.FromDays(28) + TimeSpan.FromMinutes(1));
        await Run(s => s.GetRequiredService<AccountErasure>().EraseDueAsync(CancellationToken.None));
        Assert.NotNull((await Read(db => db.Members.SingleAsync(m => m.Id == member.Id))).ErasedAt);
    }

    // L2-017 AC7: the ledger holds the account's id and time only, and a deletion it is missing is written on the next pass.
    [Fact]
    public async Task L2_017_AC7_Every_deletion_is_in_the_ledger_with_its_id_and_time_only()
    {
        var (client, member) = await Joanna();
        var deletedAt = _factory.Clock.GetUtcNow();

        await client.SendAsync(Delete("DELETE"));

        Assert.Equal([new DeletedAccount(member.Id, deletedAt)], await Ledger());
        Assert.DoesNotContain("joanna", await File.ReadAllTextAsync(_factory.DeletionLedgerPath), StringComparison.OrdinalIgnoreCase);

        File.Delete(_factory.DeletionLedgerPath);
        await ReapplyDeletions();
        Assert.Equal([new DeletedAccount(member.Id, deletedAt)], await Ledger());
    }

    // L2-017 AC7: an account that was never deleted is left alone, and an account the restored database lacks is skipped.
    [Fact]
    public async Task L2_017_AC7_The_ledger_touches_no_account_that_was_not_deleted()
    {
        var (_, member) = await Joanna();
        await Run(s => s.GetRequiredService<IDeletionLedger>().Record(new DeletedAccount(Guid.NewGuid(), ListingMother.Now), CancellationToken.None));

        await ReapplyDeletions();

        var kept = await Read(db => db.Members.SingleAsync(m => m.Id == member.Id));
        Assert.Null(kept.DeletedAt);
        Assert.NotNull(kept.PasswordHash);
    }
}
