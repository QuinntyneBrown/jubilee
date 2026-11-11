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

/// <summary>Manage profile and settings: L2-013, L2-014, L2-015, L2-016, L2-068, L2-133, L2-134, L2-149.</summary>
public sealed partial class AccountSettingsTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Email = "joanna.adeyemi@example.com";
    private const string Password = "correct horse 13";
    private const string NewPassword = "a brand new password 7";

    private readonly JubileeApiFactory _factory;

    public AccountSettingsTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

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

    /// <summary>Joins and signs in: the returned client carries a real session cookie.</summary>
    private async Task<HttpClient> Join(string email = Email, string first = "Joanna", string last = "Adeyemi")
    {
        var client = Visitor();
        var response = await client.PostAsJsonAsync("/api/account/join", new
        {
            firstName = first,
            lastName = last,
            email,
            password = Password,
            homeChurch = (string?)null,
            agreementAccepted = true,
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var token = XsrfCookie().Match(string.Join(';', response.Headers.GetValues("Set-Cookie"))).Groups[1].Value;
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", token);
        return client;
    }

    [GeneratedRegex("XSRF-TOKEN=([^;]+)")]
    private static partial Regex XsrfCookie();

    private static object Profile(
        string first = "Joanna", string last = "Adeyemi", string? phone = "416-555-0142", string? postal = "M4C 1A1",
        string? church = "Grace Toronto Church", string? pronouns = "she/her") =>
        new { firstName = first, lastName = last, phone, postalCode = postal, homeChurch = church, pronouns };

    private static Task<HttpResponseMessage> SaveProfile(HttpClient client, object profile) => client.PutAsJsonAsync("/api/account/profile", profile);

    private async Task<JsonElement> Account(HttpClient client)
    {
        var response = await client.GetAsync("/api/account");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await Json(response);
    }

    // L2-013 AC1
    [Fact]
    public async Task L2_013_AC1_the_account_shows_the_profile_with_the_member_since_date()
    {
        var client = await Join();

        var account = await Account(client);

        Assert.Equal("Joanna", account.GetProperty("firstName").GetString());
        Assert.Equal("Adeyemi", account.GetProperty("lastName").GetString());
        Assert.Equal(Email, account.GetProperty("email").GetString());
        Assert.Equal("unconfirmed", account.GetProperty("emailStatus").GetString());
        Assert.Equal(JsonValueKind.Null, account.GetProperty("phone").ValueKind);
        Assert.Equal(JsonValueKind.Null, account.GetProperty("profileSavedAt").ValueKind);
        Assert.True(account.GetProperty("hasPassword").GetBoolean());
        Assert.True(DateTimeOffset.TryParse(account.GetProperty("memberSince").GetString(), out _));
    }

    // L2-013 AC2, AC5
    [Fact]
    public async Task L2_013_AC2_a_saved_profile_persists_and_says_when_it_was_saved()
    {
        var client = await Join();
        _factory.Clock.Advance(TimeSpan.FromDays(3));

        var response = await SaveProfile(client, Profile(first: "Joy", church: "Grace Toronto Church", pronouns: "she/her"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var account = await Account(client);
        Assert.Equal("Joy", account.GetProperty("firstName").GetString());
        Assert.Equal("416-555-0142", account.GetProperty("phone").GetString());
        Assert.Equal("M4C 1A1", account.GetProperty("postalCode").GetString());
        Assert.Equal("Grace Toronto Church", account.GetProperty("homeChurch").GetString());
        Assert.Equal("she/her", account.GetProperty("pronouns").GetString());
        Assert.Equal(_factory.Clock.GetUtcNow(), account.GetProperty("profileSavedAt").GetDateTimeOffset());
    }

    // L2-013 AC3
    [Theory]
    [InlineData("555-0142")]
    [InlineData("41655501421")]
    [InlineData("call me")]
    public async Task L2_013_AC3_a_phone_that_is_not_ten_digits_is_refused_with_its_code(string phone)
    {
        var client = await Join();

        var response = await SaveProfile(client, Profile(phone: phone));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("PHONE_INVALID", (await Json(response)).GetProperty("errors").GetProperty("phone").GetString());
        Assert.Equal(JsonValueKind.Null, (await Account(client)).GetProperty("phone").ValueKind);
    }

    // L2-013 AC4
    [Theory]
    [InlineData("M4C")]
    [InlineData("12345")]
    [InlineData("M4C 1A1 9")]
    public async Task L2_013_AC4_a_postal_code_that_is_not_complete_is_refused_with_its_code(string postal)
    {
        var client = await Join();

        var response = await SaveProfile(client, Profile(postal: postal));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("POSTAL_CODE_INVALID", (await Json(response)).GetProperty("errors").GetProperty("postalCode").GetString());
    }

    [Fact]
    public async Task L2_013_a_postal_code_without_its_space_is_stored_in_the_usual_form_and_the_optional_fields_may_be_empty()
    {
        var client = await Join();

        Assert.Equal(HttpStatusCode.OK, (await SaveProfile(client, Profile(postal: "m4c1a1"))).StatusCode);
        Assert.Equal("M4C 1A1", (await Account(client)).GetProperty("postalCode").GetString());

        Assert.Equal(HttpStatusCode.OK, (await SaveProfile(client, Profile(phone: null, postal: "", church: null, pronouns: null))).StatusCode);
        var account = await Account(client);
        Assert.Equal(JsonValueKind.Null, account.GetProperty("phone").ValueKind);
        Assert.Equal(JsonValueKind.Null, account.GetProperty("postalCode").ValueKind);
    }

    [Fact]
    public async Task L2_013_a_name_is_required()
    {
        var client = await Join();

        var response = await SaveProfile(client, Profile(first: " ", last: ""));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REQUIRED", errors.GetProperty("firstName").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("lastName").GetString());
    }

    // L2-013 AC6, L2-136
    [Fact]
    public async Task L2_013_AC6_a_body_that_names_any_other_field_is_refused_and_nothing_changes()
    {
        var client = await Join();

        var response = await client.PutAsJsonAsync("/api/account/profile", new
        {
            firstName = "Mallory",
            lastName = "Adeyemi",
            phone = (string?)null,
            postalCode = (string?)null,
            homeChurch = (string?)null,
            pronouns = (string?)null,
            role = "Admin",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Joanna", (await Account(client)).GetProperty("firstName").GetString());
    }

    // L2-013 AC7: a request keeps the phone it was sent with, because it holds its own copy.
    [Fact]
    public async Task L2_013_AC7_the_phone_is_kept_as_ten_digits_for_requests_to_copy()
    {
        var client = await Join();
        Assert.Equal(HttpStatusCode.OK, (await SaveProfile(client, Profile(phone: "416-555-0100"))).StatusCode);

        Assert.Equal("4165550100", await Read(db => Task.FromResult(db.Members.Single().Phone)));
    }

    // L2-133
    [Fact]
    public async Task L2_133_the_account_needs_a_session_and_a_member_reaches_only_their_own()
    {
        var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/account")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync("/api/account/profile", Profile())).StatusCode);

        var joanna = await Join();
        var david = await Join("david.chen@example.com", "David", "Chen");
        await SaveProfile(joanna, Profile(first: "Joy"));

        Assert.Equal("David", (await Account(david)).GetProperty("firstName").GetString());
    }

    // L2-118
    [Fact]
    public async Task L2_118_a_failed_load_names_its_reference()
    {
        var client = await Join();
        _factory.Database.Unavailable = true;
        try
        {
            var response = await client.GetAsync("/api/account");

            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
            Assert.Equal("JB-ACC-503", (await Json(response)).GetProperty("reference").GetString());
        }
        finally
        {
            _factory.Database.Unavailable = false;
        }
    }
}
