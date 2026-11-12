using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

/// <summary>The owner edits a live space from My business (L2-208).</summary>
public sealed class SpaceEditTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Owner = "member|grace";
    private const string Address = "112 Brunswick Ave, Toronto ON M5S 2L7";
    private readonly JubileeApiFactory _factory;

    public SpaceEditTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var basement = ListingMother.Space(
            "annex-basement", SpaceTerm.LongTerm, 1850, "The Annex", name: "Bright basement apartment in the Annex", address: Address, minimumStay: 12);
        basement.AssignOwner(Owner);
        await _factory.Arrange(basement);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Grace() => _factory.CreateMemberClient("Grace Okafor", Owner);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static object Body(int version, object space, string category = "rooms-rentals") => new
    {
        version,
        name = "Bright basement apartment in the Annex",
        tagline = "Separate entrance, two minutes to Spadina station",
        category,
        about = "A quiet one-bedroom under our family home.",
        where = (string?)null,
        hours = (string?)null,
        website = (string?)null,
        highlight = (string?)null,
        space,
    };

    private static object Space(string term = "short-stay", int rent = 140, int minimumStay = 2, string? address = Address) => new
    {
        term,
        rent,
        available = "Most weekends",
        minimumStay,
        neighbourhood = "The Annex",
        address,
        place = "Basement apartment",
        facts = new[] { "1 bedroom", "Separate entrance" },
        included = new[] { "Wi-Fi" },
        household = (string?)null,
        rules = new[] { "No smoking" },
    };

    [Fact]
    public async Task L2_200_AC1_the_editor_holds_the_space_fields_and_its_address_for_the_owner()
    {
        var editor = await _factory.GetJson("/api/my-business/listing", Grace());

        var space = editor.GetProperty("space");
        Assert.Equal("long-term", space.GetProperty("term").GetString());
        Assert.Equal(1850, space.GetProperty("rent").GetInt32());
        Assert.Equal(12, space.GetProperty("minimumStay").GetInt32());
        Assert.Equal(Address, space.GetProperty("address").GetString());
    }

    [Fact]
    public async Task L2_200_AC2_AC3_a_change_of_term_is_live_at_once_with_its_price_unit_and_call_to_action()
    {
        var version = (await _factory.GetJson("/api/my-business/listing", Grace())).GetProperty("version").GetInt32();

        var response = await Grace().PutAsJsonAsync("/api/my-business/listing", Body(version, Space()));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = (await _factory.GetJson("/api/listings/annex-basement")).GetProperty("space");
        Assert.Equal("short-stay", page.GetProperty("term").GetString());
        Assert.Equal(140, page.GetProperty("rent").GetInt32());
        Assert.Equal("night", page.GetProperty("per").GetString());
        Assert.Equal("Request to book", page.GetProperty("callToAction").GetString());
    }

    [Fact]
    public async Task L2_200_AC2_the_space_is_validated_as_when_it_was_listed()
    {
        var version = (await _factory.GetJson("/api/my-business/listing", Grace())).GetProperty("version").GetInt32();

        var response = await Grace().PutAsJsonAsync("/api/my-business/listing", Body(version, Space(rent: 60_000, address: " ")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("TOO_HIGH", errors.GetProperty("space.rent").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("space.address").GetString());
        Assert.False(errors.TryGetProperty("hours", out _));
    }

    [Fact]
    public async Task L2_200_AC1_a_space_stays_in_rooms_and_rentals()
    {
        var version = (await _factory.GetJson("/api/my-business/listing", Grace())).GetProperty("version").GetInt32();

        var response = await Grace().PutAsJsonAsync("/api/my-business/listing", Body(version, Space(), category: "home-services"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("CATEGORY_LOCKED", (await Json(response)).GetProperty("errors").GetProperty("category").GetString());
    }
}
