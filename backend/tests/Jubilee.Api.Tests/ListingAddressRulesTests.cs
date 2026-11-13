using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Tests.Shared;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

public sealed class ReservedPizzaFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(IWebHostBuilder builder) =>
        builder.UseSetting("Addresses:Reserved", "pizza, Bakery");
}

// Acceptance Test
// Traces to: L2-241 AC2, AC3, AC4; L2-242 AC1, AC2, AC4, AC5; L2-072 AC5
// Description: the slug of a published listing is one DNS label made from the business name: lower case, no accents,
// single hyphens, at most 40 characters, "business-{n}" when the name gives fewer than 3, and never a reserved word
// or a slug another listing has or had (ADR 0067).
public sealed class ListingAddressRulesTests(ReservedPizzaFactory factory) : IClassFixture<ReservedPizzaFactory>, IAsyncLifetime
{
    private int _member;

    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>Publishes a shop named <paramref name="name"/> as a new member and answers its slug.</summary>
    private async Task<string> SlugOf(string name) =>
        JsonDocument.Parse(await (await Publish(name)).Content.ReadAsStringAsync()).RootElement.GetProperty("slug").GetString()!;

    private async Task<HttpResponseMessage> Publish(string name, Action? beforePublish = null)
    {
        var client = factory.CreateMemberClient("Naomi Laurent", $"member|owner-{++_member}");
        var body = new Dictionary<string, object?>
        {
            ["kind"] = "products",
            ["name"] = name,
            ["tagline"] = "Custom church team tees",
            ["categorySlug"] = "shops",
            ["highlight"] = null,
            ["place"] = "Leslieville",
            ["agreed"] = true,
            ["items"] = Array.Empty<object>(),
            ["idempotencyKey"] = Guid.NewGuid().ToString(),
        };
        var draft = await client.PostAsJsonAsync("/api/listing-drafts", body);
        Assert.Equal(HttpStatusCode.Created, draft.StatusCode);
        var id = JsonDocument.Parse(await draft.Content.ReadAsStringAsync()).RootElement.GetProperty("id").GetGuid();
        beforePublish?.Invoke();
        return await client.PostAsJsonAsync($"/api/listing-drafts/{id}/publish", body);
    }

    [Theory]
    [InlineData("Luzandre.com", "luzandre-com")]
    [InlineData("  Café Été & Fils!  ", "cafe-ete-fils")]
    [InlineData("🙏 Grace 🙏 Bakery Co", "grace-bakery-co")]
    [InlineData("St. John's -- Books", "st-john-s-books")]
    [InlineData("XN--Bücher", "xn-bucher")]
    public async Task L2_241_AC2_the_slug_is_the_name_in_lower_case_without_accents_with_single_hyphens(string name, string slug)
    {
        Assert.Equal(slug, await SlugOf(name));
    }

    [Fact]
    public async Task L2_241_AC2_a_long_name_is_cut_to_40_characters_and_never_ends_in_a_hyphen()
    {
        var slug = await SlugOf("Abundant Life Renovations and Plumbing S Toronto East");

        Assert.Equal("abundant-life-renovations-and-plumbing-s", slug);
        Assert.Equal(40, slug.Length);

        // The 40th character of this one is a hyphen, so the cut drops it.
        Assert.Equal("abundant-life-renovations-and-plumbings", await SlugOf("Abundant Life Renovations and Plumbings Toronto"));
    }

    [Theory]
    [InlineData("🙏🙏")]
    [InlineData("AB")]
    [InlineData("聖書")]
    public async Task L2_241_AC3_a_name_that_gives_fewer_than_3_characters_becomes_business_with_a_number(string name)
    {
        Assert.Equal("business-1", await SlugOf(name));
        Assert.Equal("business-2", await SlugOf(name));
    }

    [Fact]
    public async Task L2_241_AC4_a_suffix_cuts_the_slug_so_the_whole_stays_within_40()
    {
        const string Name = "Abundant Life Renovations and Plumbing S Toronto East";
        await SlugOf(Name);

        var second = await SlugOf(Name);

        Assert.Equal("abundant-life-renovations-and-plumbing-2", second);
        Assert.Equal(40, second.Length);
    }

    [Fact]
    public async Task L2_242_AC1_names_that_differ_only_in_capitals_do_not_share_a_slug()
    {
        Assert.Equal("luzandre-com", await SlugOf("Luzandre.com"));
        Assert.Equal("luzandre-com-2", await SlugOf("LUZANDRE.COM"));
    }

    [Fact]
    public async Task L2_242_AC2_the_slug_of_a_listing_deleted_with_its_owners_account_is_never_given_again()
    {
        await factory.Arrange(ListingMother.NonPublic(NonPublicState.Deleted, "luzandre-com"), ListingMother.NonPublic(NonPublicState.Paused, "park-tees"));

        Assert.Equal("luzandre-com-2", await SlugOf("Luzandre.com"));
        Assert.Equal("park-tees-2", await SlugOf("Park Tees"));
    }

    [Theory]
    [InlineData("Admin", "admin-2")]
    [InlineData("WWW", "www-2")]
    [InlineData("Jubilee!", "jubilee-2")]
    [InlineData("Sign-in", "sign-in")]
    [InlineData("Pizza", "pizza-2")]
    [InlineData("bakery", "bakery-2")]
    public async Task L2_242_AC4_a_reserved_word_built_in_or_set_is_treated_as_taken(string name, string slug)
    {
        Assert.Equal(slug, await SlugOf(name));
    }

    [Fact]
    public async Task L2_242_AC3_two_owners_who_publish_the_same_name_at_the_same_moment_are_both_published()
    {
        // The other owner's publish lands between this one's look for a free slug and its save.
        var response = await Publish("Luzandre.com", () => factory.Database.RaceBeforeNextSave =
            () => factory.Arrange(ListingMother.Public("luzandre-com", "shops", "Luzandre.com")));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("luzandre-com-2", JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("slug").GetString());
        var slugs = await factory.Query(db => db.Listings.AsNoTracking().Select(l => l.Slug).OrderBy(s => s).ToListAsync());
        Assert.Equal(["luzandre-com", "luzandre-com-2"], slugs);
    }

    [Fact]
    public async Task L2_242_AC3_a_save_that_fails_for_another_reason_still_fails()
    {
        var response = await Publish("Luzandre.com", () => factory.Database.RaceBeforeNextSave = () => Task.CompletedTask);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(0, await factory.Query(db => db.Listings.CountAsync()));
    }
}
