using Jubilee.Cli;
using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Cli.Tests;

// Acceptance Test
// Traces to: L2-193, L2-190
// Description: staff accounts and their roles are granted, revoked and listed with the CLI only.
public sealed class StaffCommandTests
{
    private readonly string _store = $"jubilee-cli-{Guid.NewGuid():N}";
    private readonly StringWriter _output = new();

    private Task<int> Run(params string[] args) => JubileeCli.RunAsync(
        [.. args, $"--Database:Provider={Infrastructure.DependencyInjection.InMemoryProvider}", $"--ConnectionStrings:Jubilee={_store}"], _output);

    private async Task<T> Query<T>(Func<AppDbContext, Task<T>> query)
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(_store, Infrastructure.DependencyInjection.InMemoryRoot)
            .Options);
        return await query(db);
    }

    private Task<StaffMember?> Account(string email) =>
        Query(db => db.StaffMembers.SingleOrDefaultAsync(s => s.Email == email));

    // L2-193 AC1
    [Fact]
    public async Task L2_193_AC1_grant_creates_the_staff_account_with_the_role_and_is_safe_to_run_again()
    {
        Assert.Equal(0, await Run("staff", "grant", "--email", "Esther@Jubilee.to", "--role", "moderator"));
        Assert.Equal(0, await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "moderator"));
        Assert.Equal(0, await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "admin"));

        var account = await Account("esther@jubilee.to");
        Assert.NotNull(account);
        Assert.Equal(StaffRoles.Moderator | StaffRoles.Admin, account.Roles);
        Assert.Equal(1, await Query(db => db.StaffMembers.CountAsync()));
    }

    // L2-193 AC2, L2-190 AC6
    [Fact]
    public async Task L2_193_AC2_revoke_removes_the_role_and_ends_every_staff_session_of_the_account()
    {
        await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "moderator");
        var staffId = (await Account("esther@jubilee.to"))!.Id;
        await Query(async db =>
        {
            db.Sessions.Add(MemberSession.StartStaff(Guid.NewGuid(), staffId, "hash-1", [], DateTimeOffset.UtcNow));
            db.Sessions.Add(MemberSession.Start(Guid.NewGuid(), Guid.NewGuid(), "hash-2", [], false, DateTimeOffset.UtcNow));
            return await db.SaveChangesAsync();
        });

        Assert.Equal(0, await Run("staff", "revoke", "--email", "esther@jubilee.to", "--role", "moderator"));

        Assert.Equal(StaffRoles.None, (await Account("esther@jubilee.to"))!.Roles);
        var sessions = await Query(db => db.Sessions.ToListAsync());
        Assert.NotNull(sessions.Single(s => s.Kind == SessionKind.Staff).EndedAt);
        Assert.Null(sessions.Single(s => s.Kind == SessionKind.Member).EndedAt);
    }

    // L2-098 AC4, L2-180 AC1: each role change is audited with the operator who ran the CLI; a command that changes nothing writes nothing
    [Fact]
    public async Task L2_098_AC4_granting_and_revoking_a_role_is_audited_with_the_operator_and_the_roles_before_and_after()
    {
        Assert.Equal(0, await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "moderator"));
        Assert.Equal(0, await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "moderator"));
        Assert.Equal(0, await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "admin"));
        Assert.Equal(0, await Run("staff", "revoke", "--email", "esther@jubilee.to", "--role", "moderator"));

        var records = (await Query(db => db.AuditRecords.ToListAsync())).OrderBy(a => a.At).ThenBy(a => a.After!.Length).ToList();
        Assert.Equal(["staff.role-granted", "staff.role-granted", "staff.role-revoked"], records.Select(r => r.Action));
        Assert.All(records, r =>
        {
            Assert.Equal($"cli|{Environment.UserName}", r.Actor);
            Assert.Equal($"{Environment.UserName} (jubilee CLI)", r.ActorName);
            Assert.Equal("staff", r.TargetType);
            Assert.Equal("esther@jubilee.to", r.TargetId);
            Assert.Equal("jubilee staff", r.Reason);
        });
        Assert.Equal(("no roles", "moderator"), (records[0].Before, records[0].After));
        Assert.Equal(("moderator", "moderator, admin"), (records[1].Before, records[1].After));
        Assert.Equal(("moderator, admin", "admin"), (records[2].Before, records[2].After));
    }

    // L2-098 AC4, L2-193 AC4: a refused command writes no audit record
    [Fact]
    public async Task L2_098_AC4_a_refused_role_change_is_not_audited()
    {
        Assert.Equal(1, await Run("staff", "revoke", "--email", "nobody@jubilee.to", "--role", "moderator"));
        Assert.Equal(1, await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "owner"));

        Assert.Equal(0, await Query(db => db.AuditRecords.CountAsync()));
    }

    // L2-193 AC3
    [Fact]
    public async Task L2_193_AC3_list_prints_each_account_and_its_roles()
    {
        await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "moderator");
        await Run("staff", "grant", "--email", "ada@jubilee.to", "--role", "admin");
        await Run("staff", "grant", "--email", "ada@jubilee.to", "--role", "moderator");
        _output.GetStringBuilder().Clear();

        Assert.Equal(0, await Run("staff", "list"));

        var lines = _output.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        Assert.Contains("ada@jubilee.to: moderator, admin", lines);
        Assert.Contains("esther@jubilee.to: moderator", lines);
    }

    // L2-193 AC4
    [Theory]
    [InlineData("esther@jubilee.to", "owner", "Role must be moderator or admin.")]
    [InlineData("esther@jubilee.to", "verifier", "Role must be moderator or admin.")]
    [InlineData("not-an-address", "moderator", "That is not an e-mail address.")]
    [InlineData("", "moderator", "That is not an e-mail address.")]
    public async Task L2_193_AC4_an_unknown_role_or_a_bad_address_changes_nothing_and_says_why(string email, string role, string message)
    {
        Assert.Equal(1, await Run("staff", "grant", "--email", email, "--role", role));

        Assert.Contains(message, _output.ToString());
        Assert.Equal(0, await Query(db => db.StaffMembers.CountAsync()));
    }
}
