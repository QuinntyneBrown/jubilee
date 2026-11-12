using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

/// <summary>The page of a space at <c>/b/:slug</c> (L2-204) and its call to action (L2-205 AC1).</summary>
public class SpacePageTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Owner = "member|paul";
    private readonly JubileeApiFactory _factory;

    public SpacePageTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static string Url(string slug) => $"/api/listings/{slug}";

    private static Listing Suite()
    {
        var suite = ListingMother.Space("roncesvalles-suite", SpaceTerm.ShortStay, 120, "Roncesvalles", name: "Guest suite near Roncesvalles");
        suite.Describe(new ListingProfile("Paul & Marta Kowalski", [], "Ten minutes’ walk to High Park.", null, null, null, null, null));
        suite.AssignOwner(Owner);
        return suite;
    }

    [Fact]
    public async Task L2_196_AC1_a_space_page_has_its_rental_details_host_and_call_to_action()
    {
        await _factory.Arrange(Suite());

        var json = await _factory.GetJson(Url("roncesvalles-suite"));

        Assert.Equal("space", json.GetProperty("kind").GetString());
        Assert.Equal("Guest suite near Roncesvalles", json.GetProperty("name").GetString());
        Assert.Equal("Paul & Marta Kowalski", json.GetProperty("ownerName").GetString());
        Assert.Equal("Ten minutes’ walk to High Park.", json.GetProperty("about").GetString());

        var space = json.GetProperty("space");
        Assert.Equal("short-stay", space.GetProperty("term").GetString());
        Assert.Equal(120, space.GetProperty("rent").GetInt32());
        Assert.Equal("night", space.GetProperty("per").GetString());
        Assert.Equal("Mar 1", space.GetProperty("available").GetString());
        Assert.Equal(1, space.GetProperty("minimumStay").GetInt32());
        Assert.Equal("1 night", space.GetProperty("minimumStayLabel").GetString());
        Assert.Equal("Roncesvalles", space.GetProperty("neighbourhood").GetString());
        Assert.Equal("Basement apartment", space.GetProperty("place").GetString());
        Assert.Equal(3, space.GetProperty("facts").GetArrayLength());
        Assert.Equal(["Utilities", "Wi-Fi"], space.GetProperty("included").EnumerateArray().Select(i => i.GetString()));
        Assert.Equal(["No smoking"], space.GetProperty("rules").EnumerateArray().Select(i => i.GetString()));
        Assert.Equal(JsonValueKind.Null, space.GetProperty("household").ValueKind);
        Assert.Equal("Request to book", space.GetProperty("callToAction").GetString());
    }

    [Theory]
    [InlineData(SpaceTerm.LongTerm, "Request a viewing")]
    [InlineData(SpaceTerm.Room, "Request a viewing")]
    [InlineData(SpaceTerm.Roommate, "Meet the household")]
    public async Task L2_197_AC1_the_call_to_action_fits_the_term(SpaceTerm term, string callToAction)
    {
        await _factory.Arrange(ListingMother.Space("a-space", term));

        var space = (await _factory.GetJson(Url("a-space"))).GetProperty("space");

        Assert.Equal(callToAction, space.GetProperty("callToAction").GetString());
        Assert.Equal("month", space.GetProperty("per").GetString());
    }

    [Fact]
    public async Task L2_196_AC2_a_room_shows_who_lives_there()
    {
        await _factory.Arrange(ListingMother.Space("leslieville-room", SpaceTerm.Room, household: "Ruth and Kwame with our daughter Abena."));

        var space = (await _factory.GetJson(Url("leslieville-room"))).GetProperty("space");

        Assert.Equal("Ruth and Kwame with our daughter Abena.", space.GetProperty("household").GetString());
    }

    [Fact]
    public async Task L2_196_AC1_more_rooms_and_rentals_lists_up_to_four_other_spaces_newest_first()
    {
        await _factory.Arrange(
            Suite(),
            ListingMother.Space("s1", approvedAt: ListingMother.Now.AddHours(-1)),
            ListingMother.Space("s2", approvedAt: ListingMother.Now.AddHours(-2)),
            ListingMother.Space("s3", approvedAt: ListingMother.Now.AddHours(-3)),
            ListingMother.Space("s4", approvedAt: ListingMother.Now.AddHours(-4)),
            ListingMother.Space("s5", approvedAt: ListingMother.Now.AddHours(-5)));

        var json = await _factory.GetJson(Url("roncesvalles-suite"));

        Assert.Equal(["s1", "s2", "s3", "s4"], json.GetProperty("relatedSpaces").Slugs());
        Assert.Equal(0, json.GetProperty("related").GetArrayLength());
    }

    [Fact]
    public async Task L2_196_a_business_page_has_no_space()
    {
        await _factory.Arrange(ListingMother.Public("plumber"));

        var json = await _factory.GetJson(Url("plumber"));

        Assert.Equal(JsonValueKind.Null, json.GetProperty("space").ValueKind);
        Assert.Equal(0, json.GetProperty("relatedSpaces").GetArrayLength());
    }

    [Fact]
    public async Task L2_196_AC6_L2_199_AC1_no_one_reads_the_exact_address_on_the_page()
    {
        await _factory.Arrange(Suite());

        var callers = new[]
        {
            _factory.CreateClient(),
            _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna"),
            _factory.CreateMemberClient("Miriam Castillo", "member|miriam", "verifier"),
            _factory.CreateMemberClient("Paul Kowalski", Owner),
        };

        foreach (var caller in callers)
        {
            var raw = await caller.GetStringAsync(Url("roncesvalles-suite"));
            Assert.Contains("Roncesvalles", raw, StringComparison.Ordinal);
            Assert.DoesNotContain("Brunswick", raw, StringComparison.OrdinalIgnoreCase);
        }
    }
}
