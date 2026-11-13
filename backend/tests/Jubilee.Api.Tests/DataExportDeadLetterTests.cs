using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// L2-182 AC2: a data export whose build fails is tried again after 1, 2, 4 and 8 minutes; the fifth failure is its dead
// letter, marked failed and logged, and the on-call contact is e-mailed at once with no personal data (ADR 0069).
public sealed partial class DataExportDeadLetterTests(OnCallFactory factory) : IClassFixture<OnCallFactory>, IAsyncLifetime
{
    public const string Alert = "Job alert: a data export failed";

    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [GeneratedRegex("XSRF-TOKEN=([^;]+)")]
    private static partial Regex Xsrf();

    /// <summary>Joanna asks for her data, and every build of it fails: her account row is gone from under it.</summary>
    private async Task<HttpClient> AnExportThatCannotBeBuilt()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.CookieSessionHeader, "1");
        var joined = await client.PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Joanna",
            lastName = "Adeyemi",
            email = "joanna@example.com",
            password = "correct horse 13",
            agreementAccepted = true,
        });
        Assert.Equal(HttpStatusCode.Created, joined.StatusCode);
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", Xsrf().Match(string.Join(';', joined.Headers.GetValues("Set-Cookie"))).Groups[1].Value);
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsync("/api/account/data-exports", null)).StatusCode);
        await factory.WithDb(async db =>
        {
            db.Members.Remove(await db.Members.SingleAsync());
            await db.SaveChangesAsync();
        });
        return client;
    }

    private async Task Build()
    {
        using var scope = factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<DataExportBuilder>().BuildDueAsync(CancellationToken.None);
    }

    private Task<DataExport> Export() => factory.Query(db => db.DataExports.SingleAsync());

    [Fact]
    public async Task L2_182_AC2_A_failed_build_is_tried_again_after_1_2_4_and_8_minutes()
    {
        await AnExportThatCannotBeBuilt();
        await Build();
        Assert.Equal(1, (await Export()).Attempts);

        foreach (var (wait, attempts) in new[] { (1, 2), (2, 3), (4, 4), (8, 5) })
        {
            factory.Clock.Advance(TimeSpan.FromMinutes(wait) - TimeSpan.FromSeconds(1));
            await Build();
            Assert.Equal(attempts - 1, (await Export()).Attempts);

            factory.Clock.Advance(TimeSpan.FromSeconds(1));
            await Build();
            Assert.Equal(attempts, (await Export()).Attempts);
        }
    }

    [Fact]
    public async Task L2_182_AC2_The_fifth_failure_marks_the_export_failed_and_alerts_on_call_without_personal_data()
    {
        await AnExportThatCannotBeBuilt();
        for (var i = 1; i < DataExport.MaxAttempts; i++)
        {
            await Build();
            Assert.Empty(await factory.Query(db => db.OutboxMessages.Where(o => o.Subject == Alert).ToListAsync()));
            factory.Clock.Advance(TimeSpan.FromMinutes(10));
        }

        await Build();

        var export = await Export();
        Assert.Equal(DataExportStatus.Failed, export.Status);
        var alert = Assert.Single(await factory.Query(db => db.OutboxMessages.Where(o => o.Subject == Alert).ToListAsync()));
        Assert.Equal(OnCallFactory.OnCall, alert.ToAddress);
        Assert.Null(alert.MemberId);
        Assert.Contains(export.Id.ToString(), alert.TextBody);
        Assert.Contains("5 attempts", alert.TextBody);
        Assert.DoesNotContain("joanna", alert.TextBody, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(factory.Logs.Entries, e => e.Message == $"Dead letter: DataExport {export.Id}");

        // A dead letter stays where it is: no more attempts and no second alert.
        await Build();
        Assert.Equal(DataExport.MaxAttempts, (await Export()).Attempts);
        Assert.Single(await factory.Query(db => db.OutboxMessages.Where(o => o.Subject == Alert).ToListAsync()));
    }
}
