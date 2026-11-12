using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Acceptance Test
// Traces to: L2-218, L2-216, L2-217
// Description: the marketing host states when it received a submission and sends a kept one again;
// the API believes it only with the proxy key, stores the received time as the consent time and stores it once.
public sealed class LaunchKeptSubmissionTests(LaunchTeamEmailFactory factory) : IClassFixture<LaunchTeamEmailFactory>, IAsyncLifetime
{
    private const string Notifications = "/api/launch/notifications";
    private const string Businesses = "/api/launch/businesses";

    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static string Stamp(DateTimeOffset at) => at.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);

    /// <summary>A submission as the marketing host's proxy sends it: the key, the received time and, sent again, the mark of a kept one.</summary>
    private Task<HttpResponseMessage> Send(string path, object body, DateTimeOffset? receivedAt, bool kept = false, string key = JubileeApiFactory.StaffProxyKey)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-Jubilee-Proxy-Key", key);
        request.Headers.Add("X-Jubilee-Client-Address", "203.0.113.9");
        if (receivedAt is { } at)
        {
            request.Headers.Add("X-Jubilee-Received-At", Stamp(at));
        }

        if (kept)
        {
            request.Headers.Add("X-Jubilee-Kept", "true");
        }

        return factory.CreateClient().SendAsync(request);
    }

    private static object SignUp(string email = "joanna.adeyemi@example.com") => new { email, firstName = "Joanna", consent = true };

    private static object Details(string businessName = "Luzandre.com") => new
    {
        businessName,
        contactName = "Naomi Laurent",
        email = "naomi@luzandre.com",
        category = "shops",
        area = "Leslieville",
        description = "Custom Christian apparel, artworks and gifts, made in Toronto.",
        consent = true,
    };

    private Task<List<LaunchSubscriber>> Subscribers() => factory.Query(db => db.LaunchSubscribers.AsNoTracking().ToListAsync());

    private Task<List<BusinessPreRegistration>> PreRegistrations() => factory.Query(db => db.BusinessPreRegistrations.AsNoTracking().ToListAsync());

    // L2-218 AC9
    // Given a sign-up the marketing host received two hours ago and kept, when it is sent again with the proxy key,
    // then the consent time and the time its 12 months count from are the time it was received.
    [Fact]
    public async Task L2_218_AC9_a_kept_sign_up_is_stored_with_the_time_the_marketing_host_received_it()
    {
        var received = factory.Clock.GetUtcNow() - TimeSpan.FromHours(2);

        var response = await Send(Notifications, SignUp(), received, kept: true);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var stored = Assert.Single(await Subscribers());
        Assert.Equal(received, stored.ConsentedAt);
        Assert.Equal(received, stored.CreatedAt);
        Assert.Equal(ConsentMethod.MarketingSiteForm, stored.ConsentMethod);
    }

    // L2-218 AC9: the time is believed only from the marketing host's proxy
    [Theory]
    [InlineData("a-guess")]
    [InlineData("")]
    public async Task L2_218_AC9_a_received_time_without_the_proxy_key_is_not_believed(string key)
    {
        var response = await Send(Notifications, SignUp(), factory.Clock.GetUtcNow() - TimeSpan.FromDays(300), kept: true, key: key);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal(factory.Clock.GetUtcNow(), Assert.Single(await Subscribers()).ConsentedAt);
    }

    // L2-218 AC9: a time that has not come yet is no consent time
    [Fact]
    public async Task L2_218_AC9_a_received_time_in_the_future_is_ignored()
    {
        await Send(Businesses, Details(), factory.Clock.GetUtcNow() + TimeSpan.FromDays(1));

        var stored = Assert.Single(await PreRegistrations());
        Assert.Equal(factory.Clock.GetUtcNow(), stored.ConsentedAt);
        Assert.Equal(factory.Clock.GetUtcNow(), stored.CreatedAt);
    }

    // L2-218 AC9
    // Given a bot challenge that would not pass, when the marketing host sends a kept submission again,
    // then it is stored: its token has expired and is not asked for again.
    [Fact]
    public async Task L2_218_AC9_a_kept_submission_is_not_asked_for_the_bot_challenge_again()
    {
        factory.Bot.Passes = false;

        var response = await Send(Notifications, SignUp(), factory.Clock.GetUtcNow() - TimeSpan.FromMinutes(5), kept: true);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Single(await Subscribers());
    }

    // L2-218 AC3, AC9: a first attempt, and anyone without the key, still meets the challenge
    [Theory]
    [InlineData(JubileeApiFactory.StaffProxyKey, false)]
    [InlineData("a-guess", true)]
    public async Task L2_218_AC9_only_a_kept_submission_from_the_proxy_skips_the_bot_challenge(string key, bool kept)
    {
        factory.Bot.Passes = false;

        var response = await Send(Notifications, SignUp(), factory.Clock.GetUtcNow(), kept, key);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Empty(await Subscribers());
    }

    // L2-216 AC10, L2-218 AC8
    // Given a pre-registration the API stored, when the marketing host sends the same one again (same received time),
    // then one pre-registration is kept and the team is e-mailed once.
    [Fact]
    public async Task L2_216_AC10_a_pre_registration_sent_again_is_stored_once_and_e_mailed_once()
    {
        var received = factory.Clock.GetUtcNow() - TimeSpan.FromSeconds(9);
        var first = await Send(Businesses, Details(), received);
        factory.Clock.Advance(TimeSpan.FromMinutes(1));

        var again = await Send(Businesses, Details(), received, kept: true);

        Assert.Equal(HttpStatusCode.Accepted, first.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, again.StatusCode);
        Assert.Equal(received, Assert.Single(await PreRegistrations()).ConsentedAt);
        Assert.Equal(1, await factory.Query(db => db.OutboxMessages.CountAsync()));
    }

    // L2-216 AC9: one owner may have two businesses, and may send one form twice on purpose
    [Fact]
    public async Task L2_216_AC9_pre_registrations_received_at_different_times_are_each_stored()
    {
        var received = factory.Clock.GetUtcNow() - TimeSpan.FromMinutes(3);

        await Send(Businesses, Details(), received);
        await Send(Businesses, Details(), received + TimeSpan.FromMinutes(1));
        await Send(Businesses, Details("Luzandre Studio"), received);

        Assert.Equal(3, (await PreRegistrations()).Count);
    }

    // L2-217 AC9, L2-218 AC8: a kept sign-up tells the team once, however often it is sent again
    [Fact]
    public async Task L2_217_AC9_a_kept_sign_up_sent_twice_e_mails_the_team_once()
    {
        var received = factory.Clock.GetUtcNow() - TimeSpan.FromMinutes(2);

        await Send(Notifications, SignUp(), received, kept: true);
        await Send(Notifications, SignUp(), received, kept: true);

        Assert.Single(await Subscribers());
        Assert.Equal(1, await factory.Query(db => db.OutboxMessages.CountAsync()));
    }
}
