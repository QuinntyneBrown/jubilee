using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Editing and creating a record of the admin application (L2-283, ADR 0074): a field changes only
// through the binding of the feature that owns it, a table is created only through its own, and
// each change is audited (L2-284 AC5). Ada is an administrator; Miriam is on the Jubilee team.
public sealed class AdminEditTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;
    private Member _ruth = null!;
    private Listing _shop = null!;
    private Listing _paused = null!;
    private Feedback _rating = null!;

    public AdminEditTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _ruth = Member.Join(EmailAddress.TryParse("ruth.c@outlook.com")!, "Ruth", "Chen", null, "hash", ListingMother.Now.AddMonths(-2));
        _shop = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", ListingMother.Now.AddDays(-2));
        _paused = ListingMother.Public("quiet-kiln", "shops", "Quiet Kiln", ListingMother.Now.AddDays(-3));
        _paused.Pause(ListingMother.Now.AddDays(-1));
        _rating = Feedback.Rate(
            _ruth.Id.ToString(), "Ruth Chen", 4, "Finding a plumber was easy.", new AreaScores(null, null, null, null), true, "key-1",
            ListingMother.Now.AddDays(-1));
        await _factory.Arrange(_ruth, _shop, _paused, _rating);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Ada() => _factory.CreateStaffClient("Ada Nwosu", "staff|ada", "admin");

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static object Values(params (string Key, string? Value)[] values) =>
        new { values = values.ToDictionary(v => v.Key, v => v.Value) };

    private Task<HttpResponseMessage> Patch(HttpClient client, string path, object body) =>
        client.PatchAsJsonAsync($"/api/admin/tables/{path}", body);

    // L2-283 AC1: the catalog says which fields a role may change and which tables it may create in
    [Fact]
    public async Task L2_283_AC1_the_catalog_names_the_bound_fields_and_the_tables_that_create()
    {
        var catalog = await Json(await Miriam().GetAsync("/api/admin/tables"));
        var tables = catalog.GetProperty("groups").EnumerateArray().SelectMany(g => g.GetProperty("tables").EnumerateArray()).ToList();

        var feedback = tables.Single(t => t.GetProperty("key").GetString() == "feedback");
        Assert.True(feedback.GetProperty("canEdit").GetBoolean());
        var editable = feedback.GetProperty("fields").EnumerateArray()
            .Where(f => f.GetProperty("editable").GetBoolean()).Select(f => f.GetProperty("key").GetString()).ToList();
        Assert.Equal(["status", "reply"], editable);

        var slots = tables.Single(t => t.GetProperty("key").GetString() == "featured-slots");
        Assert.True(slots.GetProperty("canCreate").GetBoolean());
        var creatable = slots.GetProperty("fields").EnumerateArray()
            .Where(f => f.GetProperty("creatable").GetBoolean()).Select(f => f.GetProperty("key").GetString()).ToList();
        Assert.Equal(["listingId", "position", "startsOn"], creatable);

        var members = tables.Single(t => t.GetProperty("key").GetString() == "members");
        Assert.False(members.GetProperty("canEdit").GetBoolean());
        Assert.False(members.GetProperty("canCreate").GetBoolean());
    }

    // L2-283 AC2, AC5: a saved change applies through the owning feature, is audited and heads the history
    [Fact]
    public async Task L2_283_AC2_a_moderator_changes_the_status_and_reply_of_feedback()
    {
        var response = await Patch(Miriam(), $"feedback/{_rating.Id}", Values(("status", "in progress"), ("reply", "Thank you, Ruth.")));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var record = await Json(response);
        Assert.Equal("in progress", record.GetProperty("status").GetString());
        Assert.Equal("Thank you, Ruth.", record.GetProperty("values").GetProperty("reply").GetString());
        var history = record.GetProperty("history").EnumerateArray().Select(h => h.GetProperty("text").GetString()).ToList();
        Assert.Contains("Miriam Castillo changed status from new to in progress", history.Take(2));

        var audit = await _factory.Query(db => db.AuditRecords.SingleAsync(a => a.Action == "feedback.update"));
        Assert.Equal("staff|miriam", audit.Actor);
        Assert.Equal(_rating.Id.ToString(), audit.TargetId);
        Assert.Contains("\"status\":\"new\"", audit.Before);
        Assert.Contains("\"status\":\"in progress\"", audit.After);
        var saved = await _factory.Query(db => db.Feedback.SingleAsync(f => f.Id == _rating.Id));
        Assert.Equal(FeedbackStatus.InProgress, saved.Status);
    }

    // L2-283 AC2: a refusal says what is wrong, field by field, and nothing is saved
    [Fact]
    public async Task L2_283_AC2_a_refused_change_names_each_field_and_saves_nothing()
    {
        var response = await Patch(
            Miriam(), $"feedback/{_rating.Id}", Values(("status", "fixed"), ("reply", new string('a', Feedback.MaxAnswerLength + 1)), ("body", "Changed")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("TOO_LONG", errors.GetProperty("reply").GetString());
        Assert.Equal("NOT_EDITABLE", errors.GetProperty("body").GetString());
        var saved = await _factory.Query(db => db.Feedback.SingleAsync(f => f.Id == _rating.Id));
        Assert.Equal(FeedbackStatus.Received, saved.Status);
        Assert.False(await _factory.Query(db => db.AuditRecords.AnyAsync(a => a.Action == "feedback.update")));
    }

    // L2-283 AC2: feedback that was read cannot become new again
    [Fact]
    public async Task L2_283_AC2_feedback_does_not_go_back_to_new()
    {
        await Patch(Miriam(), $"feedback/{_rating.Id}", Values(("status", "read")));

        var response = await Patch(Miriam(), $"feedback/{_rating.Id}", Values(("status", "new")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("NOT_ALLOWED", (await Json(response)).GetProperty("errors").GetProperty("status").GetString());
    }

    // L2-284 AC1: a role changes only the tables it may change; System is read-only to everyone
    [Fact]
    public async Task L2_284_AC1_a_change_outside_the_role_is_refused()
    {
        var members = await Patch(Miriam(), $"members/{_ruth.Id}", Values(("name", "Ruth C")));
        var system = await Patch(Ada(), $"audit-records/{Guid.NewGuid()}", Values(("action", "x")));

        Assert.Equal(HttpStatusCode.Forbidden, members.StatusCode);
        Assert.Equal("FORBIDDEN", (await Json(members)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Conflict, system.StatusCode);
        Assert.Equal("READ_ONLY", (await Json(system)).GetProperty("code").GetString());
    }

    // L2-283 AC2: a record that does not exist is not found
    [Fact]
    public async Task L2_283_AC2_changing_a_missing_record_is_not_found()
    {
        var response = await Patch(Miriam(), $"feedback/{Guid.NewGuid()}", Values(("status", "read")));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // L2-283 AC4, AC5: a featured slot is created through the featured week's rules, and audited
    [Fact]
    public async Task L2_283_AC4_a_moderator_creates_a_featured_slot()
    {
        var response = await Miriam().PostAsJsonAsync(
            "/api/admin/tables/featured-slots", Values(("listingId", _shop.Id.ToString()), ("position", "1"), ("startsOn", "2026-11-16")));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var record = await Json(response);
        var id = record.GetProperty("id").GetString();
        Assert.Equal($"/api/admin/tables/featured-slots/{id}", response.Headers.Location?.ToString());
        Assert.Equal("Luzandre.com", record.GetProperty("values").GetProperty("listingId").GetProperty("name").GetString());
        Assert.Equal("2026-11-16", record.GetProperty("values").GetProperty("startsOn").GetString());
        var audit = await _factory.Query(db => db.AuditRecords.SingleAsync(a => a.Action == "featured-slots.create"));
        Assert.Equal(id, audit.TargetId);
        Assert.Equal("Miriam Castillo", audit.ActorName);
    }

    // L2-283 AC2, L2-106 AC1: a slot is refused for a listing that is not live, a past week or a sixth slot
    [Fact]
    public async Task L2_283_AC2_a_featured_slot_is_refused_as_the_featured_week_refuses_it()
    {
        var notLive = await Miriam().PostAsJsonAsync(
            "/api/admin/tables/featured-slots", Values(("listingId", _paused.Id.ToString()), ("position", "1"), ("startsOn", "2026-11-03")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, notLive.StatusCode);
        var errors = (await Json(notLive)).GetProperty("errors");
        Assert.Equal("NOT_LIVE", errors.GetProperty("listingId").GetString());
        Assert.Equal("START_IN_PAST", errors.GetProperty("startsOn").GetString());

        var week = new DateOnly(2026, 11, 16);
        await _factory.Arrange([.. Enumerable.Range(1, 5).Select(p => (object)FeaturedSlot.Create(_shop.Id, p, week))]);
        var sixth = await Miriam().PostAsJsonAsync(
            "/api/admin/tables/featured-slots", Values(("listingId", _shop.Id.ToString()), ("position", "6"), ("startsOn", "2026-11-16")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, sixth.StatusCode);
        Assert.Equal("WEEK_FULL", (await Json(sixth)).GetProperty("errors").GetProperty("startsOn").GetString());
        Assert.Equal(5, await _factory.Query(db => db.FeaturedSlots.CountAsync()));
    }

    // L2-284 AC1: a table with no creation binding cannot be created in
    [Fact]
    public async Task L2_284_AC1_a_table_without_a_creation_is_refused()
    {
        var response = await Ada().PostAsJsonAsync("/api/admin/tables/members", Values(("name", "New")));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // L2-280 AC4: a status set on the selected rows changes each through the binding, each audited
    [Fact]
    public async Task L2_280_AC4_setting_a_status_on_selected_rows_changes_and_audits_each()
    {
        var second = Feedback.Rate(
            _ruth.Id.ToString(), "Ruth Chen", 5, null, new AreaScores(null, null, null, null), false, "key-2", ListingMother.Now);
        await _factory.Arrange(second);

        var response = await Miriam().PostAsJsonAsync(
            "/api/admin/tables/feedback/status", new { ids = new[] { _rating.Id.ToString(), second.Id.ToString() }, status = "read" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await Json(response)).GetProperty("count").GetInt32());
        Assert.Equal(2, await _factory.Query(db => db.Feedback.CountAsync(f => f.Status == FeedbackStatus.Read)));
        Assert.Equal(2, await _factory.Query(db => db.AuditRecords.CountAsync(a => a.Action == "feedback.update")));
    }

    // L2-280 AC4: a status the rule refuses is refused for all, and none is changed
    [Fact]
    public async Task L2_280_AC4_a_refused_status_changes_no_row()
    {
        var read = Feedback.Rate(
            _ruth.Id.ToString(), "Ruth Chen", 5, null, new AreaScores(null, null, null, null), false, "key-3", ListingMother.Now);
        read.MarkRead();
        await _factory.Arrange(read);

        var response = await Miriam().PostAsJsonAsync(
            "/api/admin/tables/feedback/status", new { ids = new[] { _rating.Id.ToString(), read.Id.ToString() }, status = "new" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("NOT_ALLOWED", (await Json(response)).GetProperty("errors").GetProperty("status").GetString());
        Assert.False(await _factory.Query(db => db.AuditRecords.AnyAsync()));
    }

    // L2-284 AC1: a table whose status the role may not change refuses it
    [Fact]
    public async Task L2_284_AC1_setting_a_status_without_a_binding_is_refused()
    {
        var response = await Ada().PostAsJsonAsync(
            "/api/admin/tables/members/status", new { ids = new[] { _ruth.Id.ToString() }, status = "active" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
