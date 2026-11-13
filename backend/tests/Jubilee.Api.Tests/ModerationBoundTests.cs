using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-105 AC2, L2-105 AC3, L2-106 AC1, L2-106 AC2
// Description: a listing the Jubilee team holds or removes leaves every public page on the next request, with
// every public read cached first, and a lifted hold puts it back; the featured businesses follow a week saved again
// and skip a held listing. The save drops the directory read cache (ADR 0003) and search reads the database
// (ADR 0011), so no outbox step is needed (ADR 0057). Trevor owns "held"; "stays" is another live business in the
// same category, so each is on the other's page under the related businesses.
public sealed class ModerationBoundTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Note = "Checked the listing against the report.";

    /// <summary>Every public list a live listing is on, cached by the API or not.</summary>
    private static readonly string[] Lists =
    [
        "/api/directory/welcome",
        "/api/directory/home",
        "/api/categories/home-property/listings",
        "/api/search?q=tagline",
        "/api/listings/stays",
    ];

    private readonly JubileeApiFactory _factory;
    private readonly HttpClient _visitor;
    private Guid _held;
    private Guid _stays;

    public ModerationBoundTests(JubileeApiFactory factory)
    {
        _factory = factory;
        _visitor = Searcher.At(factory);
    }

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var held = ListingMother.Public("held");
        held.AssignOwner("member|trevor");
        var stays = ListingMother.Public("stays");
        _held = held.Id;
        _stays = stays.Id;
        await _factory.Arrange(stays, held);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "member|miriam", "moderator");

    private async Task<Guid> Reported()
    {
        var response = await _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna").PostAsJsonAsync(
            "/api/listings/held/reports", new { reason = "misleading", description = "The office address is closed." });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("id").GetGuid();
    }

    private async Task Act(Guid report, string kind)
    {
        var response = await Miriam().PostAsJsonAsync(
            $"/api/admin/reports/{report}/actions", new { kind, resolutionNote = Note, messageText = (string?)null });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task L2_105_AC3_a_listing_placed_on_hold_is_gone_from_every_public_page_on_the_next_request_and_back_when_lifted()
    {
        var report = await Reported();
        Assert.All(await ReadLists(), body => Assert.Contains("held", body));
        Assert.Equal(HttpStatusCode.OK, (await _visitor.GetAsync("/api/listings/held")).StatusCode);

        await Act(report, "hold");

        Assert.All(await ReadLists(), body => Assert.DoesNotContain("held", body));
        Assert.Equal(HttpStatusCode.NotFound, (await _visitor.GetAsync("/api/listings/held")).StatusCode);

        await Act(report, "lift-hold");

        Assert.All(await ReadLists(), body => Assert.Contains("held", body));
        Assert.Equal(HttpStatusCode.OK, (await _visitor.GetAsync("/api/listings/held")).StatusCode);
    }

    [Fact]
    public async Task L2_105_AC2_a_listing_the_team_removes_is_gone_from_every_public_page_on_the_next_request()
    {
        var report = await Reported();
        Assert.All(await ReadLists(), body => Assert.Contains("held", body));

        await Act(report, "remove");

        var bodies = await ReadLists();
        Assert.All(bodies, body => Assert.DoesNotContain("held", body));
        Assert.All(bodies[..4], body => Assert.Contains("stays", body));
        Assert.Equal(HttpStatusCode.NotFound, (await _visitor.GetAsync("/api/listings/held")).StatusCode);
    }

    [Fact]
    public async Task L2_106_AC2_a_featured_listing_placed_on_hold_is_skipped_on_welcome_and_browse_on_the_next_request()
    {
        var report = await Reported();
        var set = await Miriam().PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { _held, _stays } });
        Assert.Equal(HttpStatusCode.OK, set.StatusCode);
        Assert.Equal(["held", "stays"], await Featured("/api/directory/welcome"));
        Assert.Equal(["held", "stays"], await Featured("/api/directory/home"));

        await Act(report, "hold");

        Assert.Equal(["stays"], await Featured("/api/directory/welcome"));
        Assert.Equal(["stays"], await Featured("/api/directory/home"));

        await Act(report, "lift-hold");

        Assert.Equal(["held", "stays"], await Featured("/api/directory/welcome"));
    }

    [Fact]
    public async Task L2_106_AC1_a_week_saved_again_shows_on_welcome_and_browse_on_the_next_request()
    {
        var miriam = Miriam();
        await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { _held, _stays } });
        Assert.Equal(["held", "stays"], await Featured("/api/directory/welcome"));
        Assert.Equal(["held", "stays"], await Featured("/api/directory/home"));

        var again = await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { _stays } });

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(["stays"], await Featured("/api/directory/welcome"));
        Assert.Equal(["stays"], await Featured("/api/directory/home"));
    }

    private async Task<string[]> ReadLists()
    {
        var bodies = new List<string>();
        foreach (var url in Lists)
        {
            bodies.Add(await _visitor.GetStringAsync(url));
        }

        return [.. bodies];
    }

    private async Task<string[]> Featured(string url) =>
        (await _factory.GetJson(url, _visitor)).GetProperty("featured").EnumerateArray().Select(l => l.GetProperty("slug").GetString()!).ToArray();
}
