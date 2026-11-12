using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

/// <summary>Spaces in search (L2-195): found by their words and neighbourhood, never by their address.</summary>
public sealed class SpaceSearchTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public SpaceSearchTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        await _factory.Arrange(
            ListingMother.Space(
                "family-room", SpaceTerm.Room, 950, "Leslieville", name: "Furnished room in a family home", address: "27 Curzon St, Toronto ON M4M 3B4"),
            ListingMother.Public("plumber"));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_195_AC1_a_space_is_a_business_result_with_its_space_card()
    {
        var json = await _factory.GetJson("/api/search?q=room");

        var hit = json.GetProperty("hits")[0];
        Assert.Equal("business", hit.GetProperty("kind").GetString());
        Assert.Equal("family-room", hit.GetProperty("slug").GetString());
        var card = hit.GetProperty("space");
        Assert.Equal("room", card.GetProperty("term").GetString());
        Assert.Equal(950, card.GetProperty("rent").GetInt32());
        Assert.Equal("Leslieville", card.GetProperty("neighbourhood").GetString());
        Assert.Equal(1, json.GetProperty("businessCount").GetInt32());
    }

    [Theory]
    [InlineData("Leslieville", "neighbourhood")]
    [InlineData("entrance", "key facts")]
    [InlineData("basement", "the space")]
    public async Task L2_195_AC2_a_space_is_found_by_its_neighbourhood_its_place_and_its_facts(string query, string field)
    {
        var hit = (await _factory.GetJson($"/api/search?q={query}")).GetProperty("hits")[0];

        Assert.Equal("family-room", hit.GetProperty("slug").GetString());
        Assert.EndsWith($"in {field}", hit.GetProperty("explanation").GetProperty("text").GetString());
    }

    [Fact]
    public async Task L2_195_AC3_the_address_is_never_searched_nor_answered()
    {
        var raw = await _factory.CreateClient().GetStringAsync("/api/search?q=curzon");
        var room = await _factory.CreateClient().GetStringAsync("/api/search?q=room");

        Assert.Equal(0, (await _factory.GetJson("/api/search?q=curzon")).GetProperty("businessCount").GetInt32());
        Assert.DoesNotContain("Curzon", raw.Replace("\"query\":\"curzon\"", string.Empty, StringComparison.Ordinal), StringComparison.Ordinal);
        Assert.DoesNotContain("Curzon", room, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task L2_195_a_business_result_has_no_space_card()
    {
        var hit = (await _factory.GetJson("/api/search?q=plumber")).GetProperty("hits")[0];

        Assert.Equal(System.Text.Json.JsonValueKind.Null, hit.GetProperty("space").ValueKind);
    }
}
