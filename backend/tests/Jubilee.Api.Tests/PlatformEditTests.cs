using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>The founder edits a live software platform from My business (L2-256).</summary>
public sealed class PlatformEditTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Founder = "member|abigail";
    private readonly JubileeApiFactory _factory;

    public PlatformEditTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var lanternread = ListingMother.Platform("lanternread", "Lanternread");
        lanternread.AssignOwner(Founder);
        await _factory.Arrange(lanternread);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Abigail() => _factory.CreateMemberClient("Abigail Thornton", Founder);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private async Task<int> Version() =>
        (await _factory.GetJson("/api/my-business/listing", Abigail())).GetProperty("version").GetInt32();

    private static object Platform(
        string? website = "https://app.lanternread.example",
        string? does = "Families log books and set a weekly goal.",
        string? @for = "Families and the teachers who cheer them on.",
        string? pricing = "Free for families. Schools pay per classroom.") => new { website, does, @for, pricing };

    private static object Body(int version, object? platform, string category = "software-platforms", string name = "Lanternread") => new
    {
        version,
        name,
        tagline = "A reading log families keep together",
        category,
        about = (string?)null,
        where = (string?)null,
        hours = (string?)null,
        website = (string?)null,
        highlight = "Free for families",
        platform,
    };

    [Fact]
    public async Task L2_256_AC1_the_editor_holds_the_platform_fields_and_only_its_own_category()
    {
        var editor = await _factory.GetJson("/api/my-business/listing", Abigail());

        var platform = editor.GetProperty("platform");
        Assert.Equal("https://lanternread.example", platform.GetProperty("website").GetString());
        Assert.Equal("Families log the books their children read.", platform.GetProperty("does").GetString());
        Assert.Equal("Families with children aged 4 to 12.", platform.GetProperty("for").GetString());
        Assert.Equal("Free for families.", platform.GetProperty("pricing").GetString());
        Assert.Equal("software-platforms", editor.GetProperty("categorySlug").GetString());
        var categories = editor.GetProperty("categories").EnumerateArray().Select(c => c.GetProperty("slug").GetString()).ToList();
        Assert.Equal(["software-platforms"], categories);
    }

    [Fact]
    public async Task L2_256_AC2_valid_changes_are_live_at_once_and_need_no_hours()
    {
        var response = await Abigail().PutAsJsonAsync("/api/my-business/listing", Body(await Version(), Platform()));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await _factory.GetJson("/api/listings/lanternread");
        var platform = page.GetProperty("platform");
        Assert.Equal("https://app.lanternread.example", platform.GetProperty("website").GetString());
        Assert.Equal("app.lanternread.example", platform.GetProperty("host").GetString());
        Assert.Equal("Families log books and set a weekly goal.", platform.GetProperty("does").GetString());
        Assert.Equal("Families and the teachers who cheer them on.", platform.GetProperty("for").GetString());
        Assert.Equal("Free for families. Schools pay per classroom.", platform.GetProperty("pricing").GetString());
        Assert.Equal("Free for families", page.GetProperty("highlight").GetString());
    }

    [Fact]
    public async Task L2_256_AC2_empty_platform_fields_are_refused_with_the_codes_of_listing_it()
    {
        var response = await Abigail().PutAsJsonAsync(
            "/api/my-business/listing", Body(await Version(), Platform(website: " ", does: "", @for: null, pricing: " ")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REQUIRED", errors.GetProperty("platform.website").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("platform.does").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("platform.for").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("platform.pricing").GetString());
        Assert.False(errors.TryGetProperty("hours", out _));
    }

    [Theory]
    [InlineData("http://lanternread.example")]
    [InlineData("lanternread.example")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://me:secret@lanternread.example")]
    [InlineData("https://localhost")]
    public async Task L2_256_AC2_an_address_that_fails_the_rule_is_refused_and_the_stored_one_stays(string website)
    {
        var response = await Abigail().PutAsJsonAsync("/api/my-business/listing", Body(await Version(), Platform(website: website)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("INVALID", (await Json(response)).GetProperty("errors").GetProperty("platform.website").GetString());
        var page = await _factory.GetJson("/api/listings/lanternread");
        Assert.Equal("https://lanternread.example", page.GetProperty("platform").GetProperty("website").GetString());
    }

    [Fact]
    public async Task L2_256_AC2_a_change_of_name_is_audited()
    {
        var response = await Abigail().PutAsJsonAsync(
            "/api/my-business/listing", Body(await Version(), Platform(), name: "Lanternread Home"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var audited = await _factory.Query(db => db.AuditRecords.Where(a => a.Action == "listing.renamed").ToListAsync());
        var record = Assert.Single(audited);
        Assert.Equal("Lanternread Home | software-platforms", record.After);
    }

    [Fact]
    public async Task L2_256_AC3_a_platform_stays_in_software_platforms()
    {
        var response = await Abigail().PutAsJsonAsync(
            "/api/my-business/listing", Body(await Version(), Platform(), category: "technology"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("CATEGORY_LOCKED", (await Json(response)).GetProperty("errors").GetProperty("category").GetString());
    }

    [Fact]
    public async Task L2_256_AC3_a_business_cannot_move_into_software_platforms_and_is_not_offered_it()
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
            category = "software-platforms",
            about = (string?)null,
            where = (string?)null,
            hours = "Mon–Sat 7–3",
            website = (string?)null,
            highlight = (string?)null,
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("CATEGORY_LOCKED", (await Json(response)).GetProperty("errors").GetProperty("category").GetString());
        Assert.DoesNotContain(
            editor.GetProperty("categories").EnumerateArray(), c => c.GetProperty("slug").GetString() == "software-platforms");
        Assert.Equal(JsonValueKind.Null, editor.GetProperty("platform").ValueKind);
    }

    [Fact]
    public async Task L2_256_AC4_the_founder_pauses_and_resumes_the_platform()
    {
        var paused = await Abigail().PostAsync("/api/my-business/pause", null);
        Assert.Equal(HttpStatusCode.OK, paused.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/lanternread")).StatusCode);

        var resumed = await Abigail().PostAsync("/api/my-business/resume", null);
        Assert.Equal(HttpStatusCode.OK, resumed.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/listings/lanternread")).StatusCode);
    }

    [Fact]
    public async Task L2_256_AC5_a_member_who_owns_nothing_cannot_open_or_save_the_editor()
    {
        var other = _factory.CreateMemberClient("Noah Brandt", "member|noah");

        Assert.Equal(HttpStatusCode.Forbidden, (await other.GetAsync("/api/my-business/listing")).StatusCode);
        var save = await other.PutAsJsonAsync("/api/my-business/listing", Body(1, Platform(does: "Changed by someone else.")));

        Assert.Equal(HttpStatusCode.Forbidden, save.StatusCode);
        var page = await _factory.GetJson("/api/listings/lanternread");
        Assert.Equal("Families log the books their children read.", page.GetProperty("platform").GetProperty("does").GetString());
    }
}
