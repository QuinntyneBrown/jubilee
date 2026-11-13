using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Jubilee.Api.Tests;

/// <summary>
/// L2-140 AC3: a token is never written to a log. Each test makes the requests a member's links make
/// and then reads everything the API logged.
/// </summary>
public sealed partial class TokenRedactionTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    /// <summary>A value shaped like the tokens Jubilee issues: 32 random bytes, base64url.</summary>
    private static readonly string Token = LinkTokens.NewValue();

    private readonly JubileeApiFactory _factory;

    public TokenRedactionTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private IEnumerable<string> Logged => _factory.Logs.Entries.Select(e => e.Message + e.Exception);

    private CapturedLog RequestLog(string method, string pathStart) => Assert.Single(
        _factory.Logs.Entries,
        e => e.Level == LogLevel.Information && e.Message.StartsWith($"HTTP {method} {pathStart}", StringComparison.Ordinal));

    [Fact]
    public async Task L2_140_AC3_the_request_log_writes_the_token_of_a_data_download_as_redacted()
    {
        var member = _factory.CreateMemberClient();

        var response = await member.GetAsync($"/api/account/data-exports/{Token}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("/api/account/data-exports/[redacted] responded 404", RequestLog("GET", "/api/account/data-exports/").Message);
        Assert.DoesNotContain(Logged, line => line.Contains(Token));
    }

    [Fact]
    public async Task L2_140_AC3_the_request_log_writes_the_token_of_an_unsubscribe_link_as_redacted()
    {
        await _factory.CreateClient().PostAsync($"/api/email/unsubscribe/{Token}", null);

        Assert.Contains("/api/email/unsubscribe/[redacted] responded", RequestLog("POST", "/api/email/unsubscribe/").Message);
        Assert.DoesNotContain(Logged, line => line.Contains(Token));
    }

    [Fact]
    public async Task L2_140_AC3_an_error_line_that_names_the_path_writes_the_token_as_redacted()
    {
        var member = _factory.CreateMemberClient();
        _factory.Database.Unavailable = true;

        var response = await member.GetAsync($"/api/account/data-exports/{Token}");

        Assert.True((int)response.StatusCode >= 500);
        var error = Assert.Single(_factory.Logs.Entries, e => e.Level == LogLevel.Error && e.Message.Contains("/api/account/data-exports/"));
        Assert.Contains("/api/account/data-exports/[redacted]", error.Message);
        Assert.DoesNotContain(Logged, line => line.Contains(Token));
    }

    // A link opened the wrong way (a mail scanner's GET of a POST address, a path cut short or extended)
    // matches no route, so no route parameter says where the token is.
    [Theory]
    [InlineData("GET", "/api/email/unsubscribe/{0}")]
    [InlineData("GET", "/api/account/data-exports/{0}/again")]
    [InlineData("GET", "/api/nowhere/{0}")]
    public async Task L2_140_AC3_a_token_on_a_path_that_matches_no_route_is_redacted_too(string method, string template)
    {
        var path = string.Format(System.Globalization.CultureInfo.InvariantCulture, template, Token);

        await _factory.CreateMemberClient().SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

        Assert.Contains("[redacted]", RequestLog(method, path[..path.IndexOf(Token, StringComparison.Ordinal)]).Message);
        Assert.DoesNotContain(Logged, line => line.Contains(Token));
    }

    [Fact]
    public async Task L2_140_AC3_a_path_without_a_token_is_logged_as_it_was_asked_for()
    {
        await _factory.CreateClient().GetAsync("/api/listings/legacy-financial");
        await _factory.CreateClient().GetAsync($"/api/nowhere/{Guid.NewGuid()}");

        Assert.Contains("/api/listings/legacy-financial responded", RequestLog("GET", "/api/listings/").Message);
        Assert.DoesNotContain("[redacted]", RequestLog("GET", "/api/nowhere/").Message);
    }

    [Fact]
    public async Task L2_140_AC3_joining_confirming_and_signing_in_leave_no_token_and_no_session_identifier_in_the_log()
    {
        var visitor = _factory.CreateClient();
        var joined = await visitor.PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Joanna",
            lastName = "Adeyemi",
            email = "joanna.adeyemi@example.com",
            password = "correct horse 13",
            agreementAccepted = true,
        });
        Assert.Equal(HttpStatusCode.Created, joined.StatusCode);
        var session = SessionValue(joined);

        using (var scope = _factory.Services.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
        }

        var token = TokenInLink().Match(_factory.Emails.Sent.Last().Body).Groups[1].Value;
        Assert.Equal(43, token.Length);
        var confirmed = await _factory.CreateClient().PostAsJsonAsync("/api/account/confirmation", new { token });
        Assert.Equal(HttpStatusCode.OK, confirmed.StatusCode);
        var signedIn = await _factory.CreateClient().PostAsJsonAsync(
            "/api/account/sign-in", new { email = "joanna.adeyemi@example.com", password = "correct horse 13" });
        Assert.Equal(HttpStatusCode.NoContent, signedIn.StatusCode);
        var secondSession = SessionValue(signedIn);

        // The requests were logged, so the log was being written.
        Assert.Contains("/api/account/confirmation responded 200", RequestLog("POST", "/api/account/confirmation ").Message);
        Assert.DoesNotContain(Logged, line => line.Contains(token) || line.Contains(session) || line.Contains(secondSession));
    }

    // L2-140 AC3
    // Given a reset link issued to an account, when the visitor checks it, chooses a new password with it and opens
    // the link against the API by mistake, then the request log names every request and no line holds the token.
    [Fact]
    public async Task L2_140_AC3_asking_for_checking_and_using_a_reset_link_leave_no_token_in_the_log()
    {
        await _factory.Arrange(Domain.Member.Join(
            Domain.EmailAddress.TryParse("joanna.adeyemi@example.com")!, "Joanna", "Adeyemi", null, "hash", _factory.Clock.GetUtcNow()));
        var asked = await _factory.CreateClient().PostAsJsonAsync(
            "/api/account/password-reset-requests", new { email = "joanna.adeyemi@example.com" });
        Assert.Equal(HttpStatusCode.Accepted, asked.StatusCode);
        using (var scope = _factory.Services.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<PasswordResetLinks>().IssueAsync(CancellationToken.None);
            await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
        }

        var token = ResetTokenInLink().Match(_factory.Emails.Sent.Last().Body).Groups[1].Value;
        Assert.Equal(43, token.Length);

        var inspected = await _factory.CreateClient().PostAsJsonAsync("/api/account/password-resets/inspect", new { token });
        Assert.Equal(HttpStatusCode.OK, inspected.StatusCode);
        var reset = await _factory.CreateClient().PostAsJsonAsync(
            "/api/account/password-resets", new { token, newPassword = "a brand new password 7", repeatPassword = "a brand new password 7" });
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
        var used = await _factory.CreateClient().PostAsJsonAsync(
            "/api/account/password-resets", new { token, newPassword = "yet another password 9", repeatPassword = "yet another password 9" });
        Assert.Equal(HttpStatusCode.Gone, used.StatusCode);
        await _factory.CreateClient().GetAsync($"/reset-password/{token}");

        // The requests were logged, so the log was being written.
        Assert.Contains(Logged, line => line.Contains("/api/account/password-resets responded 204"));
        Assert.Contains(Logged, line => line.Contains("/api/account/password-resets responded 410"));
        Assert.Contains("[redacted]", RequestLog("GET", "/reset-password/").Message);
        Assert.DoesNotContain(Logged, line => line.Contains(token));
    }

    [GeneratedRegex(@"https://jubilee\.test/reset-password/([A-Za-z0-9_-]+)")]
    private static partial Regex ResetTokenInLink();

    /// <summary>The value of the session cookie a response set.</summary>
    private static string SessionValue(HttpResponseMessage response)
    {
        var cookie = response.Headers.GetValues("Set-Cookie").Single(c => c.Contains("jubilee.session=", StringComparison.Ordinal));
        var value = cookie[(cookie.IndexOf('=') + 1)..cookie.IndexOf(';')];
        Assert.True(value.Length >= 22, "the session cookie should carry at least 128 bits");
        return value;
    }

    [GeneratedRegex(@"https://jubilee\.test/verify-email/([A-Za-z0-9_-]+)")]
    private static partial Regex TokenInLink();
}
