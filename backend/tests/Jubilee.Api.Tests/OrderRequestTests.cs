using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Request a product: L2-043, L2-046, L2-005 AC2, L2-132 and L2-133 AC4.
// "Today" is Tuesday 10 November 2026, 10:00 in Toronto (ListingMother.Now).
public sealed class OrderRequestTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string NaomiId = "member|naomi";
    private const string Address = "48 Woodmount Ave, East York, ON M4C 3X8";
    private const string OptionsUrl = "/api/listings/luzandre/products/faith-tee/order";

    private readonly JubileeApiFactory _factory;
    private Guid _ship;
    private Guid _pickup;
    private Guid _otherShopMethod;

    public OrderRequestTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var shop = ListingMother.Public("luzandre", Category.ShopsSlug, "Luzandre.com");
        shop.AssignOwner(NaomiId);
        shop.Describe(new ListingProfile("Naomi Luzandre", [], null, "Leslieville, Toronto", null, null, null, null));
        shop.SetMedianResponseMinutes(120);
        shop.SetFreeShippingOver(7500);
        var tee = Product.Create(shop.Id, "faith-tee", "Faith heavyweight tee, charcoal", 3400, false, TileTint.Ink, TileIcon.Shirt, ListingMother.Now.AddMinutes(-10));
        tee.Describe(new ProductDescription(
            "A 240 gsm combed-cotton tee.",
            "plus $9 shipping, or free pickup",
            [new("Fit", "Relaxed, true to size"), new("Ready in", "5–7 days, made to order")]));
        tee.SetOptions("Size", [new("S", 8), new("M", 20), new("L", 140), new("XL", 0), new("2XL", null)]);
        var mug = Product.Create(shop.Id, "gold-mug", "Gold cross stoneware mug", 2500, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now.AddMinutes(-20));
        mug.SetStock(30);
        mug.SetMinimumQuantity(2);
        var ship = DeliveryMethod.Create(shop.Id, 1, DeliveryKind.Ship, "Ship to me", 900, "Canada Post, $9 flat · 3–6 business days");
        var pickup = DeliveryMethod.Create(shop.Id, 2, DeliveryKind.Pickup, "Pick up in Leslieville", 0, "Free · Naomi sends the address when it’s ready");
        var other = ListingMother.Public("wise-plumbing", "home-property", "Wise Plumbing");
        var otherMethod = DeliveryMethod.Create(other.Id, 1, DeliveryKind.Ship, "Courier", 500, "Next day");
        await _factory.Arrange(shop, tee, mug, ship, pickup, other, otherMethod);
        _ship = ship.Id;
        _pickup = pickup.Id;
        _otherShopMethod = otherMethod.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private Task<HttpResponseMessage> Order(
        HttpClient client,
        string product = "faith-tee",
        string? option = "M",
        int quantity = 1,
        Guid? method = null,
        string? address = Address,
        string? note = null,
        string slug = "luzandre",
        string? key = null) =>
        client.PostAsJsonAsync("/api/requests/orders", new
        {
            listingSlug = slug,
            productSlug = product,
            option,
            quantity,
            deliveryMethodId = method ?? _ship,
            shippingAddress = address,
            note,
            idempotencyKey = key ?? Guid.NewGuid().ToString(),
        });

    private async Task<Request> Saved()
    {
        Request saved = default!;
        await _factory.WithDb(async db => saved = await db.Requests.AsNoTracking().SingleAsync());
        return saved;
    }

    private async Task<int> RequestCount()
    {
        var count = 0;
        await _factory.WithDb(async db => count = await db.Requests.CountAsync());
        return count;
    }

    // L2-046 AC1
    [Fact]
    public async Task L2_046_AC1_the_options_name_the_product_the_shop_and_its_delivery_methods_in_order()
    {
        var options = await _factory.GetJson(OptionsUrl, Joanna());

        Assert.Equal("Luzandre.com", options.GetProperty("shop").GetProperty("name").GetString());
        Assert.Equal("Naomi", options.GetProperty("ownerFirstName").GetString());
        Assert.Equal("within a few hours", options.GetProperty("usuallyReplies").GetString());
        Assert.Equal("Made to order: ready in 5–7 days.", options.GetProperty("leadTime").GetString());
        var product = options.GetProperty("product");
        Assert.Equal("Faith heavyweight tee, charcoal", product.GetProperty("name").GetString());
        Assert.Equal(3400, product.GetProperty("priceCents").GetInt32());
        Assert.Equal("Size", product.GetProperty("optionName").GetString());
        Assert.Equal(["S", "M", "L", "XL", "2XL"], product.GetProperty("options").EnumerateArray().Select(o => o.GetProperty("label").GetString()));
        var methods = options.GetProperty("deliveryMethods").EnumerateArray().ToList();
        Assert.Equal(["Ship to me", "Pick up in Leslieville"], methods.Select(m => m.GetProperty("label").GetString()));
        Assert.Equal("ship", methods[0].GetProperty("kind").GetString());
        Assert.Equal(900, methods[0].GetProperty("feeCents").GetInt32());
        Assert.Equal("Canada Post, $9 flat · 3–6 business days", methods[0].GetProperty("detail").GetString());
        Assert.Equal("pickup", methods[1].GetProperty("kind").GetString());
        Assert.Equal(7500, options.GetProperty("freeShippingOverCents").GetInt32());
        Assert.Equal(JsonValueKind.Null, options.GetProperty("lastShippingAddress").ValueKind);
    }

    [Fact]
    public async Task L2_046_the_options_never_reveal_stock_beyond_the_most_that_can_be_asked_for()
    {
        var product = (await _factory.GetJson(OptionsUrl, Joanna())).GetProperty("product");

        Assert.Equal([8, 20, 99, 0, 99], product.GetProperty("options").EnumerateArray().Select(o => o.GetProperty("maxQuantity").GetInt32()));
        Assert.All(product.GetProperty("options").EnumerateArray(), o => Assert.False(o.TryGetProperty("stock", out _)));
    }

    [Theory]
    [InlineData("/api/listings/no-such-shop/products/faith-tee/order")]
    [InlineData("/api/listings/luzandre/products/no-such-product/order")]
    [InlineData("/api/listings/wise-plumbing/products/faith-tee/order")]
    public async Task L2_046_the_options_of_something_that_is_not_there_are_not_found(string url)
    {
        Assert.Equal(HttpStatusCode.NotFound, (await Joanna().GetAsync(url)).StatusCode);
    }

    // L2-046 AC2: the last address used is offered again
    [Fact]
    public async Task L2_046_AC2_the_address_of_the_last_shipped_request_is_offered_again()
    {
        await Order(Joanna(), address: Address);

        var options = await _factory.GetJson(OptionsUrl, Joanna());

        Assert.Equal(Address, options.GetProperty("lastShippingAddress").GetString());
        var someoneElse = await _factory.GetJson(OptionsUrl, _factory.CreateMemberClient("Sam Stranger", "member|sam"));
        Assert.Equal(JsonValueKind.Null, someoneElse.GetProperty("lastShippingAddress").ValueKind);
    }

    // L2-046 AC5, AC6, L2-043 AC1
    [Fact]
    public async Task L2_046_AC6_the_server_computes_the_amounts_from_stored_prices()
    {
        var response = await Order(Joanna(), quantity: 2, note: "Gift wrap please.");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("new", body.GetProperty("status").GetString());
        Assert.Equal("Awaiting reply", body.GetProperty("memberStatus").GetString());
        var saved = await Saved();
        Assert.Equal(RequestKind.Order, saved.Kind);
        Assert.Equal("member|joanna", saved.MemberSubject);
        Assert.Equal("Faith heavyweight tee, charcoal", saved.ServiceName);
        Assert.Equal("M", saved.OptionLabel);
        Assert.Equal(2, saved.Quantity);
        Assert.Equal(3400, saved.UnitPriceCents);
        Assert.Equal(6800, saved.ItemCents);
        Assert.Equal(900, saved.ShippingCents);
        Assert.Equal(7700, saved.TotalCents);
        Assert.Equal("Ship to me", saved.DeliveryLabel);
        Assert.Equal(Address, saved.ShippingAddress);
        Assert.Equal("Gift wrap please.", saved.Note);
    }

    // L2-046 AC4: free shipping at or above the shop's threshold
    [Theory]
    [InlineData(2, 900)]
    [InlineData(3, 0)]
    public async Task L2_046_AC4_shipping_is_free_at_or_above_the_threshold(int quantity, int shipping)
    {
        await Order(Joanna(), product: "gold-mug", option: null, quantity: quantity);

        var saved = await Saved();
        Assert.Equal(shipping, saved.ShippingCents);
        Assert.Equal(saved.ItemCents + shipping, saved.TotalCents);
    }

    // L2-046 AC3
    [Fact]
    public async Task L2_046_AC3_a_pickup_request_has_no_address_and_no_shipping()
    {
        var response = await Order(Joanna(), method: _pickup, address: Address);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var saved = await Saved();
        Assert.Null(saved.ShippingAddress);
        Assert.Equal(0, saved.ShippingCents);
        Assert.Equal(3400, saved.TotalCents);
        Assert.Equal("Pick up in Leslieville", saved.DeliveryLabel);
    }

    // L2-046 AC6, L2-133 AC4: a price in the body is refused and nothing is changed
    [Theory]
    [InlineData("priceCents")]
    [InlineData("totalCents")]
    [InlineData("status")]
    public async Task L2_046_AC6_a_body_with_a_price_or_status_is_refused_with_400_and_nothing_is_created(string field)
    {
        var response = await Joanna().PostAsJsonAsync("/api/requests/orders", new Dictionary<string, object?>
        {
            ["listingSlug"] = "luzandre",
            ["productSlug"] = "faith-tee",
            ["option"] = "M",
            ["quantity"] = 1,
            ["deliveryMethodId"] = _ship,
            ["shippingAddress"] = Address,
            ["idempotencyKey"] = Guid.NewGuid().ToString(),
            [field] = field == "status" ? "confirmed" : 1,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, await RequestCount());
    }

    // L2-046 AC2 and the fields the dialog checks
    [Theory]
    [InlineData("M", 0, "ship", null, "quantity", "INVALID")]
    [InlineData("M", 1, "ship", null, "shippingAddress", "REQUIRED")]
    [InlineData("M", 1, "ship", "   ", "shippingAddress", "REQUIRED")]
    [InlineData("M", 1, "ship", "48 Woodmount Ave, East York", "shippingAddress", "REQUIRED")]
    [InlineData(null, 1, "ship", Address, "option", "REQUIRED")]
    [InlineData("XXL", 1, "ship", Address, "option", "INVALID")]
    [InlineData("M", 1, "none", Address, "deliveryMethodId", "REQUIRED")]
    [InlineData("M", 1, "other", Address, "deliveryMethodId", "INVALID")]
    public async Task L2_046_AC2_an_invalid_request_is_refused_with_a_field_code_and_nothing_is_created(
        string? option, int quantity, string method, string? address, string field, string code)
    {
        var chosen = method switch
        {
            "ship" => _ship,
            "other" => _otherShopMethod,
            _ => Guid.Empty,
        };

        var response = await Order(Joanna(), option: option, quantity: quantity, method: chosen, address: address);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty(field).GetString());
        Assert.Equal(0, await RequestCount());
    }

    [Fact]
    public async Task L2_046_a_product_without_options_needs_none_and_ignores_one()
    {
        var response = await Order(Joanna(), product: "gold-mug", option: "Large", quantity: 2);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Null((await Saved()).OptionLabel);
    }

    [Fact]
    public async Task L2_046_a_quantity_below_the_shops_minimum_is_refused()
    {
        var response = await Order(Joanna(), product: "gold-mug", option: null, quantity: 1);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("BELOW_MINIMUM", (await Json(response)).GetProperty("errors").GetProperty("quantity").GetString());
    }

    // L2-046 AC7
    [Theory]
    [InlineData("S", 9, "ONLY_LEFT:8")]
    [InlineData("M", 21, "ONLY_LEFT:20")]
    [InlineData("XL", 1, "ONLY_LEFT:0")]
    [InlineData("2XL", 100, "TOO_MANY")]
    public async Task L2_046_AC7_a_quantity_above_the_stock_is_refused_with_how_many_are_left(string option, int quantity, string code)
    {
        var response = await Order(Joanna(), option: option, quantity: quantity);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty("quantity").GetString());
        Assert.Equal(0, await RequestCount());
    }

    [Fact]
    public async Task L2_046_AC7_the_whole_stock_may_be_asked_for_and_sending_does_not_reduce_it()
    {
        Assert.Equal(HttpStatusCode.Created, (await Order(Joanna(), option: "S", quantity: 8)).StatusCode);

        var options = await _factory.GetJson(OptionsUrl, Joanna());
        var small = options.GetProperty("product").GetProperty("options").EnumerateArray().First();
        Assert.Equal(8, small.GetProperty("maxQuantity").GetInt32());
    }

    [Fact]
    public async Task L2_046_a_note_over_1000_characters_is_refused()
    {
        var response = await Order(Joanna(), note: new string('n', 1001));

        Assert.Equal("TOO_LONG", (await Json(response)).GetProperty("errors").GetProperty("note").GetString());
    }

    [Fact]
    public async Task L2_046_the_owner_gets_an_e_mail_with_the_item_the_amounts_and_the_address()
    {
        var naomi = Member.Join(EmailAddress.TryParse("naomi@luzandre.example")!, "Naomi", "Luzandre", null, "hash", ListingMother.Now);
        await _factory.WithDb(async db =>
        {
            db.Members.Add(naomi);
            var listing = await db.Listings.SingleAsync(l => l.Slug == "luzandre");
            listing.AssignOwner(naomi.Id.ToString());
            await db.SaveChangesAsync();
        });

        await Order(Joanna(), quantity: 2);

        OutboxMessage mail = default!;
        await _factory.WithDb(async db => mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "naomi@luzandre.example"));
        Assert.Contains("Joanna", mail.Subject);
        Assert.Contains("Faith heavyweight tee, charcoal", mail.TextBody);
        Assert.Contains("Size M × 2", mail.TextBody);
        Assert.Contains("$77.00", mail.TextBody);
        Assert.Contains("48 Woodmount Ave", mail.TextBody);
    }

    [Fact]
    public async Task L2_046_a_shop_that_is_not_listed_or_another_shops_product_is_not_found()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await Order(Joanna(), slug: "no-such-shop")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Order(Joanna(), slug: "wise-plumbing")).StatusCode);
        Assert.Equal(0, await RequestCount());
    }

    [Fact]
    public async Task L2_046_an_owner_cannot_request_from_their_own_shop()
    {
        var response = await Order(_factory.CreateMemberClient("Naomi Luzandre", NaomiId));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_046_a_visitor_is_told_to_sign_in()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Order(_factory.CreateClient())).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync(OptionsUrl)).StatusCode);
    }

    // L2-005 AC2
    [Fact]
    public async Task L2_005_AC2_a_member_with_an_unconfirmed_e_mail_cannot_request_an_item()
    {
        await _factory.CreateClient().PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Una", lastName = "Confirmed", email = "una@example.com", password = "correct horse 13",
            homeChurch = (string?)null, agreementAccepted = true,
        });
        Member member = default!;
        await _factory.WithDb(async db => member = await db.Members.AsNoTracking().SingleAsync(m => m.EmailKey == "una@example.com"));

        var response = await Order(_factory.CreateMemberClient("Una Confirmed", member.Id.ToString()));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("EMAIL_UNCONFIRMED", (await Json(response)).GetProperty("code").GetString());
        Assert.Equal(0, await RequestCount());
    }

    // L2-132
    [Fact]
    public async Task L2_132_a_repeated_key_returns_the_first_request_and_creates_no_second()
    {
        var first = await Order(Joanna(), key: "same-key-12345");
        var second = await Order(Joanna(), key: "same-key-12345");

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal((await Json(first)).GetProperty("id").GetGuid(), (await Json(second)).GetProperty("id").GetGuid());
        Assert.Equal(1, await RequestCount());
    }

    [Fact]
    public async Task L2_132_the_same_key_from_another_member_is_a_different_request()
    {
        await Order(Joanna(), key: "same-key-12345");
        await Order(_factory.CreateMemberClient("Sam Stranger", "member|sam"), key: "same-key-12345");

        Assert.Equal(2, await RequestCount());
    }
}
