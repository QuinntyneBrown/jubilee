using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

// The overview of the admin application (L2-274, L2-275, ADR 0075): what is waiting on staff, read at the moment it
// opens, with System and Recent changes beside it. The clock reads Tuesday 10 November 2026, 10:00 in Toronto.
public sealed class AdminOverviewTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private static readonly DateTimeOffset Now = ListingMother.Now;

    private readonly JubileeApiFactory _factory;

    public AdminOverviewTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync() => await _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    private async Task<JsonElement> Overview()
    {
        var response = await Miriam().GetAsync("/api/admin/overview");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
    }

    private static JsonElement Line(JsonElement overview, string table) =>
        overview.GetProperty("sections").EnumerateArray()
            .SelectMany(s => s.GetProperty("lines").EnumerateArray())
            .Single(l => l.GetProperty("table").GetString() == table);

    // L2-274 AC2, AC3: Safety and Waiting on us, each line with its count, its oldest record and whether it is urgent
    [Fact]
    public async Task L2_274_AC2_the_work_queue_counts_what_waits_with_the_oldest_record_next()
    {
        var shop = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", Now.AddDays(-30));
        var guest = ListingMother.Public("guest-suite", "home-property", "Guest suite near Roncesvalles", Now.AddDays(-30));
        var newer = ListingReport.Open(shop.Id, "member|ruth", "Ruth Chen", Now.AddDays(-1));
        var oldest = ListingReport.Open(guest.Id, "member|naomi", "Naomi Laurent", Now.AddDays(-3));
        var done = ListingReport.Open(shop.Id, "member|daniel", "Daniel Mensah", Now.AddDays(-5));
        done.Resolve("Nothing wrong.", Now.AddDays(-4));
        var conversation = Conversation.Start(shop.Id, "member|naomi", "Naomi Laurent", Now.AddDays(-4));
        var inReview = ConversationReport.File(conversation.Id, "member|naomi", "Asked to pay off Jubilee", Now.AddDays(-2));
        inReview.StartReview();
        var alert = SecurityAlert.Raise(SecurityAlert.PasswordResetBurst, 140, Now.AddHours(-3));
        var stale = SecurityAlert.Raise(SecurityAlert.PasswordResetBurst, 120, Now.AddDays(-2));
        var member = Member.Join(EmailAddress.TryParse("hannah@example.com")!, "Hannah", "Bergstrom", null, "hash", Now.AddDays(-60));
        var export = DataExport.Request(member.Id, Now.AddDays(-10));
        var feedback = Feedback.Rate(
            member.Id.ToString(), "Hannah Bergstrom", 2, "Upload spinner never stops.", new AreaScores(null, null, null, null), true, "k-1",
            Now.AddDays(-1));
        await _factory.Arrange(shop, guest, newer, oldest, done, conversation, inReview, alert, stale, member, export, feedback);

        var overview = await Overview();

        var sections = overview.GetProperty("sections").EnumerateArray().ToList();
        Assert.Equal(["Safety", "Waiting on us"], sections.Select(s => s.GetProperty("title").GetString()));
        Assert.Equal("Answer within 24 hours", sections[0].GetProperty("note").GetString());
        Assert.Equal("Members are waiting for a decision", sections[1].GetProperty("note").GetString());
        Assert.Equal(
            ["security-alerts", "listing-reports", "conversation-reports"],
            sections[0].GetProperty("lines").EnumerateArray().Select(l => l.GetProperty("table").GetString()));
        Assert.Equal(
            ["data-exports", "feedback"],
            sections[1].GetProperty("lines").EnumerateArray().Select(l => l.GetProperty("table").GetString()));

        var reports = Line(overview, "listing-reports");
        Assert.Equal("Listing reports", reports.GetProperty("label").GetString());
        Assert.Equal(2, reports.GetProperty("count").GetInt32());
        Assert.True(reports.GetProperty("urgent").GetBoolean());
        Assert.Equal(oldest.Id.ToString(), reports.GetProperty("nextId").GetString());
        Assert.Equal(Now.AddDays(-3), reports.GetProperty("oldestAt").GetDateTimeOffset());
        Assert.Equal("Guest suite near Roncesvalles", reports.GetProperty("next").GetString());

        var alerts = Line(overview, "security-alerts");
        Assert.Equal(1, alerts.GetProperty("count").GetInt32());
        Assert.True(alerts.GetProperty("urgent").GetBoolean());
        Assert.Equal(alert.Id.ToString(), alerts.GetProperty("nextId").GetString());
        Assert.Equal(SecurityAlert.PasswordResetBurst, alerts.GetProperty("next").GetString());
        Assert.Equal("Asked to pay off Jubilee", Line(overview, "conversation-reports").GetProperty("next").GetString());
        Assert.Equal("Hannah Bergstrom", Line(overview, "data-exports").GetProperty("next").GetString());
        Assert.Equal("“Upload spinner never stops.”", Line(overview, "feedback").GetProperty("next").GetString());

        Assert.False(Line(overview, "conversation-reports").GetProperty("urgent").GetBoolean());
        Assert.Equal("Data exports not delivered", Line(overview, "data-exports").GetProperty("label").GetString());
        Assert.Equal("New feedback", Line(overview, "feedback").GetProperty("label").GetString());
        Assert.Equal(6, overview.GetProperty("waiting").GetInt32());
    }

    // L2-274 AC1: "Since yesterday" counts the members, published listings, merch orders and requests of the last day
    [Fact]
    public async Task L2_274_AC1_since_yesterday_counts_the_last_day()
    {
        var joined = Member.Join(EmailAddress.TryParse("ruth@example.com")!, "Ruth", "Chen", null, "hash", Now.AddHours(-5));
        var earlier = Member.Join(EmailAddress.TryParse("naomi@example.com")!, "Naomi", "Laurent", null, "hash", Now.AddDays(-3));
        var published = ListingMother.Public("fresh", "shops", "Fresh", Now.AddHours(-2));
        var older = ListingMother.Public("older", "shops", "Older", Now.AddDays(-4));
        await _factory.Arrange(joined, earlier, published, older);

        var since = (await Overview()).GetProperty("since");

        Assert.Equal(1, since.GetProperty("members").GetInt32());
        Assert.Equal(1, since.GetProperty("listings").GetInt32());
        Assert.Equal(0, since.GetProperty("orders").GetInt32());
        Assert.Equal(0, since.GetProperty("requests").GetInt32());
    }

    // L2-274 AC5: with nothing waiting, no line is shown and nothing is counted
    [Fact]
    public async Task L2_274_AC5_nothing_waiting_shows_no_line()
    {
        var overview = await Overview();

        Assert.Equal(0, overview.GetProperty("waiting").GetInt32());
        Assert.All(overview.GetProperty("sections").EnumerateArray(), s => Assert.Empty(s.GetProperty("lines").EnumerateArray()));
    }

    // L2-275 AC1, AC2, AC3: a job run that failed today, outbox messages retrying or given up, and maintenance under way
    [Fact]
    public async Task L2_275_AC1_system_lists_failed_jobs_troubled_mail_and_maintenance()
    {
        var failed = JobRun.Claim("exports.build", Now.AddHours(-8), Now.AddHours(-8));
        var lastWeek = JobRun.Claim("exports.build", Now.AddDays(-7), Now.AddDays(-7));
        var fine = JobRun.Claim("search.index", Now.AddHours(-2), Now.AddHours(-2));
        fine.Succeed(Now.AddHours(-2));
        var retrying = OutboxMessage.Email(null, "ruth@example.com", "Your account was suspended", "…", Now.AddHours(-3));
        retrying.MarkAttemptFailed(Now.AddHours(-2));
        retrying.MarkAttemptFailed(Now.AddHours(-1));
        var gaveUp = OutboxMessage.Email(null, "naomi@example.com", "Your refund", "…", Now.AddDays(-2));
        gaveUp.MarkAttemptFailed(Now.AddHours(-1));
        var sent = OutboxMessage.Email(null, "daniel@example.com", "Welcome", "…", Now.AddHours(-1));
        sent.MarkSent(Now.AddHours(-1));
        var maintenance = MaintenanceWindow.Open(Now.AddMinutes(-30), Now.AddHours(1));
        await _factory.Arrange(failed, lastWeek, fine, retrying, gaveUp, sent, maintenance);

        var system = (await Overview()).GetProperty("system").EnumerateArray().ToList();

        Assert.Equal(["failed", "retrying", "gave-up", "maintenance"], system.Select(s => s.GetProperty("kind").GetString()));
        Assert.Equal("exports.build", system[0].GetProperty("subject").GetString());
        Assert.Equal("job-runs", system[0].GetProperty("table").GetString());
        Assert.Equal(Now.AddHours(-8), system[0].GetProperty("at").GetDateTimeOffset());
        Assert.Equal("Your account was suspended", system[1].GetProperty("subject").GetString());
        Assert.Equal(2, system[1].GetProperty("attempts").GetInt32());
        Assert.Equal("outbox-messages", system[1].GetProperty("table").GetString());
        Assert.Equal("Your refund", system[2].GetProperty("subject").GetString());
        Assert.Equal("maintenance-windows", system[3].GetProperty("table").GetString());
        Assert.Equal(Now.AddHours(1), system[3].GetProperty("until").GetDateTimeOffset());
    }

    // L2-275 AC4: Recent changes are the four newest audit records, by first name, what was done and the record
    [Fact]
    public async Task L2_275_AC4_recent_changes_are_the_four_newest_audit_records()
    {
        var records = Enumerable.Range(1, 5)
            .Select(i => AuditRecord.Make("staff|ada", "Ada Nwosu", "feedback.update", "feedback", $"fb_{i}", null, "{}", null, Now.AddMinutes(-i)))
            .Append(AuditRecord.Make("staff|miriam", "Miriam Castillo", "messages.read", "messages", "msg_9", null, null, "rpt_1", Now))
            .ToArray<object>();
        await _factory.Arrange(records);

        var changes = (await Overview()).GetProperty("changes").EnumerateArray().ToList();

        Assert.Equal(4, changes.Count);
        Assert.Equal("Miriam", changes[0].GetProperty("actor").GetString());
        Assert.Equal("read message", changes[0].GetProperty("what").GetString());
        Assert.Equal("msg_9", changes[0].GetProperty("recordId").GetString());
        Assert.Equal("messages", changes[0].GetProperty("table").GetString());
        Assert.Equal("Ada", changes[1].GetProperty("actor").GetString());
        Assert.Equal("updated feedback", changes[1].GetProperty("what").GetString());
        Assert.Equal("fb_1", changes[1].GetProperty("recordId").GetString());
        Assert.Equal(Now, changes[0].GetProperty("at").GetDateTimeOffset());
    }
}
