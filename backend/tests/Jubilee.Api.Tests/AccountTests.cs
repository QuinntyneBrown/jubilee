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

public sealed class FiveJoinsFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder) =>
        builder.UseSetting("RateLimits:JoinsPerHour", "5");
}

public partial class AccountTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public AccountTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private static object Form(
        string email = "joanna.adeyemi@example.com",
        string password = "correct horse 13",
        bool agree = true,
        string first = "Joanna",
        string last = "Adeyemi",
        string? church = "Grace Toronto Church",
        string? churchAddress = "383 Jarvis Street, Toronto") =>
        new { firstName = first, lastName = last, email, password, homeChurch = church, homeChurchAddress = churchAddress, agreementAccepted = agree };

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static async Task<Dictionary<string, string>> Errors(HttpResponseMessage response) =>
        (await Json(response)).GetProperty("errors").EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString()!);

    private async Task<Member> MemberByEmail(string email) =>
        await WithDb(db => db.Members.AsNoTracking().SingleAsync(m => m.EmailKey == email.ToLowerInvariant()));

    private async Task<T> WithDb<T>(Func<Infrastructure.Persistence.AppDbContext, Task<T>> work)
    {
        T result = default!;
        await _factory.WithDb(async db => result = await work(db));
        return result;
    }

    private async Task Dispatch()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
    }

    private async Task<string> LastLinkToken()
    {
        await Dispatch();
        var body = _factory.Emails.Sent.Last().Body;
        return TokenInLink().Match(body).Groups[1].Value;
    }

    [GeneratedRegex(@"https://jubilee\.test/verify-email/([A-Za-z0-9_-]+)")]
    private static partial Regex TokenInLink();

    private async Task<(HttpClient Client, Member Member)> JoinedMember(string email = "joanna.adeyemi@example.com")
    {
        var client = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/account/join", Form(email))).StatusCode);
        var member = await MemberByEmail(email);
        return (_factory.CreateMemberClient(member.DisplayName, member.Id.ToString()), member);
    }

    // L2-196 AC2, AC3, AC6: the home church and its address are optional, and independent of each other
    [Theory]
    [InlineData(null, null, null, null)]
    [InlineData("Grace Toronto Church", null, "Grace Toronto Church", null)]
    [InlineData(null, " 383 Jarvis Street, Toronto ", null, "383 Jarvis Street, Toronto")]
    [InlineData("   ", "   ", null, null)]
    public async Task L2_188_a_member_joins_with_the_name_the_address_both_or_neither(string? church, string? address, string? storedChurch, string? storedAddress)
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(church: church, churchAddress: address));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var member = await MemberByEmail("joanna.adeyemi@example.com");
        Assert.Equal(storedChurch, member.HomeChurch);
        Assert.Equal(storedAddress, member.HomeChurchAddress);
    }

    // L2-196 AC7, L2-145 AC1
    [Fact]
    public async Task L2_196_AC7_the_home_church_and_its_address_are_in_the_members_own_account_and_in_no_other_answer_of_joining()
    {
        var (client, _) = await JoinedMember();

        var own = await (await client.GetAsync("/api/account")).Content.ReadAsStringAsync();
        Assert.Contains("Grace Toronto Church", own);
        Assert.Contains("383 Jarvis Street, Toronto", own);
        foreach (var path in new[] { "/api/session", "/api/me/navigation" })
        {
            var answer = await (await client.GetAsync(path)).Content.ReadAsStringAsync();
            Assert.DoesNotContain("Grace Toronto Church", answer);
            Assert.DoesNotContain("383 Jarvis Street", answer);
        }

        await Dispatch();
        Assert.All(_factory.Emails.Sent, mail => Assert.DoesNotContain("Grace Toronto Church", mail.Body + mail.Html));
        Assert.DoesNotContain(_factory.Logs.Entries, e => e.Message.Contains("Grace Toronto Church") || e.Message.Contains("383 Jarvis Street"));
    }

    // L2-196 AC4
    [Fact]
    public async Task L2_188_AC4_a_home_church_address_over_200_characters_is_refused_and_200_is_kept()
    {
        var refused = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(churchAddress: new string('a', 201)));
        var kept = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(churchAddress: new string('a', 200)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, refused.StatusCode);
        Assert.Equal("TOO_LONG", (await Errors(refused))["homeChurchAddress"]);
        Assert.Equal(HttpStatusCode.Created, kept.StatusCode);
    }

    // L2-001 AC1, AC5
    [Fact]
    public async Task L2_001_AC1_joining_creates_an_unconfirmed_account_and_queues_the_confirmation_e_mail()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(email: "  Joanna.Adeyemi@Example.COM "));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("Joanna.Adeyemi@example.com", (await Json(response)).GetProperty("email").GetString());
        var member = await MemberByEmail("joanna.adeyemi@example.com");
        Assert.Equal(EmailStatus.Unconfirmed, member.EmailStatus);
        Assert.Equal("Joanna.Adeyemi@example.com", member.Email); // L2-001 AC5: domain lower-cased, trimmed
        Assert.Equal("Grace Toronto Church", member.HomeChurch);
        Assert.Equal("383 Jarvis Street, Toronto", member.HomeChurchAddress);

        await Dispatch();
        var mail = Assert.Single(_factory.Emails.Sent);
        Assert.Equal("Joanna.Adeyemi@example.com", mail.To);
        Assert.Matches(@"https://jubilee\.test/verify-email/[A-Za-z0-9_-]{43}", mail.Body);
        Assert.Contains("24 hours", mail.Body);
        Assert.DoesNotContain("<img", mail.Body); // L2-179 AC4: plain text, no tracking pixel
    }

    // L2-001 AC5, L2-134 AC1, L2-140 AC1
    [Fact]
    public async Task L2_134_the_password_is_stored_as_an_argon2id_hash_and_the_link_token_only_as_a_sha256_hash()
    {
        await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(password: "correct horse 13"));

        var member = await MemberByEmail("joanna.adeyemi@example.com");
        Assert.StartsWith("argon2id$m=19456,t=2,p=1$", member.PasswordHash);
        Assert.DoesNotContain("correct horse", member.PasswordHash);
        var token = await LastLinkToken();
        var stored = await WithDb(db => db.LinkTokens.AsNoTracking().SingleAsync());
        Assert.Equal(LinkTokens.Hash(token), stored.TokenHash);
        Assert.NotEqual(token, stored.TokenHash);
        Assert.Equal(TimeSpan.FromHours(24), stored.ExpiresAt - ListingMotherNow);
        Assert.DoesNotContain(_factory.Logs.Entries, e => e.Message.Contains("correct horse") || e.Message.Contains(token));
        // The outbox keeps no copy of the link once the e-mail is sent.
        Assert.All(await WithDb(db => db.OutboxMessages.AsNoTracking().ToListAsync()), m => Assert.Equal(string.Empty, m.TextBody));
    }

    private static DateTimeOffset ListingMotherNow => Jubilee.Tests.Shared.ListingMother.Now;

    [Fact]
    public async Task L2_134_the_hasher_accepts_the_right_password_only()
    {
        var hasher = _factory.Services.GetRequiredService<IPasswordHasher>();
        var hash = hasher.Hash("a passphrase with spaces ünï");

        Assert.True(hasher.Verify(hash, "a passphrase with spaces ünï"));
        Assert.False(hasher.Verify(hash, "a passphrase with spaces uni"));
        Assert.NotEqual(hash, hasher.Hash("a passphrase with spaces ünï")); // unique salt
    }

    // L2-002 AC1, L2-141 AC2
    [Fact]
    public async Task L2_002_AC1_an_address_that_has_an_account_is_refused_and_its_holder_is_told()
    {
        await JoinedMember();
        await Dispatch();
        _factory.Emails.Clear();

        var response = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(first: "Someone", last: "Else"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("EMAIL_TAKEN", (await Errors(response))["email"]);
        Assert.Equal(1, await WithDb(db => db.Members.CountAsync()));
        await Dispatch();
        var notice = Assert.Single(_factory.Emails.Sent);
        Assert.Equal("joanna.adeyemi@example.com", notice.To.ToLowerInvariant());
        Assert.Contains("Someone tried to join", notice.Subject);
    }

    // L2-002 AC2, AC3, AC4, AC7
    [Fact]
    public async Task L2_002_AC7_every_problem_is_reported_at_once_with_a_code_and_nothing_is_created()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync(
            "/api/account/join", Form(email: "not-an-address", password: "short", agree: false, first: " "));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var errors = await Errors(response);
        Assert.Equal("REQUIRED", errors["firstName"]);
        Assert.Equal("EMAIL_INVALID", errors["email"]);
        Assert.Equal("PASSWORD_TOO_SHORT", errors["password"]);
        Assert.Equal("AGREEMENT_REQUIRED", errors["agreement"]);
        Assert.Equal(0, await WithDb(db => db.Members.CountAsync()));
        Assert.Empty(await WithDb(db => db.OutboxMessages.ToListAsync()));
    }

    // L2-002 AC5
    [Theory]
    [InlineData("firstName", 51, "TOO_LONG")]
    [InlineData("lastName", 51, "TOO_LONG")]
    [InlineData("password", 129, "TOO_LONG")]
    public async Task L2_002_AC5_values_over_their_limit_are_rejected(string field, int length, string code)
    {
        var form = new Dictionary<string, object>
        {
            ["firstName"] = "Joanna", ["lastName"] = "Adeyemi", ["email"] = "j@example.com",
            ["password"] = "correct horse 13", ["agreementAccepted"] = true,
        };
        form[field] = new string('a', length);

        var response = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", form);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Errors(response))[field]);
    }

    [Fact]
    public async Task L2_002_AC5_an_e_mail_over_254_characters_is_rejected()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(email: new string('a', 250) + "@x.co"));

        Assert.Equal("TOO_LONG", (await Errors(response))["email"]);
    }

    // L2-134 AC2
    [Fact]
    public async Task L2_134_AC2_a_breached_password_is_refused_and_spaces_and_unicode_are_allowed()
    {
        var breached = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(password: FakeBreachedPasswordChecker.BreachedPassword));
        var unicode = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(email: "u@example.com", password: "ça va très bien   "));

        Assert.Equal("PASSWORD_BREACHED", (await Errors(breached))["password"]);
        Assert.Equal(HttpStatusCode.Created, unicode.StatusCode);
    }

    // L2-136 AC1
    [Fact]
    public async Task L2_136_AC1_unknown_fields_are_rejected()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync(
            "/api/account/join", new { firstName = "A", lastName = "B", email = "a@example.com", password = "correct horse 13", agreementAccepted = true, isAdmin = true });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, await WithDb(db => db.Members.CountAsync()));
    }

    // L2-137 AC2, L2-141 AC2
    [Fact]
    public async Task L2_137_AC2_a_failed_bot_challenge_creates_nothing_and_reveals_nothing()
    {
        await JoinedMember();
        _factory.Bot.Passes = false;

        var existing = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form());
        var fresh = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(email: "new@example.com"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, existing.StatusCode);
        Assert.Equal(await Errors(existing), await Errors(fresh)); // same answer whether or not the address is taken
        Assert.Equal("CHALLENGE_FAILED", (await Errors(fresh))["challenge"]);
        Assert.Equal(1, await WithDb(db => db.Members.CountAsync()));
    }

    // L2-001 AC2
    [Fact]
    public async Task L2_001_AC2_sending_it_again_sends_a_new_link_and_the_earlier_one_stops_working()
    {
        var (member, _) = await JoinedMember();
        var first = await LastLinkToken();

        Assert.Equal(HttpStatusCode.Accepted, (await member.PostAsync("/api/account/confirmation/resend", null)).StatusCode);
        var second = await LastLinkToken();

        Assert.NotEqual(first, second);
        Assert.Equal("expired", await Outcome(first));
        Assert.Equal("confirmed", await Outcome(second));
    }

    // L2-137 AC1, L2-005 AC5
    [Fact]
    public async Task L2_005_AC5_more_than_5_resends_in_an_hour_send_nothing_and_say_when_to_try_again()
    {
        var (member, _) = await JoinedMember();
        await Dispatch();
        _factory.Emails.Clear();
        for (var i = 0; i < 5; i++)
        {
            Assert.Equal(HttpStatusCode.Accepted, (await member.PostAsync("/api/account/confirmation/resend", null)).StatusCode);
        }

        var refused = await member.PostAsync("/api/account/confirmation/resend", null);

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.InRange(refused.Headers.RetryAfter!.Delta!.Value.TotalSeconds, 1, 3600);
        await Dispatch();
        Assert.Equal(5, _factory.Emails.Sent.Count);
    }

    private async Task<string> Outcome(string token)
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/account/confirmation", new { token });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await Json(response)).GetProperty("outcome").GetString()!;
    }

    // L2-004 AC1, AC3
    [Fact]
    public async Task L2_004_AC1_a_valid_link_confirms_the_address_and_works_once()
    {
        await JoinedMember();
        var token = await LastLinkToken();

        var response = await _factory.CreateClient().PostAsJsonAsync("/api/account/confirmation", new { token });

        Assert.Equal("confirmed", (await Json(response)).GetProperty("outcome").GetString());
        Assert.Equal("Joanna", (await Json(response)).GetProperty("firstName").GetString());
        Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single()); // L2-140 AC2
        Assert.Equal(EmailStatus.Confirmed, (await MemberByEmail("joanna.adeyemi@example.com")).EmailStatus);
        // L2-004 AC3: opened again, the account is unchanged and the page shows success.
        Assert.Equal("already-confirmed", await Outcome(token));
    }

    // L2-004 AC2
    [Fact]
    public async Task L2_004_AC2_a_link_older_than_24_hours_is_expired_and_the_account_stays_unconfirmed()
    {
        await JoinedMember();
        var token = await LastLinkToken();
        _factory.Clock.Advance(TimeSpan.FromHours(24) + TimeSpan.FromSeconds(1));

        Assert.Equal("expired", await Outcome(token));
        Assert.Equal(EmailStatus.Unconfirmed, (await MemberByEmail("joanna.adeyemi@example.com")).EmailStatus);
    }

    // L2-004 AC4
    [Theory]
    [InlineData("does-not-exist")]
    [InlineData("%%%")]
    [InlineData("")]
    public async Task L2_004_AC4_an_unknown_or_malformed_token_is_expired_and_reveals_nothing(string token)
    {
        await JoinedMember();

        var response = await _factory.CreateClient().PostAsJsonAsync("/api/account/confirmation", new { token });

        var json = await Json(response);
        Assert.Equal("expired", json.GetProperty("outcome").GetString());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("firstName").ValueKind);
    }

    // L2-004 AC7, L2-118
    [Fact]
    public async Task L2_004_AC7_a_failing_check_is_503_with_its_reference()
    {
        _factory.Database.Unavailable = true;

        var response = await _factory.CreateClient().PostAsJsonAsync("/api/account/confirmation", new { token = "x" });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-VERIFY-502", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-004 AC5, L2-141 AC1
    [Fact]
    public async Task L2_004_AC5_another_address_replaces_the_unconfirmed_one_and_gets_a_new_link()
    {
        var (member, _) = await JoinedMember();
        var first = await LastLinkToken();
        _factory.Emails.Clear();

        var response = await member.PutAsJsonAsync("/api/account/unconfirmed-email", new { email = "joanna@work.example.com" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("joanna@work.example.com", (await WithDb(db => db.Members.AsNoTracking().SingleAsync())).Email);
        await Dispatch();
        Assert.Equal("joanna@work.example.com", Assert.Single(_factory.Emails.Sent).To);
        Assert.Equal("expired", await Outcome(first));
    }

    [Fact]
    public async Task L2_141_AC1_changing_to_an_address_that_has_an_account_answers_the_same_and_changes_nothing()
    {
        var (member, _) = await JoinedMember();
        await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(email: "taken@example.com"));

        var response = await member.PutAsJsonAsync("/api/account/unconfirmed-email", new { email = "taken@example.com" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("joanna.adeyemi@example.com", (await MemberByEmail("joanna.adeyemi@example.com")).EmailKey);
    }

    // L2-005 AC2, AC3
    [Fact]
    public async Task L2_005_AC2_an_unconfirmed_member_is_refused_a_restricted_action_but_may_save()
    {
        var (member, _) = await JoinedMember();

        var restricted = await member.PostAsync("/api/test/restricted", null);
        var save = await member.PostAsync("/api/test/save", null);

        Assert.Equal(HttpStatusCode.Forbidden, restricted.StatusCode);
        Assert.Equal("EMAIL_UNCONFIRMED", (await Json(restricted)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);
    }

    [Fact]
    public async Task L2_005_a_confirmed_member_may_do_the_restricted_action()
    {
        var (member, _) = await JoinedMember();
        await _factory.CreateClient().PostAsJsonAsync("/api/account/confirmation", new { token = await LastLinkToken() });

        Assert.Equal(HttpStatusCode.OK, (await member.PostAsync("/api/test/restricted", null)).StatusCode);
    }

    // L2-005 AC1, AC4, L2-004 AC6: what the banner is built from
    [Fact]
    public async Task L2_005_AC4_the_session_reports_the_e_mail_status_afresh_each_time()
    {
        var (member, _) = await JoinedMember();

        var before = await _factory.GetJson("/api/session", member);
        await _factory.CreateClient().PostAsJsonAsync("/api/account/confirmation", new { token = await LastLinkToken() });
        var after = await _factory.GetJson("/api/session", member);

        Assert.Equal("unconfirmed", before.GetProperty("emailStatus").GetString());
        Assert.Equal("joanna.adeyemi@example.com", before.GetProperty("email").GetString());
        Assert.Equal("Joanna", before.GetProperty("firstName").GetString());
        Assert.Equal("JA", before.GetProperty("initials").GetString());
        Assert.False(before.GetProperty("emailBounced").GetBoolean());
        Assert.Equal("confirmed", after.GetProperty("emailStatus").GetString());
    }

    // L2-004 AC6, L2-179 AC2
    [Fact]
    public async Task L2_004_AC6_a_bounce_marks_the_address_and_the_session_says_so()
    {
        var (member, _) = await JoinedMember();
        var hook = _factory.CreateClient();

        var unauthorised = await hook.PostAsJsonAsync("/api/webhooks/email-events", new { type = "bounce", address = "joanna.adeyemi@example.com" });
        hook.DefaultRequestHeaders.Add("X-Webhook-Secret", "test-webhook-secret");
        var accepted = await hook.PostAsJsonAsync("/api/webhooks/email-events", new { type = "bounce", address = "Joanna.Adeyemi@EXAMPLE.com" });

        Assert.Equal(HttpStatusCode.Unauthorized, unauthorised.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, accepted.StatusCode);
        Assert.True((await _factory.GetJson("/api/session", member)).GetProperty("emailBounced").GetBoolean());
    }

    // L2-179 AC3
    [Fact]
    public async Task L2_179_AC3_a_failed_send_is_retried_with_back_off_and_given_up_after_24_hours()
    {
        await JoinedMember();
        _factory.Emails.Failing = true;
        await Dispatch();
        Assert.Empty(_factory.Emails.Sent);

        await Dispatch(); // not yet due: backed off
        _factory.Emails.Failing = false;
        await Dispatch();
        Assert.Empty(_factory.Emails.Sent);

        _factory.Clock.Advance(TimeSpan.FromMinutes(3));
        await Dispatch();
        Assert.Single(_factory.Emails.Sent);

        // A provider that stays down for a day: the message is given up, not retried for ever.
        _factory.Emails.Clear();
        await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(email: "late@example.com"));
        _factory.Emails.Failing = true;
        for (var i = 0; i < 40; i++)
        {
            _factory.Clock.Advance(TimeSpan.FromMinutes(40));
            await Dispatch();
        }

        _factory.Emails.Failing = false;
        await Dispatch();
        Assert.Empty(_factory.Emails.Sent);
        Assert.All(await WithDb(db => db.OutboxMessages.AsNoTracking().ToListAsync()), m => Assert.True(m.SentAt is not null || m.FailedAt is not null));
    }

    // L2-135 AC2
    [Fact]
    public async Task L2_135_AC2_a_state_changing_request_with_a_session_cookie_needs_the_anti_csrf_token()
    {
        var client = _factory.CreateClient();
        var joined = await client.PostAsJsonAsync("/api/account/join", Form());
        var token = Regex.Match(string.Join(';', joined.Headers.GetValues("Set-Cookie")), "XSRF-TOKEN=([^;]+)").Groups[1].Value;
        Assert.NotEmpty(token);

        var forged = await client.PostAsync("/api/account/confirmation/resend", null);
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/account/confirmation/resend");
        request.Headers.Add("X-XSRF-TOKEN", token);
        var genuine = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, forged.StatusCode);
        Assert.Equal("csrf_token_invalid", (await Json(forged)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Accepted, genuine.StatusCode);
    }

    [Fact]
    public async Task L2_001_joining_signs_the_new_member_in_with_a_new_session_cookie()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/account/join", Form());

        var cookies = string.Join(';', response.Headers.GetValues("Set-Cookie"));
        Assert.Contains("jubilee.session=", cookies);
        Assert.Contains("httponly", cookies, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", cookies, StringComparison.OrdinalIgnoreCase);
    }

    // L2-139 AC2
    [Fact]
    public async Task L2_139_AC2_every_response_carries_the_security_headers()
    {
        var response = await _factory.CreateClient().GetAsync("/api/session");

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("strict-origin-when-cross-origin", response.Headers.GetValues("Referrer-Policy").Single());
        Assert.Contains("frame-ancestors 'none'", response.Headers.GetValues("Content-Security-Policy").Single());
        Assert.True(response.Headers.Contains("Permissions-Policy"));
    }

    // L2-003 AC1
    [Fact]
    public async Task L2_003_AC1_joining_with_google_creates_a_confirmed_account_that_must_accept_the_agreement()
    {
        _factory.Google.Identity = new("g-1", "gina@example.com", true, "Gina", "Gordon");
        var client = _factory.CreateNoRedirectClient();

        var callback = await GoogleRoundTrip(client);

        Assert.StartsWith("/join/agreement", callback.Headers.Location!.OriginalString);
        var member = await MemberByEmail("gina@example.com");
        Assert.Equal(EmailStatus.Confirmed, member.EmailStatus);
        Assert.Null(member.AgreementAcceptedAt);
        Assert.Null(member.PasswordHash);

        var gina = _factory.CreateMemberClient("Gina Gordon", member.Id.ToString());
        Assert.True((await _factory.GetJson("/api/session", gina)).GetProperty("agreementRequired").GetBoolean());
        var blocked = await gina.PostAsync("/api/test/save", null);
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
        Assert.Equal("AGREEMENT_REQUIRED", (await Json(blocked)).GetProperty("code").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await gina.PostAsync("/api/account/agreement", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await gina.PostAsync("/api/test/save", null)).StatusCode);
    }

    // L2-003 AC2
    [Fact]
    public async Task L2_003_AC2_continuing_with_google_links_a_confirmed_account_and_signs_in()
    {
        var (_, joined) = await JoinedMember("gina@example.com");
        await _factory.CreateClient().PostAsJsonAsync("/api/account/confirmation", new { token = await LastLinkToken() });
        _factory.Google.Identity = new("g-1", "Gina@Example.com", true, "Gina", "Gordon");

        var callback = await GoogleRoundTrip(_factory.CreateNoRedirectClient(), "/b/legacy-financial");

        Assert.Equal("/b/legacy-financial", callback.Headers.Location!.OriginalString);
        Assert.Contains("jubilee.session=", string.Join(';', callback.Headers.GetValues("Set-Cookie")));
        Assert.Equal(1, await WithDb(db => db.Members.CountAsync()));
        Assert.Equal("g-1", (await MemberByEmail("gina@example.com")).GoogleSubject);
        Assert.Equal(joined.Id, (await MemberByEmail("gina@example.com")).Id);
    }

    [Fact]
    public async Task L2_003_a_google_sign_in_that_proves_an_unconfirmed_address_confirms_it_and_drops_the_earlier_password()
    {
        await JoinedMember("gina@example.com");
        _factory.Google.Identity = new("g-1", "gina@example.com", true, "Gina", "Gordon");

        await GoogleRoundTrip(_factory.CreateNoRedirectClient());

        var member = await MemberByEmail("gina@example.com");
        Assert.Equal(EmailStatus.Confirmed, member.EmailStatus);
        Assert.Null(member.PasswordHash);
    }

    // L2-003 AC3
    [Fact]
    public async Task L2_003_AC3_the_start_sends_state_nonce_and_a_pkce_s256_challenge()
    {
        var start = await _factory.CreateNoRedirectClient().GetAsync("/api/auth/google/start");

        Assert.Equal(HttpStatusCode.Redirect, start.StatusCode);
        Assert.StartsWith("https://accounts.google.com/", start.Headers.Location!.ToString());
        Assert.Equal("S256", _factory.Google.QueryValue("code_challenge_method"));
        Assert.False(string.IsNullOrEmpty(_factory.Google.QueryValue("state")));
        Assert.False(string.IsNullOrEmpty(_factory.Google.QueryValue("nonce")));
        Assert.False(string.IsNullOrEmpty(_factory.Google.QueryValue("code_challenge")));
    }

    [Theory]
    [InlineData("wrong-state")]
    [InlineData("")]
    public async Task L2_003_AC3_a_callback_with_an_unknown_state_is_rejected_and_no_session_is_issued(string state)
    {
        var client = _factory.CreateNoRedirectClient();
        await client.GetAsync("/api/auth/google/start");

        var callback = await client.GetAsync($"/api/auth/google/callback?code=abc&state={state}");

        Assert.Equal("/sign-in?error=google", callback.Headers.Location!.OriginalString);
        Assert.False(callback.Headers.Contains("Set-Cookie"));
        Assert.Equal(0, await WithDb(db => db.Members.CountAsync()));
    }

    [Fact]
    public async Task L2_003_AC3_a_callback_can_be_used_only_once()
    {
        var client = _factory.CreateNoRedirectClient();
        await client.GetAsync("/api/auth/google/start");
        var state = _factory.Google.QueryValue("state");
        var first = await client.GetAsync($"/api/auth/google/callback?code=abc&state={state}");
        var again = await client.GetAsync($"/api/auth/google/callback?code=abc&state={state}");

        Assert.NotEqual("/sign-in?error=google", first.Headers.Location!.OriginalString);
        Assert.Equal("/sign-in?error=google", again.Headers.Location!.OriginalString);
    }

    // L2-003 AC4
    [Fact]
    public async Task L2_003_AC4_a_google_account_without_a_verified_e_mail_is_refused()
    {
        _factory.Google.Identity = new("g-1", "gina@example.com", false, "Gina", "Gordon");

        var callback = await GoogleRoundTrip(_factory.CreateNoRedirectClient());

        Assert.Equal("/sign-in?error=google-email", callback.Headers.Location!.OriginalString);
        Assert.Equal(0, await WithDb(db => db.Members.CountAsync()));
    }

    // L2-012 AC3
    [Theory]
    [InlineData("https://evil.example/", "/")]
    [InlineData("//evil.example/x", "/")]
    [InlineData("/\\evil.example", "/")]
    [InlineData("javascript:alert(1)", "/")]
    [InlineData("/b/legacy-financial?m=1", "/b/legacy-financial?m=1")]
    public async Task L2_012_AC3_only_a_same_origin_relative_return_path_is_followed(string returnUrl, string expected)
    {
        _factory.Google.Identity = new("g-9", "back@example.com", true, "Bea", "Back");
        await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(email: "back@example.com"));
        var client = _factory.CreateNoRedirectClient();

        var callback = await GoogleRoundTrip(client, returnUrl);

        Assert.Equal(expected, callback.Headers.Location!.OriginalString);
    }

    private async Task<HttpResponseMessage> GoogleRoundTrip(HttpClient client, string? returnUrl = null)
    {
        await client.GetAsync("/api/auth/google/start" + (returnUrl is null ? string.Empty : $"?returnUrl={Uri.EscapeDataString(returnUrl)}"));
        return await client.GetAsync($"/api/auth/google/callback?code=abc&state={_factory.Google.QueryValue("state")}");
    }

    // L2-064 AC6
    [Fact]
    public async Task L2_064_AC6_confirming_the_e_mail_tells_the_member_in_the_notification_centre()
    {
        var (member, _) = await JoinedMember();
        var before = JsonDocument.Parse(await (await member.GetAsync("/api/notifications")).Content.ReadAsStringAsync()).RootElement;
        Assert.Empty(before.GetProperty("items").EnumerateArray());

        Assert.Equal("confirmed", await Outcome(await LastLinkToken()));

        var after = JsonDocument.Parse(await (await member.GetAsync("/api/notifications")).Content.ReadAsStringAsync()).RootElement;
        var item = Assert.Single(after.GetProperty("items").EnumerateArray());
        Assert.Equal("Your e-mail is confirmed", item.GetProperty("title").GetString());
        Assert.Equal("account", item.GetProperty("kind").GetString());
    }
}

public class JoinRateLimitTests(FiveJoinsFactory factory) : IClassFixture<FiveJoinsFactory>
{
    // L2-137 AC1
    [Fact]
    public async Task L2_137_AC1_more_than_5_joins_an_hour_from_one_address_get_429_with_retry_after()
    {
        var client = factory.CreateClient();
        for (var i = 0; i < 5; i++)
        {
            client = factory.CreateClient(); // a new browser each time: no session cookie yet
            var form = new { firstName = "A", lastName = "B", email = $"a{i}@example.com", password = "correct horse 13", agreementAccepted = true };
            Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/account/join", form)).StatusCode);
        }

        client = factory.CreateClient();
        var refused = await client.PostAsJsonAsync("/api/account/join", new { firstName = "A", lastName = "B", email = "z@example.com", password = "correct horse 13", agreementAccepted = true });

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.True(refused.Headers.RetryAfter!.Delta!.Value.TotalSeconds > 0);
    }
}
