using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Private records and a staff member's own listing in the admin application (L2-284 AC3, AC4): a message opens
// only while its conversation has an open report, and the read is audited with the report as its reason; nobody
// changes their own listing or acts on its reports. Miriam is on the Jubilee team and owns Grace & Co.
public sealed class AdminPrivacyTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string MiriamSubject = "staff|miriam";

    private readonly JubileeApiFactory _factory;
    private Listing _shop = null!;
    private Listing _mine = null!;
    private Message _reported = null!;
    private Message _quiet = null!;
    private MessageAttachment _photo = null!;
    private ConversationReport _report = null!;
    private ListingReport _mineReported = null!;

    public AdminPrivacyTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var now = ListingMother.Now;
        _shop = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", now.AddDays(-20));
        _shop.AssignOwner("member|ruth");
        _mine = ListingMother.Public("grace-and-co", "shops", "Grace & Co", now.AddDays(-20));
        _mine.AssignOwner(MiriamSubject);

        var reported = Conversation.Start(_shop.Id, "member|naomi", "Naomi Laurent", now.AddDays(-3));
        var quiet = Conversation.Start(_shop.Id, "member|daniel", "Daniel Mensah", now.AddDays(-3));
        _photo = MessageAttachment.Store(reported.Id, "member|naomi", "image/jpeg", "attachments/naomi.jpg", now.AddDays(-2));
        _reported = Message.Send(reported.Id, "member|naomi", "Naomi Laurent", false, "Send the money to my own account.", "k-1", null, false, now.AddDays(-2));
        _quiet = Message.Send(quiet.Id, "member|daniel", "Daniel Mensah", false, "Do you open on Saturdays?", "k-2", null, false, now.AddDays(-2));
        _report = ConversationReport.File(reported.Id, "member|ruth", "Asked to be paid off Jubilee", now.AddDays(-1));
        _mineReported = ListingReport.Open(_mine.Id, "member|naomi", "Naomi Laurent", now.AddDays(-1));
        await _factory.Arrange(_shop, _mine, reported, quiet, _photo, _reported, _quiet, _report, _mineReported);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", MiriamSubject, "moderator");

    private HttpClient Ada() => _factory.CreateStaffClient("Ada Nwosu", "staff|ada", "admin");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    // L2-284 AC3: a message of a reported conversation opens, says its read was written, and the read is audited
    [Fact]
    public async Task L2_284_AC3_a_message_of_a_reported_conversation_opens_and_its_read_is_audited()
    {
        var response = await Miriam().GetAsync($"/api/admin/tables/messages/{_reported.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var record = await Json(response);
        Assert.True(record.GetProperty("readAudited").GetBoolean());
        Assert.Equal("Send the money to my own account.", record.GetProperty("values").GetProperty("body").GetString());
        var audit = await _factory.Query(db => db.AuditRecords.SingleAsync(a => a.Action == "messages.read"));
        Assert.Equal(MiriamSubject, audit.Actor);
        Assert.Equal("Miriam Castillo", audit.ActorName);
        Assert.Equal(_reported.Id.ToString(), audit.TargetId);
        Assert.Equal(_report.Id.ToString(), audit.Reason);
    }

    // L2-284 AC3: a message attachment opens the same way, and its read is audited as a message's
    [Fact]
    public async Task L2_284_AC3_an_attachment_of_a_reported_conversation_opens_and_its_read_is_audited()
    {
        var response = await Ada().GetAsync($"/api/admin/tables/message-attachments/{_photo.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await Json(response)).GetProperty("readAudited").GetBoolean());
        var audit = await _factory.Query(db => db.AuditRecords.SingleAsync(a => a.Action == "messages.read"));
        Assert.Equal(_photo.Id.ToString(), audit.TargetId);
        Assert.Equal(_report.Id.ToString(), audit.Reason);
    }

    // L2-284 AC3: without an open report the message does not open, and nothing is audited
    [Fact]
    public async Task L2_284_AC3_a_message_without_an_open_report_does_not_open()
    {
        var quiet = await Miriam().GetAsync($"/api/admin/tables/messages/{_quiet.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, quiet.StatusCode);
        Assert.Equal("PRIVATE", (await Json(quiet)).GetProperty("code").GetString());

        await _factory.WithDb(async db =>
        {
            (await db.ConversationReports.SingleAsync(r => r.Id == _report.Id)).Resolve("Warned the member.", ListingMother.Now);
            await db.SaveChangesAsync();
        });
        var resolved = await Miriam().GetAsync($"/api/admin/tables/messages/{_reported.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, resolved.StatusCode);
        Assert.False(await _factory.Query(db => db.AuditRecords.AnyAsync(a => a.Action == "messages.read")));
    }

    // L2-284 AC3: a record of any other table is not marked as a private read
    [Fact]
    public async Task L2_284_AC3_another_record_is_not_a_private_read()
    {
        var record = await Json(await Miriam().GetAsync($"/api/admin/tables/listings/{_shop.Id}"));

        Assert.False(record.GetProperty("readAudited").GetBoolean());
    }

    // L2-284 AC4: a staff member's own listing, and a report of it, are marked as theirs
    [Fact]
    public async Task L2_284_AC4_a_staff_members_own_listing_and_its_reports_are_marked_theirs()
    {
        var mine = await Json(await Miriam().GetAsync($"/api/admin/tables/listings/{_mine.Id}"));
        var report = await Json(await Miriam().GetAsync($"/api/admin/tables/listing-reports/{_mineReported.Id}"));
        var other = await Json(await Miriam().GetAsync($"/api/admin/tables/listings/{_shop.Id}"));
        var forAda = await Json(await Ada().GetAsync($"/api/admin/tables/listings/{_mine.Id}"));

        Assert.True(mine.GetProperty("ownListing").GetBoolean());
        Assert.True(report.GetProperty("ownListing").GetBoolean());
        Assert.False(other.GetProperty("ownListing").GetBoolean());
        Assert.False(forAda.GetProperty("ownListing").GetBoolean());
    }

    // L2-284 AC4: nobody changes their own listing or sets the status of its reports
    [Fact]
    public async Task L2_284_AC4_a_staff_member_cannot_change_their_own_listing_or_its_reports()
    {
        var edit = await Miriam().PatchAsJsonAsync(
            $"/api/admin/tables/listings/{_mine.Id}", new { values = new Dictionary<string, string?> { ["name"] = "Grace and Co" } });
        var status = await Miriam().PostAsJsonAsync(
            "/api/admin/tables/listing-reports/status", new { ids = new[] { _mineReported.Id.ToString() }, status = "resolved" });

        Assert.Equal(HttpStatusCode.Forbidden, edit.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(edit)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Forbidden, status.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(status)).GetProperty("code").GetString());
        Assert.Equal("Grace & Co", await _factory.Query(db => db.Listings.Where(l => l.Id == _mine.Id).Select(l => l.Name).SingleAsync()));
    }
}
