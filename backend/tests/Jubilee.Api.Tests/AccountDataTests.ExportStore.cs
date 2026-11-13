using System.Net;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

/// <summary>The archive lives in the export store, outside the database, and leaves it with the link (L2-018 AC5, ADR 0069).</summary>
public sealed partial class AccountDataTests
{
    private string ArchiveFile(DataExport export) => Path.Combine(_factory.ExportsRoot, $"{export.ArchiveKey}.json");

    private async Task<(HttpClient Client, Member Member, DataExport Export, string Token)> AReadyArchive()
    {
        var (client, member) = await Joanna();
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();
        var export = await Read(db => db.DataExports.SingleAsync(e => e.MemberId == member.Id));
        return (client, member, export, await LinkTokenFor(member));
    }

    // L2-018 AC5: the archive is a file of the export store under a random key, and the database holds only the key.
    [Fact]
    public async Task L2_018_AC5_The_archive_is_kept_in_the_export_store_under_a_random_key()
    {
        var (client, _, export, token) = await AReadyArchive();

        Assert.Matches("^[0-9a-f]{32}$", export.ArchiveKey);
        var stored = await File.ReadAllTextAsync(ArchiveFile(export));
        Assert.Contains("Joanna", stored);
        var downloaded = await client.GetAsync($"/api/account/data-exports/{token}");
        Assert.Equal(HttpStatusCode.OK, downloaded.StatusCode);
        Assert.Equal(stored, await downloaded.Content.ReadAsStringAsync());
    }

    // L2-018 AC5: the archive leaves the store when the link expires.
    [Fact]
    public async Task L2_018_AC5_The_archive_leaves_the_store_when_the_link_expires()
    {
        var (client, _, export, _) = await AReadyArchive();

        await StayActive(client, TimeSpan.FromDays(8));
        await Run(s => s.GetRequiredService<DataExportBuilder>().ExpireAsync(CancellationToken.None));

        Assert.False(File.Exists(ArchiveFile(export)));
        Assert.Null((await Read(db => db.DataExports.SingleAsync())).ArchiveKey);
    }

    // L2-018 AC5: the archive leaves the store when the account is deleted.
    [Fact]
    public async Task L2_018_AC5_The_archive_leaves_the_store_when_the_account_is_deleted()
    {
        var (client, _, export, _) = await AReadyArchive();

        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(Delete("DELETE"))).StatusCode);

        Assert.False(File.Exists(ArchiveFile(export)));
        Assert.Equal(DataExportStatus.Expired, (await Read(db => db.DataExports.SingleAsync())).Status);
    }

    // L2-018 AC5: a key that is not the store's own shape never reaches outside the store's folder.
    [Fact]
    public async Task L2_018_AC5_The_store_reads_only_its_own_keys()
    {
        await Run(async s =>
        {
            var store = s.GetRequiredService<Application.Abstractions.IExportStore>();
            await Assert.ThrowsAsync<ArgumentException>(() => store.Read("../../appsettings", CancellationToken.None));
        });
    }
}
