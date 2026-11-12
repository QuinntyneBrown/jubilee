using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

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

    // L2-075 AC4, L2-133: only a signed-in member records an agreement
    [Fact]
    public async Task L2_075_AC4_a_visitor_cannot_record_an_agreement()
    {
        var response = await Agree(_factory.CreateClient());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
