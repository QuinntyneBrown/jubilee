using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Onboarding;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Agreeing again to an updated statement of faith: L2-075 AC3 and AC4. Naomi owns Luzandre.com, live,
// and agreed to the statement of 15 January 2026 when she submitted it. The statement was updated on
// 2 November 2026 (StatementOfFaith.Version), so she has until 2 December 2026. "Now" is
// ListingMother.Now, 10 November 2026.
public sealed class StatementAgreementTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Earlier = "2026-01-15";
    private readonly JubileeApiFactory _factory;
    private Member _naomi = null!;
    private Listing _listing = null!;

    public StatementAgreementTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _naomi = Member.Join(EmailAddress.TryParse("naomi@example.com")!, "Naomi", "Laurent", null, "hash", ListingMother.Now);
        _naomi.ConfirmEmail();
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        _listing.AssignOwner(Subject);
        await _factory.Arrange(_naomi, _listing);
        await Agreed(_listing, Earlier);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private string Subject => _naomi.Id.ToString();

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", Subject);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    /// <summary>Records that the owner agreed to <paramref name="version"/> when the listing was submitted.</summary>
    private Task Agreed(Listing listing, string version) => _factory.WithDb(async db =>
    {
        var submission = ListingSubmission.Record(listing.Id, listing.OwnerId!, Guid.NewGuid().ToString(), [], ListingMother.Now.AddMonths(-10));
        db.ListingSubmissions.Add(submission);
        db.Entry(submission).Property(s => s.StatementVersion).CurrentValue = version;
        await db.SaveChangesAsync();
    });

    private Task<HttpResponseMessage> Agree(HttpClient client, string version = StatementOfFaith.Version) =>
        client.PostAsJsonAsync("/api/statement-of-faith/agreement", new { version });

    private static JsonElement? Due(JsonElement session) =>
        session.TryGetProperty("statementDue", out var due) && due.ValueKind == JsonValueKind.Object ? due : null;

    // L2-075 AC3: an owner whose latest agreement is to an earlier version is asked
    [Fact]
    public async Task L2_075_AC3_the_session_of_an_owner_who_agreed_to_an_earlier_version_says_the_agreement_is_due()
    {
        var session = await Json(await Naomi().GetAsync("/api/session"));

        var due = Due(session) ?? throw new Xunit.Sdk.XunitException("The session carries no statementDue.");
        Assert.Equal("2026-11-02", due.GetProperty("version").GetString());
        Assert.Equal("2026-11-02", due.GetProperty("updatedOn").GetString());
        Assert.Equal("2026-12-02", due.GetProperty("agreeBy").GetString());
        Assert.False(due.GetProperty("overdue").GetBoolean());
        Assert.Equal("Luzandre.com", due.GetProperty("business").GetString());
    }

    // L2-075 AC3: an owner who agreed to the current version, and a member with no agreement, are not asked
    [Fact]
    public async Task L2_075_AC3_an_owner_who_agreed_to_the_current_version_and_a_member_with_no_agreement_are_not_asked()
    {
        await Agreed(_listing, StatementOfFaith.Version);
        Assert.Null(Due(await Json(await Naomi().GetAsync("/api/session"))));

        var joanna = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");
        Assert.Null(Due(await Json(await joanna.GetAsync("/api/session"))));
    }

    // L2-075 AC4: "I agree" records the agreement with the time and the version, once
    [Fact]
    public async Task L2_075_AC4_agreeing_records_the_version_and_the_time_once_and_the_owner_is_not_asked_again()
    {
        var naomi = Naomi();

        var first = await Agree(naomi);
        var again = await Agree(naomi);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        List<StatementAgreement> agreements = [];
        await _factory.WithDb(async db => agreements = await db.StatementAgreements.AsNoTracking().ToListAsync());
        var agreement = Assert.Single(agreements);
        Assert.Equal((Subject, StatementOfFaith.Version, ListingMother.Now), (agreement.OwnerSubject, agreement.Version, agreement.AgreedAt));
        Assert.Null(Due(await Json(await naomi.GetAsync("/api/session"))));
    }

    // L2-075 AC4: an agreement to another version than the current one is refused
    [Fact]
    public async Task L2_075_AC4_an_agreement_to_another_version_is_refused_with_409_STATEMENT_VERSION()
    {
        var response = await Agree(Naomi(), Earlier);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("STATEMENT_VERSION", (await Json(response)).GetProperty("code").GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.StatementAgreements.CountAsync()));
    }

    /// <summary>One instance of the worker reaches the daily job's tick.</summary>
    private async Task<int?> Tick()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(new RunStatementAgreementJobCommand());
    }

    private Task<Listing> Reload(Listing listing) =>
        _factory.Query(db => db.Listings.AsNoTracking().SingleAsync(l => l.Id == listing.Id));

    private Task<List<OutboxMessage>> Mails() =>
        _factory.Query(db => db.OutboxMessages.AsNoTracking().Where(m => m.ToAddress == "naomi@example.com").ToListAsync());

    /// <summary>A second business of Naomi's that she paused herself.</summary>
    private async Task<Listing> PausedByHer()
    {
        var other = ListingMother.Public("laurent-photography", "media", "Laurent Photography");
        other.AssignOwner(Subject);
        other.Pause(ListingMother.Now.AddDays(-3));
        await _factory.Arrange(other);
        return other;
    }

    // L2-075 AC6: within the 30 days the job changes nothing
    [Fact]
    public async Task L2_075_AC6_within_the_30_days_the_daily_job_leaves_the_listing_live()
    {
        _factory.Clock.Advance(TimeSpan.FromDays(22)); // 2 December, the last day to agree

        Assert.Equal(0, await Tick());

        Assert.False((await Reload(_listing)).IsPaused);
        Assert.Empty(await Mails());
    }

    // L2-075 AC6: after 30 days each live listing is paused and the owner e-mailed once per listing
    [Fact]
    public async Task L2_075_AC6_after_30_days_the_daily_job_pauses_each_live_listing_and_e_mails_the_owner_once()
    {
        var hers = await PausedByHer();
        _factory.Clock.Advance(TimeSpan.FromDays(23)); // 3 December

        Assert.Equal(1, await Tick());
        _factory.Clock.Advance(TimeSpan.FromDays(1));
        Assert.Equal(0, await Tick());

        var paused = await Reload(_listing);
        Assert.True(paused.IsPaused);
        Assert.NotNull(paused.StatementLapsedAt);
        Assert.Null((await Reload(hers)).StatementLapsedAt);
        var mail = Assert.Single(await Mails());
        Assert.Equal("Luzandre.com is paused until you agree to the statement of faith", mail.Subject);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com")).StatusCode);
        var due = Due(await Json(await Naomi().GetAsync("/api/session")))!.Value;
        Assert.True(due.GetProperty("overdue").GetBoolean());
    }

    // L2-182 AC1: the job runs at most once a day across instances and records its last success
    [Fact]
    public async Task L2_182_AC1_two_instances_on_the_same_day_run_the_statement_job_once()
    {
        _factory.Clock.Advance(TimeSpan.FromDays(23));

        Assert.Equal(1, await Tick());
        Assert.Null(await Tick());

        var run = Assert.Single(await _factory.Query(db => db.JobRuns.AsNoTracking().ToListAsync()));
        Assert.Equal(("statement-agreement", (DateTimeOffset?)_factory.Clock.GetUtcNow()), (run.Job, run.SucceededAt));
    }

    // L2-096 AC6: "Resume listing" is refused while the agreement is overdue
    [Fact]
    public async Task L2_096_AC6_resume_is_refused_with_409_STATEMENT_AGREEMENT_REQUIRED_while_the_agreement_is_overdue()
    {
        _factory.Clock.Advance(TimeSpan.FromDays(23));
        await Tick();

        var response = await Naomi().PostAsync("/api/my-business/resume", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("STATEMENT_AGREEMENT_REQUIRED", (await Json(response)).GetProperty("code").GetString());
        Assert.True((await Reload(_listing)).IsPaused);
    }

    // L2-075 AC6: agreeing makes each listing the job paused live again at once; one she paused stays paused
    [Fact]
    public async Task L2_075_AC6_agreeing_makes_each_listing_the_job_paused_live_again_without_new_verification()
    {
        var hers = await PausedByHer();
        _factory.Clock.Advance(TimeSpan.FromDays(23));
        await Tick();

        Assert.Equal(HttpStatusCode.NoContent, (await Agree(Naomi())).StatusCode);

        var live = await Reload(_listing);
        Assert.False(live.IsPaused);
        Assert.Null(live.StatementLapsedAt);
        Assert.Equal(ListingStage.Live, live.Stage);
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com")).StatusCode);
        Assert.True((await Reload(hers)).IsPaused);
        Assert.Null(Due(await Json(await Naomi().GetAsync("/api/session"))));
    }

    // L2-075 AC4, L2-133: only a signed-in member records an agreement
    [Fact]
    public async Task L2_075_AC4_a_visitor_cannot_record_an_agreement()
    {
        var response = await Agree(_factory.CreateClient());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
