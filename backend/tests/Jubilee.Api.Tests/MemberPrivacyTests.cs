using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-196 AC7, L2-145 AC1, L2-013 AC8
// Description: a member's home church and its address are given to no other reader: not the business
// reading the member's request or conversation, not the Jubilee team reading a listing's owner, not a
// public page. Pronouns are shown to the Jubilee team beside the owner's name and to no one else
// (ADR 0065). Samuel sends a request and a message to Luzandre.com, which Naomi owns; Miriam is on the
// Jubilee team.
public sealed class MemberPrivacyTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string SamuelsChurch = "Agincourt Pentecostal Church";
    private const string SamuelsChurchAddress = "2700 Bristol Circle, Oakville";
    private const string NaomisChurch = "Église Saint-Jean de Toronto";
    private const string NaomisChurchAddress = "383 Jarvis Street, Toronto";

    private readonly JubileeApiFactory _factory;
    private Member _naomi = default!;
    private Member _samuel = default!;
    private Listing _luzandre = default!;
    private Request _order = default!;

    public MemberPrivacyTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _naomi = Member.Join(EmailAddress.TryParse("naomi@example.com")!, "Naomi", "Laurent", null, "hash", ListingMother.Now.AddMonths(-5));
        _naomi.ConfirmEmail();
        _naomi.UpdateProfile("Naomi", "Laurent", null, null, NaomisChurch, NaomisChurchAddress, "she/her", ListingMother.Now.AddMonths(-1));
        _samuel = Member.Join(EmailAddress.TryParse("samuel@example.com")!, "Samuel", "Park", null, "hash", ListingMother.Now.AddMonths(-2));
        _samuel.ConfirmEmail();
        _samuel.UpdateProfile("Samuel", "Park", "4165550142", "M1S 3T5", SamuelsChurch, SamuelsChurchAddress, "he/him", ListingMother.Now.AddDays(-3));
        _luzandre = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", ListingMother.Now.AddDays(-2));
        _luzandre.AssignOwner(_naomi.Id.ToString());
        var tee = Product.Create(_luzandre.Id, "custom-church-team-tee", "Custom church team tee", 2200, true, TileTint.Gold, TileIcon.Shirt, ListingMother.Now.AddDays(-30));
        _order = Request.AskForOrder(
            _samuel.Id.ToString(), "Samuel Park", _luzandre.Id, tee.Id, tee.Name, null, 24, new OrderAmounts(2200, 2200 * 24, 0), "Pickup in Leslieville",
            "4165550142", "For the youth retreat", Guid.NewGuid().ToString(), ListingMother.Now.AddHours(-2));
        await _factory.Arrange(_naomi, _samuel, _luzandre, tee, _order);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString());

    private HttpClient Samuel() => _factory.CreateMemberClient("Samuel Park", _samuel.Id.ToString());

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    private static async Task<string> Read(HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadAsStringAsync();
    }

    private static void HoldsNoChurch(string answer)
    {
        Assert.DoesNotContain(SamuelsChurch, answer, StringComparison.Ordinal);
        Assert.DoesNotContain(SamuelsChurchAddress, answer, StringComparison.Ordinal);
        Assert.DoesNotContain("Église Saint-Jean", answer, StringComparison.Ordinal);
        Assert.DoesNotContain(NaomisChurchAddress, answer, StringComparison.Ordinal);
        Assert.DoesNotContain("homeChurch", answer, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task L2_196_AC7_the_business_the_jubilee_team_and_the_public_are_given_neither_the_home_church_nor_its_address()
    {
        var started = await Samuel().PostAsJsonAsync(
            "/api/conversations", new { listingSlug = "luzandre-com", body = "Can you print 24 tees by Friday?", idempotencyKey = Guid.NewGuid().ToString() });
        Assert.Equal(HttpStatusCode.Created, started.StatusCode);
        var conversation = JsonDocument.Parse(await started.Content.ReadAsStringAsync()).RootElement.GetProperty("conversationId").GetString();

        var answers = new[]
        {
            await Read(Naomi(), "/api/my-business/requests"),
            await Read(Naomi(), "/api/conversations"),
            await Read(Naomi(), $"/api/conversations/{conversation}"),
            await Read(Miriam(), "/api/admin/listings"),
            await Read(Miriam(), $"/api/admin/listings/{_luzandre.Id}"),
            await Read(_factory.CreateClient(), "/api/listings/luzandre-com"),
        };

        Assert.Contains("Samuel", answers[0], StringComparison.Ordinal);
        Assert.All(answers, HoldsNoChurch);
    }

    [Fact]
    public async Task L2_013_AC8_the_jubilee_team_sees_the_owners_pronouns_and_no_other_reader_is_given_any()
    {
        var owner = JsonDocument.Parse(await Read(Miriam(), $"/api/admin/listings/{_luzandre.Id}")).RootElement.GetProperty("owner");
        var started = await Samuel().PostAsJsonAsync(
            "/api/conversations", new { listingSlug = "luzandre-com", body = "Can you print 24 tees by Friday?", idempotencyKey = Guid.NewGuid().ToString() });
        var conversation = JsonDocument.Parse(await started.Content.ReadAsStringAsync()).RootElement.GetProperty("conversationId").GetString();

        Assert.Equal("she/her", owner.GetProperty("pronouns").GetString());
        foreach (var answer in new[]
        {
            await Read(Naomi(), "/api/my-business/requests"),
            await Read(Naomi(), $"/api/conversations/{conversation}"),
            await Read(Samuel(), $"/api/conversations/{conversation}"),
            await Read(_factory.CreateClient(), "/api/listings/luzandre-com"),
        })
        {
            Assert.DoesNotContain("he/him", answer, StringComparison.Ordinal);
            Assert.DoesNotContain("she/her", answer, StringComparison.Ordinal);
            Assert.DoesNotContain("pronouns", answer, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task L2_013_AC8_an_owner_who_set_no_pronouns_has_none_in_the_owner_panel()
    {
        var ruth = Member.Join(EmailAddress.TryParse("ruth@example.com")!, "Ruth", "Mensah", null, "hash", ListingMother.Now.AddMonths(-1));
        var bakery = ListingMother.Public("ruths-bakery", "shops", "Ruth's Bakery", ListingMother.Now.AddDays(-1));
        bakery.AssignOwner(ruth.Id.ToString());
        await _factory.Arrange(ruth, bakery);

        var owner = JsonDocument.Parse(await Read(Miriam(), $"/api/admin/listings/{bakery.Id}")).RootElement.GetProperty("owner");

        Assert.Equal(JsonValueKind.Null, owner.GetProperty("pronouns").ValueKind);
    }
}
