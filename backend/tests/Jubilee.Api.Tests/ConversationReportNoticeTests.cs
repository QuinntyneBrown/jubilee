using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-105 AC1, L2-063 AC1, L2-063 AC3, L2-063 AC8
// Description: a report of a conversation e-mails the Jubilee team at once, through the outbox and in the
// same transaction as the report, with what the reporter wrote and the link to the report in the admin
// application; it never names the reporter and carries no message of the conversation (ADR 0057).
public sealed class ConversationReportNoticeTests(JubileeTeamEmailFactory factory)
    : IClassFixture<JubileeTeamEmailFactory>, IAsyncLifetime
{
    private const string Team = "team@jubilee.test";
    private const string Opening = "Hello, I have a question about the life insurance quote.";
    private const string Written = "He asks for a deposit by e-transfer before any meeting.";

    public async Task InitializeAsync()
    {
        await factory.Reset();
        var legacy = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        legacy.AssignOwner("member|trevor");
        await factory.Arrange(legacy);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Joanna() => factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private HttpClient Trevor() => factory.CreateMemberClient("Trevor Chew", "member|trevor");

    private async Task<string> Conversation()
    {
        var started = await Joanna().PostAsJsonAsync(
            "/api/conversations", new { listingSlug = "legacy-financial", body = Opening, idempotencyKey = Guid.NewGuid().ToString() });
        Assert.Equal(HttpStatusCode.Created, started.StatusCode);
        return JsonDocument.Parse(await started.Content.ReadAsStringAsync()).RootElement.GetProperty("conversationId").GetString()!;
    }

    private static Task<HttpResponseMessage> Report(HttpClient client, string conversation, string reason = Written, bool block = false) =>
        client.PostAsJsonAsync($"/api/conversations/{conversation}/report", new { reason, block });

    [Fact]
    public async Task L2_105_AC1_a_report_of_a_conversation_e_mails_the_team_what_was_written_and_the_report_in_the_admin_application()
    {
        var conversation = await Conversation();

        var response = await Report(Joanna(), conversation);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDb(async db =>
        {
            var report = await db.ConversationReports.AsNoTracking().SingleAsync();
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == Team);
            Assert.Equal("New report: a conversation with Legacy Financial", mail.Subject);
            Assert.Null(mail.MemberId);
            Assert.Equal(report.Id, mail.CorrelationId);
            Assert.Contains("A conversation was reported. Look at it within one business day.", mail.TextBody);
            Assert.Contains("Business: Legacy Financial", mail.TextBody);
            Assert.Contains($"What happened: {Written}", mail.TextBody);
            Assert.Contains($"Open the report: https://admin.jubilee.test/reports/{report.Id}", mail.TextBody);
        });
    }

    [Fact]
    public async Task L2_063_AC3_the_team_s_e_mail_names_neither_the_reporter_nor_carries_the_messages()
    {
        var conversation = await Conversation();

        await Report(Joanna(), conversation);
        await Report(Trevor(), conversation, "She keeps writing after I said no.");

        await factory.WithDb(async db =>
        {
            var mails = await db.OutboxMessages.AsNoTracking().Where(m => m.ToAddress == Team).ToListAsync();
            Assert.Equal(2, mails.Count);
            Assert.All(mails, mail =>
            {
                foreach (var word in new[] { "Joanna", "Adeyemi", "Trevor", "Chew", "member|", Opening })
                {
                    Assert.DoesNotContain(word, mail.Subject + mail.TextBody, StringComparison.OrdinalIgnoreCase);
                }
            });
        });
    }

    [Fact]
    public async Task L2_063_AC8_a_repeat_while_the_report_is_open_files_nothing_and_e_mails_nobody()
    {
        var conversation = await Conversation();
        await Report(Joanna(), conversation);

        var again = await Report(Joanna(), conversation, "Still happening.", block: true);

        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        await factory.WithDb(async db => Assert.Equal(1, await db.OutboxMessages.AsNoTracking().CountAsync(m => m.ToAddress == Team)));
    }

    [Fact]
    public async Task L2_105_AC1_a_report_the_server_refuses_tells_nobody()
    {
        var conversation = await Conversation();

        var response = await Report(Joanna(), conversation, " ");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        await factory.WithDb(async db => Assert.Equal(0, await db.OutboxMessages.AsNoTracking().CountAsync(m => m.ToAddress == Team)));
    }
}

// Acceptance Test
// Traces to: L2-105 AC1
// Description: with no team address configured a report of a conversation is stored and nobody is e-mailed.
public sealed class ConversationReportNoticeWithoutTeamTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    public async Task InitializeAsync()
    {
        await factory.Reset();
        var legacy = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        legacy.AssignOwner("member|trevor");
        await factory.Arrange(legacy);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_105_AC1_without_a_team_address_the_report_is_stored_and_the_team_is_not_e_mailed()
    {
        var joanna = factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");
        var started = await joanna.PostAsJsonAsync(
            "/api/conversations", new { listingSlug = "legacy-financial", body = "Hello.", idempotencyKey = Guid.NewGuid().ToString() });
        var id = JsonDocument.Parse(await started.Content.ReadAsStringAsync()).RootElement.GetProperty("conversationId").GetString();
        var before = 0;
        await factory.WithDb(async db => before = await db.OutboxMessages.CountAsync());

        var response = await joanna.PostAsJsonAsync($"/api/conversations/{id}/report", new { reason = "Odd.", block = false });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await factory.WithDb(async db =>
        {
            Assert.Equal(1, await db.ConversationReports.CountAsync());
            Assert.Equal(before, await db.OutboxMessages.CountAsync());
        });
    }
}
