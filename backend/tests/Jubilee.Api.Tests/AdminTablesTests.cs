using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

// The schema-driven admin application (ADR 0075): the catalog of tables and what each role may read
// (L2-188, L2-272, L2-276, L2-284). Ada is an administrator; Miriam is on the Jubilee team.
public sealed class AdminTablesTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public AdminTablesTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var naomi = Member.Join(EmailAddress.TryParse("naomi@example.com")!, "Naomi", "Laurent", null, "hash", ListingMother.Now.AddMonths(-5));
        var ruth = Member.Join(EmailAddress.TryParse("ruth.c@outlook.com")!, "Ruth", "Chen", null, "hash", ListingMother.Now.AddMonths(-2));
        await _factory.Arrange(naomi, ruth, ListingMother.Public("luzandre-com", "shops", "Luzandre.com", ListingMother.Now.AddDays(-2)));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Ada() => _factory.CreateStaffClient("Ada Nwosu", "staff|ada", "admin");

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static IEnumerable<JsonElement> Tables(JsonElement catalog) =>
        catalog.GetProperty("groups").EnumerateArray().SelectMany(g => g.GetProperty("tables").EnumerateArray());

    private static JsonElement Table(JsonElement catalog, string key) => Tables(catalog).Single(t => t.GetProperty("key").GetString() == key);

    // L2-099 AC1: the Listings table's sentence and its columns, newest first
    [Fact]
    public async Task L2_099_AC1_the_listings_table_says_what_it_holds_and_shows_its_columns()
    {
        var listings = Table(await Json(await Miriam().GetAsync("/api/admin/tables")), "listings");

        Assert.Equal(
            "Every shop, service and space on Jubilee. Unpublishing hides it from Browse immediately.",
            listings.GetProperty("sentence").GetString());
        Assert.Equal(
            ["id", "name", "kind", "status", "ownerId", "category", "neighbourhood"],
            listings.GetProperty("defaultColumns").EnumerateArray().Select(c => c.GetString()));
    }

    // L2-099 AC4: an empty Listings table says when a listing appears; a table without its own words has none
    [Fact]
    public async Task L2_099_AC4_the_listings_table_says_when_a_listing_appears()
    {
        var catalog = await Json(await Miriam().GetAsync("/api/admin/tables"));

        Assert.Equal(
            "A listing appears here as soon as its owner publishes it.",
            Table(catalog, "listings").GetProperty("empty").GetString());
        Assert.Equal(JsonValueKind.Null, Table(catalog, "job-runs").GetProperty("empty").ValueKind);
    }

    // L2-272 AC1: the top bar names the environment the API runs in ("Production" in production)
    [Fact]
    public async Task L2_272_AC1_the_staff_session_names_the_environment()
    {
        var session = await Json(await Ada().GetAsync("/api/staff/session"));

        Assert.Equal("Development", session.GetProperty("environment").GetString());
        Assert.Equal("AN", session.GetProperty("initials").GetString());
    }

    // L2-272 AC2, L2-276 AC1: the groups in order, each table with its name and count
    [Fact]
    public async Task L2_272_AC2_the_catalog_lists_the_groups_in_order_with_each_tables_count()
    {
        var response = await Ada().GetAsync("/api/admin/tables");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var catalog = await Json(response);
        Assert.Equal(
            ["Accounts", "Listings", "Requests & messaging", "Reviews", "Moderation", "Member activity", "Feedback", "Merch", "Launch", "Site & content", "System"],
            catalog.GetProperty("groups").EnumerateArray().Select(g => g.GetProperty("name").GetString()));
        var system = catalog.GetProperty("groups").EnumerateArray().Last();
        Assert.True(system.GetProperty("readOnly").GetBoolean());
        Assert.Equal(["audit-records", "outbox-messages", "job-runs"], system.GetProperty("tables").EnumerateArray().Select(t => t.GetProperty("key").GetString()));

        var members = Table(catalog, "members");
        Assert.Equal("Members", members.GetProperty("label").GetString());
        Assert.Equal("Member", members.GetProperty("singular").GetString());
        Assert.Equal(2, members.GetProperty("count").GetInt32());
        Assert.Equal(1, Table(catalog, "listings").GetProperty("count").GetInt32());
        Assert.Equal("Everyone with a Jubilee account: shoppers, renters and the people behind each listing.", members.GetProperty("sentence").GetString());
    }

    // L2-276 AC3: the fields of a table, their types and the default columns
    [Fact]
    public async Task L2_276_AC3_each_table_describes_its_fields_and_default_columns()
    {
        var members = Table(await Json(await Ada().GetAsync("/api/admin/tables")), "members");

        var fields = members.GetProperty("fields").EnumerateArray().ToList();
        Assert.Equal("id", fields[0].GetProperty("key").GetString());
        Assert.Equal("id", fields[0].GetProperty("type").GetString());
        Assert.True(fields[0].GetProperty("system").GetBoolean());
        var email = fields.Single(f => f.GetProperty("key").GetString() == "email");
        Assert.Equal("email", email.GetProperty("type").GetString());
        Assert.Equal("status", members.GetProperty("statusField").GetString());
        var columns = members.GetProperty("defaultColumns").EnumerateArray().Select(c => c.GetString()).ToList();
        Assert.Equal(7, columns.Count);
        Assert.Equal("id", columns[0]);
        // A member's home church is private (L1-020, ADR 0075): it is not a field.
        Assert.DoesNotContain(fields, f => f.GetProperty("key").GetString()!.Contains("church", StringComparison.OrdinalIgnoreCase));
    }

    // L2-284 AC1, AC2: what each role reads and changes
    [Fact]
    public async Task L2_284_AC1_a_moderator_reads_every_table_but_staff_and_changes_only_their_groups()
    {
        var mine = await Json(await Miriam().GetAsync("/api/admin/tables"));
        var theirs = await Json(await Ada().GetAsync("/api/admin/tables"));

        Assert.DoesNotContain(Tables(mine), t => t.GetProperty("key").GetString() == "staff");
        Assert.Contains(Tables(theirs), t => t.GetProperty("key").GetString() == "staff");
        Assert.False(Table(mine, "members").GetProperty("canChange").GetBoolean());
        Assert.True(Table(mine, "feedback").GetProperty("canChange").GetBoolean());
        Assert.True(Table(theirs, "members").GetProperty("canChange").GetBoolean());
        Assert.False(Table(theirs, "staff").GetProperty("canChange").GetBoolean());
        Assert.False(Table(theirs, "audit-records").GetProperty("canChange").GetBoolean());
        Assert.False(Table(theirs, "consent-records").GetProperty("canDelete").GetBoolean());
        Assert.True(Table(theirs, "feedback").GetProperty("canDelete").GetBoolean());
    }

    // L2-284 AC1: a table the role may not read is refused
    [Fact]
    public async Task L2_284_AC1_a_moderator_is_refused_the_staff_table()
    {
        var response = await Miriam().GetAsync("/api/admin/tables/staff");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("FORBIDDEN", (await Json(response)).GetProperty("code").GetString());
    }

    // L2-188 AC7: a table that does not exist
    [Fact]
    public async Task L2_188_AC7_an_unknown_table_is_not_found()
    {
        var response = await Ada().GetAsync("/api/admin/tables/churches");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static List<JsonElement> Rows(JsonElement page) => [.. page.GetProperty("rows").EnumerateArray()];

    private static string? Value(JsonElement row, string key) =>
        row.GetProperty("values").GetProperty(key) is { ValueKind: JsonValueKind.String } v ? v.GetString() : null;

    // L2-276 AC2: every table of the catalog opens for an administrator
    [Fact]
    public async Task L2_276_AC2_every_table_opens()
    {
        var ada = Ada();
        var catalog = await Json(await ada.GetAsync("/api/admin/tables"));

        foreach (var key in Tables(catalog).Select(t => t.GetProperty("key").GetString()))
        {
            var response = await ada.GetAsync($"/api/admin/tables/{key}?q=a&sort=id&dir=desc");
            Assert.True(response.StatusCode == HttpStatusCode.OK, $"{key}: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        }
    }

    // L2-276 AC3, L2-282 AC2: a row's values by field, its name, and a reference by the name of what it points at
    [Fact]
    public async Task L2_276_AC3_rows_carry_their_values_names_and_references()
    {
        var page = await Json(await Ada().GetAsync("/api/admin/tables/listings"));

        var luzandre = Rows(page).Single();
        Assert.Equal("Luzandre.com", luzandre.GetProperty("name").GetString());
        Assert.Equal("live", Value(luzandre, "status"));
        Assert.Equal("shop", Value(luzandre, "kind"));
        Assert.Equal(1, page.GetProperty("total").GetInt32());
        Assert.Equal(1, page.GetProperty("page").GetInt32());
        Assert.Equal(25, page.GetProperty("size").GetInt32());
    }

    // L2-276 AC3: a reference shows the name of the record it points at, or "deleted"
    [Fact]
    public async Task L2_276_AC3_a_reference_is_named_or_marked_deleted()
    {
        var ruth = Member.Join(EmailAddress.TryParse("ruth.p@example.com")!, "Ruth", "Park", null, "hash", ListingMother.Now.AddDays(-9));
        var shop = ListingMother.Public("ruths-shop", "shops", "Ruth's Shop", ListingMother.Now.AddDays(-3));
        shop.AssignOwner(ruth.Id.ToString());
        var orphan = ListingMother.Public("orphan-co", "shops", "Orphan Co", ListingMother.Now.AddDays(-4));
        orphan.AssignOwner(Guid.NewGuid().ToString());
        await _factory.Arrange(ruth, shop, orphan);

        var rows = Rows(await Json(await Ada().GetAsync("/api/admin/tables/listings")));

        var owner = rows.Single(r => r.GetProperty("name").GetString() == "Ruth's Shop").GetProperty("values").GetProperty("ownerId");
        Assert.Equal("Ruth Park", owner.GetProperty("name").GetString());
        Assert.Equal("members", owner.GetProperty("table").GetString());
        Assert.False(owner.GetProperty("deleted").GetBoolean());
        var gone = rows.Single(r => r.GetProperty("name").GetString() == "Orphan Co").GetProperty("values").GetProperty("ownerId");
        Assert.True(gone.GetProperty("deleted").GetBoolean());
    }

    // L2-277 AC1, AC6: search looks at every searchable field, ignoring case, IDs and e-mail addresses included
    [Fact]
    public async Task L2_277_AC1_search_matches_any_field_ignoring_case()
    {
        var ada = Ada();

        var byEmail = Rows(await Json(await ada.GetAsync("/api/admin/tables/members?q=RUTH.C@")));
        Assert.Equal(["Ruth Chen"], byEmail.Select(r => r.GetProperty("name").GetString()));

        var id = byEmail[0].GetProperty("id").GetString()!;
        var byId = Rows(await Json(await ada.GetAsync($"/api/admin/tables/members?q={id[..8]}")));
        Assert.Equal(["Ruth Chen"], byId.Select(r => r.GetProperty("name").GetString()));

        var none = await Json(await ada.GetAsync("/api/admin/tables/members?q=pastor%20mike"));
        Assert.Empty(Rows(none));
        Assert.Equal(0, none.GetProperty("total").GetInt32());
    }

    // L2-277 AC2: a status filters the table
    [Fact]
    public async Task L2_277_AC2_a_status_filters_the_table()
    {
        var paused = ListingMother.Public("quiet-tutor", "learning", "Quiet Tutor", ListingMother.Now.AddDays(-1));
        paused.Pause(ListingMother.Now);
        await _factory.Arrange(paused);

        var rows = Rows(await Json(await Ada().GetAsync("/api/admin/tables/listings?status=paused")));

        Assert.Equal(["Quiet Tutor"], rows.Select(r => r.GetProperty("name").GetString()));
        Assert.Empty(Rows(await Json(await Ada().GetAsync("/api/admin/tables/listings?status=nonsense"))));
    }

    // L2-277 AC5: a column sorts the table ascending and descending
    [Fact]
    public async Task L2_277_AC5_a_column_sorts_the_table()
    {
        var ada = Ada();

        var up = Rows(await Json(await ada.GetAsync("/api/admin/tables/members?sort=name&dir=asc")));
        var down = Rows(await Json(await ada.GetAsync("/api/admin/tables/members?sort=name&dir=desc")));

        Assert.Equal(["Naomi Laurent", "Ruth Chen"], up.Select(r => r.GetProperty("name").GetString()));
        Assert.Equal(["Ruth Chen", "Naomi Laurent"], down.Select(r => r.GetProperty("name").GetString()));
    }

    // L2-278 AC2, AC3: pages of 25, 50, 100 or 250 rows
    [Fact]
    public async Task L2_278_AC3_the_table_pages_by_the_rows_asked_for()
    {
        await _factory.Arrange([.. Enumerable.Range(1, 30).Select(i =>
            (object)Member.Join(EmailAddress.TryParse($"m{i}@example.com")!, "Member", $"{i:00}", null, "hash", ListingMother.Now.AddDays(-i)))]);
        var ada = Ada();

        var second = await Json(await ada.GetAsync("/api/admin/tables/members?page=2&size=25"));
        Assert.Equal(32, second.GetProperty("total").GetInt32());
        Assert.Equal(7, Rows(second).Count);

        var odd = await Json(await ada.GetAsync("/api/admin/tables/members?size=7"));
        Assert.Equal(25, odd.GetProperty("size").GetInt32());
    }

    // L2-191: a member session never reaches the admin tables
    [Fact]
    public async Task L2_191_a_member_session_is_refused_the_catalog()
    {
        var anonymous = _factory.CreateHttpsClient();

        var response = await anonymous.GetAsync("/api/admin/tables");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
