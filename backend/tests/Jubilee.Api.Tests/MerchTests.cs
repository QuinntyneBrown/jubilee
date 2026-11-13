using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-263, L2-264
// Description: anyone reads the Purpose Tee, its fits, sizes and what is left of each.
public partial class MerchTests(MerchApiFactory factory) : IClassFixture<MerchApiFactory>, IAsyncLifetime
{
    private const string Product = "/api/merch/purpose-tee";

    public async Task InitializeAsync()
    {
        await factory.Reset();
        await factory.WithDb(async db =>
        {
            db.RemoveRange(db.MerchOrderLines);
            db.RemoveRange(db.MerchOrders);
            db.RemoveRange(db.MerchVariants);
            db.RemoveRange(db.MerchProducts);
            await db.SaveChangesAsync();
            await MerchCatalogue.SeedAsync(db, factory.Clock.GetUtcNow(), CancellationToken.None);
        });
        factory.Gateway.Reset();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static JsonElement Size(JsonElement product, string sku) =>
        product.GetProperty("fits").EnumerateArray()
            .SelectMany(f => f.GetProperty("sizes").EnumerateArray())
            .Single(s => s.GetProperty("sku").GetString() == sku);

    // L2-263 AC4
    // Given a visitor with no session, when they read the Purpose Tee,
    // then it answers the price, the shipping and the fits in order, each size with what is left.
    [Fact]
    public async Task L2_263_AC4_anyone_reads_the_purpose_tee_with_its_fits_and_sizes()
    {
        var product = await factory.GetJson(Product);

        Assert.Equal("Purpose Tee", product.GetProperty("name").GetString());
        Assert.Equal("Black", product.GetProperty("colour").GetString());
        Assert.Equal(2500, product.GetProperty("unitPriceCents").GetInt32());
        Assert.Equal("CAD", product.GetProperty("currency").GetString());
        Assert.Equal(900, product.GetProperty("shippingCents").GetInt32());
        Assert.Equal(6000, product.GetProperty("freeShippingFromCents").GetInt32());
        var fits = product.GetProperty("fits").EnumerateArray().ToList();
        Assert.Equal(["youth", "womens", "mens"], fits.Select(f => f.GetProperty("key").GetString()));
        Assert.Equal(["Youth", "Women’s", "Men’s"], fits.Select(f => f.GetProperty("name").GetString()));
        Assert.All(fits, f => Assert.False(string.IsNullOrWhiteSpace(f.GetProperty("note").GetString())));
        Assert.All(fits, f => Assert.False(string.IsNullOrWhiteSpace(f.GetProperty("guideNote").GetString())));
        Assert.Equal(["XS", "S", "M", "L", "XL"], fits[0].GetProperty("sizes").EnumerateArray().Select(s => s.GetProperty("label").GetString()));
        Assert.Equal(["XS", "S", "M", "L", "XL", "2XL"], fits[1].GetProperty("sizes").EnumerateArray().Select(s => s.GetProperty("label").GetString()));
        Assert.Equal(["S", "M", "L", "XL", "2XL", "3XL"], fits[2].GetProperty("sizes").EnumerateArray().Select(s => s.GetProperty("label").GetString()));

        var mensL = Size(product, "mens-L");
        Assert.Equal(22, mensL.GetProperty("chest").GetDecimal());
        Assert.Equal(30, mensL.GetProperty("length").GetDecimal());
        Assert.Equal(JsonValueKind.Null, mensL.GetProperty("left").ValueKind);
        Assert.Equal(JsonValueKind.Null, mensL.GetProperty("ages").ValueKind);
        Assert.Equal("14–16", Size(product, "youth-L").GetProperty("ages").GetString());
        Assert.Equal(3, Size(product, "youth-L").GetProperty("left").GetInt32());
        Assert.Equal(0, Size(product, "youth-XL").GetProperty("left").GetInt32());
        Assert.Equal(2, Size(product, "mens-3XL").GetProperty("left").GetInt32());
    }

    // L2-263 AC4, L2-267 AC2
    // Given a pending order still holding 2 of Youth L, when the tee is read, then 1 is left;
    // given its hold has expired, then 3 are left again.
    [Fact]
    public async Task L2_263_AC4_left_is_the_stock_less_what_pending_orders_hold()
    {
        await factory.ArrangePendingOrder(("youth-L", 2), expiresIn: TimeSpan.FromMinutes(30));

        Assert.Equal(1, Size(await factory.GetJson(Product), "youth-L").GetProperty("left").GetInt32());

        factory.Clock.Advance(TimeSpan.FromMinutes(31));
        Assert.Equal(3, Size(await factory.GetJson(Product), "youth-L").GetProperty("left").GetInt32());
    }

    // L2-263 AC5
    // Given the price changes on the server, when the tee is read again, then it answers the new price.
    [Fact]
    public async Task L2_263_AC5_the_price_is_read_from_the_server_rows()
    {
        await factory.WithDb(async db =>
        {
            var product = await db.MerchProducts.SingleAsync();
            product.Reprice(2800);
            await db.SaveChangesAsync();
        });

        Assert.Equal(2800, (await factory.GetJson(Product)).GetProperty("unitPriceCents").GetInt32());
    }

    // Seed is idempotent and never resets the stock the team has set.
    [Fact]
    public async Task L2_263_AC4_seeding_again_changes_nothing()
    {
        await factory.WithDb(async db =>
        {
            (await db.MerchVariants.SingleAsync(v => v.Sku == "mens-M")).SetStock(7);
            await db.SaveChangesAsync();
            await MerchCatalogue.SeedAsync(db, factory.Clock.GetUtcNow(), CancellationToken.None);
        });

        Assert.Equal(1, await factory.Query(db => db.MerchProducts.CountAsync()));
        Assert.Equal(17, await factory.Query(db => db.MerchVariants.CountAsync()));
        Assert.Equal(7, Size(await factory.GetJson(Product), "mens-M").GetProperty("left").GetInt32());
    }

    // L2-263 AC6
    [Fact]
    public async Task L2_263_AC6_the_help_answer_says_the_one_thing_Jubilee_sells()
    {
        var help = await factory.GetJson("/api/content/help");
        var answer = help.GetProperty("sections").EnumerateArray()
            .Single(s => s.GetProperty("heading").GetString() == "Does Jubilee take payment?");

        Assert.Equal(
            "Not for anything you buy from a business. You send a booking, quote or order request, the business confirms it, and you pay the business directly in the way they offer. The one thing Jubilee sells is its own shirt, the Purpose Tee, paid by card on Stripe’s secure checkout.",
            answer.GetProperty("body").GetString());
    }
}
