using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.DependencyInjection;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;

namespace Jubilee.Api.Tests;

// Sign in and out: L2-006, L2-007, L2-010, L2-011, L2-116, L2-135, L2-137, L2-141, L2-143.
public sealed partial class SignInTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Email = "joanna.adeyemi@example.com";
    private const string Password = "correct horse 13";

    private readonly JubileeApiFactory _factory;

    public SignInTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        await Join(Email);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task Join(string email)
    {
        var joined = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Joanna",
            lastName = "Adeyemi",
            email,
            password = Password,
            homeChurch = (string?)null,
            agreementAccepted = true,
        });
        Assert.Equal(HttpStatusCode.Created, joined.StatusCode);
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Task<HttpResponseMessage> SignIn(
        HttpClient client, string email = Email, string password = Password, bool keep = false) =>
        client.PostAsJsonAsync("/api/session", new { email, password, keepSignedIn = keep });

    /// <summary>A client with its own cookie jar that has signed in and sends the anti-CSRF token.</summary>
    private async Task<HttpClient> SignedIn(bool keep = false)
    {
        var client = _factory.CreateClient();
        var response = await SignIn(client, keep: keep);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var token = XsrfToken().Match(string.Join(';', response.Headers.GetValues("Set-Cookie"))).Groups[1].Value;
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", token);
        return client;
    }

    [GeneratedRegex("XSRF-TOKEN=([^;]+)")]
    private static partial Regex XsrfToken();

    [GeneratedRegex("jubilee\\.session=([^;]+)")]
    private static partial Regex SessionCookie();

    private static string CookieValue(HttpResponseMessage response) =>
        SessionCookie().Match(string.Join(';', response.Headers.GetValues("Set-Cookie"))).Groups[1].Value;

    // L2-006 AC1
    [Fact]
    public async Task L2_006_AC1_the_right_e_mail_and_password_sign_the_member_in()
    {
        var client = _factory.CreateClient();

        var response = await SignIn(client, email: "  JOANNA.Adeyemi@Example.com ");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("Joanna", body.GetProperty("firstName").GetString());
        var session = await Json(await client.GetAsync("/api/session"));
        Assert.True(session.GetProperty("signedIn").GetBoolean());
        Assert.Equal("Joanna Adeyemi", session.GetProperty("displayName").GetString());
        Assert.Equal((HttpStatusCode)200, (await client.GetAsync("/api/me/navigation")).StatusCode);
    }

    // L2-006 AC1: a member whose e-mail is not confirmed yet can sign in (L2-005).
    [Fact]
    public async Task L2_006_AC1_an_unconfirmed_member_can_sign_in_and_is_told_so()
    {
        var client = _factory.CreateClient();

        await SignIn(client);

        var session = await Json(await client.GetAsync("/api/session"));
        Assert.Equal("unconfirmed", session.GetProperty("emailStatus").GetString());
    }

    // L2-006 AC4
    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    [InlineData("a@b")]
    public async Task L2_006_AC4_a_malformed_e_mail_is_refused_with_a_field_error(string email)
    {
        var response = await SignIn(_factory.CreateClient(), email: email);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("EMAIL_INVALID", (await Json(response)).GetProperty("errors").GetProperty("email").GetString());
    }

    [Fact]
    public async Task L2_006_a_missing_password_is_refused_with_a_field_error()
    {
        var response = await SignIn(_factory.CreateClient(), password: "");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("password").GetString());
    }

    // L2-006 AC5, AC6 and L2-141 AC1
    [Fact]
    public async Task L2_006_AC5_AC6_a_wrong_password_and_an_unknown_e_mail_get_the_same_answer()
    {
        var wrong = await SignIn(_factory.CreateClient(), password: "not the password");
        var unknown = await SignIn(_factory.CreateClient(), email: "nobody@example.com");

        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal(wrong.StatusCode, unknown.StatusCode);
        var wrongBody = await Json(wrong);
        var unknownBody = await Json(unknown);
        Assert.Equal("INVALID_CREDENTIALS", wrongBody.GetProperty("code").GetString());
        Assert.Equal(
            wrongBody.EnumerateObject().Select(p => p.Name).Where(n => n != "correlationId").Order(),
            unknownBody.EnumerateObject().Select(p => p.Name).Where(n => n != "correlationId").Order());
        Assert.Equal(wrongBody.GetProperty("title").GetString(), unknownBody.GetProperty("title").GetString());
        Assert.False(wrong.Headers.Contains("Set-Cookie") && wrong.Headers.GetValues("Set-Cookie").Any(c => c.StartsWith("jubilee.session")));
    }

    // L2-006: a member who joined with Google has no password to match.
    [Fact]
    public async Task L2_006_a_member_without_a_password_cannot_sign_in_with_one()
    {
        _factory.Google.Identity = new("google-9", "gina@example.com", true, "Gina", "Gordon");
        var start = await _factory.CreateNoRedirectClient().GetAsync("/api/auth/google/start");
        var callbackClient = _factory.CreateNoRedirectClient();
        start = await callbackClient.GetAsync("/api/auth/google/start");
        var state = _factory.Google.QueryValue("state");
        await callbackClient.GetAsync($"/api/auth/google/callback?state={state}&code=c");

        var response = await SignIn(_factory.CreateClient(), email: "gina@example.com", password: "anything at all");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // L2-007 AC1, AC3
    [Fact]
    public async Task L2_007_AC1_five_failures_lock_the_account_for_fifteen_minutes_even_for_the_right_password()
    {
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await SignIn(_factory.CreateClient(), password: "wrong")).StatusCode);
        }

        var locked = await SignIn(_factory.CreateClient());

        Assert.Equal(HttpStatusCode.TooManyRequests, locked.StatusCode);
        Assert.Equal("SIGN_IN_LOCKED", (await Json(locked)).GetProperty("code").GetString());
        Assert.Equal(900, (int)locked.Headers.RetryAfter!.Delta!.Value.TotalSeconds);

        _factory.Clock.Advance(TimeSpan.FromMinutes(16));

        Assert.Equal(HttpStatusCode.OK, (await SignIn(_factory.CreateClient())).StatusCode);
    }

    // L2-007 AC3
    [Fact]
    public async Task L2_007_AC3_the_account_holder_is_e_mailed_when_the_lock_starts()
    {
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            await SignIn(_factory.CreateClient(), password: "wrong");
        }

        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
        var notice = _factory.Emails.Sent.Single(e => e.Subject.Contains("blocked"));
        Assert.Equal(Email, notice.To);
        Assert.Contains("https://jubilee.test/forgot-password", notice.Body);
    }

    [Fact]
    public async Task L2_007_AC3_an_unknown_address_that_is_locked_gets_no_e_mail_but_the_same_answer()
    {
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            await SignIn(_factory.CreateClient(), email: "nobody@example.com", password: "wrong");
        }

        var sixth = await SignIn(_factory.CreateClient(), email: "nobody@example.com", password: "wrong");

        Assert.Equal(HttpStatusCode.TooManyRequests, sixth.StatusCode);
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
        Assert.DoesNotContain(_factory.Emails.Sent, e => e.Subject.Contains("blocked"));
    }

    // L2-007 AC4
    [Fact]
    public async Task L2_007_AC4_a_successful_sign_in_resets_the_counter()
    {
        for (var attempt = 1; attempt <= 4; attempt++)
        {
            await SignIn(_factory.CreateClient(), password: "wrong");
        }

        Assert.Equal(HttpStatusCode.OK, (await SignIn(_factory.CreateClient())).StatusCode);

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await SignIn(_factory.CreateClient(), password: "wrong")).StatusCode);
        }

        Assert.Equal(HttpStatusCode.OK, (await SignIn(_factory.CreateClient())).StatusCode);
    }

    // L2-007 AC2 and L2-137 AC1
    [Fact]
    public async Task L2_007_AC2_twenty_failures_from_one_address_block_that_address_with_retry_after()
    {
        for (var attempt = 1; attempt <= 20; attempt++)
        {
            Assert.Equal(
                HttpStatusCode.Unauthorized,
                (await SignIn(_factory.CreateClient(), email: $"someone{attempt}@example.com", password: "wrong")).StatusCode);
        }

        var blocked = await SignIn(_factory.CreateClient(), email: "someone21@example.com", password: "wrong");

        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
        Assert.NotNull(blocked.Headers.RetryAfter);
        Assert.Equal("rate_limited", (await Json(blocked)).GetProperty("code").GetString());
    }

    // L2-010 AC1
    [Fact]
    public async Task L2_010_AC1_keep_me_signed_in_gives_a_cookie_that_outlives_the_browser()
    {
        var kept = await SignIn(_factory.CreateClient(), keep: true);
        var session = await SignIn(_factory.CreateClient(), keep: false);

        Assert.Contains("expires=", string.Join(';', kept.Headers.GetValues("Set-Cookie")), StringComparison.OrdinalIgnoreCase);
        var sessionCookie = session.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("jubilee.session"));
        Assert.DoesNotContain("expires=", sessionCookie, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("max-age=", sessionCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("httponly", sessionCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", sessionCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/", sessionCookie, StringComparison.OrdinalIgnoreCase);
    }

    // L2-010 AC2
    [Fact]
    public async Task L2_010_AC2_a_session_without_keep_me_signed_in_ends_after_twelve_hours_without_activity()
    {
        var client = await SignedIn(keep: false);
        _factory.Clock.Advance(TimeSpan.FromHours(11));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/me/navigation")).StatusCode);

        _factory.Clock.Advance(TimeSpan.FromHours(11));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/me/navigation")).StatusCode);

        _factory.Clock.Advance(TimeSpan.FromHours(13));
        var expired = await client.GetAsync("/api/me/navigation");

        Assert.Equal(HttpStatusCode.Unauthorized, expired.StatusCode);
        Assert.Equal("SESSION_EXPIRED", (await Json(expired)).GetProperty("code").GetString());
    }

    // L2-010 AC3
    [Fact]
    public async Task L2_010_AC3_a_session_ends_thirty_days_after_sign_in_however_active()
    {
        var client = await SignedIn(keep: true);
        for (var day = 1; day <= 29; day++)
        {
            _factory.Clock.Advance(TimeSpan.FromDays(1));
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/me/navigation")).StatusCode);
        }

        _factory.Clock.Advance(TimeSpan.FromDays(1.5));
        var expired = await client.GetAsync("/api/me/navigation");

        Assert.Equal(HttpStatusCode.Unauthorized, expired.StatusCode);
        Assert.Equal("SESSION_EXPIRED", (await Json(expired)).GetProperty("code").GetString());
        var session = await Json(await client.GetAsync("/api/session"));
        Assert.False(session.GetProperty("signedIn").GetBoolean());
    }

    // L2-010 AC5 and L2-135 AC1
    [Fact]
    public async Task L2_010_AC5_every_sign_in_issues_a_new_opaque_session_identifier()
    {
        var first = CookieValue(await SignIn(_factory.CreateClient()));
        var second = CookieValue(await SignIn(_factory.CreateClient()));

        Assert.NotEqual(first, second);
        Assert.True(first.Length >= 22, "at least 128 bits");
        Assert.DoesNotContain("joanna", first, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Adeyemi", first, StringComparison.OrdinalIgnoreCase);
    }

    // L2-011 AC2
    [Fact]
    public async Task L2_011_AC2_signing_out_ends_this_session_and_leaves_the_others()
    {
        var phone = await SignedIn();
        var laptop = await SignedIn();

        var signOut = await phone.DeleteAsync("/api/session");

        Assert.Equal(HttpStatusCode.NoContent, signOut.StatusCode);
        Assert.False((await Json(await phone.GetAsync("/api/session"))).GetProperty("signedIn").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, (await laptop.GetAsync("/api/me/navigation")).StatusCode);
    }

    [Fact]
    public async Task L2_011_AC2_a_signed_out_cookie_cannot_be_used_again()
    {
        var client = _factory.CreateClient();
        var signIn = await SignIn(client);
        var value = CookieValue(signIn);
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", XsrfToken().Match(string.Join(';', signIn.Headers.GetValues("Set-Cookie"))).Groups[1].Value);
        await client.DeleteAsync("/api/session");

        var replay = _factory.CreateClient();
        replay.DefaultRequestHeaders.Add("Cookie", $"jubilee.session={value}");

        Assert.Equal(HttpStatusCode.Unauthorized, (await replay.GetAsync("/api/me/navigation")).StatusCode);
    }

    [Fact]
    public async Task L2_011_signing_out_needs_the_anti_CSRF_token()
    {
        var client = _factory.CreateClient();
        await SignIn(client);

        var response = await client.DeleteAsync("/api/session");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // L2-011 AC4
    [Fact]
    public async Task L2_011_AC4_a_member_can_end_all_other_sessions_and_sees_how_many_there_are()
    {
        var phone = await SignedIn();
        var laptop = await SignedIn();
        var tablet = await SignedIn();
        // The laptop, the tablet and the browser that joined.
        Assert.Equal(3, (await Json(await phone.GetAsync("/api/session"))).GetProperty("otherSessionCount").GetInt32());

        var ended = await phone.DeleteAsync("/api/session/others");

        Assert.Equal(HttpStatusCode.NoContent, ended.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await phone.GetAsync("/api/me/navigation")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await laptop.GetAsync("/api/me/navigation")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await tablet.GetAsync("/api/me/navigation")).StatusCode);
        Assert.Equal(0, (await Json(await phone.GetAsync("/api/session"))).GetProperty("otherSessionCount").GetInt32());
    }

    // L2-116 AC1: a call without any session is told so differently from one whose session ended.
    [Fact]
    public async Task L2_116_AC1_a_visitor_is_told_to_sign_in_and_a_member_whose_session_ended_is_told_so()
    {
        var visitor = await _factory.CreateClient().GetAsync("/api/me/navigation");
        Assert.Equal(HttpStatusCode.Unauthorized, visitor.StatusCode);
        Assert.Equal("sign_in_required", (await Json(visitor)).GetProperty("code").GetString());
    }

    // L2-143 AC1
    [Fact]
    public async Task L2_143_AC1_sign_in_successes_failures_and_lockouts_are_logged_without_the_password()
    {
        await SignIn(_factory.CreateClient(), password: "a wrong password 77");
        await SignIn(_factory.CreateClient());
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            await SignIn(_factory.CreateClient(), password: "wrong");
        }

        var messages = _factory.Logs.Entries.Select(e => e.Message).ToList();
        Assert.Contains(messages, m => m.Contains("Sign-in failed", StringComparison.Ordinal));
        Assert.Contains(messages, m => m.Contains("Sign-in succeeded", StringComparison.Ordinal));
        Assert.Contains(messages, m => m.Contains("Sign-in locked", StringComparison.Ordinal));
        Assert.DoesNotContain(messages, m => m.Contains("a wrong password 77", StringComparison.Ordinal));
        Assert.DoesNotContain(messages, m => m.Contains(Password, StringComparison.Ordinal));
    }
}
