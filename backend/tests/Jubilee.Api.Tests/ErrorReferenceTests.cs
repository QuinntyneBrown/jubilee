using System.Net;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Tests.Shared;
using Microsoft.Extensions.Logging;

namespace Jubilee.Api.Tests;

public class ErrorReferenceTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public ErrorReferenceTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    // L2-021 AC6 / L2-023 AC4 / L2-118 AC2: 503 "service unavailable" with the area's reference.
    [Theory]
    [InlineData("/api/directory/welcome", "JB-DIR-503")]
    [InlineData("/api/directory/home", "JB-DIR-503")]
    [InlineData("/api/categories/home-property/listings", "JB-CAT-503")]
    [InlineData("/api/categories/home-property/listings/count", "JB-CAT-503")]
    [InlineData("/api/listings/legacy-financial", "JB-BIZ-503")]
    [InlineData("/api/listings/luzandre/products/faith-heavyweight-tee-charcoal", "JB-PRD-503")]
    public async Task L2_118_AC2_a_directory_read_that_cannot_be_served_answers_503_with_its_reference(string url, string reference)
    {
        _factory.Database.Unavailable = true;

        var response = await _factory.CreateClient().GetAsync(url);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        Assert.Equal(503, json.GetProperty("status").GetInt32());
        Assert.Equal(reference, json.GetProperty("reference").GetString());
        Assert.Equal(
            Assert.Single(response.Headers.GetValues("X-Correlation-ID")),
            json.GetProperty("correlationId").GetString());
        Assert.DoesNotContain("Login failed", body);
        Assert.DoesNotContain("Exception", body);
        Assert.False(response.Headers.CacheControl?.Public ?? false);
    }

    // L2-086 / L2-118: the owner's overview quotes the reference its page and its mock show.
    [Fact]
    public async Task L2_118_AC2_my_business_that_cannot_be_served_answers_503_with_the_reference_of_its_page()
    {
        _factory.Database.Unavailable = true;

        var response = await _factory.CreateMemberClient("Naomi Laurent", "member|naomi").GetAsync("/api/my-business");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("JB-BIZ-503", json.GetProperty("reference").GetString());
    }

    [Theory]
    [InlineData("/api/directory/home", "JB-DIR-503")]
    [InlineData("/api/categories/media/listings", "JB-CAT-503")]
    [InlineData("/api/listings/legacy-financial", "JB-BIZ-503")]
    public async Task L2_118_AC3_the_reference_is_logged_with_the_correlation_id_of_the_failing_request(string url, string reference)
    {
        _factory.Database.Unavailable = true;
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("X-Correlation-ID", "support-case-4711");

        await _factory.CreateClient().SendAsync(request);

        var entry = Assert.Single(_factory.Logs.Entries, e => e.Level == LogLevel.Error && e.Message.Contains(reference));
        Assert.Contains("support-case-4711", entry.Message);
        Assert.Contains(DatabaseOutage.SecretDetail, entry.Exception?.Message);
    }

    [Fact]
    public async Task L2_118_AC3_the_request_log_records_the_status_the_caller_received()
    {
        _factory.Database.Unavailable = true;

        await _factory.CreateClient().GetAsync("/api/directory/home");

        Assert.Contains(
            _factory.Logs.Entries,
            e => e.Level == LogLevel.Information && e.Message.Contains("/api/directory/home") && e.Message.Contains("503"));
    }

    [Fact]
    public async Task L2_118_AC1_the_directory_recovers_when_the_database_is_back()
    {
        await _factory.Arrange(ListingMother.Public("a"));
        _factory.Database.Unavailable = true;
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await _factory.CreateClient().GetAsync("/api/directory/home")).StatusCode);

        _factory.Database.Unavailable = false;

        var json = await _factory.GetJson("/api/directory/home");
        Assert.Equal(1, json.GetProperty("liveBusinessCount").GetInt32());
    }

    [Fact]
    public async Task L2_118_an_unknown_category_is_still_404_while_the_database_is_down()
    {
        _factory.Database.Unavailable = true;

        var response = await _factory.CreateClient().GetAsync("/api/categories/pets/listings");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task L2_118_any_other_unhandled_error_answers_500_without_leaking_detail()
    {
        var response = await _factory.CreateClient().GetAsync("/api/test/boom");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        Assert.Equal(500, json.GetProperty("status").GetInt32());
        var correlationId = json.GetProperty("correlationId").GetString();
        Assert.Equal(Assert.Single(response.Headers.GetValues("X-Correlation-ID")), correlationId);
        Assert.Matches("^JB-500-[A-Z2-9]{4}$", json.GetProperty("reference").GetString());
        Assert.DoesNotContain("PaymentsService", body);
        Assert.DoesNotContain("InvalidOperationException", body);
        Assert.Contains(
            _factory.Logs.Entries,
            e => e.Level == LogLevel.Error && e.Message.Contains(correlationId!) && e.Exception?.Message == FailingController.SecretDetail);
    }
}
