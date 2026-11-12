using System.Net;
using System.Net.Http.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-113 AC2
// Description: when an owner changes the business name, the listing's slug follows it and the old slug is kept;
// the old slug answers 301 to the current one, and is never given to another listing (ADR 0056).
public sealed class KeptSlugTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private Member _naomi = null!;
    private Listing _listing = null!;

    public async Task InitializeAsync()
    {
        await factory.Reset();
        _naomi = Member.Join(EmailAddress.TryParse("naomi@luzandre.example")!, "Naomi", "Laurent", null, "hash", ListingMother.Now);
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", tagline: "Custom church team tees");
        _listing.AssignOwner(_naomi.Id.ToString());
        var tee = Product.Create(_listing.Id, "faith-tee", "Faith heavyweight tee, charcoal", 3400, false, TileTint.Ink, TileIcon.Shirt, ListingMother.Now);
        await factory.Arrange(_naomi, _listing, tee);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Naomi() => factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString());

    private static object Body(int version, string name) =>
        new { version, name, tagline = "Custom church team tees", category = "shops", about = "We print.", where = "Leslieville", hours = "Mon to Fri, 10 to 6", website = "", highlight = "" };

    private async Task Rename(string name, int version)
    {
        var response = await Naomi().PutAsJsonAsync("/api/my-business/listing", Body(version, name));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task L2_113_AC2_a_new_name_gives_the_listing_a_new_slug_and_keeps_the_old_one()
    {
        await Rename("Luzandre Print Co.", 0);

        await factory.WithDb(async db =>
        {
            var listing = await db.Listings.AsNoTracking().SingleAsync(l => l.Id == _listing.Id);
            Assert.Equal("luzandre-print-co", listing.Slug);
            var kept = await db.ListingSlugs.AsNoTracking().SingleAsync();
            Assert.Equal("luzandre-com", kept.Slug);
            Assert.Equal(_listing.Id, kept.ListingId);
        });
        var page = await factory.GetJson("/api/listings/luzandre-print-co");
        Assert.Equal("Luzandre Print Co.", page.GetProperty("name").GetString());
    }

    [Fact]
    public async Task L2_113_AC2_the_old_slug_answers_301_to_the_listing_and_its_products_under_the_current_slug()
    {
        await Rename("Luzandre Print Co.", 0);
        var client = factory.CreateNoRedirectClient();

        var listing = await client.GetAsync("/api/listings/luzandre-com");
        var product = await client.GetAsync("/api/listings/luzandre-com/products/faith-tee");

        Assert.Equal(HttpStatusCode.MovedPermanently, listing.StatusCode);
        Assert.Equal("/api/listings/luzandre-print-co", listing.Headers.Location?.OriginalString);
        Assert.Equal(HttpStatusCode.MovedPermanently, product.StatusCode);
        Assert.Equal("/api/listings/luzandre-print-co/products/faith-tee", product.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task L2_113_AC2_a_slug_that_was_never_used_still_answers_404()
    {
        await Rename("Luzandre Print Co.", 0);

        var response = await factory.CreateNoRedirectClient().GetAsync("/api/listings/no-such-business");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task L2_113_AC2_a_kept_slug_is_never_given_to_another_listing()
    {
        await Rename("Luzandre Print Co.", 0);
        var samuel = Member.Join(EmailAddress.TryParse("samuel@example.com")!, "Samuel", "Park", null, "hash", ListingMother.Now);
        var other = ListingMother.Public("park-tees", "shops", "Park Tees", tagline: "Tees");
        other.AssignOwner(samuel.Id.ToString());
        await factory.Arrange(samuel, other);

        var response = await factory.CreateMemberClient("Samuel Park", samuel.Id.ToString())
            .PutAsJsonAsync("/api/my-business/listing", Body(0, "Luzandre.com"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var slug = await factory.Query(db => db.Listings.AsNoTracking().Where(l => l.Id == other.Id).Select(l => l.Slug).SingleAsync());
        Assert.Equal("luzandre-com-2", slug);
        var old = await factory.CreateNoRedirectClient().GetAsync("/api/listings/luzandre-com");
        Assert.Equal("/api/listings/luzandre-print-co", old.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task L2_113_AC2_a_name_changed_back_takes_its_old_slug_back_and_the_other_one_is_kept()
    {
        await Rename("Luzandre Print Co.", 0);
        await Rename("Luzandre.com", 1);

        var slug = await factory.Query(db => db.Listings.AsNoTracking().Where(l => l.Id == _listing.Id).Select(l => l.Slug).SingleAsync());
        Assert.Equal("luzandre-com", slug);
        var client = factory.CreateNoRedirectClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/listings/luzandre-com")).StatusCode);
        var renamed = await client.GetAsync("/api/listings/luzandre-print-co");
        Assert.Equal(HttpStatusCode.MovedPermanently, renamed.StatusCode);
        Assert.Equal("/api/listings/luzandre-com", renamed.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task L2_113_AC2_a_save_that_keeps_the_name_keeps_the_slug()
    {
        await Rename("Luzandre.com", 0);

        Assert.Equal(0, await factory.Query(db => db.ListingSlugs.CountAsync()));
        var slug = await factory.Query(db => db.Listings.AsNoTracking().Where(l => l.Id == _listing.Id).Select(l => l.Slug).SingleAsync());
        Assert.Equal("luzandre-com", slug);
    }
}
