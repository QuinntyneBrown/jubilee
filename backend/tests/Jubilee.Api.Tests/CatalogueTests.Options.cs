using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Jubilee.Api.Tests;

// Options and minimum order from the product editor: L2-091 AC8 (ADR 0063).
public sealed partial class CatalogueTests
{
    [Fact]
    public async Task L2_091_AC8_removing_the_last_option_gives_the_product_its_own_stock_again()
    {
        var naomi = Naomi();
        var created = await Json(await naomi.PostAsJsonAsync("/api/my-business/products", new
        {
            name = "Team tee", price = "22.00", minimumQuantity = 12, optionName = "Size",
            options = new[] { new { label = "S", stock = (int?)20 }, new { label = "M", stock = (int?)0 } },
        }));
        var id = created.GetProperty("id").GetGuid();

        var saved = await Json(await naomi.PutAsJsonAsync($"/api/my-business/products/{id}", new
        {
            name = "Team tee", price = "22.00", stock = (int?)40, minimumQuantity = 1, optionName = (string?)null,
            options = Array.Empty<object>(),
        }));

        Assert.Equal(0, saved.GetProperty("options").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, saved.GetProperty("optionName").ValueKind);
        Assert.Equal(40, saved.GetProperty("stock").GetInt32());
        Assert.Equal(1, saved.GetProperty("minimumQuantity").GetInt32());
    }

    [Fact]
    public async Task L2_091_AC8_a_blank_or_repeated_option_name_is_refused()
    {
        var blank = await Naomi().PostAsJsonAsync("/api/my-business/products", new
        {
            name = "Team tee", price = "22.00", options = new[] { new { label = " ", stock = (int?)1 } },
        });
        var twice = await Naomi().PostAsJsonAsync("/api/my-business/products", new
        {
            name = "Team tee", price = "22.00", options = new[] { new { label = "M", stock = (int?)1 }, new { label = "m ", stock = (int?)2 } },
        });

        Assert.Equal("INVALID", (await Json(blank)).GetProperty("errors").GetProperty("options").GetString());
        Assert.Equal("INVALID", (await Json(twice)).GetProperty("errors").GetProperty("options").GetString());
    }

    [Fact]
    public async Task L2_091_AC8_what_the_options_choose_is_40_characters_at_most()
    {
        var response = await Naomi().PostAsJsonAsync("/api/my-business/products", new
        {
            name = "Team tee", price = "22.00", optionName = new string('x', 41), options = new[] { new { label = "S", stock = (int?)1 } },
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("TOO_LONG", (await Json(response)).GetProperty("errors").GetProperty("optionName").GetString());
    }
}
