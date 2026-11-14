using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

// The jump palette of the admin application (L2-273 AC3, AC6): records, across every table the staff member may read,
// whose ID or name contains the text, ignoring case; six at most; never a private table or one the role may not read.
public sealed class AdminJumpTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private static readonly DateTimeOffset Now = ListingMother.Now;

    private readonly JubileeApiFactory _factory;

    public AdminJumpTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync() => await _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    private HttpClient Ada() => _factory.CreateStaffClient("Ada Nwosu", "staff|ada", "admin");

    private static async Task<List<JsonElement>> Found(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return [.. JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.EnumerateArray()];
    }

    private static Member Join(string email, string first, string last) =>
        Member.Join(EmailAddress.TryParse(email)!, first, last, null, "hash", Now.AddDays(-30));

    // L2-273 AC3: a record matches by its name, ignoring case, with its table's name and singular
    [Fact]
    public async Task L2_273_AC3_records_match_by_name_ignoring_case()
    {
        var ruth = Join("ruth.c@outlook.com", "Ruth", "Castillo");
        var naomi = Join("naomi@example.com", "Naomi", "Laurent");
        await _factory.Arrange(ruth, naomi);

        var found = await Found(await Miriam().GetAsync("/api/admin/jump?q=RUTH"));

        var member = Assert.Single(found, f => f.GetProperty("table").GetString() == "members");
        Assert.Equal(ruth.Id.ToString(), member.GetProperty("id").GetString());
        Assert.Equal("Ruth Castillo", member.GetProperty("name").GetString());
        Assert.Equal("Members", member.GetProperty("tableLabel").GetString());
        Assert.Equal("Member", member.GetProperty("singular").GetString());
        Assert.DoesNotContain(found, f => f.GetProperty("id").GetString() == naomi.Id.ToString());
    }

    // L2-273 AC3: a record matches by its ID
    [Fact]
    public async Task L2_273_AC3_records_match_by_id()
    {
        var shop = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", Now.AddDays(-30));
        await _factory.Arrange(shop);

        var found = await Found(await Miriam().GetAsync($"/api/admin/jump?q={shop.Id.ToString()[..8]}"));

        Assert.Contains(found, f => f.GetProperty("table").GetString() == "listings" && f.GetProperty("id").GetString() == shop.Id.ToString());
    }

    // L2-273 AC3: six records at most
    [Fact]
    public async Task L2_273_AC3_six_records_at_most()
    {
        await _factory.Arrange([.. Enumerable.Range(1, 8).Select(i => Join($"ruth{i}@example.com", "Ruth", $"Number{i}"))]);

        var found = await Found(await Miriam().GetAsync("/api/admin/jump?q=ruth"));

        Assert.Equal(6, found.Count);
    }

    // L2-273 AC6, L2-284: a table the role may not read is never searched
    [Fact]
    public async Task L2_273_AC6_tables_the_role_may_not_read_are_not_searched()
    {
        var staff = StaffMember.Create(EmailAddress.TryParse("ruth.staff@jubilee.to")!, Now.AddDays(-30));
        await _factory.Arrange(staff);

        var moderator = await Found(await Miriam().GetAsync("/api/admin/jump?q=ruth.staff"));
        var admin = await Found(await Ada().GetAsync("/api/admin/jump?q=ruth.staff"));

        Assert.DoesNotContain(moderator, f => f.GetProperty("table").GetString() == "staff");
        Assert.Contains(admin, f => f.GetProperty("table").GetString() == "staff");
    }

    // L2-273 AC6, L2-284 AC3: a private table, such as Messages, is never searched
    [Fact]
    public async Task L2_273_AC6_private_tables_are_not_searched()
    {
        var shop = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", Now.AddDays(-30));
        var conversation = Conversation.Start(shop.Id, "member|naomi", "Naomi Laurent", Now.AddDays(-4));
        var message = Message.Send(
            conversation.Id, "member|naomi", "Naomi Laurent", false, "Is the guest suite free?", "k-1", null, false, Now.AddDays(-4));
        await _factory.Arrange(shop, conversation, message);

        var found = await Found(await Ada().GetAsync("/api/admin/jump?q=naomi"));

        Assert.DoesNotContain(found, f => f.GetProperty("table").GetString() is "messages" or "message-attachments");
    }

    // L2-273 AC6: without a staff session nothing is searched
    [Fact]
    public async Task L2_273_AC6_the_search_needs_a_staff_session()
    {
        var response = await _factory.CreateClient().GetAsync("/api/admin/jump?q=ruth");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
