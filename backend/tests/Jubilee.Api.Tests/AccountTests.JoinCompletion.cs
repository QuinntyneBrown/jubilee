using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>Google sign-in that is off, cancelled or refused (L2-003 AC5 to AC7, ADR 0037).</summary>
public partial class AccountTests
{
    private async Task<JsonElement> Session(HttpClient client) =>
        await Json(await client.GetAsync("/api/session"));

    // L2-003 AC5
    [Fact]
    public async Task L2_003_AC5_the_session_says_whether_google_sign_in_is_available()
    {
        Assert.True((await Session(_factory.CreateClient())).GetProperty("googleSignIn").GetBoolean());

        _factory.Google.IsConfigured = false;
        try
        {
            Assert.False((await Session(_factory.CreateClient())).GetProperty("googleSignIn").GetBoolean());
        }
        finally
        {
            _factory.Google.IsConfigured = true;
        }
    }

    // L2-003 AC5
    [Theory]
    [InlineData("", "/sign-in?error=google")]
    [InlineData("?from=join", "/join?error=google")]
    [InlineData("?from=join&returnUrl=%2Fb%2Flegacy-financial", "/join?error=google&returnUrl=%2Fb%2Flegacy-financial")]
    public async Task L2_003_AC5_starting_google_sign_in_when_it_is_off_returns_to_where_the_visitor_started(string query, string expected)
    {
        _factory.Google.IsConfigured = false;
        try
        {
            var start = await _factory.CreateNoRedirectClient().GetAsync("/api/auth/google/start" + query);

            Assert.Equal(HttpStatusCode.Redirect, start.StatusCode);
            Assert.Equal(expected, start.Headers.Location!.OriginalString);
        }
        finally
        {
            _factory.Google.IsConfigured = true;
        }
    }

    // L2-003 AC6
    [Theory]
    [InlineData("?from=join&returnUrl=%2Fb%2Flegacy-financial", "/join?error=google-cancelled&returnUrl=%2Fb%2Flegacy-financial")]
    [InlineData("?returnUrl=%2Fb%2Flegacy-financial", "/sign-in?error=google-cancelled&returnUrl=%2Fb%2Flegacy-financial")]
    [InlineData("", "/sign-in?error=google-cancelled")]
    public async Task L2_003_AC6_a_visitor_who_cancels_at_google_returns_to_where_they_started(string query, string expected)
    {
        var client = _factory.CreateNoRedirectClient();
        await client.GetAsync("/api/auth/google/start" + query);

        var callback = await client.GetAsync(
            $"/api/auth/google/callback?error=access_denied&state={_factory.Google.QueryValue("state")}");

        Assert.Equal(expected, callback.Headers.Location!.OriginalString);
        Assert.Equal(0, await WithDb(db => db.Members.CountAsync()));
    }

    // L2-003 AC7
    [Fact]
    public async Task L2_003_AC7_a_refusal_after_starting_from_join_is_shown_on_join()
    {
        _factory.Google.Identity = new("g-1", "gina@example.com", false, "Gina", "Gordon");
        var client = _factory.CreateNoRedirectClient();
        await client.GetAsync("/api/auth/google/start?from=join");

        var callback = await client.GetAsync($"/api/auth/google/callback?code=abc&state={_factory.Google.QueryValue("state")}");

        Assert.Equal("/join?error=google-email", callback.Headers.Location!.OriginalString);
    }

    // L2-003 AC7: only the two pages that show the Google button can be returned to.
    [Fact]
    public async Task L2_003_AC7_an_unknown_starting_page_falls_back_to_sign_in()
    {
        var client = _factory.CreateNoRedirectClient();
        await client.GetAsync("/api/auth/google/start?from=https%3A%2F%2Fevil.example");

        var callback = await client.GetAsync(
            $"/api/auth/google/callback?error=access_denied&state={_factory.Google.QueryValue("state")}");

        Assert.Equal("/sign-in?error=google-cancelled", callback.Headers.Location!.OriginalString);
    }
}
