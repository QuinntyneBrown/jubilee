using System.Net;
using System.Text.Json;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

// A deleted product on members' saved lists: L2-092 AC2 (ADR 0063).
public sealed partial class CatalogueTests
{
    [Fact]
    public async Task L2_092_AC2_members_who_saved_a_deleted_product_see_it_no_longer_available_and_can_remove_it()
    {
        var mug = Item("gold-mug", 2400, stock: 5, position: 1);
        await _factory.Arrange(mug);
        var joanna = Joanna();
        Assert.Equal(HttpStatusCode.NoContent, (await joanna.PutAsync("/api/saved/products/luzandre-com/gold-mug", null)).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await Naomi().DeleteAsync($"/api/my-business/products/{mug.Id}")).StatusCode);

        var list = await Json(await joanna.GetAsync("/api/saved"));
        var item = Assert.Single(list.GetProperty("items").EnumerateArray());
        Assert.Equal("product", item.GetProperty("kind").GetString());
        Assert.Equal("gold mug", item.GetProperty("name").GetString());
        Assert.False(item.GetProperty("available").GetBoolean());
        Assert.Equal(JsonValueKind.Null, item.GetProperty("product").ValueKind);
        Assert.Equal(0, list.GetProperty("productCount").GetInt32());

        var removed = await joanna.DeleteAsync($"/api/saved/items/{item.GetProperty("id").GetGuid()}");

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Empty((await Json(await joanna.GetAsync("/api/saved"))).GetProperty("items").EnumerateArray());
    }
}
