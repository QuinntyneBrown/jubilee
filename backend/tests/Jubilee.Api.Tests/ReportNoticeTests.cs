using System.Net;
using System.Net.Http.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>The Jubilee team's own address (<c>Moderation:TeamEmail</c>, ADR 0055, ADR 0057).</summary>
public sealed class JubileeTeamEmailFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder) =>
        builder.UseSetting("Moderation:TeamEmail", "team@jubilee.test");
}

// Acceptance Test
// Traces to: L2-039 AC3, L2-039 AC5, L2-105 AC1, L2-132
// Description: a new report of a listing e-mails the Jubilee team at once, through the outbox and in the
// same transaction as the report, with the reason, the description and the link to the report in the admin
// application, and never the reporter (ADR 0055).
public sealed class ReportNoticeTests(JubileeTeamEmailFactory factory) : IClassFixture<JubileeTeamEmailFactory>, IAsyncLifetime
{
    private const string Team = "team@jubilee.test";
    private const string Detail = "The office address on the listing is closed; they moved last spring.";

    public async Task InitializeAsync()
    {
        await factory.Reset();
        await factory.Arrange(ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial"));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Joanna() => factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static Task<HttpResponseMessage> Report(HttpClient client, string reason = "misleading", string description = Detail, string? key = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/listings/legacy-financial/reports")
        {
            Content = JsonContent.Create(new { reason, description }),
        };
        request.Headers.Add("Idempotency-Key", key ?? Guid.NewGuid().ToString());
        return client.SendAsync(request);
    }

    [Fact]
    public async Task L2_105_AC1_a_new_report_e_mails_the_team_the_listing_reason_description_and_the_report_in_the_admin_application()
    {
        var response = await Report(Joanna());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDb(async db =>
        {
            var report = await db.ListingReports.AsNoTracking().SingleAsync();
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == Team);
            Assert.Equal("New report: Legacy Financial", mail.Subject);
            Assert.Null(mail.MemberId);
            Assert.Equal(report.Id, mail.CorrelationId);
            Assert.Contains("A member reported a listing. Look at it within one business day.", mail.TextBody);
            Assert.Contains("Listing: Legacy Financial", mail.TextBody);
            Assert.Contains("Reason: The listing is misleading or out of date", mail.TextBody);
            Assert.Contains($"What happened: {Detail}", mail.TextBody);
            Assert.Contains($"Open the report: https://admin.jubilee.test/reports/{report.Id}", mail.TextBody);
            Assert.Contains("The reporter's name is shown to the Jubilee team in the admin application only.", mail.TextBody);
            Assert.DoesNotContain("verif", mail.TextBody, StringComparison.OrdinalIgnoreCase);
        });
    }

    [Fact]
    public async Task L2_105_AC1_the_team_s_e_mail_never_names_the_reporter()
    {
        await Report(Joanna());

        await factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == Team);
            Assert.DoesNotContain("Joanna", mail.TextBody);
            Assert.DoesNotContain("Adeyemi", mail.TextBody);
            Assert.DoesNotContain("joanna", mail.TextBody, StringComparison.OrdinalIgnoreCase);
        });
    }

    [Fact]
    public async Task L2_039_AC5_an_entry_added_to_the_report_of_the_last_24_hours_e_mails_the_team_again_as_more_on_that_report()
    {
        await Report(Joanna());
        await Report(Joanna(), reason: "bad-experience", description: "They never called back.");

        await factory.WithDb(async db =>
        {
            var report = await db.ListingReports.AsNoTracking().SingleAsync();
            var mails = await db.OutboxMessages.AsNoTracking().Where(m => m.ToAddress == Team).OrderBy(m => m.CreatedAt).ToListAsync();
            Assert.Equal(2, mails.Count);
            var more = mails.Single(m => m.Subject != "New report: Legacy Financial");
            Assert.Equal("More on a report: Legacy Financial", more.Subject);
            Assert.Contains("The member added to their report of a listing. Look at it within one business day.", more.TextBody);
            Assert.Contains("Reason: I had a bad experience", more.TextBody);
            Assert.Contains("What happened: They never called back.", more.TextBody);
            Assert.Contains($"https://admin.jubilee.test/reports/{report.Id}", more.TextBody);
        });
    }

    [Fact]
    public async Task L2_132_a_repeated_key_tells_the_team_once()
    {
        await Report(Joanna(), key: "report-key-1");
        await Report(Joanna(), key: "report-key-1");

        await factory.WithDb(async db => Assert.Equal(1, await db.OutboxMessages.AsNoTracking().CountAsync(m => m.ToAddress == Team)));
    }

    [Fact]
    public async Task L2_039_a_report_the_server_refuses_tells_nobody()
    {
        var response = await Report(Joanna(), description: " ");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        await factory.WithDb(async db => Assert.Empty(await db.OutboxMessages.AsNoTracking().ToListAsync()));
    }
}

// Acceptance Test
// Traces to: L2-105 AC1
// Description: with no team address configured nobody is e-mailed, and the report is still stored (ADR 0055).
public sealed class ReportNoticeWithoutTeamTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    public async Task InitializeAsync()
    {
        await factory.Reset();
        await factory.Arrange(ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial"));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_105_AC1_without_a_team_address_the_report_is_stored_and_nobody_is_e_mailed()
    {
        var response = await factory.CreateMemberClient("Joanna Adeyemi", "member|joanna")
            .PostAsJsonAsync("/api/listings/legacy-financial/reports", new { reason = "other", description = "Odd." });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await factory.WithDb(async db =>
        {
            Assert.Equal(1, await db.ListingReports.CountAsync());
            Assert.Empty(await db.OutboxMessages.AsNoTracking().ToListAsync());
        });
    }
}
