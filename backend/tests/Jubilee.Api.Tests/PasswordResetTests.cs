using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

/// <summary>Forgot password and reset password (L2-008, L2-009, L2-134 AC3, L2-137, L2-140, L2-141, L2-143).</summary>
public sealed partial class PasswordResetTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Email = "joanna.adeyemi@example.com";
    private const string OldPassword = "correct horse 13";
    private const string NewPassword = "a brand new password 7";

    private readonly JubileeApiFactory _factory;

    public PasswordResetTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>A visitor whose session cookie, once it has one, counts.</summary>
    private HttpClient Visitor()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.CookieSessionHeader, "1");
        return client;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private async Task<T> Read<T>(Func<Infrastructure.Persistence.AppDbContext, Task<T>> work)
    {
        T result = default!;
        await _factory.WithDb(async db => result = await work(db));
        return result;
    }

    private async Task<HttpClient> Join(string email = Email)
    {
        var client = Visitor();
        var response = await client.PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Joanna",
            lastName = "Adeyemi",
            email,
            password = OldPassword,
            homeChurch = (string?)null,
            agreementAccepted = true,
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return client;
    }

    private Task<HttpResponseMessage> Ask(string? email) =>
        Visitor().PostAsJsonAsync("/api/account/password-reset-requests", new { email });

    /// <summary>The worker's pass over the requests, then the outbox.</summary>
    private async Task Deliver()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<PasswordResetLinks>().IssueAsync(CancellationToken.None);
        await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
    }

    private IEnumerable<SentEmail> ResetMails() => _factory.Emails.Sent.Where(m => m.Subject.Contains("Reset your Jubilee password"));

    private string EmailedToken() => ResetLink().Match(ResetMails().Last().Body).Groups[1].Value;

    [GeneratedRegex(@"https://jubilee\.test/reset-password/([A-Za-z0-9_-]+)")]
    private static partial Regex ResetLink();

    private Task<HttpResponseMessage> Inspect(string token) =>
        Visitor().PostAsJsonAsync("/api/account/password-resets/inspect", new { token });

    private Task<HttpResponseMessage> Reset(string token, string password = NewPassword, string? repeat = null) =>
        Visitor().PostAsJsonAsync("/api/account/password-resets", new { token, newPassword = password, repeatPassword = repeat ?? password });

    private Task<HttpResponseMessage> SignIn(string email, string password) =>
        Visitor().PostAsJsonAsync("/api/account/sign-in", new { email, password });

    private async Task<string> IssuedToken()
    {
        await Join();
        Assert.Equal(HttpStatusCode.Accepted, (await Ask(Email)).StatusCode);
        await Deliver();
        return EmailedToken();
    }

    private async Task<string> StateOf(string token) => (await Json(await Inspect(token))).GetProperty("state").GetString()!;

    // L2-008 AC1, L2-141 AC1
    [Fact]
    public async Task L2_008_AC1_the_answer_is_the_same_for_an_address_with_an_account_and_one_without()
    {
        await Join();

        var known = await Ask(Email);
        var unknown = await Ask("nobody@example.com");

        Assert.Equal(HttpStatusCode.Accepted, known.StatusCode);
        Assert.Equal(known.StatusCode, unknown.StatusCode);
        Assert.Equal(await known.Content.ReadAsStringAsync(), await unknown.Content.ReadAsStringAsync());
    }

    // L2-141 AC1, L2-008 AC5: the request does no account lookup, so it cannot take longer for an account.
    [Fact]
    public async Task L2_141_AC1_the_request_only_queues_so_it_leaves_the_same_trace_for_any_address()
    {
        await Join();
        var linksBefore = await Read(db => db.LinkTokens.CountAsync());
        var outboxBefore = await Read(db => db.OutboxMessages.CountAsync());

        await Ask(Email);
        await Ask("nobody@example.com");

        Assert.Equal(2, await Read(db => db.PasswordResetRequests.CountAsync()));
        Assert.Equal(linksBefore, await Read(db => db.LinkTokens.CountAsync()));
        Assert.Equal(outboxBefore, await Read(db => db.OutboxMessages.CountAsync()));
    }

    // L2-008 AC2, L2-140 AC1
    [Fact]
    public async Task L2_008_AC2_an_account_gets_a_link_stored_only_as_a_hash_and_an_unknown_address_gets_nothing()
    {
        await Join();
        await Ask("nobody@example.com");
        await Ask(Email);
        await Deliver();

        var mail = Assert.Single(ResetMails());
        Assert.Equal(Email, mail.To);
        Assert.Matches(@"https://jubilee\.test/reset-password/[A-Za-z0-9_-]{43}", mail.Body);
        Assert.Contains("60 minutes", mail.Body);
        var hashes = await Read(db => db.LinkTokens.Where(t => t.Purpose == LinkTokenPurpose.PasswordReset).Select(t => t.TokenHash).ToListAsync());
        Assert.Equal(LinkTokens.Hash(EmailedToken()), Assert.Single(hashes));
    }

    // L2-008 AC2
    [Fact]
    public async Task L2_008_AC2_a_new_request_makes_the_earlier_link_stop_working()
    {
        await Join();
        await Ask(Email);
        await Deliver();
        var first = EmailedToken();
        await Ask(Email);
        await Deliver();
        var second = EmailedToken();

        Assert.NotEqual(first, second);
        Assert.Equal("expired", await StateOf(first));
        Assert.Equal("valid", await StateOf(second));
    }

    // L2-008 AC3
    [Theory]
    [InlineData(null, "REQUIRED")]
    [InlineData("   ", "REQUIRED")]
    [InlineData("not-an-address", "EMAIL_INVALID")]
    public async Task L2_008_AC3_an_empty_or_malformed_address_is_refused_with_a_field_error(string? email, string code)
    {
        var response = await Ask(email);

        Assert.Equal((HttpStatusCode)422, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty("email").GetString());
    }

    // L2-008 AC4, L2-137 AC1
    [Fact]
    public async Task L2_008_AC4_the_fourth_request_in_an_hour_shows_the_same_answer_but_sends_nothing()
    {
        await Join();
        for (var i = 0; i < 4; i++)
        {
            Assert.Equal(HttpStatusCode.Accepted, (await Ask(Email)).StatusCode);
            await Deliver();
        }

        Assert.Equal(3, ResetMails().Count());

        _factory.Clock.Advance(TimeSpan.FromMinutes(61));
        await Ask(Email);
        await Deliver();
        Assert.Equal(4, ResetMails().Count());
    }

    // L2-008 AC4
    [Fact]
    public async Task L2_008_AC4_the_address_is_matched_ignoring_case_so_a_changed_spelling_does_not_get_around_the_limit()
    {
        await Join();
        foreach (var spelling in new[] { Email, "JOANNA.ADEYEMI@example.com", "Joanna.Adeyemi@example.com", " joanna.adeyemi@EXAMPLE.com " })
        {
            await Ask(spelling);
            await Deliver();
        }

        Assert.Equal(3, ResetMails().Count());
    }

    // L2-009 AC1, L2-140 AC2
    [Fact]
    public async Task L2_009_AC1_a_valid_link_shows_the_account_address()
    {
        var token = await IssuedToken();

        var response = await Inspect(token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("valid", body.GetProperty("state").GetString());
        Assert.Equal(Email, body.GetProperty("email").GetString());
        Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
    }

    // L2-009 AC2, AC3, AC6
    [Theory]
    [InlineData("short", null, "newPassword", "PASSWORD_TOO_SHORT")]
    [InlineData("a brand new password 7", "another password 88", "repeatPassword", "PASSWORDS_DIFFER")]
    [InlineData(FakeBreachedPasswordChecker.BreachedPassword, null, "newPassword", "PASSWORD_BREACHED")]
    public async Task L2_009_a_password_that_breaks_the_rules_is_refused_and_the_link_still_works(string password, string? repeat, string field, string code)
    {
        var token = await IssuedToken();

        var response = await Reset(token, password, repeat);

        Assert.Equal((HttpStatusCode)422, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty(field).GetString());
        Assert.Equal("valid", await StateOf(token));
    }

    // L2-009 AC4, L2-134 AC1
    [Fact]
    public async Task L2_009_AC4_the_password_changes_and_the_new_one_signs_in_and_the_old_one_does_not()
    {
        var token = await IssuedToken();

        var response = await Reset(token);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await SignIn(Email, NewPassword)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await SignIn(Email, OldPassword)).StatusCode);
        var stored = await Read(db => db.Members.Select(m => m.PasswordHash).SingleAsync());
        Assert.StartsWith("argon2id$", stored);
    }

    // L2-009 AC4, L2-134 AC3
    [Fact]
    public async Task L2_009_AC4_every_session_that_began_before_the_change_ends()
    {
        var earlier = await Join();
        await Ask(Email);
        await Deliver();
        var token = EmailedToken();
        Assert.True((await Json(await earlier.GetAsync("/api/session"))).GetProperty("signedIn").GetBoolean());

        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        Assert.Equal(HttpStatusCode.NoContent, (await Reset(token)).StatusCode);

        Assert.False((await Json(await earlier.GetAsync("/api/session"))).GetProperty("signedIn").GetBoolean());
        var after = Visitor();
        Assert.Equal(HttpStatusCode.NoContent, (await after.PostAsJsonAsync("/api/account/sign-in", new { email = Email, password = NewPassword })).StatusCode);
        Assert.True((await Json(await after.GetAsync("/api/session"))).GetProperty("signedIn").GetBoolean());
    }

    // L2-009 AC4
    [Fact]
    public async Task L2_009_AC4_a_security_e_mail_tells_the_holder_the_password_changed()
    {
        var token = await IssuedToken();
        await Reset(token);
        await Deliver();

        var mail = Assert.Single(_factory.Emails.Sent, m => m.Subject.Contains("password was changed"));
        Assert.Equal(Email, mail.To);
        Assert.DoesNotContain(NewPassword, mail.Body);
        Assert.DoesNotContain(token, mail.Body);
    }

    // L2-009 AC5, L2-140 AC1
    [Fact]
    public async Task L2_009_AC5_a_link_works_once()
    {
        var token = await IssuedToken();
        await Reset(token);

        Assert.Equal("expired", await StateOf(token));
        var again = await Reset(token, "yet another password 9");
        Assert.Equal(HttpStatusCode.Gone, again.StatusCode);
        Assert.Equal("LINK_EXPIRED", (await Json(again)).GetProperty("code").GetString());
    }

    // L2-009 AC5, L2-140 AC1
    [Fact]
    public async Task L2_009_AC5_a_link_expires_after_60_minutes()
    {
        var token = await IssuedToken();

        _factory.Clock.Advance(TimeSpan.FromMinutes(59));
        Assert.Equal("valid", await StateOf(token));
        _factory.Clock.Advance(TimeSpan.FromMinutes(2));

        var inspected = await Json(await Inspect(token));
        Assert.Equal("expired", inspected.GetProperty("state").GetString());
        Assert.False(inspected.TryGetProperty("email", out var email) && email.ValueKind == JsonValueKind.String);
        Assert.Equal(HttpStatusCode.Gone, (await Reset(token)).StatusCode);
    }

    // L2-009 AC5
    [Fact]
    public async Task L2_009_AC5_an_unknown_link_looks_the_same_as_an_expired_one()
    {
        var response = await Inspect("not-a-real-token");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("expired", (await Json(response)).GetProperty("state").GetString());
        Assert.Equal(HttpStatusCode.Gone, (await Reset("not-a-real-token")).StatusCode);
    }

    // L2-134 AC3: a reset also stops every other outstanding link
    [Fact]
    public async Task L2_134_AC3_a_reset_ends_the_other_outstanding_links()
    {
        await Join();
        await Ask(Email);
        await Deliver();
        var token = EmailedToken();
        var other = LinkTokens.NewValue();
        var memberId = await Read(db => db.Members.Select(m => m.Id).SingleAsync());
        await _factory.Arrange(LinkToken.Issue(
            memberId, LinkTokenPurpose.PasswordReset, LinkTokens.Hash(other), _factory.Clock.GetUtcNow(), LinkToken.PasswordResetLifetime));

        await Reset(token);

        Assert.Equal("expired", await StateOf(other));
    }

    // L2-143 AC1
    [Fact]
    public async Task L2_143_AC1_the_reset_is_logged_without_the_token_or_the_password()
    {
        var token = await IssuedToken();
        await Reset(token);

        var entries = _factory.Logs.Entries.Select(e => e.Message).ToList();
        Assert.Contains(entries, m => m.Contains("Security event") && m.Contains("PasswordReset"));
        Assert.DoesNotContain(entries, m => m.Contains(token) || m.Contains(NewPassword));
    }

    // L2-136 AC1
    [Fact]
    public async Task L2_136_AC1_unknown_fields_are_refused()
    {
        var response = await Visitor().PostAsJsonAsync("/api/account/password-reset-requests", new { email = Email, admin = true });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // The smallest seam for journey 5: the password signs in without telling which half was wrong.
    [Fact]
    public async Task Sign_in_answers_the_same_for_a_wrong_password_and_an_unknown_address()
    {
        await Join();

        var wrong = await SignIn(Email, "not the password");
        var unknown = await SignIn("nobody@example.com", "not the password");

        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal((await Json(wrong)).GetProperty("title").GetString(), (await Json(unknown)).GetProperty("title").GetString());
    }
}
