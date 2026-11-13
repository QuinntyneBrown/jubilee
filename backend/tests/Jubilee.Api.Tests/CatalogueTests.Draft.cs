using System.Net;
using System.Net.Http.Json;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

// L2-097 AC3: an owner manages the products and services of a listing that is not live yet, and the
// header gives its stage instead of "Live since".
public sealed partial class CatalogueTests
{
    [Fact]
    public async Task L2_097_AC3_the_products_and_services_of_a_draft_are_managed_and_say_its_stage()
    {
        await _factory.Reset();
        var draft = ListingMother.NonPublic(NonPublicState.Draft, "luzandre-com", "shops");
        draft.AssignOwner(NaomiId);
        await _factory.Arrange(draft);
        var naomi = Naomi();

        var added = await naomi.PostAsJsonAsync("/api/my-business/products", Product_());
        var service = await naomi.PostAsJsonAsync("/api/my-business/services", Service_());
        var products = await Json(await naomi.GetAsync("/api/my-business/products"));
        var services = await Json(await naomi.GetAsync("/api/my-business/services"));

        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        Assert.Equal(HttpStatusCode.Created, service.StatusCode);
        Assert.Equal("Draft · not published yet", products.GetProperty("subtitle").GetString());
        Assert.False(products.GetProperty("live").GetBoolean());
        Assert.Equal(1, products.GetProperty("total").GetInt32());
        Assert.Equal("Draft · not published yet", services.GetProperty("subtitle").GetString());
        Assert.Equal(1, services.GetProperty("total").GetInt32());
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com/products/walnut-prayer-bench")).StatusCode);
    }
}
