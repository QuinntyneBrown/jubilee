using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

/// <summary>The listing page of a service business (L2-033), related businesses (L2-040) and who may see it (L2-028).</summary>
public class ListingPageTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public ListingPageTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static string Url(string slug) => $"/api/listings/{slug}";

    private static Listing Legacy()
    {
        var listing = ListingMother.Public(
            "legacy-financial",
            "financial-insurance",
            "Legacy Financial",
            highlight: "Free first meeting",
            tagline: "Build a Legacy. Protect a Legacy. Leave a Legacy.");
        listing.Describe(new ListingProfile(
            OwnerName: "Trevor Chew, CKA®, CFP®, CLU®",
            Credentials: ["CKA® · CFP® · CLU®"],
            About: "Financial planning grounded in biblical stewardship.",
            Where: "2 Sheppard Ave E, North York · video across Ontario",
            Hours: "Mon–Fri 9:00–5:00 · Thu until 8:00",
            Languages: "English, Cantonese",
            Delivery: null,
            MadeToOrder: null));
        listing.SetMedianResponseMinutes(600);
        return listing;
    }

    private static Service[] LegacyServices(Listing listing) =>
    [
        Service.Create(listing.Id, 1, "Discovery meeting", "30 min · In person or video", ServicePrice.Free, ServiceAction.Book),
        Service.Create(listing.Id, 2, "Retirement & RRSP review", "60 min · Bring your statements", ServicePrice.Ask, ServiceAction.Book),
        Service.Create(listing.Id, 3, "Church and ministry treasurer training", "Half day · On site", ServicePrice.Amount(125000), ServiceAction.Ask),
    ];

    [Fact]
    public async Task L2_033_AC1_a_service_business_page_carries_everything_its_page_shows()
    {
        var legacy = Legacy();
        await _factory.Arrange(legacy);

        var json = await _factory.GetJson(Url("legacy-financial"));

        Assert.Equal("legacy-financial", json.GetProperty("slug").GetString());
        Assert.Equal("services", json.GetProperty("kind").GetString());
        Assert.Equal("Legacy Financial", json.GetProperty("name").GetString());
        Assert.Equal("financial-insurance", json.GetProperty("category").GetProperty("slug").GetString());
        Assert.Equal("Financial & insurance", json.GetProperty("category").GetProperty("name").GetString());
        Assert.True(json.GetProperty("verified").GetBoolean()); // L2-111 AC1
        Assert.Equal("Trevor Chew, CKA®, CFP®, CLU®", json.GetProperty("ownerName").GetString());
        Assert.Equal("Build a Legacy. Protect a Legacy. Leave a Legacy.", json.GetProperty("tagline").GetString());
        Assert.Equal(["CKA® · CFP® · CLU®"], json.GetProperty("credentials").EnumerateArray().Select(c => c.GetString()));
        Assert.Equal("Free first meeting", json.GetProperty("highlight").GetString());
        Assert.Equal("Financial planning grounded in biblical stewardship.", json.GetProperty("about").GetString());
        Assert.Equal("visitor", json.GetProperty("viewerRelation").GetString());

        var details = json.GetProperty("details");
        Assert.Equal("2 Sheppard Ave E, North York · video across Ontario", details.GetProperty("where").GetString());
        Assert.Equal("Mon–Fri 9:00–5:00 · Thu until 8:00", details.GetProperty("hours").GetString());
        Assert.Equal("English, Cantonese", details.GetProperty("languages").GetString());
        Assert.Equal(legacy.CreatedAt, details.GetProperty("onJubileeSince").GetDateTimeOffset());
        Assert.Equal("day", details.GetProperty("replies").GetString());
    }

    [Fact]
    public async Task L2_033_AC2_each_service_has_name_detail_price_and_action_in_the_owners_order()
    {
        var legacy = Legacy();
        await _factory.Arrange([legacy, .. LegacyServices(legacy).Reverse()]);

        var services = (await _factory.GetJson(Url("legacy-financial"))).GetProperty("services");

        Assert.Equal(
            [
                ("Discovery meeting", "30 min · In person or video", "free", (int?)null, "book"),
                ("Retirement & RRSP review", "60 min · Bring your statements", "ask", null, "book"),
                ("Church and ministry treasurer training", "Half day · On site", "amount", 125000, "ask"),
            ],
            services.EnumerateArray().Select(s => (
                s.GetProperty("name").GetString()!,
                s.GetProperty("detail").GetString()!,
                s.GetProperty("priceKind").GetString()!,
                s.GetProperty("priceCents").ValueKind == JsonValueKind.Null ? (int?)null : s.GetProperty("priceCents").GetInt32(),
                s.GetProperty("action").GetString()!)));
        Assert.All(services.EnumerateArray(), s => Assert.NotEqual(Guid.Empty, s.GetProperty("id").GetGuid()));
    }

    [Fact]
    public async Task L2_033_AC3_every_one_of_ten_services_and_every_credential_is_returned()
    {
        var legacy = Legacy();
        string[] credentials = ["CKA®", "CFP®", "CLU®", "CHS®", "RRC®", "CPA", "Member, Kingdom Advisors", "Licensed in Ontario and Quebec"];
        legacy.Describe(new ListingProfile("Trevor Chew", credentials, null, null, null, null, null, null));
        var services = Enumerable.Range(1, 10)
            .Select(i => Service.Create(legacy.Id, i, $"Service {i}", "45 min", ServicePrice.Free, ServiceAction.Book));
        await _factory.Arrange([legacy, .. services]);

        var json = await _factory.GetJson(Url("legacy-financial"));

        Assert.Equal(10, json.GetProperty("services").GetArrayLength());
        Assert.Equal(credentials, json.GetProperty("credentials").EnumerateArray().Select(c => c.GetString()));
    }

    [Fact]
    public async Task L2_033_AC4_a_business_without_services_returns_an_empty_list_and_omits_details_it_lacks()
    {
        await _factory.Arrange(ListingMother.Public("new-on-jubilee", "learning"));

        var json = await _factory.GetJson(Url("new-on-jubilee"));

        Assert.Equal(0, json.GetProperty("services").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("ownerName").ValueKind);
        Assert.Equal(JsonValueKind.Null, json.GetProperty("details").GetProperty("hours").ValueKind);
    }

    [Theory]
    [InlineData(1, "few-hours")]
    [InlineData(359, "few-hours")]
    [InlineData(360, "day")]
    [InlineData(1439, "day")]
    [InlineData(1440, "few-days")]
    [InlineData(null, null)]
    public async Task L2_033_AC5_replies_reads_the_band_of_the_median_first_reply_time(int? minutes, string? band)
    {
        var legacy = Legacy();
        legacy.SetMedianResponseMinutes(minutes);
        await _factory.Arrange(legacy);

        var replies = (await _factory.GetJson(Url("legacy-financial"))).GetProperty("details").GetProperty("replies");

        Assert.Equal(band, replies.ValueKind == JsonValueKind.Null ? null : replies.GetString());
    }

    [Theory]
    [InlineData(NonPublicState.Draft)]
    [InlineData(NonPublicState.ReadyToReview)]
    [InlineData(NonPublicState.ChangesRequested)]
    [InlineData(NonPublicState.Paused)]
    [InlineData(NonPublicState.Deleted)]
    [InlineData(NonPublicState.UnderModerationHold)]
    public async Task L2_028_AC3_a_listing_that_is_not_public_is_not_found_by_a_visitor_or_another_member(NonPublicState state)
    {
        await _factory.Arrange(ListingMother.NonPublic(state, "hidden"));

        var visitor = await _factory.CreateClient().GetAsync(Url("hidden"));
        var member = await _factory.CreateMemberClient().GetAsync(Url("hidden"));

        Assert.Equal(HttpStatusCode.NotFound, visitor.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, member.StatusCode);
        Assert.Equal("listing_not_found", JsonDocument.Parse(await visitor.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_028_AC3_an_unknown_slug_is_not_found()
    {
        var response = await _factory.CreateClient().GetAsync(Url("no-such-business"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task L2_040_AC1_related_shows_two_other_live_businesses_of_the_category_in_recommended_order()
    {
        await _factory.Arrange(
            Legacy(),
            ListingMother.Public("deeks", "financial-insurance", approvedAt: ListingMother.Now.AddDays(-2)),
            ListingMother.Public("jd-smith", "financial-insurance", approvedAt: ListingMother.Now.AddDays(-3)),
            ListingMother.Public("oldest", "financial-insurance", approvedAt: ListingMother.Now.AddDays(-30)),
            ListingMother.NonPublic(NonPublicState.Paused, "paused", "financial-insurance"),
            ListingMother.Public("elsewhere", "media"));

        var related = (await _factory.GetJson(Url("legacy-financial"))).GetProperty("related");

        Assert.Equal(["deeks", "jd-smith"], related.Slugs());
        Assert.All(related.EnumerateArray(), card =>
        {
            Assert.True(card.GetProperty("verified").GetBoolean());
            Assert.Equal("financial-insurance", card.GetProperty("categorySlug").GetString());
        });
    }

    [Fact]
    public async Task L2_040_AC1_related_never_includes_the_listing_itself()
    {
        await _factory.Arrange(
            ListingMother.Public("first", "financial-insurance", approvedAt: ListingMother.Now.AddDays(-1)),
            ListingMother.Public("second", "financial-insurance", approvedAt: ListingMother.Now.AddDays(-2)));

        var related = (await _factory.GetJson(Url("first"))).GetProperty("related");

        Assert.Equal(["second"], related.Slugs());
    }

    [Fact]
    public async Task L2_040_AC2_related_is_empty_when_no_other_business_of_the_category_is_live()
    {
        await _factory.Arrange(
            Legacy(),
            ListingMother.NonPublic(NonPublicState.Draft, "draft", "financial-insurance"),
            ListingMother.Public("elsewhere", "media"));

        var related = (await _factory.GetJson(Url("legacy-financial"))).GetProperty("related");

        Assert.Equal(0, related.GetArrayLength());
    }

    [Fact]
    public async Task L2_156_a_visitors_answer_may_be_cached_publicly_and_a_members_is_never_stored()
    {
        await _factory.Arrange(Legacy());

        var visitor = await _factory.CreateClient().GetAsync(Url("legacy-financial"));
        var member = await _factory.CreateMemberClient().GetAsync(Url("legacy-financial"));

        Assert.True(visitor.Headers.CacheControl?.Public);
        Assert.Equal(TimeSpan.FromSeconds(60), visitor.Headers.CacheControl?.MaxAge);
        Assert.Contains("Cookie", visitor.Headers.Vary);
        Assert.True(member.Headers.CacheControl?.NoStore);
        Assert.False(member.Headers.CacheControl?.Public ?? false);
    }
}
