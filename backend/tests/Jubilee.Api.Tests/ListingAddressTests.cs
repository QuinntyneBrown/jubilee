using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.AspNetCore.Hosting;

namespace Jubilee.Api.Tests;

public sealed class AddressDomainFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(IWebHostBuilder builder) =>
        builder.UseSetting("Addresses:Domain", "jubilee.to");
}

// Acceptance Test
// Traces to: L2-241 AC1, AC6; L2-244 AC1 to AC4; L2-245 AC1, AC3, AC5, AC6
// Description: with an address domain set, the API states the address https://{slug}.jubilee.to of a listing where
// the app shows it: the listing page, the answer to a publish, My business and the listing editor. The address
// follows a change of name and nothing else; a draft has none (ADR 0071).
public sealed class ListingAddressTests(AddressDomainFactory factory) : IClassFixture<AddressDomainFactory>, IAsyncLifetime
{
    private Member _naomi = null!;
    private Listing _listing = null!;

    public async Task InitializeAsync()
    {
        await factory.Reset();
        _naomi = Member.Join(EmailAddress.TryParse("naomi@luzandre.example")!, "Naomi", "Laurent", null, "hash", ListingMother.Now);
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", tagline: "Custom church team tees");
        _listing.AssignOwner(_naomi.Id.ToString());
        await factory.Arrange(_naomi, _listing);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Naomi() => factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString());

    private static object Edit(int version, string name, string category = "shops") =>
        new { version, name, tagline = "Custom church team tees", category, about = "We print.", where = "Leslieville", hours = "Mon to Fri, 10 to 6", website = "", highlight = "" };

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    [Fact]
    public async Task L2_241_AC1_the_listing_page_states_the_address_made_from_the_slug()
    {
        var page = await factory.GetJson("/api/listings/luzandre-com");

        Assert.Equal("https://luzandre-com.jubilee.to", page.GetProperty("address").GetString());
    }

    [Fact]
    public async Task L2_244_AC2_the_answer_to_a_publish_states_the_address_and_the_draft_before_it_has_none()
    {
        var joanna = factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");
        var body = new Dictionary<string, object?>
        {
            ["kind"] = "products", ["name"] = "Grace Bakery", ["tagline"] = "Bread", ["categorySlug"] = "shops", ["highlight"] = null,
            ["place"] = "Leslieville", ["agreed"] = true, ["items"] = Array.Empty<object>(), ["idempotencyKey"] = Guid.NewGuid().ToString(),
        };
        var draft = await Json(await joanna.PostAsJsonAsync("/api/listing-drafts", body));

        // L2-241 AC6: a draft has no slug and no address.
        Assert.False(draft.TryGetProperty("address", out _));
        Assert.False(draft.TryGetProperty("slug", out _));

        var published = await Json(await joanna.PostAsJsonAsync($"/api/listing-drafts/{draft.GetProperty("id").GetGuid()}/publish", body));

        Assert.Equal("https://grace-bakery.jubilee.to", published.GetProperty("address").GetString());
    }

    [Fact]
    public async Task L2_244_AC3_AC4_my_business_and_the_listing_editor_state_the_address()
    {
        var overview = await factory.GetJson("/api/my-business", Naomi());
        var editor = await factory.GetJson("/api/my-business/listing", Naomi());

        Assert.Equal("https://luzandre-com.jubilee.to", overview.GetProperty("address").GetString());
        Assert.Equal("https://luzandre-com.jubilee.to", editor.GetProperty("address").GetString());
    }

    [Fact]
    public async Task L2_245_AC1_AC3_the_address_follows_a_new_name_and_comes_back_with_the_old_one()
    {
        var renamed = await Json(await Naomi().PutAsJsonAsync("/api/my-business/listing", Edit(0, "Luzandre Print Co.")));
        Assert.Equal("https://luzandre-print-co.jubilee.to", renamed.GetProperty("address").GetString());

        var back = await Json(await Naomi().PutAsJsonAsync("/api/my-business/listing", Edit(1, "Luzandre.com")));
        Assert.Equal("https://luzandre-com.jubilee.to", back.GetProperty("address").GetString());
    }

    [Fact]
    public async Task L2_245_AC5_AC6_a_change_of_category_a_pause_and_a_resume_leave_the_address_as_it_was()
    {
        var edited = await Naomi().PutAsJsonAsync("/api/my-business/listing", Edit(0, "Luzandre.com", "media"));
        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        Assert.Equal("https://luzandre-com.jubilee.to", (await Json(edited)).GetProperty("address").GetString());

        Assert.True((await Naomi().PostAsync("/api/my-business/pause", null)).IsSuccessStatusCode);
        Assert.Equal("https://luzandre-com.jubilee.to", (await factory.GetJson("/api/my-business", Naomi())).GetProperty("address").GetString());

        Assert.True((await Naomi().PostAsync("/api/my-business/resume", null)).IsSuccessStatusCode);
        Assert.Equal("https://luzandre-com.jubilee.to", (await factory.GetJson("/api/listings/luzandre-com")).GetProperty("address").GetString());
    }

    [Fact]
    public async Task L2_246_AC7_a_request_from_an_address_is_no_allowed_origin()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/listings/luzandre-com");
        request.Headers.Add("Origin", "https://luzandre-com.jubilee.to");
        var preflight = new HttpRequestMessage(HttpMethod.Options, "/api/saved/businesses/luzandre-com");
        preflight.Headers.Add("Origin", "https://luzandre-com.jubilee.to");
        preflight.Headers.Add("Access-Control-Request-Method", "PUT");

        var read = await factory.CreateClient().SendAsync(request);
        var asked = await factory.CreateClient().SendAsync(preflight);

        Assert.False(read.Headers.Contains("Access-Control-Allow-Origin"));
        Assert.False(asked.Headers.Contains("Access-Control-Allow-Origin"));
        Assert.False(asked.Headers.Contains("Access-Control-Allow-Credentials"));
    }
}

// Acceptance Test
// Traces to: L2-244 AC6
// Description: with no address domain set (local development, the end-to-end suite), the API states no address and
// the app shares the listing's page on its own host.
public sealed class NoAddressDomainTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>
{
    [Fact]
    public async Task L2_244_AC6_without_an_address_domain_the_listing_page_states_no_address()
    {
        await factory.Reset();
        await factory.Arrange(ListingMother.Public("luzandre-com", "shops", "Luzandre.com"));

        var page = await factory.GetJson("/api/listings/luzandre-com");

        Assert.Equal(JsonValueKind.Null, page.GetProperty("address").ValueKind);
    }
}
