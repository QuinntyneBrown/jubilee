using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;

namespace Jubilee.Api.Tests;

public class HostTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>
{
    [Fact]
    public async Task Health_is_open_to_anonymous_callers()
    {
        var response = await factory.CreateClient().GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Swagger_document_is_served_without_signing_in()
    {
        var response = await factory.CreateClient().GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task L2_118_AC3_every_response_carries_a_correlation_id()
    {
        var response = await factory.CreateClient().GetAsync("/api/health");

        var id = Assert.Single(response.Headers.GetValues("X-Correlation-ID"));
        Assert.False(string.IsNullOrWhiteSpace(id));
    }

    [Fact]
    public async Task L2_118_AC3_a_correlation_id_sent_by_the_caller_is_kept()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        request.Headers.Add("X-Correlation-ID", "abc-123");

        var response = await factory.CreateClient().SendAsync(request);

        Assert.Equal("abc-123", Assert.Single(response.Headers.GetValues("X-Correlation-ID")));
    }

    [Fact]
    public async Task L2_118_AC3_an_unusable_correlation_id_is_replaced()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        request.Headers.Add("X-Correlation-ID", new string('x', 200));

        var response = await factory.CreateClient().SendAsync(request);

        Assert.NotEqual(new string('x', 200), Assert.Single(response.Headers.GetValues("X-Correlation-ID")));
    }

    // The fallback policy covers every route, so an anonymous probe learns nothing.
    [Fact]
    public async Task L2_133_AC1_an_unknown_api_route_refuses_an_anonymous_caller()
    {
        var response = await factory.CreateClient().GetAsync("/api/nothing-here");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task L2_113_AC1_an_unknown_api_route_is_not_found_for_a_member()
    {
        var response = await factory.CreateMemberClient().GetAsync("/api/nothing-here");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}

public class SessionTests(JubileeApiFactory factory) : IClassFixture<JubileeApiFactory>
{
    // L2-022 AC3: a visitor has no session, so the top bar shows "Sign in" and "Join free".
    [Fact]
    public async Task L2_022_AC3_a_visitor_has_no_session()
    {
        var json = await GetJson(factory.CreateClient(), "/api/session");

        Assert.False(json.GetProperty("signedIn").GetBoolean());
        Assert.False(json.TryGetProperty("firstName", out _));
    }

    // L2-021 AC1: the greeting needs the member's first name.
    [Fact]
    public async Task L2_021_AC1_a_member_session_names_the_member()
    {
        var json = await GetJson(factory.CreateMemberClient("Joanna Adeyemi"), "/api/session");

        Assert.True(json.GetProperty("signedIn").GetBoolean());
        Assert.Equal("Joanna", json.GetProperty("firstName").GetString());
        Assert.Equal("Joanna Adeyemi", json.GetProperty("displayName").GetString());
        Assert.Equal("JA", json.GetProperty("initials").GetString());
    }

    [Fact]
    public async Task L2_133_AC5_navigation_summary_refuses_an_anonymous_caller()
    {
        var response = await factory.CreateClient().GetAsync("/api/me/navigation");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal(401, json.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrEmpty(json.GetProperty("correlationId").GetString()));
    }

    [Fact]
    public async Task Navigation_summary_for_a_member_has_no_counts_yet()
    {
        var json = await GetJson(factory.CreateMemberClient(), "/api/me/navigation");

        Assert.Equal(0, json.GetProperty("unreadConversationCount").GetInt32());
        Assert.Equal(0, json.GetProperty("unreadNotificationCount").GetInt32());
        Assert.Equal(0, json.GetProperty("newRequestCount").GetInt32());
        Assert.False(json.GetProperty("ownsListing").GetBoolean());
    }

    private static async Task<JsonElement> GetJson(HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
    }
}
