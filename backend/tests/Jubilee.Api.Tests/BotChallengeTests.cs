using System.Text.Json;
using Jubilee.Api.Tests.Support;

namespace Jubilee.Api.Tests;

public sealed class BotChallengeFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder) =>
        builder.UseSetting("BotChallenge:SiteKey", "site-key-for-tests");
}

/// <summary>The bot challenge of the join form (L2-137 AC2): the form learns its site key from the session.</summary>
public sealed class BotChallengeConfiguredTests(BotChallengeFactory factory) : IClassFixture<BotChallengeFactory>
{
    [Fact]
    public async Task L2_137_AC2_the_session_gives_the_join_form_the_site_key_of_the_challenge()
    {
        var session = JsonDocument.Parse(await factory.CreateClient().GetStringAsync("/api/session")).RootElement;

        Assert.Equal("site-key-for-tests", session.GetProperty("botChallengeSiteKey").GetString());
    }
}

public sealed class BotChallengeOffTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>
{
    [Fact]
    public async Task L2_137_AC2_without_a_site_key_the_session_names_none_and_the_form_shows_no_challenge()
    {
        var session = JsonDocument.Parse(await factory.CreateClient().GetStringAsync("/api/session")).RootElement;

        Assert.False(session.TryGetProperty("botChallengeSiteKey", out _));
    }
}
