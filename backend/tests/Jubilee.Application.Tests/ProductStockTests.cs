using Jubilee.Domain;

namespace Jubilee.Application.Tests;

/// <summary>Stock and quantity rules of a product (L2-035 AC3, L2-036).</summary>
public class ProductStockTests
{
    private static Product Tee(params (string Label, int? Stock)[] options)
    {
        var tee = Product.Create(Guid.NewGuid(), "tee", "Tee", 3400, false, TileTint.Ink, TileIcon.Shirt, DateTimeOffset.UnixEpoch);
        tee.SetOptions("Size", [.. options.Select(o => new ProductOption(o.Label, o.Stock))]);
        return tee;
    }

    [Fact]
    public void L2_036_AC1_a_product_with_stock_0_in_every_option_is_sold_out()
    {
        Assert.True(Tee(("S", 0), ("M", 0)).IsSoldOut);
        Assert.False(Tee(("S", 0), ("M", 1)).IsSoldOut);
        Assert.False(Tee(("S", 0), ("M", null)).IsSoldOut);
    }

    [Fact]
    public void L2_036_AC1_a_product_without_options_is_sold_out_at_stock_0_and_never_when_untracked()
    {
        var mug = Tee();
        Assert.False(mug.IsSoldOut);
        mug.SetStock(0);
        Assert.True(mug.IsSoldOut);
    }

    [Fact]
    public void L2_036_the_last_option_reaching_0_makes_the_product_sold_out_and_a_restock_brings_it_back()
    {
        var tee = Tee(("S", 0), ("M", 2));

        Assert.Equal(StockChange.BecameSoldOut, tee.SetStock("M", 0));
        Assert.Equal(StockChange.None, tee.SetStock("S", 0));
        Assert.Equal(StockChange.BackInStock, tee.SetStock("S", 5));
        Assert.Equal(StockChange.None, tee.SetStock("M", 3));
    }

    [Fact]
    public void L2_035_AC3_the_bound_is_the_stock_or_99_when_untracked_and_the_largest_option_before_one_is_chosen()
    {
        var tee = Tee(("S", 8), ("M", 120), ("L", null));

        Assert.Equal([8, 99, 99], tee.Options.Select(o => o.MaxQuantity));
        Assert.Equal(99, tee.MaxQuantity);
        Assert.Equal(8, Tee(("S", 8), ("M", 0)).MaxQuantity);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(10000)]
    public void L2_091_AC4_stock_is_a_whole_number_from_0_to_9999(int stock)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Tee().SetStock(stock));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1000)]
    public void L2_091_AC3_the_minimum_order_quantity_is_1_to_999(int minimum)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Tee().SetMinimumQuantity(minimum));
    }
}
