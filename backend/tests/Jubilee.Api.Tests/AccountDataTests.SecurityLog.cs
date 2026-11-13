using System.Net;
using Jubilee.Api.Tests.Support;

namespace Jubilee.Api.Tests;

/// <summary>An account deletion in the security log (L2-143 AC1).</summary>
public sealed partial class AccountDataTests
{
    // L2-143 AC1: a deletion, and a refused one, are logged with the actor, the address and the outcome; the time is the log's.
    [Fact]
    public async Task L2_143_AC1_A_deletion_and_a_refused_one_are_logged_with_actor_address_and_outcome()
    {
        var (client, member) = await Joanna();
        client.DefaultRequestHeaders.Add(JubileeApiFactory.RemoteAddressHeader, "203.0.113.27");
        _factory.Logs.Clear();

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await client.SendAsync(Delete("delete"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(Delete("DELETE"))).StatusCode);

        var events = _factory.Logs.Entries.Select(e => e.Message)
            .Where(m => m.StartsWith("Security event: AccountDeletion ", StringComparison.Ordinal)).ToList();
        Assert.Equal(
            [
                $"Security event: AccountDeletion refused for member {member.Id} from 203.0.113.27",
                $"Security event: AccountDeletion succeeded for member {member.Id} from 203.0.113.27",
            ],
            events);
        Assert.DoesNotContain("joanna@example.com", string.Join(' ', _factory.Logs.Entries.Select(e => e.Message)), StringComparison.Ordinal);
    }
}
