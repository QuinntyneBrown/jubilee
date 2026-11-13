using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Policy pages: L2-107 to L2-110, L2-133.
public sealed class PolicyContentTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public PolicyContentTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient AsAdmin() => _factory.CreateStaffClient("Ada Admin", "member|ada", "admin");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static object Text(string title = "Terms of use", string body = "New rules.") => new
    {
        title,
        lead = "Updated terms.",
        sections = new[] { new { heading = "Your account", anchor = "", body } },
    };

    [Theory]
    [InlineData("statement-of-faith", "Statement of faith", "How listings stay honest")]
    [InlineData("terms", "Terms of use", "Requests and payment")]
    [InlineData("privacy", "Privacy", "Your choices")]
    [InlineData("help", "Help", "How do I report a listing?")]
    public async Task A_visitor_reads_each_policy_page_with_its_sections_and_date(string slug, string title, string heading)
    {
        var response = await _factory.CreateClient().GetAsync($"/api/content/{slug}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await Json(response);
        Assert.Equal(title, page.GetProperty("title").GetString());
        Assert.Equal(1, page.GetProperty("version").GetInt32());
        Assert.Equal("2026-11-02", page.GetProperty("publishedAt").GetString()![..10]);
        Assert.Contains(page.GetProperty("sections").EnumerateArray(), s => s.GetProperty("heading").GetString() == heading);
    }

    [Fact]
    public async Task The_help_page_has_the_five_questions_each_with_an_anchor()
    {
        var page = await Json(await _factory.CreateClient().GetAsync("/api/content/help"));

        var sections = page.GetProperty("sections").EnumerateArray().ToList();
        Assert.Equal(
            ["How does Jubilee keep listings honest?", "Does Jubilee take payment?", "Is it free?", "Who can see my messages?", "How do I report a listing?"],
            sections.Select(s => s.GetProperty("heading").GetString()));
        Assert.Equal("how-does-jubilee-keep-listings-honest", sections[0].GetProperty("anchor").GetString());
        Assert.Equal(
            "Every owner agrees to Jubilee's statement of faith and to deal honestly with every customer when they list. If a listing isn't honest about its business, report it from the listing page: the Jubilee team reads every report and takes down listings that misrepresent a business.",
            sections[0].GetProperty("body").GetString());
    }

    // ADR 0057: no policy page says that Jubilee verifies a listing
    [Theory]
    [InlineData("statement-of-faith")]
    [InlineData("terms")]
    [InlineData("privacy")]
    [InlineData("help")]
    public async Task No_policy_page_claims_that_a_listing_is_verified(string slug)
    {
        var page = await _factory.CreateClient().GetStringAsync($"/api/content/{slug}");

        Assert.DoesNotContain("verif", page, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task The_privacy_notice_names_the_privacy_contact_and_how_to_ask_for_access_or_correction()
    {
        var page = await Json(await _factory.CreateClient().GetAsync("/api/content/privacy"));

        var text = string.Join(' ', page.GetProperty("sections").EnumerateArray().Select(s => s.GetProperty("body").GetString()));
        Assert.Contains("privacy@jubilee.example", text);
        Assert.Contains("see or correct", text);
        // L2-108 AC1: the notice has no section about church references, and says the home church is private.
        Assert.DoesNotContain(page.GetProperty("sections").EnumerateArray(), s => s.GetProperty("heading").GetString() == "Church references");
        Assert.Contains("Your home church is shown to no one.", text);
    }

    [Fact]
    public async Task An_unknown_page_is_not_found()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/content/nonsense")).StatusCode);
    }

    [Fact]
    public async Task An_admin_publishes_a_new_version_and_the_earlier_one_is_kept()
    {
        var admin = AsAdmin();

        var published = await admin.PostAsJsonAsync("/api/admin/content/terms/versions", Text());

        Assert.Equal(HttpStatusCode.Created, published.StatusCode);
        Assert.Equal(2, (await Json(published)).GetProperty("version").GetInt32());
        var read = await Json(await _factory.CreateClient().GetAsync("/api/content/terms"));
        Assert.Equal(2, read.GetProperty("version").GetInt32());
        Assert.Equal("New rules.", read.GetProperty("sections")[0].GetProperty("body").GetString());
        Assert.Equal("your-account", read.GetProperty("sections")[0].GetProperty("anchor").GetString());

        await admin.PostAsJsonAsync("/api/admin/content/terms/versions", Text(body: "Newer rules."));
        var versions = await Json(await admin.GetAsync("/api/admin/content/terms/versions"));
        Assert.Equal([3, 2, 1], versions.EnumerateArray().Select(v => v.GetProperty("number").GetInt32()));
        Assert.Equal([true, false, false], versions.EnumerateArray().Select(v => v.GetProperty("published").GetBoolean()));
        Assert.Equal(2, await Count());
    }

    private async Task<int> Count()
    {
        var count = 0;
        await _factory.WithDb(async db => count = await db.ContentVersions.CountAsync());
        return count;
    }

    [Fact]
    public async Task Publishing_without_a_title_or_sections_is_refused_and_nothing_changes()
    {
        var response = await AsAdmin().PostAsJsonAsync("/api/admin/content/terms/versions", new { title = " ", sections = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("TITLE_REQUIRED", errors.GetProperty("title").GetString());
        Assert.Equal("SECTIONS_REQUIRED", errors.GetProperty("sections").GetString());
        Assert.Equal(0, await Count());
    }

    [Fact]
    public async Task Only_an_admin_publishes_or_lists_versions()
    {
        var member = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

        Assert.Equal(HttpStatusCode.Forbidden, (await member.PostAsJsonAsync("/api/admin/content/terms/versions", Text())).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/admin/content/terms/versions")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().PostAsJsonAsync("/api/admin/content/terms/versions", Text())).StatusCode);
        Assert.Equal(0, await Count());
    }

    [Fact]
    public async Task A_publish_that_sets_fields_the_page_does_not_have_is_rejected()
    {
        var response = await AsAdmin().PostAsJsonAsync(
            "/api/admin/content/terms/versions", new { title = "Terms", sections = new[] { new { heading = "A", body = "B" } }, version = 9 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, await Count());
    }

    [Fact]
    public async Task Joining_records_the_terms_version_that_was_published_then()
    {
        await AsAdmin().PostAsJsonAsync("/api/admin/content/terms/versions", Text());

        var joined = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Joanna",
            lastName = "Adeyemi",
            email = "joanna.terms@example.com",
            password = "correct horse 13",
            homeChurch = (string?)null,
            agreementAccepted = true,
        });

        Assert.Equal(HttpStatusCode.Created, joined.StatusCode);
        int? recorded = null;
        await _factory.WithDb(async db =>
            recorded = (await db.Members.SingleAsync(m => m.Email == "joanna.terms@example.com")).TermsVersionNumber);
        Assert.Equal(2, recorded);
    }
}
