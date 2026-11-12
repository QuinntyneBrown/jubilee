using System.Text.Json;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Ratings on cards: L2-230.
public sealed partial class ReviewTests
{
    private async Task CountStars(Listing listing, StarCounts stars)
    {
        await _factory.WithDb(async db =>
        {
            var stored = db.Listings.Single(l => l.Id == listing.Id);
            stored.CountStars(stars);
            await db.SaveChangesAsync();
        });
        _factory.Services.GetRequiredService<Application.Directory.IDirectoryReadCache>().Invalidate();
    }

    private static JsonElement CardOf(JsonElement cards, string slug) =>
        cards.EnumerateArray().Single(c => c.GetProperty("slug").GetString() == slug);

    // L2-230 AC1, AC4
    [Fact]
    public async Task L2_227_AC1_a_business_card_carries_the_average_and_count_from_three_reviews()
    {
        await CountStars(_listing, new StarCounts(3, 2, 0, 0, 0));

        var page = await _factory.GetJson("/api/categories/financial-insurance/listings");

        var rating = CardOf(page.GetProperty("businesses"), "legacy-financial").GetProperty("rating");
        Assert.Equal(4.6m, rating.GetProperty("average").GetDecimal());
        Assert.Equal(5, rating.GetProperty("count").GetInt32());
    }

    // L2-230 AC3
    [Fact]
    public async Task L2_227_AC3_a_card_with_fewer_than_three_reviews_carries_no_rating()
    {
        await CountStars(_listing, new StarCounts(1, 1, 0, 0, 0));

        var page = await _factory.GetJson("/api/categories/financial-insurance/listings");

        Assert.Equal(JsonValueKind.Null, CardOf(page.GetProperty("businesses"), "legacy-financial").GetProperty("rating").ValueKind);
    }

    // L2-230 AC1: a space card
    [Fact]
    public async Task L2_227_AC1_a_space_card_carries_its_rating()
    {
        var suite = ListingMother.Space("guest-suite", SpaceTerm.ShortStay, 120);
        await _factory.Arrange(suite);
        await CountStars(suite, new StarCounts(2, 1, 0, 0, 0));

        var page = await _factory.GetJson("/api/categories/rooms-rentals/listings");

        Assert.Equal(4.7m, CardOf(page.GetProperty("spaces"), "guest-suite").GetProperty("rating").GetProperty("average").GetDecimal());
    }

    // L2-230 AC2, AC5, L2-237 AC9
    [Fact]
    public async Task L2_227_AC2_a_product_card_carries_the_rating_of_the_reviews_about_it()
    {
        var shop = ListingMother.Public("luzandre", "shops", "Luzandre.com");
        var mug = Product.Create(shop.Id, "gold-cross-stoneware-mug", "Gold cross stoneware mug", 2400, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now);
        await _factory.Arrange(shop, mug);
        await _factory.WithDb(async db =>
        {
            db.Products.Single(p => p.Id == mug.Id).CountStars(new StarCounts(2, 1, 0, 0, 0));
            await db.SaveChangesAsync();
        });
        _factory.Services.GetRequiredService<Application.Directory.IDirectoryReadCache>().Invalidate();

        var page = await _factory.GetJson("/api/listings/luzandre");

        var card = page.GetProperty("products").EnumerateArray().Single();
        Assert.Equal(4.7m, card.GetProperty("rating").GetProperty("average").GetDecimal());
        Assert.Equal(3, card.GetProperty("rating").GetProperty("count").GetInt32());
    }
}
