using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Change e-mail (L2-014) and change password (L2-015, L2-134 AC3, L2-140).
public sealed partial class AccountSettingsTests
{
    private const string Other = "joy.new@example.com";

    private static Task<HttpResponseMessage> ChangePassword(
        HttpClient client, string? current = Password, string? next = NewPassword, string? repeat = null) =>
        client.PutAsJsonAsync("/api/account/password", new { currentPassword = current, newPassword = next, repeatPassword = repeat ?? next });

    private static Task<HttpResponseMessage> RequestEmailChange(HttpClient client, string? email = Other, string? password = Password) =>
        client.PostAsJsonAsync("/api/account/email-change", new { email, currentPassword = password });

    private Task<HttpResponseMessage> ConfirmEmailChange(string token) =>
        _factory.CreateClient().PostAsJsonAsync("/api/account/email-change/confirm", new { token });

    private async Task Deliver()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
    }

    private async Task<HttpResponseMessage> SignInAs(HttpClient client, string email, string password) =>
        await client.PostAsJsonAsync("/api/account/sign-in", new { email, password });

    private async Task<string> EmailChangeToken(string to = Other)
    {
        await Deliver();
        var mail = _factory.Emails.Sent.Last(m => m.To == to && m.Subject.Contains("Confirm your new e-mail"));
        return ConfirmLink().Match(mail.Body).Groups[1].Value;
    }

    [GeneratedRegex(@"https://jubilee\.test/confirm-email-change/([A-Za-z0-9_-]+)")]
    private static partial Regex ConfirmLink();

    // L2-015 AC2, AC3, AC4
    [Fact]
    public async Task L2_015_AC3_a_changed_password_signs_in_ends_the_other_sessions_and_sends_a_security_e_mail()
    {
        var thisDevice = await Join();
        var otherDevice = Visitor();
        Assert.Equal(HttpStatusCode.NoContent, (await SignInAs(otherDevice, Email, Password)).StatusCode);
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));

        var response = await ChangePassword(thisDevice);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await thisDevice.GetAsync("/api/account")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await otherDevice.GetAsync("/api/account")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await SignInAs(Visitor(), Email, NewPassword)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await SignInAs(Visitor(), Email, Password)).StatusCode);
        await Deliver();
        Assert.Contains(_factory.Emails.Sent, m => m.To == Email && m.Subject.Contains("Your Jubilee password was changed"));
        var account = await Account(thisDevice);
        Assert.Equal(_factory.Clock.GetUtcNow(), account.GetProperty("passwordChangedAt").GetDateTimeOffset());
    }

    // L2-015 AC2
    [Fact]
    public async Task L2_015_AC2_a_wrong_current_password_is_refused_and_nothing_changes()
    {
        var client = await Join();

        var response = await ChangePassword(client, current: "not my password");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("CURRENT_PASSWORD_INCORRECT", (await Json(response)).GetProperty("errors").GetProperty("currentPassword").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await SignInAs(Visitor(), Email, Password)).StatusCode);
        await Deliver();
        Assert.DoesNotContain(_factory.Emails.Sent, m => m.Subject.Contains("password was changed"));
    }

    // L2-134 AC1, AC2
    [Theory]
    [InlineData("short", "short", "newPassword", "PASSWORD_TOO_SHORT")]
    [InlineData("password12345", "password12345", "newPassword", "PASSWORD_BREACHED")]
    [InlineData("a brand new password 7", "something else entirely", "repeatPassword", "PASSWORDS_DIFFER")]
    public async Task L2_134_the_new_password_is_checked(string next, string repeat, string field, string code)
    {
        var client = await Join();

        var response = await ChangePassword(client, next: next, repeat: repeat);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty(field).GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await SignInAs(Visitor(), Email, Password)).StatusCode);
    }

    // L2-015 AC5
    [Fact]
    public async Task L2_015_AC5_a_member_who_joined_with_google_sets_a_password_without_a_current_one()
    {
        var google = Member.JoinWithGoogle(
            EmailAddress.TryParse("grace@example.com")!, "Grace", "Okafor", "google-subject-1", _factory.Clock.GetUtcNow());
        google.AcceptAgreement(_factory.Clock.GetUtcNow());
        await _factory.Arrange(google);
        var client = _factory.CreateMemberClient("Grace Okafor", google.Id.ToString());
        Assert.False((await Account(client)).GetProperty("hasPassword").GetBoolean());

        var response = await ChangePassword(client, current: null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.True((await Account(client)).GetProperty("hasPassword").GetBoolean());
        Assert.Equal(HttpStatusCode.NoContent, (await SignInAs(Visitor(), "grace@example.com", NewPassword)).StatusCode);
    }

    // L2-015 AC5: a member who has a password cannot skip the current one.
    [Fact]
    public async Task L2_015_a_member_with_a_password_must_give_the_current_one()
    {
        var client = await Join();

        var response = await ChangePassword(client, current: null);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("CURRENT_PASSWORD_INCORRECT", (await Json(response)).GetProperty("errors").GetProperty("currentPassword").GetString());
    }

    // L2-009 AC4 carried over: an unused reset link stops working once the password has changed.
    [Fact]
    public async Task L2_015_a_reset_link_still_waiting_stops_working_when_the_password_changes()
    {
        var client = await Join();
        var memberId = await Read(db => Task.FromResult(db.Members.Single().Id));
        await _factory.Arrange(LinkToken.Issue(
            memberId, LinkTokenPurpose.PasswordReset, LinkTokens.Hash("waiting-token"), _factory.Clock.GetUtcNow(), LinkToken.PasswordResetLifetime));

        await ChangePassword(client);

        var inspected = await Visitor().PostAsJsonAsync("/api/account/password-resets/inspect", new { token = "waiting-token" });
        Assert.Equal("expired", (await Json(inspected)).GetProperty("state").GetString()!.ToLowerInvariant());
    }

    // L2-014 AC1, AC2
    [Fact]
    public async Task L2_014_AC1_an_e_mail_change_sends_a_link_to_the_new_address_and_a_notice_to_the_old_one_and_changes_nothing_yet()
    {
        var client = await Join();

        var response = await RequestEmailChange(client);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        await Deliver();
        var toNew = Assert.Single(_factory.Emails.Sent, m => m.To == Other);
        Assert.Contains("/confirm-email-change/", toNew.Body);
        var toOld = Assert.Single(_factory.Emails.Sent, m => m.To == Email && m.Subject.Contains("e-mail change"));
        Assert.Contains(Other, toOld.Body);
        Assert.Equal(Email, (await Account(client)).GetProperty("email").GetString());
    }

    // L2-014 AC3
    [Fact]
    public async Task L2_014_AC3_opening_the_link_replaces_the_address_and_confirms_it()
    {
        var client = await Join();
        await RequestEmailChange(client);
        var token = await EmailChangeToken();

        var response = await ConfirmEmailChange(token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("confirmed", (await Json(response)).GetProperty("outcome").GetString());
        var account = await Account(client);
        Assert.Equal(Other, account.GetProperty("email").GetString());
        Assert.Equal("confirmed", account.GetProperty("emailStatus").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await SignInAs(Visitor(), Other, Password)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await SignInAs(Visitor(), Email, Password)).StatusCode);
    }

    // L2-014 AC4
    [Fact]
    public async Task L2_014_AC4_an_address_another_account_uses_is_refused_with_its_code()
    {
        var client = await Join();
        await Join("taken@example.com", "David", "Chen");

        var response = await RequestEmailChange(client, "Taken@Example.com");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("EMAIL_IN_USE", (await Json(response)).GetProperty("errors").GetProperty("email").GetString());
        await Deliver();
        Assert.DoesNotContain(_factory.Emails.Sent, m => m.To == "taken@example.com" && m.Subject.Contains("Confirm your new e-mail"));
    }

    // L2-014 AC1: the current password is asked for.
    [Fact]
    public async Task L2_014_the_current_password_and_a_valid_address_are_required()
    {
        var client = await Join();

        var wrong = await RequestEmailChange(client, password: "not my password");
        var invalid = await RequestEmailChange(client, email: "not-an-email");

        Assert.Equal("CURRENT_PASSWORD_INCORRECT", (await Json(wrong)).GetProperty("errors").GetProperty("currentPassword").GetString());
        Assert.Equal("EMAIL_INVALID", (await Json(invalid)).GetProperty("errors").GetProperty("email").GetString());
        await Deliver();
        Assert.DoesNotContain(_factory.Emails.Sent, m => m.Subject.Contains("Confirm your new e-mail"));
    }

    // L2-014 AC5: a link never opened changes nothing; it lasts 24 hours.
    [Fact]
    public async Task L2_014_AC5_a_link_that_is_not_opened_in_24_hours_changes_nothing()
    {
        var client = await Join();
        await RequestEmailChange(client);
        var token = await EmailChangeToken();
        _factory.Clock.Advance(TimeSpan.FromHours(24) + TimeSpan.FromMinutes(1));

        var response = await ConfirmEmailChange(token);

        Assert.Equal("expired", (await Json(response)).GetProperty("outcome").GetString());
        Assert.Equal(Email, (await Account(client)).GetProperty("email").GetString());
    }

    [Fact]
    public async Task L2_140_the_link_works_once_and_a_newer_request_replaces_an_older_link()
    {
        var client = await Join();
        await RequestEmailChange(client, "first@example.com");
        var first = await EmailChangeToken("first@example.com");
        await RequestEmailChange(client, "second@example.com");
        var second = await EmailChangeToken("second@example.com");

        Assert.Equal("expired", (await Json(await ConfirmEmailChange(first))).GetProperty("outcome").GetString());
        Assert.Equal("confirmed", (await Json(await ConfirmEmailChange(second))).GetProperty("outcome").GetString());
        Assert.Equal("expired", (await Json(await ConfirmEmailChange(second))).GetProperty("outcome").GetString());
        Assert.Equal("second@example.com", (await Account(client)).GetProperty("email").GetString());
    }

    [Fact]
    public async Task L2_014_an_address_taken_while_the_link_waited_is_not_given_to_a_second_account()
    {
        var client = await Join();
        await RequestEmailChange(client);
        var token = await EmailChangeToken();
        await Join(Other, "David", "Chen");

        var response = await ConfirmEmailChange(token);

        Assert.Equal("email-in-use", (await Json(response)).GetProperty("outcome").GetString());
        Assert.Equal(Email, (await Account(client)).GetProperty("email").GetString());
    }

    [Fact]
    public async Task L2_133_changing_credentials_needs_a_session()
    {
        var anonymous = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await ChangePassword(anonymous)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await RequestEmailChange(anonymous)).StatusCode);
    }
}
