using System.Net;
using System.Net.Http.Json;
using Jubilee.Application.Accounts;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

/// <summary>The two e-mails of this journey answer the member's own action: no category, no unsubscribe (L2-018 AC6, L2-068 AC6).</summary>
public sealed partial class AccountDataTests
{
    private async Task TurnEveryEmailOff(HttpClient client)
    {
        foreach (var setting in new[] { "messages", "requests", "reminders", "new-businesses", "tips" })
        {
            var response = await client.PatchAsJsonAsync("/api/account/notification-preferences", new { setting, enabled = false });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync("/api/account/notification-preferences", new { setting = "frequency", frequency = "daily-summary" })).StatusCode);
    }

    private Task Dispatch() => Run(s => s.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None));

    // L2-018 AC6, L2-068 AC6: the link is sent at once whatever the settings say, and carries no unsubscribe.
    [Fact]
    public async Task L2_018_AC6_The_link_e_mail_is_sent_whatever_the_settings_and_has_no_unsubscribe()
    {
        var (client, _) = await Joanna();
        await TurnEveryEmailOff(client);
        await client.PostAsync("/api/account/data-exports", null);

        await BuildExports();
        await Dispatch();

        var sent = Assert.Single(_factory.Emails.Sent, m => m.Subject == "Your Jubilee data is ready to download");
        Assert.Equal("joanna@example.com", sent.To);
        Assert.Null(sent.UnsubscribeUrl);
        Assert.DoesNotContain("nsubscribe", sent.Body, StringComparison.Ordinal);
        Assert.DoesNotContain("nsubscribe", sent.Html, StringComparison.Ordinal);
    }

    // L2-068 AC6: the deletion's confirmation is sent at once whatever the settings say, and carries no unsubscribe.
    [Fact]
    public async Task L2_068_AC6_The_deletion_confirmation_is_sent_whatever_the_settings_and_has_no_unsubscribe()
    {
        var (client, _) = await Joanna();
        await TurnEveryEmailOff(client);

        await client.SendAsync(Delete("DELETE"));
        await Dispatch();

        var sent = Assert.Single(_factory.Emails.Sent, m => m.Subject == "Your Jubilee account was deleted");
        Assert.Null(sent.UnsubscribeUrl);
        Assert.DoesNotContain("nsubscribe", sent.Html, StringComparison.Ordinal);
    }
}
