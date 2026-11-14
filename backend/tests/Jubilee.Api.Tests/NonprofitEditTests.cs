// Acceptance Test
// Traces to: L2-294
// Description: the leader edits a live non-profit: the editor holds its fields and only its own
// category, valid changes are live at once, the rules of listing it apply, and it pauses and resumes.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

public class NonprofitEditTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Leader = "member|grace";
    private readonly JubileeApiFactory _factory;

    public NonprofitEditTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var hopeHouse = ListingMother.Nonprofit("hope-house", "Hope House Toronto");
        hopeHouse.AssignOwner(Leader);
        await _factory.Arrange(hopeHouse);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Grace() => _factory.CreateMemberClient("Grace Adeyemi", Leader);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private async Task<int> Version() =>
        (await _factory.GetJson("/api/my-business/listing", Grace())).GetProperty("version").GetInt32();

    private static object Nonprofit(
        string? website = "https://www.hopehouse.example",
        string? giveUrl = "https://give.hopehouse.example",
        string? mission = "Meals, beds and friendship until each man has a home.",
        string? serves = "Men leaving shelters downtown.",
        string? area = "Moss Park") => new { website, giveUrl, mission, serves, area };

    private static object Body(int version, object? nonprofit, string category = "non-profits", string name = "Hope House Toronto") => new
    {
        version,
        name,
        tagline = "Meals, beds and friendship for men leaving the shelter system",
        category,
        about = (string?)null,
        where = (string?)null,
        hours = (string?)null,
        website = (string?)null,
        highlight = "Volunteers welcome",
        nonprofit,
    };

    [Fact]
    public async Task L2_294_AC1_the_editor_holds_the_non_profit_fields_and_only_its_own_category()
    {
        var editor = await _factory.GetJson("/api/my-business/listing", Grace());

        var nonprofit = editor.GetProperty("nonprofit");
        Assert.Equal("https://hopehouse.example", nonprofit.GetProperty("website").GetString());
        Assert.Equal("https://hopehouse.example/give", nonprofit.GetProperty("giveUrl").GetString());
        Assert.Equal(ListingMother.NonprofitMission, nonprofit.GetProperty("mission").GetString());
        Assert.Equal(ListingMother.NonprofitServes, nonprofit.GetProperty("serves").GetString());
        Assert.Equal(ListingMother.NonprofitArea, nonprofit.GetProperty("area").GetString());
        Assert.Equal(JsonValueKind.Null, editor.GetProperty("platform").ValueKind);
        var categories = editor.GetProperty("categories").EnumerateArray().Select(c => c.GetProperty("slug").GetString()).ToList();
        Assert.Equal(["non-profits"], categories);
    }

    [Fact]
    public async Task L2_294_AC2_valid_changes_are_live_at_once_and_need_no_hours()
    {
        var response = await Grace().PutAsJsonAsync("/api/my-business/listing", Body(await Version(), Nonprofit()));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var nonprofit = (await _factory.GetJson("/api/listings/hope-house")).GetProperty("nonprofit");
        Assert.Equal("https://www.hopehouse.example", nonprofit.GetProperty("website").GetString());
        Assert.Equal("give.hopehouse.example", nonprofit.GetProperty("giveHost").GetString());
        Assert.Equal("Meals, beds and friendship until each man has a home.", nonprofit.GetProperty("mission").GetString());
        Assert.Equal("Men leaving shelters downtown.", nonprofit.GetProperty("serves").GetString());
        Assert.Equal("Moss Park", nonprofit.GetProperty("area").GetString());
    }

    [Fact]
    public async Task L2_294_AC2_emptying_the_page_for_giving_removes_the_link()
    {
        var response = await Grace().PutAsJsonAsync("/api/my-business/listing", Body(await Version(), Nonprofit(giveUrl: "")));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var nonprofit = (await _factory.GetJson("/api/listings/hope-house")).GetProperty("nonprofit");
        Assert.Equal(JsonValueKind.Null, nonprofit.GetProperty("giveUrl").ValueKind);
    }

    [Fact]
    public async Task L2_294_AC2_empty_or_invalid_fields_are_refused_with_the_codes_of_listing_it()
    {
        var response = await Grace().PutAsJsonAsync(
            "/api/my-business/listing", Body(await Version(), Nonprofit(website: " ", giveUrl: "http://hopehouse.example", mission: "", serves: null, area: " ")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REQUIRED", errors.GetProperty("nonprofit.website").GetString());
        Assert.Equal("INVALID", errors.GetProperty("nonprofit.giveUrl").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("nonprofit.mission").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("nonprofit.serves").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("nonprofit.area").GetString());
        Assert.False(errors.TryGetProperty("hours", out _));
        var page = await _factory.GetJson("/api/listings/hope-house");
        Assert.Equal("https://hopehouse.example", page.GetProperty("nonprofit").GetProperty("website").GetString());
    }

    [Fact]
    public async Task L2_294_AC2_a_change_of_name_is_audited()
    {
        var response = await Grace().PutAsJsonAsync("/api/my-business/listing", Body(await Version(), Nonprofit(), name: "Hope House"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var audited = await _factory.Query(db => db.AuditRecords.Where(a => a.Action == "listing.renamed").ToListAsync());
        Assert.Equal("Hope House | non-profits", Assert.Single(audited).After);
    }

    [Fact]
    public async Task L2_294_AC3_a_non_profit_stays_in_non_profits()
    {
        var response = await Grace().PutAsJsonAsync("/api/my-business/listing", Body(await Version(), Nonprofit(), category: "community"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("CATEGORY_LOCKED", (await Json(response)).GetProperty("errors").GetProperty("category").GetString());
    }

    [Fact]
    public async Task L2_294_AC3_a_business_cannot_move_into_non_profits_and_is_not_offered_it()
    {
        var bakery = ListingMother.Public("rise-bakery", name: "Rise Bakery");
        bakery.AssignOwner("member|ruth");
        await _factory.Arrange(bakery);
        var ruth = _factory.CreateMemberClient("Ruth Adeyemi", "member|ruth");
        var editor = await _factory.GetJson("/api/my-business/listing", ruth);

        var response = await ruth.PutAsJsonAsync("/api/my-business/listing", new
        {
            version = editor.GetProperty("version").GetInt32(),
            name = "Rise Bakery",
            tagline = "Bread baked every morning",
            category = "non-profits",
            about = (string?)null,
            where = (string?)null,
            hours = "Mon–Sat 7–3",
            website = (string?)null,
            highlight = (string?)null,
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("CATEGORY_LOCKED", (await Json(response)).GetProperty("errors").GetProperty("category").GetString());
        Assert.DoesNotContain(editor.GetProperty("categories").EnumerateArray(), c => c.GetProperty("slug").GetString() == "non-profits");
        Assert.Equal(JsonValueKind.Null, editor.GetProperty("nonprofit").ValueKind);
    }

    [Fact]
    public async Task L2_294_AC4_the_leader_pauses_and_resumes_the_non_profit()
    {
        Assert.Equal(HttpStatusCode.OK, (await Grace().PostAsync("/api/my-business/pause", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/hope-house")).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await Grace().PostAsync("/api/my-business/resume", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/listings/hope-house")).StatusCode);
    }

    [Fact]
    public async Task L2_294_AC5_a_member_who_owns_nothing_cannot_open_or_save_the_editor()
    {
        var other = _factory.CreateMemberClient("Noah Brandt", "member|noah");

        Assert.Equal(HttpStatusCode.Forbidden, (await other.GetAsync("/api/my-business/listing")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PutAsJsonAsync("/api/my-business/listing", Body(1, Nonprofit(mission: "Changed by someone else.")))).StatusCode);
        var page = await _factory.GetJson("/api/listings/hope-house");
        Assert.Equal(ListingMother.NonprofitMission, page.GetProperty("nonprofit").GetProperty("mission").GetString());
    }
}
