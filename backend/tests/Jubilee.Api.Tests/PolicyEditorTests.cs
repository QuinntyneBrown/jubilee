using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// The policies screens of the admin application: L2-226, L2-133.
public sealed class PolicyEditorTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public PolicyEditorTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient AsAdmin() => _factory.CreateStaffClient("Daniel Osei", "staff|daniel", "admin");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static object Privacy(int? basedOn = 1, string body = "Write to privacy@jubilee.to.") => new
    {
        title = "Privacy",
        lead = "We collect only what the marketplace needs.",
        sections = new[] { new { heading = "Privacy contact and your rights", anchor = "privacy-contact", body } },
        basedOn,
    };

    [Fact]
    public async Task L2_226_AC1_an_administrator_lists_the_four_pages_with_their_published_version()
    {
        var admin = AsAdmin();

        var before = await Json(await admin.GetAsync("/api/admin/content"));

        Assert.Equal(["statement-of-faith", "terms", "privacy", "help"], before.EnumerateArray().Select(r => r.GetProperty("slug").GetString()));
        Assert.Equal(["Statement of faith", "Terms of use", "Privacy", "Help"], before.EnumerateArray().Select(r => r.GetProperty("title").GetString()));
        Assert.All(before.EnumerateArray(), r =>
        {
            Assert.Equal(1, r.GetProperty("version").GetInt32());
            Assert.Equal("built-in", r.GetProperty("publishedBy").GetString());
            Assert.Equal(1, r.GetProperty("keptVersions").GetInt32());
        });

        (await admin.PostAsJsonAsync("/api/admin/content/privacy/versions", Privacy())).EnsureSuccessStatusCode();

        var privacy = (await Json(await admin.GetAsync("/api/admin/content"))).EnumerateArray().Single(r => r.GetProperty("slug").GetString() == "privacy");
        Assert.Equal(2, privacy.GetProperty("version").GetInt32());
        Assert.Equal("Daniel Osei", privacy.GetProperty("publishedBy").GetString());
        Assert.Equal(2, privacy.GetProperty("keptVersions").GetInt32());
    }

    [Fact]
    public async Task L2_226_AC2_an_administrator_opens_a_page_with_its_text_and_kept_versions()
    {
        var admin = AsAdmin();
        (await admin.PostAsJsonAsync("/api/admin/content/privacy/versions", Privacy())).EnsureSuccessStatusCode();

        var page = await Json(await admin.GetAsync("/api/admin/content/privacy"));

        Assert.Equal("Privacy", page.GetProperty("published").GetProperty("title").GetString());
        Assert.Equal(2, page.GetProperty("published").GetProperty("version").GetInt32());
        Assert.Equal("privacy-contact", page.GetProperty("published").GetProperty("sections")[0].GetProperty("anchor").GetString());
        Assert.Equal("Daniel Osei", page.GetProperty("publishedBy").GetString());
        Assert.Equal([2, 1], page.GetProperty("versions").EnumerateArray().Select(v => v.GetProperty("number").GetInt32()));
        Assert.Equal(["Daniel Osei", "built-in"], page.GetProperty("versions").EnumerateArray().Select(v => v.GetProperty("publishedBy").GetString()));
    }

    [Fact]
    public async Task L2_226_AC2_an_unknown_page_is_not_found()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await AsAdmin().GetAsync("/api/admin/content/nonsense")).StatusCode);
    }

    [Fact]
    public async Task L2_226_AC10_a_moderator_a_member_and_a_visitor_are_refused_every_policy_endpoint()
    {
        var moderator = _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");
        var member = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");
        var visitor = _factory.CreateClient();

        foreach (var client in new[] { moderator, member })
        {
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/content")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/content/privacy")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/admin/content/privacy/versions", Privacy())).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync("/api/admin/content")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync("/api/admin/content/privacy")).StatusCode);
        Assert.Equal(0, await _factory.Query(db => db.ContentVersions.CountAsync()));
    }
}
