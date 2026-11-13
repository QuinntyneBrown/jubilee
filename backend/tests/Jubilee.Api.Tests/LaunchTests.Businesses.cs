using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Jubilee.Application.Launch;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

public sealed class LaunchTeamEmailFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder) =>
        builder.UseSetting("Launch:TeamEmail", "team@jubilee.test");
}

// Acceptance Test
// Traces to: L2-216, L2-218
// Description: an owner sends their business's details before launch; the team reads them and they are deleted after 12 months.
public partial class LaunchTests
{
    private const string Businesses = "/api/launch/businesses";

    private static Dictionary<string, object?> Details(params (string Field, object? Value)[] changes)
    {
        var details = new Dictionary<string, object?>
        {
            ["businessName"] = "Luzandre.com",
            ["contactName"] = "Naomi Laurent",
            ["email"] = "naomi@luzandre.com",
            ["phone"] = "416-555-0142",
            ["category"] = "shops",
            ["area"] = "Leslieville",
            ["website"] = "luzandre.com",
            ["description"] = "Custom Christian apparel, artworks and gifts, made in Toronto.",
            ["consent"] = true,
        };
        foreach (var (field, value) in changes)
        {
            details[field] = value;
        }

        return details;
    }

    private Task<List<BusinessPreRegistration>> PreRegistrations() =>
        factory.Query(db => db.BusinessPreRegistrations.AsNoTracking().ToListAsync());

    // L2-216 AC9, L2-218 AC1
    // Given an owner with no session, when they send valid details with consent,
    // then the answer is 202 with no body and the pre-registration is stored with its consent, and nothing else changes.
    [Fact]
    public async Task L2_216_AC9_a_pre_registration_is_stored_with_its_consent_and_lists_nothing()
    {
        var listings = await factory.Query(db => db.Listings.CountAsync());

        var response = await factory.CreateClient().PostAsJsonAsync(Businesses, Details());

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
        var stored = Assert.Single(await PreRegistrations());
        Assert.Equal("Luzandre.com", stored.BusinessName);
        Assert.Equal("Naomi Laurent", stored.ContactName);
        Assert.Equal("naomi@luzandre.com", stored.Email);
        Assert.Equal("4165550142", stored.Phone);
        Assert.Equal("shops", stored.CategorySlug);
        Assert.Equal("Leslieville", stored.Area);
        Assert.Equal("https://luzandre.com", stored.Website);
        Assert.Equal("Custom Christian apparel, artworks and gifts, made in Toronto.", stored.Description);
        Assert.Equal(factory.Clock.GetUtcNow(), stored.ConsentedAt);
        Assert.Equal(ConsentMethod.MarketingSiteForm, stored.ConsentMethod);
        // Nothing is listed, drafted or joined, and without a team address nothing is e-mailed.
        Assert.Equal(listings, await factory.Query(db => db.Listings.CountAsync()));
        Assert.Equal(0, await factory.Query(db => db.ListingDrafts.CountAsync()));
        Assert.Equal(0, await factory.Query(db => db.Members.CountAsync()));
        Assert.Equal(0, await factory.Query(db => db.OutboxMessages.CountAsync()));
    }

    // L2-216 AC1: the phone and the website are optional; one owner may send two businesses
    // L2-248 AC2: the twelfth category is one a business can pre-register in.
    [Fact]
    public async Task L2_248_AC2_a_founder_pre_registers_a_software_platform()
    {
        var response = await factory.CreateClient().PostAsJsonAsync(
            Businesses, Details(("businessName", "Lanternread"), ("category", "software-platforms"), ("website", "https://lanternread.example")));

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var stored = Assert.Single(await PreRegistrations());
        Assert.Equal("software-platforms", stored.CategorySlug);
    }

    [Fact]
    public async Task L2_216_AC1_phone_and_website_are_optional_and_every_pre_registration_is_kept()
    {
        var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync(Businesses, Details(("phone", null), ("website", " ")))).StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync(Businesses, Details(("businessName", "Laurent Prints"), ("phone", "1 (416) 555-0142"), ("website", "http://prints.example/shop")))).StatusCode);

        var stored = (await PreRegistrations()).OrderBy(r => r.BusinessName).ToList();
        Assert.Equal(2, stored.Count);
        Assert.Equal("4165550142", stored[0].Phone);
        Assert.Equal("http://prints.example/shop", stored[0].Website);
        Assert.Null(stored[1].Phone);
        Assert.Null(stored[1].Website);
    }

    // L2-216 AC3, L2-218 AC1
    [Theory]
    [InlineData("businessName", "", "REQUIRED")]
    [InlineData("contactName", null, "REQUIRED")]
    [InlineData("email", "", "REQUIRED")]
    [InlineData("email", "naomi@", "EMAIL_INVALID")]
    [InlineData("phone", "555-0142", "PHONE_INVALID")]
    [InlineData("phone", "call me", "PHONE_INVALID")]
    [InlineData("category", "", "REQUIRED")]
    [InlineData("category", "bakeries", "CATEGORY_UNKNOWN")]
    [InlineData("area", " ", "REQUIRED")]
    [InlineData("website", "javascript:alert(1)", "WEBSITE_INVALID")]
    [InlineData("website", "ftp://luzandre.com", "WEBSITE_INVALID")]
    [InlineData("website", "not a site", "WEBSITE_INVALID")]
    [InlineData("description", "", "REQUIRED")]
    [InlineData("consent", false, "CONSENT_REQUIRED")]
    public async Task L2_216_AC3_an_invalid_pre_registration_is_refused_with_a_code_for_the_field_and_nothing_is_stored(
        string field, object? value, string code)
    {
        var response = await factory.CreateClient().PostAsJsonAsync(Businesses, Details((field, value)));

        var errors = await Errors(response);
        Assert.Equal(code, errors[field]);
        Assert.Single(errors);
        Assert.Empty(await PreRegistrations());
    }

    [Fact]
    public async Task L2_216_AC3_values_over_their_limits_are_too_long()
    {
        var response = await factory.CreateClient().PostAsJsonAsync(Businesses, Details(
            ("businessName", new string('b', 81)), ("contactName", new string('c', 101)), ("area", new string('a', 81)),
            ("website", new string('w', 198) + ".ca"), ("description", new string('d', 501))));

        var errors = await Errors(response);
        Assert.Equal(["area", "businessName", "contactName", "description", "website"], errors.Keys.Order());
        Assert.All(errors.Values, code => Assert.Equal("TOO_LONG", code));
    }

    // L2-218 AC2
    [Fact]
    public async Task L2_218_AC2_unknown_fields_of_a_pre_registration_are_refused()
    {
        var response = await factory.CreateClient().PostAsJsonAsync(Businesses, Details(("verified", true)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await PreRegistrations());
    }

    // L2-218 AC3
    [Fact]
    public async Task L2_218_AC3_a_failed_bot_challenge_refuses_a_pre_registration_before_anything_else()
    {
        factory.Bot.Passes = false;

        var response = await factory.CreateClient().PostAsJsonAsync(Businesses, Details(("email", "naomi@"), ("challengeToken", "bad")));

        var errors = await Errors(response);
        Assert.Equal("CHALLENGE_FAILED", errors["challenge"]);
        Assert.Single(errors);
        Assert.Empty(await PreRegistrations());
    }

    // L2-218 AC6 (L2-148 AC6)
    // Given a sign-up and a pre-registration 12 months old and one of each that is newer,
    // when the daily job's rule runs, then the old ones are deleted and the counts are returned.
    [Fact]
    public async Task L2_218_AC6_sign_ups_and_pre_registrations_are_deleted_after_twelve_months()
    {
        var client = factory.CreateClient();
        await client.PostAsJsonAsync(Notifications, SignUp("old@example.com"));
        await client.PostAsJsonAsync(Businesses, Details(("businessName", "Old Bakery")));
        factory.Clock.Advance(TimeSpan.FromDays(200));
        await client.PostAsJsonAsync(Notifications, SignUp("new@example.com"));
        await client.PostAsJsonAsync(Businesses, Details(("businessName", "New Bakery")));
        factory.Clock.Advance(TimeSpan.FromDays(166));

        using var scope = factory.Services.CreateScope();
        var purged = await scope.ServiceProvider.GetRequiredService<ISender>().Send(new PurgeLaunchDataCommand());

        Assert.Equal(new LaunchPurgeResult(1, 1), purged);
        Assert.Equal("new@example.com", Assert.Single(await Subscribers()).Email);
        Assert.Equal("New Bakery", Assert.Single(await PreRegistrations()).BusinessName);
    }
}

public sealed class LaunchTeamEmailTests(LaunchTeamEmailFactory factory) : IClassFixture<LaunchTeamEmailFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    // L2-216 AC10
    // Given a team address is configured, when a pre-registration is stored,
    // then an e-mail with the details goes to that address through the outbox.
    [Fact]
    public async Task L2_216_AC10_the_team_is_e_mailed_the_details_of_each_pre_registration()
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/launch/businesses", new
        {
            businessName = "Luzandre.com",
            contactName = "Naomi Laurent",
            email = "naomi@luzandre.com",
            phone = "416-555-0142",
            category = "shops",
            area = "Leslieville",
            website = "luzandre.com",
            description = "Custom Christian apparel, artworks and gifts, made in Toronto.",
            consent = true,
        });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);

        var sent = Assert.Single(factory.Emails.Sent);
        Assert.Equal("team@jubilee.test", sent.To);
        Assert.Equal("New business pre-registration: Luzandre.com", sent.Subject);
        foreach (var detail in new[] { "Naomi Laurent", "naomi@luzandre.com", "416-555-0142", "Shops", "Leslieville", "https://luzandre.com", "Custom Christian apparel" })
        {
            Assert.Contains(detail, sent.Body);
        }
    }
}
