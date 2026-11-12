using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

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
        // Pre-registrations have a budget of their own.
        var details = new { businessName = "B", contactName = "C", email = "o@example.com", category = "shops", area = "A", description = "D", consent = true };
        for (var i = 0; i < 5; i++)
        {
            Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/launch/businesses", details)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostAsJsonAsync("/api/launch/businesses", details)).StatusCode);
        Assert.Equal(5, await factory.Query(db => db.BusinessPreRegistrations.CountAsync()));
        // The limit is of the sign-ups only.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/launch")).StatusCode);
    }

    /// <summary>A sign-up as the marketing host's proxy sends it for a caller at one address.</summary>
    private Task<HttpResponseMessage> FromTheProxy(string email, bool kept, string key = JubileeApiFactory.StaffProxyKey)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/launch/notifications") { Content = JsonContent.Create(new { email, consent = true }) };
        request.Headers.Add("X-Jubilee-Proxy-Key", key);
        request.Headers.Add("X-Jubilee-Client-Address", "203.0.113.77");
        request.Headers.Add("X-Jubilee-Received-At", "2026-01-01T00:00:00.000Z");
        if (kept)
        {
            request.Headers.Add("X-Jubilee-Kept", "true");
        }

        return factory.CreateClient().SendAsync(request);
    }

    // L2-218 AC9
    // Given an address has used its five sign-ups of the hour, when the marketing host sends again a sign-up it
    // kept for that address, then it is stored: a kept submission is not counted, because sending it again is the
    // marketing host's doing, not the visitor's. The same request without the proxy's key is still refused.
    [Fact]
    public async Task L2_218_AC9_a_kept_submission_is_not_counted_against_the_limit_of_its_address()
    {
        for (var i = 0; i < 5; i++)
        {
            Assert.Equal(HttpStatusCode.Accepted, (await FromTheProxy($"first{i}@example.com", kept: false)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await FromTheProxy("sixth@example.com", kept: false)).StatusCode);

        Assert.Equal(HttpStatusCode.Accepted, (await FromTheProxy("kept@example.com", kept: true)).StatusCode);
        Assert.Contains(await factory.Query(db => db.LaunchSubscribers.Select(s => s.Email).ToListAsync()), email => email == "kept@example.com");
    }

    // L2-218 AC9
    // Given a caller that marks its own sign-ups as kept without the proxy's key, when it passes the limit of its
    // address, then it is refused like anyone else.
    [Fact]
    public async Task L2_218_AC9_a_kept_mark_without_the_proxy_key_is_counted()
    {
        var client = factory.CreateClient();
        HttpResponseMessage? last = null;
        for (var i = 0; i < 6; i++)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/launch/businesses")
            {
                Content = JsonContent.Create(new { businessName = $"B{i}", contactName = "C", email = "o@example.com", category = "shops", area = "A", description = "D", consent = true }),
            };
            request.Headers.Add("X-Jubilee-Proxy-Key", "not-the-key");
            request.Headers.Add("X-Jubilee-Kept", "true");
            last = await client.SendAsync(request);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, last!.StatusCode);
    }
}

public sealed class LaunchSignUpTeamEmailTests(LaunchTeamEmailFactory factory) : IClassFixture<LaunchTeamEmailFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private Task<HttpResponseMessage> SignUp(string email, string? firstName = "Joanna") =>
        factory.CreateClient().PostAsJsonAsync("/api/launch/notifications", new { email, firstName, consent = true });

    private async Task<IReadOnlyList<SentEmail>> Dispatched()
    {
        using var scope = factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
        return factory.Emails.Sent.ToList();
    }

    // L2-217 AC9
    // Given a team address is configured, when a new address signs up,
    // then one e-mail with the address and the first name goes to the team through the outbox.
    [Fact]
    public async Task L2_217_AC9_the_team_is_e_mailed_each_new_sign_up()
    {
        Assert.Equal(HttpStatusCode.Accepted, (await SignUp("joanna.adeyemi@example.com")).StatusCode);

        Assert.Equal(1, await factory.Query(db => db.OutboxMessages.CountAsync()));
        var sent = Assert.Single(await Dispatched());
        Assert.Equal("team@jubilee.test", sent.To);
        Assert.Equal("New launch notification sign-up", sent.Subject);
        Assert.Contains("E-mail: joanna.adeyemi@example.com", sent.Body);
        Assert.Contains("First name: Joanna", sent.Body);
    }

    // L2-217 AC9: without a first name the e-mail says so
    [Fact]
    public async Task L2_217_AC9_the_e_mail_says_when_no_first_name_was_given()
    {
        await SignUp("ruth@example.com", firstName: null);

        Assert.Contains("First name: not given", Assert.Single(await Dispatched()).Body);
    }

    // L2-217 AC9, AC5
    // Given an address that has signed up, when it signs up again, then the team is e-mailed no second time.
    [Fact]
    public async Task L2_217_AC9_a_repeat_sign_up_e_mails_no_one()
    {
        await SignUp("joanna.adeyemi@example.com");

        Assert.Equal(HttpStatusCode.Accepted, (await SignUp("JOANNA.ADEYEMI@example.com", "Someone else")).StatusCode);

        Assert.Equal(1, await factory.Query(db => db.OutboxMessages.CountAsync()));
        Assert.Single(await Dispatched());
    }
}
