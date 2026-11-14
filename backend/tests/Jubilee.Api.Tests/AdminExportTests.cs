using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Admin;
using Jubilee.Domain;
using Jubilee.Application.Accounts;
using Jubilee.Tests.Shared;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Exporting a table of the admin application (L2-279, ADR 0074): the file is built on the server from
// what the role reads, audited, needs a reason for private data, and a weekly e-mail links to it.
// Ada is an administrator; Miriam is on the Jubilee team.
public sealed class AdminExportTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;
    private Member _ruth = null!;
    private Feedback _rating = null!;
    private Feedback _bug = null!;

    public AdminExportTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _ruth = Member.Join(EmailAddress.TryParse("ruth.c@outlook.com")!, "Ruth", "Chen", null, "hash", ListingMother.Now.AddMonths(-2));
        _rating = Feedback.Rate(
            _ruth.Id.ToString(), "Ruth Chen", 4, "Finding a plumber was easy.", new AreaScores(null, null, null, null), true, "key-1",
            ListingMother.Now.AddDays(-1));
        _bug = Feedback.Rate(
            _ruth.Id.ToString(), "Ruth Chen", 2, "=HYPERLINK(\"http://evil\")", new AreaScores(null, null, null, null), true, "key-2",
            ListingMother.Now.AddDays(-2));
        await _factory.Arrange(_ruth, _rating, _bug);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Ada() => _factory.CreateStaffClient("Ada Nwosu", "staff|ada", "admin");

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static string[] Lines(string csv) => csv.Split("\r\n", StringSplitOptions.RemoveEmptyEntries);

    // L2-279 AC2: the CSV is built on the server with the table's fields as columns, and audited
    [Fact]
    public async Task L2_279_AC2_a_csv_of_every_record_downloads_and_is_audited()
    {
        var response = await Miriam().GetAsync("/api/admin/tables/feedback/export?format=csv");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("feedback-2026-11-10.csv", response.Content.Headers.ContentDisposition?.FileNameStar);
        var lines = Lines(await response.Content.ReadAsStringAsync());
        Assert.Equal(3, lines.Length);
        Assert.StartsWith("ID,Kind,Member,Rating,Status,Note,Sent", lines[0]);
        Assert.Contains(lines, l => l.Contains("Finding a plumber was easy.") && l.StartsWith(_rating.Id.ToString()));

        var audit = await _factory.Query(db => db.AuditRecords.SingleAsync(a => a.Action == "feedback.export"));
        Assert.Equal("staff|miriam", audit.Actor);
        Assert.Contains("\"format\":\"csv\"", audit.After);
        Assert.Contains("\"rows\":\"2\"", audit.After);
    }

    // L2-279 AC1, AC2: the matching rows, or the selected ones, are exported alone
    [Fact]
    public async Task L2_279_AC2_a_csv_of_the_matching_or_selected_rows_holds_only_them()
    {
        var matching = Lines(await (await Miriam().GetAsync("/api/admin/tables/feedback/export?format=csv&q=plumber")).Content.ReadAsStringAsync());
        Assert.Equal(2, matching.Length);
        Assert.StartsWith(_rating.Id.ToString(), matching[1]);

        var selected = Lines(await (await Miriam().GetAsync($"/api/admin/tables/feedback/export?format=csv&ids={_bug.Id}")).Content.ReadAsStringAsync());
        Assert.Equal(2, selected.Length);
        Assert.StartsWith(_bug.Id.ToString(), selected[1]);
    }

    // L2-279 AC2: a cell a spreadsheet would run as a formula is written as text
    [Fact]
    public async Task L2_279_AC2_a_csv_cell_never_runs_as_a_formula()
    {
        var csv = await (await Miriam().GetAsync($"/api/admin/tables/feedback/export?format=csv&ids={_bug.Id}")).Content.ReadAsStringAsync();

        Assert.Contains("\"'=HYPERLINK(\"\"http://evil\"\")\"", csv);
    }

    // L2-279 AC2: the JSON has every field of every record
    [Fact]
    public async Task L2_279_AC2_a_json_export_has_every_field()
    {
        var response = await Ada().GetAsync("/api/admin/tables/feedback/export?format=json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("feedback-2026-11-10.json", response.Content.Headers.ContentDisposition?.FileNameStar);
        var rows = (await Json(response)).EnumerateArray().ToList();
        Assert.Equal(2, rows.Count);
        var rating = rows.Single(r => r.GetProperty("id").GetString() == _rating.Id.ToString());
        Assert.Equal("Finding a plumber was easy.", rating.GetProperty("body").GetString());
        Assert.Equal("new", rating.GetProperty("status").GetString());
    }

    // L2-279 AC4: private data is exported only with a reason, which is audited
    [Fact]
    public async Task L2_279_AC4_a_private_table_needs_a_reason()
    {
        var refused = await Ada().GetAsync("/api/admin/tables/consent-records/export?format=csv");
        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
        Assert.Equal("REASON_REQUIRED", (await Json(refused)).GetProperty("code").GetString());

        var response = await Ada().GetAsync("/api/admin/tables/consent-records/export?format=csv&reason=Privacy%20request%20from%20Ruth");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var audit = await _factory.Query(db => db.AuditRecords.SingleAsync(a => a.Action == "consent-records.export"));
        Assert.Contains("Privacy request from Ruth", audit.After);
    }

    // L2-284 AC1: a table the role may not read is not exported
    [Fact]
    public async Task L2_284_AC1_a_table_outside_the_role_is_not_exported()
    {
        var response = await Miriam().GetAsync("/api/admin/tables/staff/export?format=csv");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.False(await _factory.Query(db => db.AuditRecords.AnyAsync()));
    }

    // L2-279 AC1, AC3: "Email me this weekly" turns on, the catalog says so, and "Stop the weekly email" turns it off
    [Fact]
    public async Task L2_279_AC3_the_weekly_email_turns_on_and_off()
    {
        async Task<bool> Weekly() => (await Json(await Miriam().GetAsync("/api/admin/tables"))).GetProperty("groups").EnumerateArray()
            .SelectMany(g => g.GetProperty("tables").EnumerateArray())
            .Single(t => t.GetProperty("key").GetString() == "feedback").GetProperty("weeklyExport").GetBoolean();

        Assert.False(await Weekly());
        Assert.Equal(HttpStatusCode.NoContent, (await Miriam().PutAsync("/api/admin/tables/feedback/weekly-export", null)).StatusCode);
        Assert.True(await Weekly());
        Assert.Equal(HttpStatusCode.NoContent, (await Miriam().DeleteAsync("/api/admin/tables/feedback/weekly-export")).StatusCode);
        Assert.False(await Weekly());

        Assert.Equal(HttpStatusCode.Forbidden, (await Miriam().PutAsync("/api/admin/tables/staff/weekly-export", null)).StatusCode);
    }

    // L2-279 AC3: on Monday from 08:00 in Toronto the staff member is e-mailed a link to the CSV, never the file, once
    // a week, and only while their role reads the table
    [Fact]
    public async Task L2_279_AC3_the_weekly_email_links_to_the_csv_while_the_role_reads_the_table()
    {
        var ada = StaffMember.Create(EmailAddress.TryParse("ada@jubilee.to")!, ListingMother.Now);
        ada.Grant(StaffRoles.Admin);
        var miriam = StaffMember.Create(EmailAddress.TryParse("miriam@jubilee.to")!, ListingMother.Now);
        miriam.Grant(StaffRoles.Moderator);
        await _factory.Arrange(
            ada, miriam,
            AdminExportSubscription.Start($"staff|{ada.Id}", ada.Id, "members", ListingMother.Now),
            AdminExportSubscription.Start($"staff|{miriam.Id}", miriam.Id, "staff", ListingMother.Now));

        // Monday 16 November 2026, 07:59 in Toronto (UTC-5): not yet.
        GoTo(new DateTimeOffset(2026, 11, 16, 12, 59, 0, TimeSpan.Zero));
        Assert.Null(await WeeklyTick());

        GoTo(new DateTimeOffset(2026, 11, 16, 13, 5, 0, TimeSpan.Zero));
        Assert.Equal(1, await WeeklyTick());
        var sent = Assert.Single(_factory.Emails.Sent, e => e.Subject == "Your weekly export of Members");
        Assert.Equal("ada@jubilee.to", sent.To);
        Assert.Contains("https://admin.jubilee.test/members?export=csv", sent.Body);
        Assert.DoesNotContain("ruth.c@outlook.com", sent.Body);

        GoTo(new DateTimeOffset(2026, 11, 16, 14, 0, 0, TimeSpan.Zero));
        Assert.Null(await WeeklyTick());
        Assert.Single(_factory.Emails.Sent, e => e.Subject == "Your weekly export of Members");
        Assert.DoesNotContain(_factory.Emails.Sent, e => e.To == "miriam@jubilee.to");
    }

    /// <summary>One instance of the worker reaches the weekly job's tick, then the outbox is sent.</summary>
    private async Task<int?> WeeklyTick()
    {
        int? queued;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            queued = await scope.ServiceProvider.GetRequiredService<ISender>().Send(new SendWeeklyExportsCommand());
        }

        using var dispatch = _factory.Services.CreateScope();
        await dispatch.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
        return queued;
    }

    private void GoTo(DateTimeOffset instant) => _factory.Clock.Advance(instant - _factory.Clock.GetUtcNow());
}
