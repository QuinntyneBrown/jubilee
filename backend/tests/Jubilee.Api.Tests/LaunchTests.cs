using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

public sealed class FiveLaunchSubmissionsFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("RateLimits:LaunchSignUpsPerHour", "5");
        builder.UseSetting("RateLimits:LaunchPreRegistrationsPerHour", "5");
    }
}

public sealed class LaunchChallengeFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder) =>
        builder.UseSetting("BotChallenge:SiteKey", "site-key-for-tests");
}

// Acceptance Test
// Traces to: L2-217, L2-218
// Description: anyone signs up, on the launching-soon marketing page, to be told when Jubilee launches.
public partial class LaunchTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Notifications = "/api/launch/notifications";

    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static object SignUp(string? email = "joanna.adeyemi@example.com", string? firstName = "Joanna", bool consent = true) =>
        new { email, firstName, consent };

    private static async Task<Dictionary<string, string>> Errors(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("validation_failed", json.GetProperty("code").GetString());
        return json.GetProperty("errors").EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString()!);
    }

    private Task<List<LaunchSubscriber>> Subscribers() =>
        factory.Query(db => db.LaunchSubscribers.AsNoTracking().ToListAsync());

    // L2-217 AC8, L2-218 AC1, AC2
    // Given a visitor with no session, when they send a valid address with consent,
    // then the answer is 202 with no body and the sign-up is stored with its consent.
    [Fact]
    public async Task L2_217_AC8_a_sign_up_is_stored_with_its_consent_and_answers_202_with_no_body()
    {
        var response = await factory.CreateClient().PostAsJsonAsync(Notifications, SignUp(" Joanna.Adeyemi@Example.com ", " Joanna "));

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
        var stored = Assert.Single(await Subscribers());
        Assert.Equal("Joanna.Adeyemi@example.com", stored.Email);
        Assert.Equal("joanna.adeyemi@example.com", stored.EmailKey);
        Assert.Equal("Joanna", stored.FirstName);
        Assert.Equal(factory.Clock.GetUtcNow(), stored.ConsentedAt);
        Assert.Equal(ConsentMethod.MarketingSiteForm, stored.ConsentMethod);
        Assert.Equal(factory.Clock.GetUtcNow(), stored.CreatedAt);
        // No account is created and no e-mail is sent now.
        Assert.Equal(0, await factory.Query(db => db.Members.CountAsync()));
        Assert.Equal(0, await factory.Query(db => db.OutboxMessages.CountAsync()));
    }

    // L2-217 AC1: the first name is optional
    [Fact]
    public async Task L2_217_AC1_the_first_name_is_optional()
    {
        var response = await factory.CreateClient().PostAsJsonAsync(Notifications, new { email = "ruth@example.com", consent = true });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Null(Assert.Single(await Subscribers()).FirstName);
    }

    // L2-217 AC5
    // Given an address that has signed up, when it signs up again (in other letter case),
    // then the answer is the same and one sign-up is kept, unchanged.
    [Fact]
    public async Task L2_217_AC5_signing_up_twice_answers_the_same_and_keeps_one_unchanged_sign_up()
    {
        var client = factory.CreateClient();
        var first = await client.PostAsJsonAsync(Notifications, SignUp());
        factory.Clock.Advance(TimeSpan.FromDays(2));

        var second = await client.PostAsJsonAsync(Notifications, SignUp("JOANNA.ADEYEMI@EXAMPLE.COM", "Someone else"));

        Assert.Equal(first.StatusCode, second.StatusCode);
        Assert.Equal(await first.Content.ReadAsStringAsync(), await second.Content.ReadAsStringAsync());
        var stored = Assert.Single(await Subscribers());
        Assert.Equal("Joanna", stored.FirstName);
        Assert.Equal(factory.Clock.GetUtcNow() - TimeSpan.FromDays(2), stored.ConsentedAt);
    }

    // L2-217 AC2, L2-218 AC1
    [Theory]
    [InlineData(null, "Joanna", true, "email", "REQUIRED")]
    [InlineData("  ", "Joanna", true, "email", "REQUIRED")]
    [InlineData("not-an-address", "Joanna", true, "email", "EMAIL_INVALID")]
    [InlineData("joanna@example.com", "Joanna", false, "consent", "CONSENT_REQUIRED")]
    public async Task L2_217_AC2_an_invalid_sign_up_is_refused_with_a_code_for_the_field_and_nothing_is_stored(
        string? email, string? firstName, bool consent, string field, string code)
    {
        var response = await factory.CreateClient().PostAsJsonAsync(Notifications, SignUp(email, firstName, consent));

        var errors = await Errors(response);
        Assert.Equal(code, errors[field]);
        Assert.Single(errors);
        Assert.Empty(await Subscribers());
    }

    [Fact]
    public async Task L2_217_AC2_values_over_their_limits_are_too_long()
    {
        var response = await factory.CreateClient().PostAsJsonAsync(
            Notifications, SignUp(new string('a', 250) + "@example.com", new string('J', 51)));

        var errors = await Errors(response);
        Assert.Equal("TOO_LONG", errors["email"]);
        Assert.Equal("TOO_LONG", errors["firstName"]);
        Assert.Empty(await Subscribers());
    }

    // L2-218 AC2 (L2-136 AC1)
    [Fact]
    public async Task L2_218_AC2_unknown_fields_are_refused()
    {
        var response = await factory.CreateClient().PostAsJsonAsync(
            Notifications, new { email = "joanna@example.com", consent = true, isAdmin = true });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await Subscribers());
    }

    // L2-218 AC2 (L2-136 AC2): text is stored as text
    [Fact]
    public async Task L2_218_AC2_markup_in_a_name_is_stored_as_the_text_it_is()
    {
        await factory.CreateClient().PostAsJsonAsync(Notifications, SignUp(firstName: "<script>alert(1)</script>"));

        Assert.Equal("<script>alert(1)</script>", Assert.Single(await Subscribers()).FirstName);
    }

    // L2-218 AC3 (L2-137 AC2)
    // Given the bot challenge is not passed, when a sign-up arrives, then it is refused before anything is checked or stored.
    [Fact]
    public async Task L2_218_AC3_a_failed_bot_challenge_is_refused_before_anything_else_and_stores_nothing()
    {
        factory.Bot.Passes = false;

        var response = await factory.CreateClient().PostAsJsonAsync(Notifications, new { email = "not-an-address", consent = false, challengeToken = "bad" });

        var errors = await Errors(response);
        Assert.Equal("CHALLENGE_FAILED", Assert.Single(errors).Value);
        Assert.Equal("challenge", errors.Keys.Single());
        Assert.Empty(await Subscribers());
    }

    // L2-218 AC5
    [Fact]
    public async Task L2_218_AC5_without_a_bot_challenge_the_page_is_told_of_none()
    {
        var response = await factory.CreateClient().GetAsync("/api/launch");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Empty(json.EnumerateObject());
    }
}

public sealed class LaunchChallengeTests(LaunchChallengeFactory factory) : IClassFixture<LaunchChallengeFactory>
{
    // L2-218 AC5
    [Fact]
    public async Task L2_218_AC5_the_page_learns_the_site_key_of_the_bot_challenge_and_nothing_else()
    {
        var json = JsonDocument.Parse(await factory.CreateClient().GetStringAsync("/api/launch")).RootElement;

        Assert.Equal("site-key-for-tests", json.GetProperty("botChallengeSiteKey").GetString());
        Assert.Single(json.EnumerateObject());
    }
}

public sealed class LaunchRateLimitTests(FiveLaunchSubmissionsFactory factory) : IClassFixture<FiveLaunchSubmissionsFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    // L2-218 AC3 (L2-137 AC1)
    // Given five sign-ups from one address in an hour, when a sixth is sent, then the answer is 429 with Retry-After.
    [Fact]
    public async Task L2_218_AC3_the_sixth_sign_up_from_one_address_in_an_hour_answers_429_with_retry_after()
    {
        var client = factory.CreateClient();
        for (var i = 0; i < 5; i++)
        {
            var accepted = await client.PostAsJsonAsync("/api/launch/notifications", new { email = $"visitor{i}@example.com", consent = true });
            Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
        }

        var refused = await client.PostAsJsonAsync("/api/launch/notifications", new { email = "visitor6@example.com", consent = true });

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.InRange(refused.Headers.RetryAfter!.Delta!.Value.TotalSeconds, 1, 3600);
        var json = JsonDocument.Parse(await refused.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("rate_limited", json.GetProperty("code").GetString());
        Assert.Equal(5, await factory.Query(db => db.LaunchSubscribers.CountAsync()));
        // The limit is of the sign-ups only.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/launch")).StatusCode);
    }
}
