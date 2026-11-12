using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Jubilee.Application.Maintenance;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Jubilee.Api.Tests;

// Recover from errors: L2-113 AC1, L2-114 AC2, L2-115, L2-117, L2-118 AC3, L2-133, L2-175 AC1 and AC3.
public sealed partial class ErrorPagesTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public ErrorPagesTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient AsJoanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    [GeneratedRegex("^JB-500-[A-Z2-9]{4}$")]
    private static partial Regex Unhandled();

    [Fact]
    public async Task L2_115_an_unhandled_error_answers_500_with_a_reference_and_no_internal_detail()
    {
        var response = await _factory.CreateClient().GetAsync("/api/test/boom");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        Assert.Matches(Unhandled(), json.GetProperty("reference").GetString());
        Assert.DoesNotContain("PaymentsService", body);
        Assert.DoesNotContain("InvalidOperationException", body);
        Assert.DoesNotContain(" at ", body);
        Assert.DoesNotContain(".cs", body);
    }

    [Fact]
    public async Task L2_118_the_reference_leads_support_to_the_correlation_id_and_the_log_entry()
    {
        var response = await _factory.CreateClient().GetAsync("/api/test/boom");

        var json = await Json(response);
        var reference = json.GetProperty("reference").GetString()!;
        var correlationId = json.GetProperty("correlationId").GetString()!;
        Assert.Equal(correlationId, Assert.Single(response.Headers.GetValues("X-Request-Id")));
        Assert.Contains(
            _factory.Logs.Entries,
            e => e.Level == LogLevel.Error && e.Message.Contains(reference) && e.Message.Contains(correlationId));
    }

    [Fact]
    public async Task L2_175_a_request_carries_the_correlation_id_it_was_given_and_the_same_reference_follows()
    {
        var first = _factory.CreateClient();
        first.DefaultRequestHeaders.Add("X-Correlation-ID", "support-trace-0001");
        var second = _factory.CreateClient();
        second.DefaultRequestHeaders.Add("X-Correlation-ID", "support-trace-0001");

        var a = await Json(await first.GetAsync("/api/test/boom"));
        var b = await Json(await second.GetAsync("/api/test/boom"));

        Assert.Equal("support-trace-0001", a.GetProperty("correlationId").GetString());
        Assert.Equal(a.GetProperty("reference").GetString(), b.GetProperty("reference").GetString());
    }

    [Fact]
    public async Task L2_113_a_missing_listing_answers_404_that_names_nothing_about_it()
    {
        var response = await _factory.CreateClient().GetAsync("/api/listings/no-such-business");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    // L2-117 AC1 and AC3

    [Fact]
    public async Task L2_117_while_maintenance_is_on_every_request_answers_503_with_retry_after_and_the_back_by_time()
    {
        var backBy = _factory.Clock.GetUtcNow().AddHours(2);
        _factory.Maintenance.Enabled = true;
        _factory.Maintenance.BackBy = backBy;

        var response = await _factory.CreateClient().GetAsync("/api/content/help");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("7200", Assert.Single(response.Headers.GetValues("Retry-After")));
        var json = await Json(response);
        Assert.Equal("MAINTENANCE", json.GetProperty("code").GetString());
        Assert.Equal(backBy, json.GetProperty("backBy").GetDateTimeOffset());
    }

    [Fact]
    public async Task L2_117_a_member_signed_in_is_also_held_and_the_health_probe_still_answers()
    {
        _factory.Maintenance.Enabled = true;

        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await AsJoanna().GetAsync("/api/account")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/health")).StatusCode);
    }

    [Fact]
    public async Task L2_117_without_a_back_by_time_the_wait_is_a_default_and_turning_the_switch_off_serves_again()
    {
        _factory.Maintenance.Enabled = true;

        var held = await _factory.CreateClient().GetAsync("/api/content/help");
        Assert.Equal("300", Assert.Single(held.Headers.GetValues("Retry-After")));
        Assert.False((await Json(held)).TryGetProperty("backBy", out _));

        _factory.Maintenance.Off();

        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/content/help")).StatusCode);
    }

    // L2-117 AC2

    private async Task<T> Read<T>(Func<Infrastructure.Persistence.AppDbContext, Task<T>> work)
    {
        T result = default!;
        await _factory.WithDb(async db => result = await work(db));
        return result;
    }

    private async Task Observe()
    {
        await _factory.WithDb(async db =>
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var service = new MaintenanceWindowService(db, _factory.Maintenance, _factory.Clock);
            await service.ObserveAsync(CancellationToken.None);
        });
    }

    private async Task<(Guid MemberId, Guid ListingId)> Seed()
    {
        var member = Member.Join(EmailAddress.TryParse("naomi@example.com")!, "Naomi", "Laurent", null, "hash", ListingMother.Now);
        var listing = ListingMother.Public("a-listing", "home-property", "A Listing");
        await _factory.Arrange(member, listing);
        return (member.Id, listing.Id);
    }

    private static LinkToken Token(Guid memberId, LinkTokenPurpose purpose, string raw, DateTimeOffset now, TimeSpan lifetime) =>
        LinkToken.Issue(memberId, purpose, LinkTokens.Hash(raw), now, lifetime);

    [Fact]
    public async Task L2_117_links_that_were_valid_when_maintenance_began_are_extended_by_the_length_of_the_window_once()
    {
        var (memberId, listingId) = await Seed();
        var now = _factory.Clock.GetUtcNow();
        var confirm = Token(memberId, LinkTokenPurpose.EmailConfirmation, "confirm", now, LinkToken.EmailConfirmationLifetime);
        var change = Token(memberId, LinkTokenPurpose.ChangeEmail, "change", now, LinkToken.ChangeEmailLifetime);
        var reset = Token(memberId, LinkTokenPurpose.PasswordReset, "reset", now, LinkToken.PasswordResetLifetime);
        await _factory.Arrange(confirm, change, reset);

        _factory.Maintenance.Enabled = true;
        await Observe();
        _factory.Clock.Advance(TimeSpan.FromHours(3));
        _factory.Maintenance.Off();
        await Observe();

        var window = await Read(db => db.MaintenanceWindows.SingleAsync());
        Assert.Equal(TimeSpan.FromHours(3), window.EndedAt - window.StartedAt);
        Assert.Equal(now + LinkToken.EmailConfirmationLifetime + TimeSpan.FromHours(3), (await Read(db => db.LinkTokens.SingleAsync(t => t.Id == confirm.Id))).ExpiresAt);
        Assert.Equal(now + LinkToken.ChangeEmailLifetime + TimeSpan.FromHours(3), (await Read(db => db.LinkTokens.SingleAsync(t => t.Id == change.Id))).ExpiresAt);
        // A password reset is not one of the links that wait.
        Assert.Equal(now + LinkToken.PasswordResetLifetime, (await Read(db => db.LinkTokens.SingleAsync(t => t.Id == reset.Id))).ExpiresAt);

        // The window was applied once: observing again changes nothing.
        await Observe();
        Assert.Equal(now + LinkToken.EmailConfirmationLifetime + TimeSpan.FromHours(3), (await Read(db => db.LinkTokens.SingleAsync(t => t.Id == confirm.Id))).ExpiresAt);
    }

    [Fact]
    public async Task L2_117_a_link_already_used_or_already_expired_is_not_revived()
    {
        var (memberId, _) = await Seed();
        var now = _factory.Clock.GetUtcNow();
        var used = Token(memberId, LinkTokenPurpose.EmailConfirmation, "used", now, LinkToken.EmailConfirmationLifetime);
        used.Redeem(now);
        var expired = Token(memberId, LinkTokenPurpose.EmailConfirmation, "expired", now.AddDays(-3), LinkToken.EmailConfirmationLifetime);
        await _factory.Arrange(used, expired);

        _factory.Maintenance.Enabled = true;
        await Observe();
        _factory.Clock.Advance(TimeSpan.FromHours(1));
        _factory.Maintenance.Off();
        await Observe();

        Assert.Equal(now + LinkToken.EmailConfirmationLifetime, (await Read(db => db.LinkTokens.SingleAsync(t => t.Id == used.Id))).ExpiresAt);
        Assert.Equal(now.AddDays(-3) + LinkToken.EmailConfirmationLifetime, (await Read(db => db.LinkTokens.SingleAsync(t => t.Id == expired.Id))).ExpiresAt);
    }

    [Fact]
    public async Task L2_117_a_window_records_when_it_began_and_the_time_it_promised()
    {
        var backBy = _factory.Clock.GetUtcNow().AddHours(6);
        _factory.Maintenance.Enabled = true;
        _factory.Maintenance.BackBy = backBy;

        await Observe();
        await Observe();

        var window = await Read(db => db.MaintenanceWindows.SingleAsync());
        Assert.Equal(_factory.Clock.GetUtcNow(), window.StartedAt);
        Assert.Equal(backBy, window.BackBy);
        Assert.Null(window.EndedAt);
    }

    // L2-114 AC2 and AC3, L2-133, L2-132

    [Fact]
    public async Task L2_114_ask_for_access_records_the_address_and_the_member_and_grants_nothing()
    {
        var client = AsJoanna();

        var response = await client.PostAsJsonAsync("/api/help/access-requests", new { url = "/admin/verifications?stage=ready" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var stored = await Read(db => db.AccessRequests.SingleAsync());
        Assert.Equal("member|joanna", stored.MemberSubject);
        Assert.Equal("/admin/verifications?stage=ready", stored.Url);
        // Still refused where it was refused before.
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/verifications")).StatusCode);
    }

    [Fact]
    public async Task L2_114_a_visitor_cannot_ask_for_access_and_nothing_is_stored()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/help/access-requests", new { url = "/admin" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, await Read(db => db.AccessRequests.CountAsync()));
    }

    [Theory]
    [InlineData("https://elsewhere.example/phish")]
    [InlineData("//elsewhere.example")]
    [InlineData("admin")]
    [InlineData("")]
    public async Task L2_126_an_address_that_is_not_a_page_of_jubilee_is_refused(string url)
    {
        var response = await AsJoanna().PostAsJsonAsync("/api/help/access-requests", new { url });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("URL_INVALID", (await Json(response)).GetProperty("errors").GetProperty("url").GetString());
        Assert.Equal(0, await Read(db => db.AccessRequests.CountAsync()));
    }

    [Fact]
    public async Task L2_132_asking_again_with_the_same_key_returns_the_first_answer_without_a_second_request()
    {
        var client = AsJoanna();
        client.DefaultRequestHeaders.Add("Idempotency-Key", "ask-1");

        var first = await Json(await client.PostAsJsonAsync("/api/help/access-requests", new { url = "/admin" }));
        var second = await Json(await client.PostAsJsonAsync("/api/help/access-requests", new { url = "/admin" }));

        Assert.Equal(first.GetProperty("id").GetGuid(), second.GetProperty("id").GetGuid());
        Assert.Equal(1, await Read(db => db.AccessRequests.CountAsync()));
    }

    [Fact]
    public async Task L2_127_the_sixth_request_in_an_hour_is_slowed_down()
    {
        var client = AsJoanna();
        for (var i = 0; i < CreateAccessRequestCommandHandler.PerHour; i++)
        {
            Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/help/access-requests", new { url = $"/admin/{i}" })).StatusCode);
        }

        var response = await client.PostAsJsonAsync("/api/help/access-requests", new { url = "/admin/more" });

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.NotEmpty(response.Headers.GetValues("Retry-After"));
    }

    [Fact]
    public async Task L2_133_a_request_that_sets_fields_it_may_not_is_rejected_and_nothing_is_stored()
    {
        var response = await AsJoanna().PostAsJsonAsync("/api/help/access-requests", new { url = "/admin", role = "admin", granted = true });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, await Read(db => db.AccessRequests.CountAsync()));
    }

    // L2-121 AC2: the app probes this to tell "offline" from "Jubilee is down".

    [Fact]
    public async Task L2_121_the_ping_answers_204_to_anyone_without_reading_data()
    {
        _factory.Database.Unavailable = true;

        var response = await _factory.CreateClient().GetAsync("/api/health/ping");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task L2_121_while_maintenance_is_on_the_ping_says_so()
    {
        _factory.Maintenance.Enabled = true;

        var response = await _factory.CreateClient().GetAsync("/api/health/ping");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("MAINTENANCE", (await Json(response)).GetProperty("code").GetString());
    }
}
