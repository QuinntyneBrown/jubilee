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
        Assert.Equal(0, await Run("staff", "grant", "--email", "Esther@Jubilee.to", "--role", "verifier"));
        Assert.Equal(0, await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "verifier"));
        Assert.Equal(0, await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "admin"));

        var account = await Account("esther@jubilee.to");
        Assert.NotNull(account);
        Assert.Equal(StaffRoles.Verifier | StaffRoles.Admin, account.Roles);
        Assert.Equal(1, await Query(db => db.StaffMembers.CountAsync()));
    }

    // L2-193 AC2, L2-190 AC6
    [Fact]
    public async Task L2_193_AC2_revoke_removes_the_role_and_ends_every_staff_session_of_the_account()
    {
        await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "verifier");
        var staffId = (await Account("esther@jubilee.to"))!.Id;
        await Query(async db =>
        {
            db.Sessions.Add(MemberSession.StartStaff(Guid.NewGuid(), staffId, "hash-1", [], DateTimeOffset.UtcNow));
            db.Sessions.Add(MemberSession.Start(Guid.NewGuid(), Guid.NewGuid(), "hash-2", [], false, DateTimeOffset.UtcNow));
            return await db.SaveChangesAsync();
        });

        Assert.Equal(0, await Run("staff", "revoke", "--email", "esther@jubilee.to", "--role", "verifier"));

        Assert.Equal(StaffRoles.None, (await Account("esther@jubilee.to"))!.Roles);
        var sessions = await Query(db => db.Sessions.ToListAsync());
        Assert.NotNull(sessions.Single(s => s.Kind == SessionKind.Staff).EndedAt);
        Assert.Null(sessions.Single(s => s.Kind == SessionKind.Member).EndedAt);
    }

    // L2-193 AC3
    [Fact]
    public async Task L2_193_AC3_list_prints_each_account_and_its_roles()
    {
        await Run("staff", "grant", "--email", "esther@jubilee.to", "--role", "verifier");
        await Run("staff", "grant", "--email", "ada@jubilee.to", "--role", "admin");
        await Run("staff", "grant", "--email", "ada@jubilee.to", "--role", "verifier");
        _output.GetStringBuilder().Clear();

        Assert.Equal(0, await Run("staff", "list"));

        var lines = _output.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        Assert.Contains("ada@jubilee.to: verifier, admin", lines);
        Assert.Contains("esther@jubilee.to: verifier", lines);
    }

    // L2-193 AC4
    [Theory]
    [InlineData("esther@jubilee.to", "owner", "Role must be verifier or admin.")]
    [InlineData("not-an-address", "verifier", "That is not an e-mail address.")]
    [InlineData("", "verifier", "That is not an e-mail address.")]
    public async Task L2_193_AC4_an_unknown_role_or_a_bad_address_changes_nothing_and_says_why(string email, string role, string message)
    {
        Assert.Equal(1, await Run("staff", "grant", "--email", email, "--role", role));

        Assert.Contains(message, _output.ToString());
        Assert.Equal(0, await Query(db => db.StaffMembers.CountAsync()));
    }
}
