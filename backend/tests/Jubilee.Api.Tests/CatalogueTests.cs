using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Manage products and services: L2-089 to L2-095, L2-132 and L2-133. Naomi owns Luzandre.com, a live shop.
public sealed class CatalogueTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string NaomiId = "member|naomi";

    private readonly JubileeApiFactory _factory;
    private Listing _listing = null!;

    public CatalogueTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        _listing.AssignOwner(NaomiId);
        await _factory.Arrange(_listing);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", NaomiId);

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private Product Item(string slug, int cents, int? stock = null, int position = 0, DateTimeOffset? at = null)
    {
        var product = Product.Create(_listing.Id, slug, slug.Replace('-', ' '), cents, false, TileTint.Gold, TileIcon.Mug, at ?? ListingMother.Now.AddDays(-30));
        product.SetStock(stock);
        product.Place(position, null);
        return product;
    }

    private static object Product_(string name = "Walnut prayer bench", string price = "185.00", int? stock = 3, string? key = null) =>
        new { name, price, stock, description = "Solid walnut kneeling bench.", idempotencyKey = key };

    private static object Service_(
        string name = "Discovery call", string pricing = "free", string? price = null, string action = "ask", int? duration = null,
        bool video = true, bool inPerson = false, string? place = null, string? detail = "30 min", string? key = null) =>
        new { name, detail, pricing, price, action, durationMinutes = duration, offersVideo = video, offersInPerson = inPerson, place, idempotencyKey = key };

    private async Task<string[]> PublicProducts() =>
        [.. (await _factory.GetJson("/api/listings/luzandre-com")).GetProperty("products").EnumerateArray().Select(p => p.GetProperty("name").GetString()!)];

    private async Task<string[]> PublicServices() =>
        [.. (await _factory.GetJson("/api/listings/luzandre-com")).GetProperty("services").EnumerateArray().Select(p => p.GetProperty("name").GetString()!)];

    // L2-089
    [Fact]
    public async Task L2_089_the_list_counts_products_and_sold_out_and_each_row_counts_its_requests()
    {
        var tee = Item("faith-tee", 3400, stock: 0, position: 1);
        var mug = Item("gold-mug", 2400, stock: 5, position: 2);
        var order = Request.AskForOrder(
            "member|samuel", "Samuel Park", _listing.Id, mug.Id, mug.Name, null, 2, new OrderAmounts(2400, 4800, 0), "Pickup", null, null,
            Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-1));
        await _factory.Arrange(tee, mug, order);

        var json = await Json(await Naomi().GetAsync("/api/my-business/products"));

        Assert.Equal(2, json.GetProperty("total").GetInt32());
        Assert.Equal(1, json.GetProperty("soldOut").GetInt32());
        var rows = json.GetProperty("rows");
        Assert.Equal("faith tee", rows[0].GetProperty("name").GetString());
        Assert.True(rows[0].GetProperty("soldOut").GetBoolean());
        Assert.Equal(3400, rows[0].GetProperty("priceCents").GetInt32());
        Assert.Equal(0, rows[0].GetProperty("requests").GetInt32());
        Assert.Equal(1, rows[1].GetProperty("requests").GetInt32());
    }

    [Fact]
    public async Task L2_089_a_shop_with_no_products_has_an_empty_list()
    {
        var json = await Json(await Naomi().GetAsync("/api/my-business/products"));

        Assert.Equal(0, json.GetProperty("total").GetInt32());
        Assert.Equal(0, json.GetProperty("rows").GetArrayLength());
    }

    [Fact]
    public async Task L2_089_a_shop_with_100_products_cannot_add_a_101st()
    {
        await _factory.Arrange([.. Enumerable.Range(1, 100).Select(i => (object)Item($"product-{i}", 1000, position: i))]);

        var response = await Naomi().PostAsJsonAsync("/api/my-business/products", Product_());

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var json = await Json(response);
        Assert.Equal("PRODUCT_LIMIT", json.GetProperty("code").GetString());
        Assert.Contains("You can list up to 100 products.", json.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task L2_089_the_list_that_cannot_load_carries_the_reference_JB_PRD_503()
    {
        _factory.Database.Unavailable = true;

        var response = await Naomi().GetAsync("/api/my-business/products");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-PRD-503", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-091
    [Fact]
    public async Task L2_091_a_valid_product_is_stored_in_cents_and_is_live_at_once()
    {
        var response = await Naomi().PostAsJsonAsync("/api/my-business/products", Product_());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await Json(response);
        Assert.Equal(18500, json.GetProperty("priceCents").GetInt32());
        Assert.Equal(3, json.GetProperty("stock").GetInt32());
        Assert.Equal("walnut-prayer-bench", json.GetProperty("slug").GetString());
        Assert.Contains("Walnut prayer bench", await PublicProducts());
    }

    [Fact]
    public async Task L2_091_an_empty_name_and_a_price_of_abc_are_named()
    {
        var response = await Naomi().PostAsJsonAsync("/api/my-business/products", Product_(name: " ", price: "abc"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REQUIRED", errors.GetProperty("name").GetString());
        Assert.Equal("INVALID", errors.GetProperty("price").GetString());
    }

    [Theory]
    [InlineData("0")]
    [InlineData("0.00")]
    [InlineData("100000.01")]
    [InlineData("1.234")]
    [InlineData("-5")]
    [InlineData("$24")]
    public async Task L2_091_a_price_outside_001_to_100000_with_two_decimals_is_refused(string price)
    {
        var response = await Naomi().PostAsJsonAsync("/api/my-business/products", Product_(price: price));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Theory]
    [InlineData("0.01", 1)]
    [InlineData("100000.00", 10_000_000)]
    [InlineData("24", 2400)]
    public async Task L2_091_the_edges_of_the_price_range_are_accepted(string price, int cents)
    {
        var response = await Naomi().PostAsJsonAsync("/api/my-business/products", Product_(price: price));

        Assert.Equal(cents, (await Json(response)).GetProperty("priceCents").GetInt32());
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(10_000)]
    public async Task L2_091_stock_is_a_whole_number_from_0_to_9999(int stock)
    {
        var response = await Naomi().PostAsJsonAsync("/api/my-business/products", Product_(stock: stock));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("INVALID", (await Json(response)).GetProperty("errors").GetProperty("stock").GetString());
    }

    [Fact]
    public async Task L2_091_empty_stock_is_not_tracked_and_zero_shows_as_sold_out()
    {
        var untracked = await Json(await Naomi().PostAsJsonAsync("/api/my-business/products", Product_(name: "Mug", stock: null)));
        var zero = await Json(await Naomi().PostAsJsonAsync("/api/my-business/products", Product_(name: "Tee", stock: 0)));

        Assert.False(untracked.GetProperty("soldOut").GetBoolean());
        Assert.Equal(JsonValueKind.Null, untracked.GetProperty("stock").ValueKind);
        Assert.True(zero.GetProperty("soldOut").GetBoolean());
    }

    [Fact]
    public async Task L2_091_editing_a_product_changes_its_values_and_keeps_its_link()
    {
        var created = await Json(await Naomi().PostAsJsonAsync("/api/my-business/products", Product_()));
        var id = created.GetProperty("id").GetString();

        var edited = await Naomi().PutAsJsonAsync($"/api/my-business/products/{id}", Product_(name: "Walnut bench", price: "199.50", stock: 0));

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        var json = await Json(edited);
        Assert.Equal("Walnut bench", json.GetProperty("name").GetString());
        Assert.Equal(19950, json.GetProperty("priceCents").GetInt32());
        Assert.Equal("walnut-prayer-bench", json.GetProperty("slug").GetString());
        Assert.True(json.GetProperty("soldOut").GetBoolean());
        Assert.Contains("Walnut bench", await PublicProducts());
    }

    [Fact]
    public async Task L2_091_a_product_can_have_up_to_ten_options_and_a_minimum_quantity()
    {
        var options = Enumerable.Range(1, 10).Select(i => new { label = $"Size {i}", stock = (int?)i }).ToList();
        var ok = await Naomi().PostAsJsonAsync("/api/my-business/products", new
        {
            name = "Team tee", price = "22.00", stock = (int?)null, minimumQuantity = 12, optionName = "Size", options,
        });
        var tooMany = await Naomi().PostAsJsonAsync("/api/my-business/products", new
        {
            name = "Team tee 2", price = "22.00", options = options.Append(new { label = "Size 11", stock = (int?)1 }),
        });
        var tooMuch = await Naomi().PostAsJsonAsync("/api/my-business/products", new { name = "Team tee 3", price = "22.00", minimumQuantity = 1000 });

        var json = await Json(ok);
        Assert.Equal(12, json.GetProperty("minimumQuantity").GetInt32());
        Assert.Equal(10, json.GetProperty("options").GetArrayLength());
        Assert.Equal("Size", json.GetProperty("optionName").GetString());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, tooMany.StatusCode);
        Assert.Equal("INVALID", (await Json(tooMany)).GetProperty("errors").GetProperty("options").GetString());
        Assert.Equal("INVALID", (await Json(tooMuch)).GetProperty("errors").GetProperty("minimumQuantity").GetString());
    }

    [Fact]
    public async Task L2_132_a_repeat_of_the_same_key_adds_one_product()
    {
        var key = Guid.NewGuid().ToString();

        var first = await Json(await Naomi().PostAsJsonAsync("/api/my-business/products", Product_(key: key)));
        var again = await Json(await Naomi().PostAsJsonAsync("/api/my-business/products", Product_(key: key)));

        Assert.Equal(first.GetProperty("id").GetString(), again.GetProperty("id").GetString());
        Assert.Equal(1, (await Json(await Naomi().GetAsync("/api/my-business/products"))).GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task L2_091_two_products_with_the_same_name_get_different_links()
    {
        await Naomi().PostAsJsonAsync("/api/my-business/products", Product_());
        var second = await Json(await Naomi().PostAsJsonAsync("/api/my-business/products", Product_()));

        Assert.Equal("walnut-prayer-bench-2", second.GetProperty("slug").GetString());
    }

    // L2-092
    [Fact]
    public async Task L2_092_a_deleted_product_leaves_the_public_pages_but_open_orders_stay_open()
    {
        var mug = Item("gold-mug", 2400, stock: 5, position: 1);
        var other = Item("tee", 3000, position: 2);
        var order = Request.AskForOrder(
            "member|samuel", "Samuel Park", _listing.Id, mug.Id, mug.Name, null, 2, new OrderAmounts(2400, 4800, 0), "Pickup", null, null,
            Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-1));
        await _factory.Arrange(mug, other, order);

        var response = await Naomi().DeleteAsync($"/api/my-business/products/{mug.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await Json(response);
        Assert.Equal("gold mug", json.GetProperty("name").GetString());
        Assert.Equal(1, json.GetProperty("pastRequests").GetInt32());
        Assert.DoesNotContain("gold mug", await PublicProducts());
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com/products/gold-mug")).StatusCode);
        await _factory.WithDb(async db =>
        {
            var kept = await db.Requests.AsNoTracking().SingleAsync(r => r.Id == order.Id);
            Assert.Equal(RequestStatus.New, kept.Status);
            Assert.Equal(2400, kept.UnitPriceCents);
        });
    }

    [Fact]
    public async Task L2_092_a_product_that_is_gone_cannot_be_deleted_again_nor_edited()
    {
        var mug = Item("gold-mug", 2400);
        await _factory.Arrange(mug);
        await Naomi().DeleteAsync($"/api/my-business/products/{mug.Id}");

        Assert.Equal(HttpStatusCode.NotFound, (await Naomi().DeleteAsync($"/api/my-business/products/{mug.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Naomi().PutAsJsonAsync($"/api/my-business/products/{mug.Id}", Product_())).StatusCode);
    }

    // L2-133
    [Fact]
    public async Task L2_133_only_the_owner_of_the_listing_reaches_its_catalogue()
    {
        var mug = Item("gold-mug", 2400);
        var service = Service.Create(_listing.Id, 1, "Consult", "30 min", ServicePrice.Free, ServiceAction.Ask);
        await _factory.Arrange(mug, service);
        var joanna = Joanna();

        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.GetAsync("/api/my-business/products")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.PostAsJsonAsync("/api/my-business/products", Product_())).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.DeleteAsync($"/api/my-business/products/{mug.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.GetAsync("/api/my-business/services")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.DeleteAsync($"/api/my-business/services/{service.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/my-business/products")).StatusCode);
    }

    [Fact]
    public async Task L2_133_another_owners_items_are_not_found()
    {
        var theirs = ListingMother.Public("trade-shop", "shops", "Trade Shop");
        theirs.AssignOwner("member|joanna");
        var product = Product.Create(theirs.Id, "stool", "Stool", 5000, false, TileTint.Ink, TileIcon.Bag, ListingMother.Now);
        var service = Service.Create(theirs.Id, 1, "Repairs", "", ServicePrice.Ask, ServiceAction.Ask);
        await _factory.Arrange(theirs, product, service);

        Assert.Equal(HttpStatusCode.NotFound, (await Naomi().DeleteAsync($"/api/my-business/products/{product.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Naomi().PutAsJsonAsync($"/api/my-business/products/{product.Id}", Product_())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Naomi().DeleteAsync($"/api/my-business/services/{service.Id}")).StatusCode);
    }

    [Fact]
    public async Task L2_133_a_product_cannot_be_sent_with_a_slug_or_a_listing()
    {
        var response = await Naomi().PostAsJsonAsync("/api/my-business/products", new { name = "x", price = "1", slug = "evil", listingId = Guid.NewGuid() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // L2-090
    [Fact]
    public async Task L2_090_moving_a_product_changes_the_order_the_public_listing_shows()
    {
        var a = Item("alpha", 1000, position: 1);
        var b = Item("bravo", 1000, position: 2);
        var c = Item("charlie", 1000, position: 3);
        await _factory.Arrange(a, b, c);
        Assert.Equal(["alpha", "bravo", "charlie"], await PublicProducts());

        var moved = await Json(await Naomi().PutAsJsonAsync($"/api/my-business/products/{c.Id}/position", new { position = 1 }));

        Assert.Equal(["charlie", "alpha", "bravo"], moved.GetProperty("rows").EnumerateArray().Select(r => r.GetProperty("name").GetString()!).ToArray());
        Assert.Equal(["charlie", "alpha", "bravo"], await PublicProducts());
        var down = await Json(await Naomi().PutAsJsonAsync($"/api/my-business/products/{c.Id}/position", new { position = 3 }));
        Assert.Equal("charlie", down.GetProperty("rows")[2].GetProperty("name").GetString());
    }

    // L2-093
    [Fact]
    public async Task L2_093_the_services_are_listed_in_the_owners_order()
    {
        await _factory.Arrange(
            Service.Create(_listing.Id, 2, "Church merch package", "Tees, mugs and totes", ServicePrice.Ask, ServiceAction.Ask),
            Service.Create(_listing.Id, 1, "Custom design consultation", "30 min · Video", ServicePrice.Free, ServiceAction.Book));

        var json = await Json(await Naomi().GetAsync("/api/my-business/services"));

        Assert.Equal(2, json.GetProperty("total").GetInt32());
        Assert.Equal("Custom design consultation", json.GetProperty("rows")[0].GetProperty("name").GetString());
        Assert.Equal("free", json.GetProperty("rows")[0].GetProperty("priceKind").GetString());
        Assert.Equal("ask", json.GetProperty("rows")[1].GetProperty("priceKind").GetString());
    }

    [Fact]
    public async Task L2_093_a_listing_with_50_services_cannot_add_a_51st()
    {
        await _factory.Arrange([.. Enumerable.Range(1, 50).Select(i => (object)Service.Create(_listing.Id, i, $"Service {i}", "", ServicePrice.Ask, ServiceAction.Ask))]);

        var response = await Naomi().PostAsJsonAsync("/api/my-business/services", Service_());

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("SERVICE_LIMIT", (await Json(response)).GetProperty("code").GetString());
        Assert.Contains("You can list up to 50 services.", (await Json(response)).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task L2_093_a_list_that_cannot_load_carries_the_reference_JB_SVC_503()
    {
        _factory.Database.Unavailable = true;

        var response = await Naomi().GetAsync("/api/my-business/services");

        Assert.Equal("JB-SVC-503", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-094
    [Fact]
    public async Task L2_094_a_free_service_and_a_service_to_ask_about_hold_no_price()
    {
        var free = await Json(await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(pricing: "free", price: "50.00")));
        var ask = await Json(await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(name: "Quote", pricing: "ask", price: "9.00")));

        Assert.Equal(JsonValueKind.Null, free.GetProperty("priceCents").ValueKind);
        Assert.Equal(JsonValueKind.Null, ask.GetProperty("priceCents").ValueKind);
        Assert.Equal(["Discovery call", "Quote"], await PublicServices());
    }

    [Fact]
    public async Task L2_094_a_fixed_price_is_required_and_checked_like_a_products()
    {
        var good = await Json(await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(pricing: "amount", price: "8.00")));
        var bad = await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(name: "x", pricing: "amount", price: "abc"));
        var missing = await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(name: "y", pricing: "amount", price: null));

        Assert.Equal(800, good.GetProperty("priceCents").GetInt32());
        Assert.Equal("INVALID", (await Json(bad)).GetProperty("errors").GetProperty("price").GetString());
        Assert.Equal("REQUIRED", (await Json(missing)).GetProperty("errors").GetProperty("price").GetString());
    }

    [Fact]
    public async Task L2_094_an_empty_name_is_named_and_the_detail_stops_at_60_characters()
    {
        var response = await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(name: " ", detail: new string('d', 61)));

        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REQUIRED", errors.GetProperty("name").GetString());
        Assert.Equal("TOO_LONG", errors.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task L2_094_booking_a_time_needs_a_duration_from_15_to_480_and_a_way_to_meet()
    {
        var short_ = await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(action: "book", duration: 10));
        var long_ = await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(action: "book", duration: 481));
        var none = await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(action: "book", duration: 30, video: false, inPerson: false));
        var noPlace = await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(action: "book", duration: 30, video: false, inPerson: true));
        var ok = await Json(await Naomi().PostAsJsonAsync("/api/my-business/services",
            Service_(action: "book", duration: 45, video: true, inPerson: true, place: "12 Queen St E")));

        Assert.Equal("INVALID", (await Json(short_)).GetProperty("errors").GetProperty("duration").GetString());
        Assert.Equal("INVALID", (await Json(long_)).GetProperty("errors").GetProperty("duration").GetString());
        Assert.Equal("REQUIRED", (await Json(none)).GetProperty("errors").GetProperty("modes").GetString());
        Assert.Equal("REQUIRED", (await Json(noPlace)).GetProperty("errors").GetProperty("place").GetString());
        Assert.Equal(45, ok.GetProperty("durationMinutes").GetInt32());
        Assert.Equal("12 Queen St E", ok.GetProperty("inPersonPlace").GetString());
    }

    [Fact]
    public async Task L2_094_editing_a_service_changes_it_and_a_switch_to_ask_clears_the_duration()
    {
        var created = await Json(await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(action: "book", duration: 60, pricing: "amount", price: "80")));
        var id = created.GetProperty("id").GetString();

        var edited = await Json(await Naomi().PutAsJsonAsync($"/api/my-business/services/{id}", Service_(name: "Planning", action: "ask", pricing: "ask")));

        Assert.Equal("Planning", edited.GetProperty("name").GetString());
        Assert.Equal("ask", edited.GetProperty("priceKind").GetString());
        Assert.Equal(JsonValueKind.Null, edited.GetProperty("priceCents").ValueKind);
        Assert.Equal(JsonValueKind.Null, edited.GetProperty("durationMinutes").ValueKind);
        Assert.Contains("Planning", await PublicServices());
    }

    [Fact]
    public async Task L2_132_a_repeat_of_the_same_key_adds_one_service()
    {
        var key = Guid.NewGuid().ToString();

        await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(key: key));
        await Naomi().PostAsJsonAsync("/api/my-business/services", Service_(key: key));

        Assert.Equal(1, (await Json(await Naomi().GetAsync("/api/my-business/services"))).GetProperty("total").GetInt32());
    }

    // L2-095
    [Fact]
    public async Task L2_095_a_deleted_service_leaves_the_listing_but_open_quote_requests_stay_open()
    {
        var consult = Service.Create(_listing.Id, 1, "Consult", "30 min", ServicePrice.Free, ServiceAction.Ask);
        var other = Service.Create(_listing.Id, 2, "Package", "", ServicePrice.Ask, ServiceAction.Ask);
        var quote = Request.AskForQuote(
            "member|david", "David Chen", _listing.Id, consult.Id, "Consult", "A question", null, null, null, Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-1));
        await _factory.Arrange(consult, other, quote);

        var response = await Naomi().DeleteAsync($"/api/my-business/services/{consult.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, (await Json(response)).GetProperty("pastRequests").GetInt32());
        Assert.Equal(["Package"], await PublicServices());
        await _factory.WithDb(async db =>
        {
            Assert.Equal(RequestStatus.New, (await db.Requests.AsNoTracking().SingleAsync(r => r.Id == quote.Id)).Status);
            Assert.Equal(1, (await db.Services.AsNoTracking().SingleAsync()).Position);
        });
    }

    // L2-090
    [Fact]
    public async Task L2_090_moving_a_service_changes_the_order_the_public_listing_shows()
    {
        var a = Service.Create(_listing.Id, 1, "Alpha", "", ServicePrice.Ask, ServiceAction.Ask);
        var b = Service.Create(_listing.Id, 2, "Bravo", "", ServicePrice.Ask, ServiceAction.Ask);
        await _factory.Arrange(a, b);

        var moved = await Json(await Naomi().PutAsJsonAsync($"/api/my-business/services/{b.Id}/position", new { position = 1 }));

        Assert.Equal(["Bravo", "Alpha"], moved.GetProperty("rows").EnumerateArray().Select(r => r.GetProperty("name").GetString()!).ToArray());
        Assert.Equal(["Bravo", "Alpha"], await PublicServices());
    }
}
