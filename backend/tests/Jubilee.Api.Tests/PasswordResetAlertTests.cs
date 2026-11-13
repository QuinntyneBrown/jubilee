using System.Net;
using System.Net.Http.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Jubilee.Api.Tests;

public sealed class OnCallFactory : JubileeApiFactory
{
    public const string OnCall = "oncall@jubilee.test";

    protected override void ConfigureSettings(IWebHostBuilder builder)
    {
        builder.UseSetting("Security:OnCallEmail", OnCall);
        builder.UseSetting("Moderation:TeamEmail", "team@jubilee.test");
    }
}

public sealed class TeamOnlyFactory : JubileeApiFactory
{
    public const string Team = "team@jubilee.test";

    protected override void ConfigureSettings(IWebHostBuilder builder) => builder.UseSetting("Moderation:TeamEmail", Team);
}

/// <summary>Helpers the alert tests share: many addresses asking at once, and the worker's pass.</summary>
internal static class Burst
{
    public const string Subject = "Security alert: a burst of password reset requests";

    public static async Task Ask(JubileeApiFactory factory, int count, string prefix = "visitor")
    {
        var client = factory.CreateClient();
        for (var i = 0; i < count; i++)
        {
            var response = await client.PostAsJsonAsync("/api/account/password-reset-requests", new { email = $"{prefix}{i}@example.com" });
            Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        }
    }

    public static async Task Process(JubileeApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<PasswordResetLinks>().IssueAsync(CancellationToken.None);
        await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
    }

    public static IEnumerable<SentEmail> Alerts(JubileeApiFactory factory) => factory.Emails.Sent.Where(m => m.Subject == Subject);
}

// L2-143 AC4: more than 100 password reset requests across all addresses within 5 minutes alert the on-call
// security contact, with the count and no address, at most once in any 5 minutes while the burst lasts.
public sealed class PasswordResetAlertTests(OnCallFactory factory) : IClassFixture<OnCallFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    // Given 101 reset requests for different addresses within 5 minutes, when the worker processes them,
    // then the on-call contact is e-mailed once with the count and no address, and a warning is logged.
    [Fact]
    public async Task L2_143_AC4_more_than_100_reset_requests_in_5_minutes_alert_the_on_call_contact_once()
    {
        await Burst.Ask(factory, 60);
        factory.Clock.Advance(TimeSpan.FromMinutes(4));
        await Burst.Ask(factory, 41, "later");

        await Burst.Process(factory);

        var alert = Assert.Single(Burst.Alerts(factory));
        Assert.Equal(OnCallFactory.OnCall, alert.To);
        Assert.Contains("101 password reset requests in the last 5 minutes", alert.Body);
        Assert.DoesNotContain("@example.com", alert.Body);
        var line = Assert.Single(factory.Logs.Entries, e => e.Message.StartsWith("Security alert:", StringComparison.Ordinal));
        Assert.Equal(LogLevel.Warning, line.Level);
        Assert.Equal("Security alert: 101 password reset requests in 5 minutes", line.Message);
        Assert.Equal(1, await factory.Query(db => db.SecurityAlerts.CountAsync()));

        // The burst goes on: no second alert within the 5 minutes.
        factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await Burst.Ask(factory, 101, "more");
        await Burst.Process(factory);
        Assert.Single(Burst.Alerts(factory));

        // Still going 5 minutes after the alert: the contact hears again.
        factory.Clock.Advance(TimeSpan.FromMinutes(4));
        await Burst.Ask(factory, 101, "still");
        await Burst.Process(factory);
        Assert.Equal(2, Burst.Alerts(factory).Count());
    }

    // Given 100 reset requests within 5 minutes, or 101 spread over more than 5, when they are processed, then nobody is alerted.
    [Fact]
    public async Task L2_143_AC4_100_requests_or_a_slower_stream_alert_nobody()
    {
        await Burst.Ask(factory, 100);
        await Burst.Process(factory);
        Assert.Empty(Burst.Alerts(factory));

        factory.Clock.Advance(TimeSpan.FromMinutes(6));
        await Burst.Ask(factory, 1, "next");
        await Burst.Process(factory);
        Assert.Empty(Burst.Alerts(factory));
        Assert.DoesNotContain(factory.Logs.Entries, e => e.Message.StartsWith("Security alert:", StringComparison.Ordinal));
    }
}

// L2-143 AC4: with no on-call address the Jubilee team's address hears of the burst.
public sealed class PasswordResetAlertTeamTests(TeamOnlyFactory factory) : IClassFixture<TeamOnlyFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_143_AC4_without_an_on_call_address_the_jubilee_team_is_alerted()
    {
        await Burst.Ask(factory, 101);
        await Burst.Process(factory);

        Assert.Equal(TeamOnlyFactory.Team, Assert.Single(Burst.Alerts(factory)).To);
    }
}

// L2-143 AC4: with no address at all the alert is still logged and recorded.
public sealed class PasswordResetAlertUnaddressedTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_143_AC4_without_any_address_the_alert_is_logged_and_recorded_only()
    {
        await Burst.Ask(factory, 101);
        await Burst.Process(factory);

        Assert.Empty(Burst.Alerts(factory));
        Assert.Contains(factory.Logs.Entries, e => e.Level == LogLevel.Warning && e.Message.StartsWith("Security alert:", StringComparison.Ordinal));
        Assert.Equal(1, await factory.Query(db => db.SecurityAlerts.CountAsync()));
    }
}
