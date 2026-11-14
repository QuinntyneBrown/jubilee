using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

// One record of any table in the admin application (L2-282, ADR 0074): its name, status and fields,
// the records that point at it, and its history. Ada is an administrator; Miriam is on the Jubilee team.
public sealed class AdminRecordTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;
    private Member _ruth = null!;
    private Member _naomi = null!;
    private Listing _shop = null!;

    public AdminRecordTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _ruth = Member.Join(EmailAddress.TryParse("ruth.c@outlook.com")!, "Ruth", "Chen", null, "hash", ListingMother.Now.AddMonths(-2));
        _naomi = Member.Join(EmailAddress.TryParse("naomi@example.com")!, "Naomi", "Laurent", null, "hash", ListingMother.Now.AddMonths(-5));
        _shop = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", ListingMother.Now.AddDays(-2));
        _shop.AssignOwner(_ruth.Id.ToString());
        await _factory.Arrange(_ruth, _naomi, _shop);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Ada() => _factory.CreateStaffClient("Ada Nwosu", "staff|ada", "admin");

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    // L2-282 AC1, AC2, AC3: the record's name, status and every field by its type
    [Fact]
    public async Task L2_282_AC1_a_record_shows_its_name_status_and_fields()
    {
        var response = await Ada().GetAsync($"/api/admin/tables/members/{_ruth.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var record = await Json(response);
        Assert.Equal("members", record.GetProperty("table").GetString());
        Assert.Equal(_ruth.Id.ToString(), record.GetProperty("id").GetString());
        Assert.Equal("Ruth Chen", record.GetProperty("name").GetString());
        Assert.Equal("unconfirmed", record.GetProperty("status").GetString());
        var values = record.GetProperty("values");
        Assert.Equal("ruth.c@outlook.com", values.GetProperty("email").GetString());
        Assert.True(values.TryGetProperty("createdAt", out _));
    }

    // L2-282 AC3: a reference on a record is named
    [Fact]
    public async Task L2_282_AC3_a_reference_on_a_record_is_named()
    {
        var record = await Json(await Miriam().GetAsync($"/api/admin/tables/listings/{_shop.Id}"));

        var owner = record.GetProperty("values").GetProperty("ownerId");
        Assert.Equal("Ruth Chen", owner.GetProperty("name").GetString());
        Assert.Equal("live", record.GetProperty("status").GetString());
    }

    // L2-282 AC4: the tables whose records reference this one, by field, with their count
    [Fact]
    public async Task L2_282_AC4_points_here_lists_the_tables_that_reference_the_record()
    {
        var ruth = await Json(await Ada().GetAsync($"/api/admin/tables/members/{_ruth.Id}"));
        var naomi = await Json(await Ada().GetAsync($"/api/admin/tables/members/{_naomi.Id}"));

        var listings = ruth.GetProperty("pointsHere").EnumerateArray().Single(p => p.GetProperty("table").GetString() == "listings");
        Assert.Equal("Listings", listings.GetProperty("label").GetString());
        Assert.Equal("Owner", listings.GetProperty("field").GetString());
        Assert.Equal(1, listings.GetProperty("count").GetInt32());
        Assert.Empty(naomi.GetProperty("pointsHere").EnumerateArray());
    }

    // L2-282 AC5: the history, newest first: audited actions with the staff member, and the creation
    [Fact]
    public async Task L2_282_AC5_the_history_lists_audited_actions_and_the_creation_newest_first()
    {
        await _factory.Arrange(AuditRecord.Make(
            "staff|miriam", "Miriam Castillo", "listing.held", "listing", _shop.Id.ToString(),
            "live", "on hold", "Checking the address", ListingMother.Now.AddHours(-1)));

        var history = (await Json(await Ada().GetAsync($"/api/admin/tables/listings/{_shop.Id}")))
            .GetProperty("history").EnumerateArray().ToList();

        Assert.Equal(2, history.Count);
        Assert.Equal("Miriam Castillo put it on hold", history[0].GetProperty("text").GetString());
        Assert.Equal("Jubilee created this listing", history[1].GetProperty("text").GetString());
        Assert.True(history[0].GetProperty("at").GetDateTimeOffset() > history[1].GetProperty("at").GetDateTimeOffset());
    }

    // L2-282 AC5: a field change reads "{staff member} changed {field} from {old} to {new}"
    [Fact]
    public async Task L2_282_AC5_a_field_change_says_what_changed()
    {
        await _factory.Arrange(AuditRecord.Make(
            "staff|ada", "Ada Nwosu", "members.update", "members", _ruth.Id.ToString(),
            "{\"phone\":null}", "{\"phone\":\"416-555-0144\"}", null, ListingMother.Now));

        var history = (await Json(await Ada().GetAsync($"/api/admin/tables/members/{_ruth.Id}")))
            .GetProperty("history").EnumerateArray().ToList();

        Assert.Equal("Ada Nwosu changed phone from — to 416-555-0144", history[0].GetProperty("text").GetString());
    }

    // L2-282 AC6, L2-188 AC7: a record that does not exist is not found
    [Fact]
    public async Task L2_282_AC6_a_missing_record_is_not_found()
    {
        var response = await Ada().GetAsync($"/api/admin/tables/members/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("NOT_FOUND", (await Json(response)).GetProperty("code").GetString());
    }

    // L2-284 AC1: a moderator may not open a record of Staff
    [Fact]
    public async Task L2_284_AC1_a_moderator_may_not_open_a_staff_record()
    {
        var response = await Miriam().GetAsync($"/api/admin/tables/staff/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
