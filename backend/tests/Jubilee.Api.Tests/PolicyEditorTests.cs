using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// The policies screens of the admin application: L2-247, L2-133.
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
    public async Task L2_247_AC1_an_administrator_lists_the_four_pages_with_their_published_version()
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
    public async Task L2_247_AC2_an_administrator_opens_a_page_with_its_text_and_kept_versions()
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
    public async Task L2_247_AC2_an_unknown_page_is_not_found()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await AsAdmin().GetAsync("/api/admin/content/nonsense")).StatusCode);
    }

    [Fact]
    public async Task L2_247_AC10_a_moderator_a_member_and_a_visitor_are_refused_every_policy_endpoint()
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

    [Fact]
    public async Task L2_247_AC6_a_publish_is_stored_with_the_administrators_name_read_at_once_and_audited()
    {
        var admin = AsAdmin();

        var response = await admin.PostAsJsonAsync("/api/admin/content/privacy/versions", Privacy());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var read = await Json(await _factory.CreateClient().GetAsync("/api/content/privacy"));
        Assert.Equal(2, read.GetProperty("version").GetInt32());
        Assert.Equal("Write to privacy@jubilee.to.", read.GetProperty("sections")[0].GetProperty("body").GetString());
        var stored = await _factory.Query(db => db.ContentVersions.SingleAsync());
        Assert.Equal("Daniel Osei", stored.PublishedBy);
        var audit = await _factory.Query(db => db.AuditRecords.SingleAsync(a => a.Action == "content.published"));
        Assert.Equal("staff|daniel", audit.Actor);
        Assert.Equal("Daniel Osei", audit.ActorName);
        Assert.Equal("content", audit.TargetType);
        Assert.Equal("privacy", audit.TargetId);
        Assert.Equal("version 1", audit.Before);
        Assert.Equal("version 2", audit.After);
    }

    [Fact]
    public async Task L2_247_AC7_a_publish_based_on_an_older_version_is_refused_and_nothing_is_published()
    {
        var admin = AsAdmin();
        (await admin.PostAsJsonAsync("/api/admin/content/privacy/versions", Privacy(basedOn: 1))).EnsureSuccessStatusCode();

        var stale = await admin.PostAsJsonAsync("/api/admin/content/privacy/versions", Privacy(basedOn: 1, body: "Older draft."));

        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("VERSION_CHANGED", (await Json(stale)).GetProperty("code").GetString());
        Assert.Equal(1, await _factory.Query(db => db.ContentVersions.CountAsync()));
        Assert.Equal(1, await _factory.Query(db => db.AuditRecords.CountAsync(a => a.Action == "content.published")));
        var read = await Json(await _factory.CreateClient().GetAsync("/api/content/privacy"));
        Assert.Equal("Write to privacy@jubilee.to.", read.GetProperty("sections")[0].GetProperty("body").GetString());
    }

    [Fact]
    public async Task L2_247_AC4_an_incomplete_section_is_refused_and_nothing_is_published_or_audited()
    {
        var response = await AsAdmin().PostAsJsonAsync("/api/admin/content/privacy/versions", new
        {
            title = "Privacy",
            lead = "",
            sections = new[] { new { heading = "What we keep", anchor = "", body = " " } },
            basedOn = 1,
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("SECTION_INCOMPLETE", (await Json(response)).GetProperty("errors").GetProperty("sections").GetString());
        Assert.Equal(0, await _factory.Query(db => db.ContentVersions.CountAsync()));
        Assert.Equal(0, await _factory.Query(db => db.AuditRecords.CountAsync()));
    }

    [Fact]
    public async Task L2_247_AC11_a_page_read_once_is_served_from_the_read_cache_while_the_database_is_down()
    {
        var visitor = _factory.CreateClient();
        Assert.Equal(1, (await Json(await visitor.GetAsync("/api/content/privacy"))).GetProperty("version").GetInt32());

        _factory.Database.Unavailable = true;
        try
        {
            var response = await visitor.GetAsync("/api/content/privacy");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(1, (await Json(response)).GetProperty("version").GetInt32());
        }
        finally
        {
            _factory.Database.Unavailable = false;
        }
    }

    [Fact]
    public async Task L2_247_AC11_the_next_read_after_a_publish_is_the_new_version()
    {
        var visitor = _factory.CreateClient();
        await visitor.GetAsync("/api/content/privacy");

        (await AsAdmin().PostAsJsonAsync("/api/admin/content/privacy/versions", Privacy())).EnsureSuccessStatusCode();

        var page = await Json(await visitor.GetAsync("/api/content/privacy"));
        Assert.Equal(2, page.GetProperty("version").GetInt32());
        Assert.Equal("Write to privacy@jubilee.to.", page.GetProperty("sections")[0].GetProperty("body").GetString());
    }

    [Fact]
    public async Task L2_247_AC11_a_cached_page_is_read_again_from_the_database_after_ten_minutes()
    {
        var visitor = _factory.CreateClient();
        await visitor.GetAsync("/api/content/terms");
        await _factory.WithDbBehindTheApp(async db =>
        {
            db.ContentVersions.Add(Domain.ContentVersion.Publish(
                "terms", 2, "Terms of use", "Changed behind the app.", "[{\"Heading\":\"Using Jubilee\",\"Anchor\":\"using\",\"Body\":\"Text.\"}]",
                _factory.Clock.GetUtcNow(), "Daniel Osei"));
            await db.SaveChangesAsync();
        });

        _factory.Clock.Advance(TimeSpan.FromMinutes(9));
        Assert.Equal(1, (await Json(await visitor.GetAsync("/api/content/terms"))).GetProperty("version").GetInt32());

        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        Assert.Equal(2, (await Json(await visitor.GetAsync("/api/content/terms"))).GetProperty("version").GetInt32());
    }
}
