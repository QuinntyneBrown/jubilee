// Acceptance Test
// Traces to: L2-295
// Description: the Jubilee team sees a non-profit in the Listings table with its category, reads its
// addresses as text and its own words on its record, and takes it down like any listing.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

public class NonprofitAdminTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;
    private Listing _hopeHouse = null!;

    public NonprofitAdminTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _hopeHouse = ListingMother.Nonprofit("hope-house", "Hope House Toronto", tagline: "Meals, beds and friendship");
        _hopeHouse.AssignOwner("member|grace");
        await _factory.Arrange(_hopeHouse, ListingMother.Public("hartwell-plumbing", name: "Hartwell Plumbing"));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    [Fact]
    public async Task L2_295_AC1_a_non_profit_is_listed_with_its_category_and_found_by_name()
    {
        var all = await _factory.GetJson("/api/admin/listings", Miriam());
        var row = all.GetProperty("rows").EnumerateArray().Single(r => r.GetProperty("name").GetString() == "Hope House Toronto");
        Assert.Equal("Non-profits", row.GetProperty("categoryName").GetString());

        var found = await _factory.GetJson("/api/admin/listings?q=hope", Miriam());
        Assert.Equal("Hope House Toronto", Assert.Single(found.GetProperty("rows").EnumerateArray()).GetProperty("name").GetString());
    }

    [Fact]
    public async Task L2_295_AC2_the_moderator_reads_the_addresses_and_the_non_profits_words()
    {
        var listing = await _factory.GetJson($"/api/admin/listings/{_hopeHouse.Id}", Miriam());

        Assert.Equal("nonprofit", listing.GetProperty("kind").GetString());
        Assert.Equal("Non-profits", listing.GetProperty("categoryName").GetString());
        Assert.Equal(JsonValueKind.Null, listing.GetProperty("platform").ValueKind);
        var nonprofit = listing.GetProperty("nonprofit");
        Assert.Equal("https://hopehouse.example", nonprofit.GetProperty("address").GetString());
        Assert.Equal("https://hopehouse.example", nonprofit.GetProperty("website").GetString());
        Assert.Equal("https://hopehouse.example/give", nonprofit.GetProperty("giveAddress").GetString());
        Assert.Equal("https://hopehouse.example/give", nonprofit.GetProperty("giveUrl").GetString());
        Assert.Equal(ListingMother.NonprofitMission, nonprofit.GetProperty("mission").GetString());
        Assert.Equal(ListingMother.NonprofitServes, nonprofit.GetProperty("serves").GetString());
        Assert.Equal(ListingMother.NonprofitArea, nonprofit.GetProperty("area").GetString());
    }

    [Fact]
    public async Task L2_295_AC2_an_address_that_fails_the_rule_is_text_and_never_a_link()
    {
        var odd = ListingMother.Nonprofit("oddity", "Oddity", website: "javascript:alert(1)", giveUrl: "http://oddity.example/give");
        await _factory.Arrange(odd);

        var nonprofit = (await _factory.GetJson($"/api/admin/listings/{odd.Id}", Miriam())).GetProperty("nonprofit");

        Assert.Equal("javascript:alert(1)", nonprofit.GetProperty("address").GetString());
        Assert.Equal(JsonValueKind.Null, nonprofit.GetProperty("website").ValueKind);
        Assert.Equal("http://oddity.example/give", nonprofit.GetProperty("giveAddress").GetString());
        Assert.Equal(JsonValueKind.Null, nonprofit.GetProperty("giveUrl").ValueKind);
    }

    [Fact]
    public async Task L2_295_AC2_a_business_has_no_non_profit_details()
    {
        var id = (await _factory.GetJson("/api/admin/listings?q=hartwell", Miriam())).GetProperty("rows")[0].GetProperty("id").GetString();

        Assert.Equal(JsonValueKind.Null, (await _factory.GetJson($"/api/admin/listings/{id}", Miriam())).GetProperty("nonprofit").ValueKind);
    }

    [Fact]
    public async Task L2_295_AC3_taken_down_a_non_profit_leaves_every_list_and_its_page_answers_404()
    {
        var response = await Miriam().PostAsJsonAsync(
            $"/api/admin/listings/{_hopeHouse.Id}/take-down", new { reason = "The ministry is not what its listing describes." });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/hope-house")).StatusCode);
        Assert.Empty((await _factory.GetJson("/api/categories/non-profits/listings")).GetProperty("businesses").EnumerateArray());
        Assert.Equal(0, (await _factory.GetJson("/api/directory/home")).GetProperty("nonprofits").GetProperty("count").GetInt32());
        Assert.DoesNotContain("Hope House", (await _factory.GetJson("/api/search?q=hope")).GetRawText());
    }
}
