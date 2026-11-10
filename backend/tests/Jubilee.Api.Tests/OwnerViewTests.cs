using System.Net;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>
/// Who is looking at a listing (L2-037, L2-133): the server decides it from the session, and
/// counts a listing view for everyone but the owner.
/// </summary>
public class OwnerViewTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Trevor = "member|trevor";
    private readonly JubileeApiFactory _factory;

    public OwnerViewTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static Listing Legacy(Listing? listing = null)
    {
        listing ??= ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        listing.AssignOwner(Trevor);
        return listing;
    }

    private HttpClient Owner() => _factory.CreateMemberClient("Trevor Chew", Trevor);

    private async Task<int> Views()
    {
        var count = 0;
        await _factory.WithDb(async db => count = await db.ListingViews.CountAsync());
        return count;
    }

    [Fact]
    public async Task L2_037_AC1_the_owner_of_a_listing_is_told_it_is_theirs()
    {
        await _factory.Arrange(Legacy());

        var json = await _factory.GetJson("/api/listings/legacy-financial", Owner());

        Assert.Equal("owner", json.GetProperty("viewerRelation").GetString());
        Assert.Equal("live", json.GetProperty("stage").GetString());
    }

    [Fact]
    public async Task L2_133_AC1_another_member_and_a_visitor_are_not_the_owner_whatever_they_send()
    {
        await _factory.Arrange(Legacy());
        var member = _factory.CreateMemberClient("Joanna Adeyemi");
        member.DefaultRequestHeaders.Add("X-Viewer-Relation", "owner");

        var asMember = await _factory.GetJson("/api/listings/legacy-financial?viewerRelation=owner", member);
        var asVisitor = await _factory.GetJson("/api/listings/legacy-financial");

        Assert.Equal("member", asMember.GetProperty("viewerRelation").GetString());
        Assert.Equal("visitor", asVisitor.GetProperty("viewerRelation").GetString());
    }

    [Fact]
    public async Task L2_037_the_owners_page_is_never_stored_by_a_shared_cache()
    {
        await _factory.Arrange(Legacy());

        var response = await Owner().GetAsync("/api/listings/legacy-financial");

        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task L2_133_AC1_the_verification_team_is_recognised_by_its_role()
    {
        await _factory.Arrange(Legacy());

        var json = await _factory.GetJson(
            "/api/listings/legacy-financial",
            _factory.CreateMemberClient("Miriam Castillo", role: "verifier"));

        Assert.Equal("verifier", json.GetProperty("viewerRelation").GetString());
    }

    [Theory]
    [InlineData("owner")]
    [InlineData("verifier")]
    public async Task L2_028_AC3_a_listing_that_is_not_live_is_a_preview_for_its_owner_and_the_verification_team(string who)
    {
        await _factory.Arrange(Legacy(ListingMother.NonPublic(NonPublicState.ChangesRequested, "legacy-financial", "financial-insurance")));
        var client = who == "owner" ? Owner() : _factory.CreateMemberClient("Miriam Castillo", role: "verifier");

        var json = await _factory.GetJson("/api/listings/legacy-financial", client);

        Assert.Equal(who, json.GetProperty("viewerRelation").GetString());
        Assert.Equal("changes-requested", json.GetProperty("stage").GetString());
        Assert.False(json.GetProperty("verified").GetBoolean());
    }

    [Fact]
    public async Task L2_028_AC3_a_listing_that_is_not_live_is_not_found_for_anyone_else()
    {
        await _factory.Arrange(Legacy(ListingMother.NonPublic(NonPublicState.Paused, "legacy-financial", "financial-insurance")));

        var member = await _factory.CreateMemberClient("Joanna Adeyemi").GetAsync("/api/listings/legacy-financial");
        var visitor = await _factory.CreateClient().GetAsync("/api/listings/legacy-financial");

        Assert.Equal(HttpStatusCode.NotFound, member.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, visitor.StatusCode);
    }

    [Fact]
    public async Task L2_037_AC3_a_visitor_and_a_member_each_count_one_listing_view()
    {
        await _factory.Arrange(Legacy());

        var visitor = await _factory.CreateClient().PostAsync("/api/listings/legacy-financial/views", null);
        var member = await _factory.CreateMemberClient("Joanna Adeyemi").PostAsync("/api/listings/legacy-financial/views", null);

        Assert.Equal(HttpStatusCode.NoContent, visitor.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, member.StatusCode);
        Assert.Equal(2, await Views());
    }

    [Fact]
    public async Task L2_037_AC3_the_owners_own_visit_is_not_counted()
    {
        await _factory.Arrange(Legacy());

        var response = await Owner().PostAsync("/api/listings/legacy-financial/views", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(0, await Views());
    }

    [Fact]
    public async Task L2_037_AC3_a_repeat_visit_within_30_minutes_counts_once()
    {
        await _factory.Arrange(Legacy());
        var member = _factory.CreateMemberClient("Joanna Adeyemi");

        await member.PostAsync("/api/listings/legacy-financial/views", null);
        _factory.Clock.Advance(TimeSpan.FromMinutes(29));
        await member.PostAsync("/api/listings/legacy-financial/views", null);
        Assert.Equal(1, await Views());

        _factory.Clock.Advance(TimeSpan.FromMinutes(2));
        await member.PostAsync("/api/listings/legacy-financial/views", null);
        Assert.Equal(2, await Views());
    }

    [Fact]
    public async Task L2_037_AC3_a_known_bot_is_not_counted()
    {
        await _factory.Arrange(Legacy());
        var bot = _factory.CreateClient();
        bot.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");

        await bot.PostAsync("/api/listings/legacy-financial/views", null);

        Assert.Equal(0, await Views());
    }

    [Fact]
    public async Task L2_133_AC5_a_view_of_a_listing_that_is_not_public_is_refused()
    {
        await _factory.Arrange(Legacy(ListingMother.NonPublic(NonPublicState.Paused, "legacy-financial", "financial-insurance")));

        var response = await _factory.CreateMemberClient("Joanna Adeyemi").PostAsync("/api/listings/legacy-financial/views", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(0, await Views());
    }
}
