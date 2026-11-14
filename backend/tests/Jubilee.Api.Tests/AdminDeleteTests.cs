using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Deleting records in the admin application (L2-281, ADR 0074): only a table that declares it, kept
// apart for 30 days and out of every screen, audited, and brought back by "Undo". Ada is an
// administrator; Miriam is on the Jubilee team.
public sealed class AdminDeleteTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;
    private Member _ruth = null!;
    private Feedback _rating = null!;
    private Feedback _bug = null!;
    private FeedbackScreenshot _screenshot = null!;

    public AdminDeleteTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _ruth = Member.Join(EmailAddress.TryParse("ruth.c@outlook.com")!, "Ruth", "Chen", null, "hash", ListingMother.Now.AddMonths(-2));
        _rating = Feedback.Rate(
            _ruth.Id.ToString(), "Ruth Chen", 4, "Finding a plumber was easy.", new AreaScores(null, null, null, null), true, "key-1",
            ListingMother.Now.AddDays(-1));
        _bug = Feedback.Rate(
            _ruth.Id.ToString(), "Ruth Chen", 2, "The map would not load.", new AreaScores(null, null, null, null), true, "key-2",
            ListingMother.Now.AddDays(-2));
        _screenshot = FeedbackScreenshot.Store(_ruth.Id.ToString(), "image/png", [1, 2, 3], ListingMother.Now.AddDays(-2));
        _screenshot.AttachTo(_rating.Id);
        await _factory.Arrange(_ruth, _rating, _bug, _screenshot);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Ada() => _factory.CreateStaffClient("Ada Nwosu", "staff|ada", "admin");

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Task<HttpResponseMessage> Post(HttpClient client, string path, params Guid[] ids) =>
        client.PostAsJsonAsync($"/api/admin/tables/{path}", new { ids = ids.Select(i => i.ToString()).ToArray() });

    // L2-281 AC3, AC5: deleted records leave the table and the record, each audited with its values
    [Fact]
    public async Task L2_281_AC3_deleted_records_leave_the_table_and_are_audited()
    {
        var response = await Post(Miriam(), "feedback/delete", _rating.Id, _bug.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await Json(response)).GetProperty("count").GetInt32());
        var rows = await Json(await Miriam().GetAsync("/api/admin/tables/feedback"));
        Assert.Equal(0, rows.GetProperty("total").GetInt32());
        Assert.Equal(HttpStatusCode.NotFound, (await Miriam().GetAsync($"/api/admin/tables/feedback/{_rating.Id}")).StatusCode);

        var audits = await _factory.Query(db => db.AuditRecords.Where(a => a.Action == "feedback.delete").ToListAsync());
        Assert.Equal(2, audits.Count);
        var rating = audits.Single(a => a.TargetId == _rating.Id.ToString());
        Assert.Equal("staff|miriam", rating.Actor);
        Assert.Contains("Finding a plumber was easy.", rating.Before);
    }

    // L2-281 AC4: until it is erased a deleted record is kept apart, out of the app's own reads
    [Fact]
    public async Task L2_281_AC4_a_deleted_record_is_kept_apart_and_out_of_every_query()
    {
        await Post(Ada(), "feedback/delete", _rating.Id);

        Assert.False(await _factory.Query(db => db.Feedback.AnyAsync(f => f.Id == _rating.Id)));
        var kept = await _factory.Query(db => db.Feedback.IgnoreQueryFilters().SingleAsync(f => f.Id == _rating.Id));
        Assert.NotNull(kept.AdminDeletedAt);
    }

    // L2-281 AC4: a reference to a deleted record reads "deleted"
    [Fact]
    public async Task L2_281_AC4_a_reference_to_a_deleted_record_reads_deleted()
    {
        await Post(Ada(), "feedback/delete", _rating.Id);

        var record = await Json(await Ada().GetAsync($"/api/admin/tables/feedback-screenshots/{_screenshot.Id}"));
        var reference = record.GetProperty("values").GetProperty("feedbackId");
        Assert.True(reference.GetProperty("deleted").GetBoolean());
    }

    // L2-281 AC3: "Undo" restores the records as they were, audited
    [Fact]
    public async Task L2_281_AC3_undo_restores_the_records_as_they_were()
    {
        await Post(Miriam(), "feedback/delete", _rating.Id, _bug.Id);

        var response = await Post(Miriam(), "feedback/restore", _rating.Id, _bug.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await Json(response)).GetProperty("count").GetInt32());
        var record = await Json(await Miriam().GetAsync($"/api/admin/tables/feedback/{_rating.Id}"));
        Assert.Equal("Finding a plumber was easy.", record.GetProperty("values").GetProperty("body").GetString());
        Assert.Equal(2, await _factory.Query(db => db.AuditRecords.CountAsync(a => a.Action == "feedback.restore")));
        Assert.Equal(2, await _factory.Query(db => db.Feedback.CountAsync()));
    }

    // L2-281 AC5: a table that does not declare deletion offers no "Delete" and refuses it
    [Fact]
    public async Task L2_281_AC5_a_table_the_law_keeps_or_that_does_not_declare_deletion_refuses_it()
    {
        var catalog = await Json(await Ada().GetAsync("/api/admin/tables"));
        var tables = catalog.GetProperty("groups").EnumerateArray().SelectMany(g => g.GetProperty("tables").EnumerateArray()).ToList();
        bool CanDelete(string key) => tables.Single(t => t.GetProperty("key").GetString() == key).GetProperty("canDelete").GetBoolean();
        Assert.True(CanDelete("feedback"));
        Assert.False(CanDelete("members"));
        Assert.False(CanDelete("consent-records"));
        Assert.False(CanDelete("audit-records"));

        var members = await Post(Ada(), "members/delete", _ruth.Id);
        Assert.Equal(HttpStatusCode.Forbidden, members.StatusCode);
        var staff = await Post(Ada(), "staff/delete", Guid.NewGuid());
        Assert.Equal(HttpStatusCode.Conflict, staff.StatusCode);
        Assert.True(await _factory.Query(db => db.Members.AnyAsync(m => m.Id == _ruth.Id)));
        Assert.False(await _factory.Query(db => db.AuditRecords.AnyAsync()));
    }

    // L2-284 AC1: a role deletes only in the tables it may change
    [Fact]
    public async Task L2_284_AC1_a_deletion_outside_the_role_is_refused()
    {
        var subscriber = LaunchSubscriber.SignUp(EmailAddress.TryParse("eve@example.com")!, "Eve", ListingMother.Now);
        await _factory.Arrange(subscriber);

        var response = await Post(Miriam(), "launch-subscribers/delete", subscriber.Id);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.True(await _factory.Query(db => db.LaunchSubscribers.AnyAsync()));
    }
}
