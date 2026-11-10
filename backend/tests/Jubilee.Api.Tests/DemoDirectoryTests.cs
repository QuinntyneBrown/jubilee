using Jubilee.Api.Tests.Support;
using Microsoft.AspNetCore.Hosting;

namespace Jubilee.Api.Tests;

public sealed class SeededApiFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(IWebHostBuilder builder) => builder.UseSetting("Seed:OnStartup", "true");
}

/// <summary>
/// The API seeded on startup, as the e2e API is: the demo data is the mocks' catalogue, and the
/// Playwright suite relies on these facts.
/// </summary>
public class DemoDirectoryTests(SeededApiFactory factory) : IClassFixture<SeededApiFactory>
{
    private const string HomeProperty = "/api/categories/home-property/listings";

    [Fact]
    public async Task The_demo_welcome_counts_47_businesses_and_features_four()
    {
        var json = await factory.GetJson("/api/directory/welcome");

        Assert.Equal(47, json.GetProperty("liveBusinessCount").GetInt32());
        Assert.Equal(
            ["legacy-financial", "luzandre", "christian-bookstores", "adrianne-sequeira"],
            json.GetProperty("featured").Slugs());
    }

    [Fact]
    public async Task The_demo_home_features_the_five_businesses_of_the_mock_with_their_highlights()
    {
        var featured = (await factory.GetJson("/api/directory/home")).GetProperty("featured");

        Assert.Equal(
            [
                ("Legacy Financial", "Free first meeting"),
                ("Luzandre.com", "Ships across Canada"),
                ("Christian Bookstores", "Pickup in store"),
                ("Adrianne Sequeira, DMin., RP, RMFT, RN", "Accepting new clients"),
                ("WaterWorks Plumbing & Drains", "Emergency calls"),
            ],
            featured.EnumerateArray().Select(c => (c.GetProperty("name").GetString()!, c.GetProperty("highlight").GetString()!)));
    }

    [Fact]
    public async Task The_demo_home_shows_the_five_products_of_the_mock_newest_first()
    {
        var products = (await factory.GetJson("/api/directory/home")).GetProperty("products");

        Assert.Equal(
            [
                ("Faith heavyweight tee, charcoal", "Luzandre.com", 3400, false, "ink", "shirt"),
                ("Gold cross stoneware mug", "Luzandre.com", 2400, false, "gold", "mug"),
                ("Custom church team tee (min. 12)", "Luzandre.com", 2200, true, "blue", "shirt"),
                ("Morning mug, set of two", "Luzandre.com", 4200, false, "green", "mug"),
                ("Leather journaling Bible, ESV", "Christian Bookstores", 6400, false, "gold", "book"),
            ],
            products.EnumerateArray().Select(p => (
                p.GetProperty("name").GetString()!,
                p.GetProperty("shopName").GetString()!,
                p.GetProperty("priceCents").GetInt32(),
                p.GetProperty("perUnit").GetBoolean(),
                p.GetProperty("tile").GetProperty("tint").GetString()!,
                p.GetProperty("tile").GetProperty("icon").GetString()!)));
    }

    [Fact]
    public async Task The_demo_home_groups_match_the_mock_counts_and_row_order()
    {
        var groups = (await factory.GetJson("/api/directory/home")).GetProperty("groups");

        Assert.Equal(
            [
                ("Shops", 3, false), ("Financial & insurance", 3, false), ("Legal & immigration", 6, true),
                ("Home & property", 10, true), ("Real estate & living", 4, false), ("Health & family", 4, false),
                ("Business & tech", 5, true), ("Learning", 2, false), ("Media", 7, true), ("Community", 3, false),
            ],
            groups.EnumerateArray().Select(g => (
                g.GetProperty("name").GetString()!, g.GetProperty("count").GetInt32(), g.GetProperty("hasMore").GetBoolean())));

        string[] Names(int group) =>
            [.. groups[group].GetProperty("businesses").EnumerateArray().Select(b => b.GetProperty("name").GetString()!)];
        Assert.Equal(["Luzandre.com", "Christian Bookstores", "Flower Creations"], Names(0));
        Assert.Equal(
            ["Kevin Marshall, Barrister & Solicitor", "Desloges Law Group", "KYL Law Firm", "Law Office of Denise Badley-Castello"],
            Names(2));
        Assert.Equal(
            ["WaterWorks Plumbing & Drains", "Ace Waterproofing", "Atera Construction and Renovation", "Moore’s Cleaning Service"],
            Names(3));
        Assert.Equal(["Amen FM Christian Superstation", "FAITH TV", "Joy Radio CJYE", "JOY TV"], Names(8));
        Assert.Equal(
            ["The Scott Mission", "Teen Challenge Canada – Vehicle Donation", "Jesus in the City Parade and Festival"],
            Names(9));
    }

    [Fact]
    public async Task The_demo_home_and_property_page_matches_the_category_mock()
    {
        var json = await factory.GetJson(HomeProperty);

        Assert.Equal(10, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(3, json.GetProperty("fact").GetProperty("count").GetInt32());
        Assert.Equal(1, json.GetProperty("pageCount").GetInt32());
        Assert.Equal(
            [
                ("waterworks-plumbing-drains", "Emergency calls"),
                ("ace-waterproofing", "Free quote"),
                ("atera-construction-and-renovation", "Free quote"),
                ("moores-cleaning-service", "Weekly or one-time"),
            ],
            json.GetProperty("businesses").EnumerateArray().Take(4)
                .Select(b => (b.GetProperty("slug").GetString()!, b.GetProperty("highlight").GetString()!)));
    }

    [Fact]
    public async Task The_demo_filters_give_the_counts_the_mocks_show()
    {
        var emergency = await factory.GetJson($"{HomeProperty}/count?offers=emergency-calls");
        var quoteEastYork = await factory.GetJson($"{HomeProperty}/count?offers=free-quote&areas=east-york");
        var scarborough = await factory.GetJson($"{HomeProperty}/count?areas=scarborough");
        var noResults = await factory.GetJson($"{HomeProperty}?offers=emergency-calls,open-saturdays&areas=scarborough");
        var saturdays = await factory.GetJson($"{HomeProperty}?offers=open-saturdays");

        Assert.Equal(3, emergency.GetProperty("count").GetInt32());
        Assert.Equal(4, quoteEastYork.GetProperty("count").GetInt32()); // "Show 4 businesses"
        Assert.True(scarborough.GetProperty("count").GetInt32() >= 1);
        Assert.Equal(0, noResults.GetProperty("matchCount").GetInt32());
        Assert.Equal(
            [("emergency-calls", 0), ("open-saturdays", 0), ("scarborough", 3)],
            noResults.GetProperty("suggestions").EnumerateArray().Select(s => (
                s.GetProperty("removed").GetProperty("value").GetString()!, s.GetProperty("count").GetInt32())));
        // Two of the three that take emergency calls are open Saturdays, and no one else is.
        Assert.Equal(2, saturdays.GetProperty("matchCount").GetInt32());
    }

    [Fact]
    public async Task The_demo_name_order_files_the_scott_mission_under_s()
    {
        var json = await factory.GetJson("/api/categories/community/listings?sort=name");

        Assert.Equal(
            ["jesus-in-the-city-parade-and-festival", "the-scott-mission", "teen-challenge-canada-vehicle-donation"],
            json.GetProperty("businesses").Slugs());
    }

    [Theory]
    [InlineData("emmaus-road-coffee-roasters")]
    [InlineData("narrow-gate-tutoring")]
    [InlineData("living-stone-masonry")]
    [InlineData("bethel-gift-baskets")]
    [InlineData("shiloh-wellness-clinic")]
    public async Task L2_028_AC1_the_demo_listings_that_are_not_public_never_show(string slug)
    {
        var client = factory.CreateClient();
        string[] urls =
        [
            "/api/directory/welcome",
            "/api/directory/home",
            "/api/categories/shops/listings",
            "/api/categories/learning/listings",
            "/api/categories/home-property/listings",
            "/api/categories/health-family/listings",
        ];

        foreach (var url in urls)
        {
            Assert.DoesNotContain(slug, await client.GetStringAsync(url));
        }
    }

    [Fact]
    public async Task The_demo_luzandre_page_is_the_shop_mock()
    {
        var json = await factory.GetJson("/api/listings/luzandre");

        Assert.Equal("shop", json.GetProperty("kind").GetString());
        Assert.Equal(4, json.GetProperty("productCount").GetInt32());
        Assert.Equal(
            ["faith-heavyweight-tee-charcoal", "gold-cross-stoneware-mug", "custom-church-team-tee", "morning-mug-set-of-two"],
            json.GetProperty("products").Slugs());
        Assert.Equal(
            ["Custom design consultation", "Church merch package"],
            json.GetProperty("services").EnumerateArray().Select(s => s.GetProperty("name").GetString()));
        Assert.Equal("few-hours", json.GetProperty("details").GetProperty("replies").GetString());
        Assert.Equal(["christian-bookstores", "flower-creations"], json.GetProperty("related").Slugs());
    }

    [Fact]
    public async Task The_demo_legacy_financial_page_is_the_business_mock()
    {
        var json = await factory.GetJson("/api/listings/legacy-financial");

        Assert.Equal("services", json.GetProperty("kind").GetString());
        Assert.Equal("Trevor Chew, CKA®, CFP®, CLU®", json.GetProperty("ownerName").GetString());
        Assert.Equal(
            ["Discovery meeting", "Retirement & RRSP review", "Life & disability insurance review", "Estate & legacy plan"],
            json.GetProperty("services").EnumerateArray().Select(s => s.GetProperty("name").GetString()));
        Assert.Equal(new DateTimeOffset(2026, 3, 16, 14, 0, 0, TimeSpan.Zero), json.GetProperty("details").GetProperty("onJubileeSince").GetDateTimeOffset());
        Assert.Equal("day", json.GetProperty("details").GetProperty("replies").GetString());
        Assert.Equal(
            [("Deeks Insurance", "Get a quote"), ("JD Smith Insurance Brokers", "Get a quote")],
            json.GetProperty("related").EnumerateArray().Select(c => (c.GetProperty("name").GetString()!, c.GetProperty("highlight").GetString()!)));
    }
}
