using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>
/// The parts of joining that ADR 0037 and ADR 0038 add: Google sign-in that is off, cancelled or
/// refused (L2-003 AC5 to AC7), the HTML part of an e-mail (L2-179 AC5 and AC6) and the provider's
/// delivery reports over Event Grid (L2-179 AC2).
/// </summary>
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

    // L2-179 AC5, AC6 and AC4
    [Fact]
    public async Task L2_179_AC5_the_confirmation_e_mail_is_html_with_the_same_link_as_its_text()
    {
        await _factory.CreateClient().PostAsJsonAsync("/api/account/join", Form(first: "Jo<script>"));
        await Dispatch();

        var mail = _factory.Emails.Sent.Single(m => m.Subject == "Confirm your e-mail for Jubilee");
        var link = TokenInLink().Match(mail.Body).Value;
        Assert.NotEmpty(link);

        Assert.StartsWith("<!DOCTYPE html>", mail.Html);
        Assert.Contains($"href=\"{link}\"", mail.Html);               // the button, absolute from App:PublicBaseUrl
        Assert.Contains(">Confirm your e-mail</a>", mail.Html);       // labelled by what it does
        Assert.Contains("within 24 hours", mail.Html);
        Assert.Contains(">jubilee<", mail.Html);                      // the wordmark in the header
        Assert.Contains("Toronto’s Christian marketplace", mail.Html); // the footer
        Assert.Contains("Hi Jo&lt;script&gt;,", mail.Html);           // a person's text is HTML-encoded
        Assert.DoesNotContain("<script", mail.Html);
        Assert.Contains("color-scheme", mail.Html);                   // light and dark mail clients
        Assert.DoesNotContain("<img", mail.Html);                     // nothing to track with
        Assert.Contains("Hi Jo<script>,", mail.Body);                 // the text part is the text as written
    }

    // L2-179 AC2
    [Fact]
    public async Task L2_179_AC2_the_webhook_answers_event_grids_validation_handshake()
    {
        var response = await PostEvents(
            """[{"id":"1","eventType":"Microsoft.EventGrid.SubscriptionValidationEvent","data":{"validationCode":"512d38b6"}}]""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("512d38b6", (await Json(response)).GetProperty("validationResponse").GetString());
    }

    // L2-179 AC2
    [Theory]
    [InlineData("Bounced", true)]
    [InlineData("Suppressed", true)]
    [InlineData("Delivered", false)]
    public async Task L2_179_AC2_a_delivery_report_of_a_bounce_marks_the_address_undeliverable(string status, bool bounced)
    {
        await JoinedMember("bounce@example.com");

        var response = await PostEvents(
            """[{"id":"2","eventType":"Microsoft.Communication.EmailDeliveryReportReceived","data":{"recipient":"bounce@example.com","status":"STATUS"}}]"""
                .Replace("STATUS", status));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(bounced, (await MemberByEmail("bounce@example.com")).EmailBounced);
    }

    // L2-179 AC2
    [Fact]
    public async Task L2_179_AC2_event_grid_events_without_the_secret_are_refused()
    {
        var response = await PostEvents(
            """[{"id":"1","eventType":"Microsoft.EventGrid.SubscriptionValidationEvent","data":{"validationCode":"x"}}]""", secret: "wrong");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private Task<HttpResponseMessage> PostEvents(string json, string secret = "test-webhook-secret")
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/email-events")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("X-Webhook-Secret", secret);
        return _factory.CreateClient().SendAsync(request);
    }
}
