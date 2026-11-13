using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.AspNetCore.Hosting;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-243 AC1 to AC4, AC6, AC8; L2-245 AC2, AC6; L2-246 AC3, AC6, AC10
// Description: the app's host asks GET /api/addresses/{label}?path= where an address leads. The answer is a path of
// the app under /b/{slug}; it is the same for a public, an unknown and a hidden listing, so nothing tells them apart.
// An old address of a public listing leads to its current slug in one step. A label that cannot be a slug, a reserved
// word and a path that tries to leave the listing answer 404 without touching the database (ADR 0071).
public sealed class AddressResolutionTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private Member _naomi = null!;

    public async Task InitializeAsync()
    {
        await factory.Reset();
        _naomi = Member.Join(EmailAddress.TryParse("naomi@luzandre.example")!, "Naomi", "Laurent", null, "hash", ListingMother.Now);
        var listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", tagline: "Custom church team tees");
        listing.AssignOwner(_naomi.Id.ToString());
        await factory.Arrange(_naomi, listing, ListingMother.NonPublic(NonPublicState.Paused, "park-tees"));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<string?> Location(string url)
    {
        var response = await factory.CreateClient().GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("location").GetString();
    }

    private async Task Rename(string name)
    {
        var body = new { version = 0, name, tagline = "Custom church team tees", category = "shops", about = "We print.", where = "Leslieville", hours = "Mon to Fri, 10 to 6", website = "", highlight = "" };
        var response = await factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString()).PutAsJsonAsync("/api/my-business/listing", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task L2_243_AC1_the_address_of_a_listing_leads_to_its_page_in_the_app()
    {
        Assert.Equal("/b/luzandre-com", await Location("/api/addresses/luzandre-com"));
        Assert.Equal("/b/luzandre-com", await Location("/api/addresses/luzandre-com?path=/"));
    }

    [Theory]
    [InlineData("/p/faith-tee", "/b/luzandre-com/p/faith-tee")]
    [InlineData("/review", "/b/luzandre-com/review")]
    [InlineData("/p/faith-tee/", "/b/luzandre-com/p/faith-tee")]
    [InlineData("/p/caf%C3%A9%20au%20lait", "/b/luzandre-com/p/caf%C3%A9%20au%20lait")]
    [InlineData("/p/a%3Fb%23c", "/b/luzandre-com/p/a%3Fb%23c")]
    public async Task L2_243_AC2_a_path_is_kept_under_the_listings_page_and_encoded_again(string path, string location)
    {
        Assert.Equal(location, await Location($"/api/addresses/luzandre-com?path={Uri.EscapeDataString(path)}"));
    }

    [Fact]
    public async Task L2_243_AC3_an_address_with_capitals_leads_to_the_same_page()
    {
        Assert.Equal("/b/luzandre-com", await Location("/api/addresses/Luzandre-COM"));
    }

    [Fact]
    public async Task L2_243_AC4_an_unknown_address_and_a_hidden_listing_are_answered_as_a_public_one_is()
    {
        // The app's host answers /b/{slug} with 404 for both (DocumentStatusTests); nothing here tells them apart.
        var known = await factory.CreateClient().GetAsync("/api/addresses/luzandre-com");
        var unknown = await factory.CreateClient().GetAsync("/api/addresses/no-such-business");
        var hidden = await factory.CreateClient().GetAsync("/api/addresses/park-tees");

        Assert.Equal("/b/no-such-business", await Location("/api/addresses/no-such-business"));
        Assert.Equal("/b/park-tees", await Location("/api/addresses/park-tees"));
        foreach (var response in new[] { known, unknown, hidden })
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
            Assert.False(response.Headers.Contains("Set-Cookie"));
            Assert.Equal(["location"], JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.EnumerateObject().Select(p => p.Name));
        }
    }

    [Fact]
    public async Task L2_245_AC2_an_old_address_leads_to_the_current_slug_in_one_step_with_its_path()
    {
        await Rename("Luzandre Print Co.");

        Assert.Equal("/b/luzandre-print-co", await Location("/api/addresses/luzandre-com"));
        Assert.Equal("/b/luzandre-print-co/p/faith-tee", await Location("/api/addresses/luzandre-com?path=/p/faith-tee"));
        Assert.Equal("/b/luzandre-print-co", await Location("/api/addresses/luzandre-print-co"));
    }

    [Fact]
    public async Task L2_243_AC4_the_old_address_of_a_listing_that_is_no_longer_public_does_not_name_its_current_slug()
    {
        await Rename("Luzandre Print Co.");
        Assert.True((await factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString()).PostAsync("/api/my-business/pause", null)).IsSuccessStatusCode);

        Assert.Equal("/b/luzandre-com", await Location("/api/addresses/luzandre-com"));

        // L2-245 AC6: resumed, the old address opens it again.
        Assert.True((await factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString()).PostAsync("/api/my-business/resume", null)).IsSuccessStatusCode);
        Assert.Equal("/b/luzandre-print-co", await Location("/api/addresses/luzandre-com"));
    }

    [Theory]
    [InlineData("zq")]
    [InlineData("-luzandre")]
    [InlineData("luzandre-")]
    [InlineData("luz--andre")]
    [InlineData("luz_andre")]
    [InlineData("luzandre.com")]
    [InlineData("xn--bcher-kva")]
    [InlineData("a-label-that-is-longer-than-forty-characters-in-all")]
    [InlineData("admin")]
    [InlineData("www")]
    [InlineData("JUBILEE")]
    public async Task L2_243_AC6_AC8_a_label_that_is_not_well_formed_or_is_reserved_answers_404_without_the_database(string label)
    {
        // The database is out: an answer proves it was not asked.
        factory.Database.Unavailable = true;

        var response = await factory.CreateClient().GetAsync($"/api/addresses/{label}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.DoesNotContain(label, await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("/../sign-in")]
    [InlineData("/p/../../sign-in")]
    [InlineData("/./p")]
    [InlineData("//evil.example")]
    [InlineData("/p//faith-tee")]
    [InlineData("/p\\faith-tee")]
    [InlineData("/%2e%2e/sign-in")]
    [InlineData("/p/%2E%2E/x")]
    [InlineData("/p/a%2Fb")]
    [InlineData("/p/a%5Cb")]
    [InlineData("/p/a%00b")]
    [InlineData("/p/%ZZ")]
    [InlineData("p/faith-tee")]
    public async Task L2_246_AC6_a_path_that_tries_to_leave_the_listings_page_answers_404(string path)
    {
        factory.Database.Unavailable = true;

        var response = await factory.CreateClient().GetAsync($"/api/addresses/luzandre-com?path={Uri.EscapeDataString(path)}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task L2_246_AC10_the_log_of_an_address_holds_the_label_the_status_and_the_correlation_id()
    {
        factory.Logs.Clear();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/addresses/luzandre-com?path=/p/faith-tee");
        request.Headers.Add("X-Correlation-ID", "address-test-1");
        request.Headers.Add("Cookie", "__Host-jubilee.session=secret-session-value");

        await factory.CreateClient().SendAsync(request);

        var messages = factory.Logs.Entries.Select(e => e.Message).ToList();
        var line = Assert.Single(messages, m => m.StartsWith("HTTP GET /api/addresses/luzandre-com responded 200", StringComparison.Ordinal));
        Assert.Contains("address-test-1", line);
        Assert.DoesNotContain("secret-session-value", string.Join('\n', messages));
    }
}

public sealed class ThreeAddressesPerMinuteFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(IWebHostBuilder builder) =>
        builder.UseSetting("RateLimits:AddressesPerMinute", "3");
}

// Acceptance Test
// Traces to: L2-246 AC8
// Description: addresses have a budget of their own per caller; beyond it the answer is 429 with Retry-After, and
// the directory's budget is not spent.
public sealed class AddressRateLimitTests(ThreeAddressesPerMinuteFactory factory) : IClassFixture<ThreeAddressesPerMinuteFactory>
{
    [Fact]
    public async Task L2_246_AC8_addresses_beyond_the_limit_answer_429_with_retry_after()
    {
        var client = factory.CreateClient();
        foreach (var label in new[] { "one-business", "two-business", "admin" })
        {
            Assert.NotEqual(HttpStatusCode.TooManyRequests, (await client.GetAsync($"/api/addresses/{label}")).StatusCode);
        }

        var refused = await client.GetAsync("/api/addresses/four-business");

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.InRange(refused.Headers.RetryAfter!.Delta!.Value.TotalSeconds, 1, 60);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/directory/home")).StatusCode);
    }
}
