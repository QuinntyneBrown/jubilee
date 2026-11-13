using System.Net;
using System.Net.Http.Json;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-114 AC2, L2-127, L2-132
// Description: "Ask for access" e-mails the Jubilee team the address, the member and when it was asked,
// through the outbox, once per request: a repeated key or a request over the hourly limit sends nothing (ADR 0056).
public sealed class AccessRequestNoticeTests(JubileeTeamEmailFactory factory) : IClassFixture<JubileeTeamEmailFactory>, IAsyncLifetime
{
    private const string Team = "team@jubilee.test";
    private Member _joanna = null!;

    public async Task InitializeAsync()
    {
        await factory.Reset();
        _joanna = Member.Join(EmailAddress.TryParse("joanna@example.com")!, "Joanna", "Adeyemi", null, "hash", ListingMother.Now);
        await factory.Arrange(_joanna);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private Task<HttpResponseMessage> Ask(string url, string key)
    {
        var client = factory.CreateMemberClient("Joanna Adeyemi", _joanna.Id.ToString());
        client.DefaultRequestHeaders.Add("Idempotency-Key", key);
        return client.PostAsJsonAsync("/api/help/access-requests", new { url });
    }

    [Fact]
    public async Task L2_114_AC2_the_team_is_e_mailed_the_address_the_member_and_when_it_was_asked()
    {
        var response = await Ask("/my-business", "key-1");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync();
            Assert.Equal(Team, mail.ToAddress);
            Assert.Null(mail.MemberId);
            Assert.Equal("Access request: /my-business", mail.Subject);
            Assert.Equal(
                "A member asked for access to a page they could not open. Nothing was granted; look at it and answer them.\n\n"
                + "Page: https://jubilee.test/my-business\n"
                + "Member: Joanna Adeyemi (joanna@example.com)\n"
                + "Asked: 10:00 a.m. Eastern on Tuesday 10 November\n\n"
                + "Their roles and permissions are unchanged until the team changes them.\n\n"
                + "Jubilee · Toronto's Christian marketplace\n",
                mail.TextBody);
        });
    }

    [Fact]
    public async Task L2_132_asking_again_with_the_same_key_sends_no_second_e_mail()
    {
        await Ask("/my-business", "key-1");
        await Ask("/my-business", "key-1");

        Assert.Equal(1, await factory.Query(db => db.OutboxMessages.CountAsync()));
    }

    [Fact]
    public async Task L2_127_a_request_over_the_hourly_limit_sends_nothing()
    {
        for (var i = 0; i < 6; i++)
        {
            await Ask("/my-business", $"key-{i}");
        }

        Assert.Equal(5, await factory.Query(db => db.OutboxMessages.CountAsync()));
        Assert.Equal(5, await factory.Query(db => db.AccessRequests.CountAsync()));
    }
}
