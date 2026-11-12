using Jubilee.Cli;
using Jubilee.Domain;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Cli.Tests;

// Acceptance Test
// Traces to: L2-218 (AC4), L2-150 (AC4)
// Description: the Jubilee team reads the sign-ups and the pre-registrations with the CLI only, and each reading is audited.
public sealed class LaunchCommandTests
{
    private static readonly DateTimeOffset Sent = new(2026, 11, 12, 14, 30, 0, TimeSpan.Zero);
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

    private string[] Lines() => _output.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private Task Arrange() => Query(async db =>
    {
        db.LaunchSubscribers.Add(LaunchSubscriber.SignUp(EmailAddress.TryParse("joanna.adeyemi@example.com")!, "Joanna", Sent));
        db.LaunchSubscribers.Add(LaunchSubscriber.SignUp(EmailAddress.TryParse("ruth@example.com")!, null, Sent.AddHours(1)));
        db.BusinessPreRegistrations.Add(BusinessPreRegistration.Send(
            "Luzandre.com", "Naomi Laurent", EmailAddress.TryParse("naomi@luzandre.com")!, "4165550142", Category.Find("shops")!, "Leslieville",
            "https://luzandre.com", "Apparel, artworks and gifts, \"made in Toronto\".", Sent));
        db.BusinessPreRegistrations.Add(BusinessPreRegistration.Send(
            "=cmd()", "Eve", EmailAddress.TryParse("eve@example.com")!, null, Category.Find("media")!, "Scarborough", null, "Line one\nline two", Sent.AddHours(2)));
        return await db.SaveChangesAsync();
    });

    // L2-218 AC4
    [Fact]
    public async Task L2_218_AC4_list_prints_the_sign_ups_as_comma_separated_values_oldest_first()
    {
        await Arrange();

        Assert.Equal(0, await Run("launch", "list", "--kind", "notifications"));

        Assert.Equal(
            [
                "email,firstName,consentedAt,consentMethod",
                "joanna.adeyemi@example.com,Joanna,2026-11-12T14:30:00Z,MarketingSiteForm",
                "ruth@example.com,,2026-11-12T15:30:00Z,MarketingSiteForm",
            ],
            Lines());
    }

    // L2-218 AC4: values that hold a comma, a quote or a line break are quoted, and a value a spreadsheet would run is not left bare
    [Fact]
    public async Task L2_218_AC4_list_prints_the_pre_registrations_with_values_quoted_where_they_must_be()
    {
        await Arrange();

        Assert.Equal(0, await Run("launch", "list", "--kind", "businesses"));

        var text = _output.ToString().ReplaceLineEndings("\n");
        Assert.StartsWith("businessName,contactName,email,phone,category,area,website,description,consentedAt,consentMethod\n", text);
        Assert.Contains(
            "Luzandre.com,Naomi Laurent,naomi@luzandre.com,4165550142,Shops,Leslieville,https://luzandre.com,\"Apparel, artworks and gifts, \"\"made in Toronto\"\".\",2026-11-12T14:30:00Z,MarketingSiteForm\n",
            text);
        Assert.Contains("'=cmd(),Eve,eve@example.com,,Media,Scarborough,,\"Line one\nline two\",2026-11-12T16:30:00Z,MarketingSiteForm\n", text);
    }

    // L2-218 AC4, L2-150 AC4
    [Fact]
    public async Task L2_218_AC4_each_reading_is_written_to_the_audit_log_with_its_kind_and_count_and_no_personal_data()
    {
        await Arrange();

        await Run("launch", "list", "--kind", "notifications");

        var record = Assert.Single(await Query(db => db.AuditRecords.ToListAsync()));
        Assert.Equal("launch.list", record.Action);
        Assert.Equal("notifications", record.TargetType);
        Assert.Equal("2 rows", record.After);
        Assert.DoesNotContain("example.com", $"{record.Actor}{record.ActorName}{record.TargetId}{record.Before}{record.After}{record.Reason}");
    }

    [Theory]
    [InlineData("launch")]
    [InlineData("launch", "list")]
    [InlineData("launch", "list", "--kind", "everything")]
    public async Task L2_218_AC4_without_a_known_kind_nothing_is_read(params string[] args)
    {
        await Arrange();

        Assert.Equal(1, await Run(args));

        Assert.DoesNotContain("example.com", _output.ToString());
        Assert.Equal(0, await Query(db => db.AuditRecords.CountAsync()));
    }
}
