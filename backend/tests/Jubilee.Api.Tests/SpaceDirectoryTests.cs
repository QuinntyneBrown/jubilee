using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

/// <summary>Spaces in "Rooms & rentals": the category, the term filter and the space card (L2-188, L2-193, L2-194, L2-199).</summary>
public class SpaceDirectoryTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Url = "/api/categories/rooms-rentals/listings";
    private const string Address = "12 Brunswick Ave, Toronto ON M5S 2L7";
    private readonly JubileeApiFactory _factory;

    public SpaceDirectoryTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_188_AC4_rooms_and_rentals_is_the_second_of_eleven_categories()
    {
        var categories = (await _factory.GetJson("/api/directory/welcome")).GetProperty("categories");

        Assert.Equal(11, categories.GetArrayLength());
        Assert.Equal("rooms-rentals", categories[1].GetProperty("slug").GetString());
        Assert.Equal("Rooms & rentals", categories[1].GetProperty("name").GetString());
    }

    [Fact]
    public async Task L2_193_AC1_L2_194_AC1_the_category_lists_space_cards_newest_first_with_their_term_and_rent()
    {
        await _factory.Arrange(
            ListingMother.Space("annex-basement", SpaceTerm.LongTerm, 1850, "The Annex", ListingMother.Now.AddDays(-2)),
            ListingMother.Space("roncesvalles-suite", SpaceTerm.ShortStay, 120, "Roncesvalles", ListingMother.Now.AddDays(-1)));

        var json = await _factory.GetJson(Url);

        Assert.Equal("rooms-rentals", json.GetProperty("category").GetProperty("slug").GetString());
        Assert.Equal(2, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(["roncesvalles-suite", "annex-basement"], json.GetProperty("spaces").Slugs());
        Assert.Equal(0, json.GetProperty("businesses").GetArrayLength());

        var suite = json.GetProperty("spaces")[0];
        Assert.Equal("short-stay", suite.GetProperty("term").GetString());
        Assert.Equal(120, suite.GetProperty("rent").GetInt32());
        Assert.Equal("night", suite.GetProperty("per").GetString());
        Assert.Equal("Roncesvalles", suite.GetProperty("neighbourhood").GetString());
        Assert.Equal("Mar 1", suite.GetProperty("available").GetString());
        Assert.Equal(["1 bedroom", "1 bath"], suite.GetProperty("facts").EnumerateArray().Select(f => f.GetString()));

        var basement = json.GetProperty("spaces")[1];
        Assert.Equal("long-term", basement.GetProperty("term").GetString());
        Assert.Equal("month", basement.GetProperty("per").GetString());
    }

    [Fact]
    public async Task L2_193_AC2_a_term_narrows_the_spaces_and_an_unknown_term_is_ignored()
    {
        await _factory.Arrange(
            ListingMother.Space("annex-basement", SpaceTerm.LongTerm),
            ListingMother.Space("leslieville-room", SpaceTerm.Room),
            ListingMother.Space("east-york-roommate", SpaceTerm.Roommate));

        var rooms = await _factory.GetJson($"{Url}?term=room");
        var junk = await _factory.GetJson($"{Url}?term=castle");

        Assert.Equal(["leslieville-room"], rooms.GetProperty("spaces").Slugs());
        Assert.Equal("room", rooms.GetProperty("term").GetString());
        Assert.Equal(1, rooms.GetProperty("matchCount").GetInt32());
        Assert.Equal(3, rooms.GetProperty("totalCount").GetInt32());
        Assert.Equal(3, junk.GetProperty("spaces").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, junk.GetProperty("term").ValueKind);
    }

    [Fact]
    public async Task L2_188_AC5_only_public_spaces_are_listed()
    {
        var paused = ListingMother.Space("paused-suite");
        paused.Pause();
        await _factory.Arrange(ListingMother.Space("annex-basement"), paused);

        var json = await _factory.GetJson(Url);

        Assert.Equal(["annex-basement"], json.GetProperty("spaces").Slugs());
    }

    [Fact]
    public async Task L2_194_AC4_L2_199_AC1_no_space_list_carries_the_exact_address()
    {
        await _factory.Arrange(ListingMother.Space("annex-basement"));

        var raw = await _factory.CreateClient().GetStringAsync(Url);

        Assert.DoesNotContain("Brunswick", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(Address, raw, StringComparison.Ordinal);
    }

    [Fact]
    public async Task L2_192_AC1_AC3_the_rooms_shelf_holds_the_newest_four_overall_and_the_newest_four_of_each_term()
    {
        var spaces = new List<Listing>();
        for (var i = 1; i <= 6; i++)
        {
            spaces.Add(ListingMother.Space($"long-{i}", SpaceTerm.LongTerm, approvedAt: ListingMother.Now.AddHours(-i)));
        }

        spaces.Add(ListingMother.Space("old-room", SpaceTerm.Room, approvedAt: ListingMother.Now.AddDays(-30)));
        await _factory.Arrange([.. spaces, ListingMother.Public("plumber")]);

        var rooms = (await _factory.GetJson("/api/directory/home")).GetProperty("rooms");

        Assert.Equal(7, rooms.GetProperty("count").GetInt32());
        Assert.Equal(["long-1", "long-2", "long-3", "long-4", "old-room"], rooms.GetProperty("spaces").Slugs());
        Assert.Equal("room", rooms.GetProperty("spaces")[4].GetProperty("term").GetString());
    }

    [Fact]
    public async Task L2_192_AC5_without_spaces_the_rooms_shelf_is_empty()
    {
        await _factory.Arrange(ListingMother.Public("plumber"));

        var rooms = (await _factory.GetJson("/api/directory/home")).GetProperty("rooms");

        Assert.Equal(0, rooms.GetProperty("count").GetInt32());
        Assert.Equal(0, rooms.GetProperty("spaces").GetArrayLength());
    }

    [Fact]
    public async Task L2_199_AC1_the_browse_home_carries_no_exact_address()
    {
        await _factory.Arrange(ListingMother.Space("annex-basement"));

        var raw = await _factory.CreateClient().GetStringAsync("/api/directory/home");

        Assert.Contains("annex-basement", raw, StringComparison.Ordinal);
        Assert.DoesNotContain("Brunswick", raw, StringComparison.OrdinalIgnoreCase);
    }
}
