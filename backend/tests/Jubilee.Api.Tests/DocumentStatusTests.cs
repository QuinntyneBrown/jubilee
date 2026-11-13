using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-113 AC1 to AC3, L2-114 AC1 and AC3, L2-117 AC1, L2-023 AC2
// Description: the app's host asks GET /api/documents/status what a page load answers: 404 for a listing that is
// missing or not public and for an unknown category, 301 for a kept slug, 403 for the owner's workspace asked by a
// member who owns no listing, 503 while maintenance is on, and 200 otherwise (ADR 0056).
public sealed class DocumentStatusTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private Member _naomi = null!;

    public async Task InitializeAsync()
    {
        await factory.Reset();
        _naomi = Member.Join(EmailAddress.TryParse("naomi@luzandre.example")!, "Naomi", "Laurent", null, "hash", ListingMother.Now);
        var luzandre = ListingMother.Public("luzandre", "shops", "Luzandre.com");
        luzandre.AssignOwner(_naomi.Id.ToString());
        var hidden = ListingMother.NonPublic(NonPublicState.Paused, "quiet-co");
        hidden.AssignOwner(_naomi.Id.ToString());
        await factory.Arrange(_naomi, luzandre, hidden, ListingSlug.Keep("luzandre-print-co", luzandre.Id, ListingMother.Now));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<JsonElement> Status(string path, HttpClient? client = null, bool owner = false)
    {
        var response = await (client ?? factory.CreateClient())
            .GetAsync($"/api/documents/status?path={Uri.EscapeDataString(path)}{(owner ? "&owner=true" : string.Empty)}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/b/luzandre")]
    [InlineData("/b/luzandre/p/faith-tee")]
    [InlineData("/b/luzandre/message")]
    [InlineData("/c/home-property")]
    [InlineData("/search")]
    public async Task L2_113_a_page_whose_records_exist_answers_200(string path)
    {
        var status = await Status(path);

        Assert.Equal(200, status.GetProperty("status").GetInt32());
    }

    [Theory]
    [InlineData("/b/no-such-business")]
    [InlineData("/b/no-such-business/p/faith-tee")]
    [InlineData("/b/quiet-co")]
    [InlineData("/c/no-such-category")]
    public async Task L2_113_AC3_a_missing_or_hidden_listing_and_an_unknown_category_answer_404(string path)
    {
        var status = await Status(path);

        Assert.Equal(404, status.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task L2_113_AC3_the_owner_of_a_hidden_listing_may_open_its_preview()
    {
        var status = await Status("/b/quiet-co", factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString()));

        Assert.Equal(200, status.GetProperty("status").GetInt32());
    }

    [Theory]
    [InlineData("/b/luzandre-print-co", "/b/luzandre")]
    [InlineData("/b/luzandre-print-co/p/faith-tee", "/b/luzandre/p/faith-tee")]
    [InlineData("/b/luzandre-print-co/share", "/b/luzandre/share")]
    public async Task L2_113_AC2_a_kept_slug_answers_301_to_the_same_address_under_the_current_slug(string path, string location)
    {
        var status = await Status(path);

        Assert.Equal(301, status.GetProperty("status").GetInt32());
        Assert.Equal(location, status.GetProperty("location").GetString());
    }

    [Fact]
    public async Task L2_114_AC1_the_owners_workspace_asked_by_a_member_who_owns_no_listing_answers_403()
    {
        var joanna = factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

        var status = await Status("/my-business/requests", joanna, owner: true);

        Assert.Equal(403, status.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task L2_114_AC1_the_owner_opens_their_workspace_with_200()
    {
        var status = await Status("/my-business", factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString()), owner: true);

        Assert.Equal(200, status.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task L2_114_AC3_a_visitor_is_answered_200_so_the_app_sends_them_to_sign_in()
    {
        var status = await Status("/my-business", owner: true);

        Assert.Equal(200, status.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task L2_117_AC1_while_maintenance_is_on_the_status_is_503_with_retry_after()
    {
        factory.Maintenance.Enabled = true;
        factory.Maintenance.BackBy = ListingMother.Now.AddHours(2);

        var response = await factory.CreateClient().GetAsync("/api/documents/status?path=%2F");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.NotNull(response.Headers.RetryAfter);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("MAINTENANCE", body.GetProperty("code").GetString());
    }

    [Theory]
    [InlineData("")]
    [InlineData("b/luzandre")]
    [InlineData("//evil.example/b/luzandre")]
    public async Task L2_126_a_path_that_is_not_an_address_of_the_app_is_refused(string path)
    {
        var response = await factory.CreateClient().GetAsync($"/api/documents/status?path={Uri.EscapeDataString(path)}");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }
}
