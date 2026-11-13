using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

/// <summary>A software platform in the admin application (L2-257).</summary>
public sealed class PlatformAdminTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;
    private Listing _lanternread = default!;

    public PlatformAdminTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _lanternread = ListingMother.Platform("lanternread", "Lanternread", tagline: "A reading log families keep together");
        _lanternread.AssignOwner("member|abigail");
        await _factory.Arrange(_lanternread, ListingMother.Public("hartwell-plumbing", name: "Hartwell Plumbing"));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    [Fact]
    public async Task L2_257_AC1_a_platform_is_listed_with_its_category_and_found_by_name()
    {
        var all = await _factory.GetJson("/api/admin/listings", Miriam());
        var row = all.GetProperty("rows").EnumerateArray().Single(r => r.GetProperty("name").GetString() == "Lanternread");
        Assert.Equal("Software platforms", row.GetProperty("categoryName").GetString());

        var found = await _factory.GetJson("/api/admin/listings?q=lantern", Miriam());
        var only = Assert.Single(found.GetProperty("rows").EnumerateArray());
        Assert.Equal("Lanternread", only.GetProperty("name").GetString());
    }

    [Fact]
    public async Task L2_257_AC2_the_moderator_reads_the_address_and_the_founders_words()
    {
        var listing = await _factory.GetJson($"/api/admin/listings/{_lanternread.Id}", Miriam());

        Assert.Equal("platform", listing.GetProperty("kind").GetString());
        Assert.Equal("Software platforms", listing.GetProperty("categoryName").GetString());
        Assert.Equal("A reading log families keep together", listing.GetProperty("tagline").GetString());
        var platform = listing.GetProperty("platform");
        Assert.Equal("https://lanternread.example", platform.GetProperty("address").GetString());
        Assert.Equal("https://lanternread.example", platform.GetProperty("website").GetString());
        Assert.Equal("Families log the books their children read.", platform.GetProperty("does").GetString());
        Assert.Equal("Families with children aged 4 to 12.", platform.GetProperty("for").GetString());
        Assert.Equal("Free for families.", platform.GetProperty("pricing").GetString());
    }

    [Fact]
    public async Task L2_257_AC2_an_address_that_fails_the_rule_is_text_and_never_a_link()
    {
        var odd = ListingMother.Platform("oddity", "Oddity", website: "javascript:alert(1)");
        await _factory.Arrange(odd);

        var listing = await _factory.GetJson($"/api/admin/listings/{odd.Id}", Miriam());

        var platform = listing.GetProperty("platform");
        Assert.Equal("javascript:alert(1)", platform.GetProperty("address").GetString());
        Assert.Equal(JsonValueKind.Null, platform.GetProperty("website").ValueKind);
    }

    [Fact]
    public async Task L2_257_AC2_a_business_has_no_platform_details()
    {
        var all = await _factory.GetJson("/api/admin/listings?q=hartwell", Miriam());
        var id = all.GetProperty("rows")[0].GetProperty("id").GetString();

        var listing = await _factory.GetJson($"/api/admin/listings/{id}", Miriam());

        Assert.Equal(JsonValueKind.Null, listing.GetProperty("platform").ValueKind);
    }

    [Fact]
    public async Task L2_257_AC3_taken_down_a_platform_leaves_every_list_and_its_page_answers_404()
    {
        var response = await Miriam().PostAsJsonAsync(
            $"/api/admin/listings/{_lanternread.Id}/take-down", new { reason = "The platform is not what its listing describes." });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/lanternread")).StatusCode);
        var category = await _factory.GetJson("/api/categories/software-platforms/listings");
        Assert.Empty(category.GetProperty("businesses").EnumerateArray());
        var search = await _factory.GetJson("/api/search?q=lanternread");
        Assert.DoesNotContain("Lanternread", search.GetRawText());
        var told = await _factory.Query(db => Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
            db.Notifications.Where(n => n.MemberSubject == "member|abigail")));
        Assert.NotEmpty(told);
    }
}
