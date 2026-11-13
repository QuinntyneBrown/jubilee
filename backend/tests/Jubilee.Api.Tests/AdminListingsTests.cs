using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// The Jubilee team's listings and the takedown: L2-098 to L2-101 and L2-180 (ADR 0057). Nobody verifies a
// listing before it goes live; the team looks through what was published and takes down a listing that
// misrepresents a business. Naomi owns Luzandre.com; Miriam is on the Jubilee team. "Today" is Tuesday
// 10 November 2026 (ListingMother.Now).
public sealed class AdminListingsTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;
    private Member _naomi = default!;
    private Listing _luzandre = default!;

    public AdminListingsTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _naomi = Member.Join(EmailAddress.TryParse("naomi@example.com")!, "Naomi", "Laurent", null, "hash", ListingMother.Now.AddMonths(-5));
        _naomi.ConfirmEmail();
        _luzandre = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", ListingMother.Now.AddDays(-2));
        _luzandre.AssignOwner(_naomi.Id.ToString());
        await _factory.Arrange(
            _naomi,
            _luzandre,
            ListingSubmission.Record(_luzandre.Id, _naomi.Id.ToString(), "k-luzandre", ["CONTACT_IN_TEXT"], ListingMother.Now.AddDays(-2)));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Miriam() => _factory.CreateStaffClient("Miriam Castillo", "staff|miriam", "moderator");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private Task<HttpResponseMessage> TakeDown(HttpClient client, Guid id, string? reason = "The shop sells counterfeit goods.") =>
        client.PostAsJsonAsync($"/api/admin/listings/{id}/take-down", new { reason });

    // L2-099 AC1, AC2: every published listing, newest first, with its status and the week's count
    [Fact]
    public async Task L2_099_AC1_AC2_the_list_counts_the_published_listings_and_orders_them_newest_first()
    {
        var older = ListingMother.Public("old-bakery", "shops", "Old Bakery", ListingMother.Now.AddDays(-30));
        var paused = ListingMother.Public("quiet-tutor", "learning", "Quiet Tutor", ListingMother.Now.AddDays(-1));
        paused.Pause(ListingMother.Now);
        var held = ListingMother.Public("held-co", "shops", "Held Co", ListingMother.Now.AddDays(-20));
        held.PlaceModerationHold();
        var draft = ListingMother.NonPublic(NonPublicState.Draft, "a-draft", "shops");
        var deleted = ListingMother.NonPublic(NonPublicState.Deleted, "gone-co", "shops");
        await _factory.Arrange(older, paused, held, draft, deleted);

        var list = await Json(await Miriam().GetAsync("/api/admin/listings"));

        Assert.Equal(4, list.GetProperty("total").GetInt32());
        Assert.Equal(2, list.GetProperty("publishedThisWeek").GetInt32());
        var rows = list.GetProperty("rows").EnumerateArray().ToList();
        Assert.Equal(
            ["Quiet Tutor|paused|Paused", "Luzandre.com|live|Live", "Held Co|on-hold|On hold", "Old Bakery|live|Live"],
            rows.Select(r => $"{r.GetProperty("name").GetString()}|{r.GetProperty("status").GetString()}|{r.GetProperty("statusLabel").GetString()}"));
        var luzandre = rows[1];
        Assert.Equal("Shops", luzandre.GetProperty("categoryName").GetString());
        Assert.Equal("Naomi Laurent", luzandre.GetProperty("ownerName").GetString());
        Assert.Equal(ListingMother.Now.AddDays(-2), luzandre.GetProperty("publishedAt").GetDateTimeOffset());
        Assert.True(luzandre.GetProperty("flagged").GetBoolean());
        Assert.False(rows[0].GetProperty("flagged").GetBoolean());
    }

    // L2-099 AC3: a search by business name
    [Fact]
    public async Task L2_099_AC3_a_search_by_name_keeps_the_matching_listings()
    {
        await _factory.Arrange(ListingMother.Public("old-bakery", "shops", "Old Bakery"));

        var found = await Json(await Miriam().GetAsync("/api/admin/listings?q=luzan"));
        var none = await Json(await Miriam().GetAsync("/api/admin/listings?q=plumber"));

        Assert.Equal(["Luzandre.com"], found.GetProperty("rows").EnumerateArray().Select(r => r.GetProperty("name").GetString()));
        Assert.Empty(none.GetProperty("rows").EnumerateArray());
        Assert.Equal(2, none.GetProperty("total").GetInt32());
    }

    // L2-100 AC1 to AC3: one listing with its owner and flags, naming no third party
    [Fact]
    public async Task L2_100_AC1_one_listing_shows_its_owner_its_flags_and_where_it_stands()
    {
        var other = ListingMother.Public("laurent-photography", "media", "Laurent Photography");
        other.AssignOwner(_naomi.Id.ToString());
        await _factory.Arrange(other);
        var naomi = _factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString());
        await naomi.PostAsJsonAsync("/api/listing-drafts", new { kind = "services", name = "Laurent Studio", agreed = false });

        var listing = await Json(await Miriam().GetAsync($"/api/admin/listings/{_luzandre.Id}"));

        Assert.Equal("Luzandre.com", listing.GetProperty("name").GetString());
        Assert.Equal("Shops", listing.GetProperty("categoryName").GetString());
        Assert.Equal("live", listing.GetProperty("status").GetString());
        Assert.Equal(ListingMother.Now.AddDays(-2), listing.GetProperty("publishedAt").GetDateTimeOffset());
        var owner = listing.GetProperty("owner");
        Assert.Equal("Naomi Laurent", owner.GetProperty("name").GetString());
        Assert.Equal("naomi@example.com", owner.GetProperty("email").GetString());
        Assert.True(owner.GetProperty("emailConfirmed").GetBoolean());
        // L2-079 AC3: the owner's other listings, then their drafts, each with its stage
        Assert.Equal(
            ["Laurent Photography|Live", "Laurent Studio|Draft"],
            owner.GetProperty("otherListings").EnumerateArray().Select(l => $"{l.GetProperty("name").GetString()}|{l.GetProperty("stageLabel").GetString()}"));
        Assert.Equal(["CONTACT_IN_TEXT"], listing.GetProperty("flags").EnumerateArray().Select(f => f.GetString()));
        Assert.Equal(JsonValueKind.Null, listing.GetProperty("takenDown").ValueKind);
        var text = listing.GetRawText();
        Assert.DoesNotContain("church", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("checklist", text, StringComparison.OrdinalIgnoreCase);
    }

    // L2-150 AC1, L2-180 AC1: opening a listing reads the owner's personal data, so each opening is audited
    [Fact]
    public async Task L2_150_AC1_opening_a_listing_records_the_access_to_the_owner_with_the_listing_as_the_reason()
    {
        await Miriam().GetAsync($"/api/admin/listings/{_luzandre.Id}");
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        await Miriam().GetAsync($"/api/admin/listings/{_luzandre.Id}");

        await _factory.WithDb(async db =>
        {
            var records = await db.AuditRecords.AsNoTracking().Where(a => a.Action == "owner.viewed").OrderBy(a => a.At).ToListAsync();
            Assert.Equal(2, records.Count);
            Assert.All(records, record =>
            {
                Assert.Equal("staff|miriam", record.Actor);
                Assert.Equal("Miriam Castillo", record.ActorName);
                Assert.Equal("member", record.TargetType);
                Assert.Equal(_naomi.Id.ToString(), record.TargetId);
                Assert.Equal($"Listing {_luzandre.Id}", record.Reason);
            });
            Assert.Equal([ListingMother.Now, ListingMother.Now.AddMinutes(5)], records.Select(r => r.At));
        });
    }

    // L2-150 AC1: a listing that cannot be opened reads nobody's data
    [Fact]
    public async Task L2_150_AC1_a_listing_that_is_not_found_records_no_access()
    {
        await Miriam().GetAsync($"/api/admin/listings/{Guid.NewGuid()}");

        await _factory.WithDb(async db => Assert.Equal(0, await db.AuditRecords.CountAsync()));
    }

    // L2-100: an unknown listing, or a draft, is not one of the published listings
    [Fact]
    public async Task L2_100_a_draft_or_an_unknown_listing_is_not_found()
    {
        var draft = ListingMother.NonPublic(NonPublicState.Draft, "a-draft", "shops");
        await _factory.Arrange(draft);

        Assert.Equal(HttpStatusCode.NotFound, (await Miriam().GetAsync($"/api/admin/listings/{draft.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Miriam().GetAsync($"/api/admin/listings/{Guid.NewGuid()}")).StatusCode);
    }

    // L2-101 AC3, AC5, AC7: the listing leaves Jubilee, the owner is told why and the takedown is audited
    [Fact]
    public async Task L2_101_AC3_taking_down_a_listing_removes_it_tells_the_owner_and_is_audited()
    {
        var response = await TakeDown(Miriam(), _luzandre.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("taken-down", body.GetProperty("status").GetString());
        var takenDown = body.GetProperty("takenDown");
        Assert.Equal("Miriam Castillo", takenDown.GetProperty("byName").GetString());
        Assert.Equal("The shop sells counterfeit goods.", takenDown.GetProperty("reason").GetString());
        Assert.Equal(ListingMother.Now, takenDown.GetProperty("at").GetDateTimeOffset());
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com")).StatusCode);
        Assert.Equal(0, (await _factory.GetJson("/api/categories/shops/listings")).GetProperty("totalCount").GetInt32());
        await _factory.WithDb(async db =>
        {
            var notice = await db.Notifications.AsNoTracking().SingleAsync(n => n.MemberSubject == _naomi.Id.ToString());
            Assert.Equal("We’ve taken down Luzandre.com", notice.Title);
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "naomi@example.com");
            Assert.Equal("We’ve taken down Luzandre.com", mail.Subject);
            Assert.Contains("The shop sells counterfeit goods.", mail.TextBody);
            var audit = await db.AuditRecords.AsNoTracking().SingleAsync(a => a.Action == "listing.taken-down");
            Assert.Equal(_luzandre.Id.ToString(), audit.TargetId);
            Assert.Equal("Miriam Castillo", audit.ActorName);
            Assert.Equal("The shop sells counterfeit goods.", audit.Reason);
        });
        var overview = await Json(await _factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString()).GetAsync("/api/my-business"));
        Assert.Equal("none", overview.GetProperty("state").GetString());
    }

    // L2-100 AC5: a listing taken down says when, by whom and why
    [Fact]
    public async Task L2_100_AC5_a_listing_taken_down_still_opens_and_says_who_took_it_down_and_why()
    {
        await TakeDown(Miriam(), _luzandre.Id);

        var listing = await Json(await Miriam().GetAsync($"/api/admin/listings/{_luzandre.Id}"));
        var list = await Json(await Miriam().GetAsync("/api/admin/listings"));

        Assert.Equal("taken-down", listing.GetProperty("status").GetString());
        Assert.Equal("Miriam Castillo", listing.GetProperty("takenDown").GetProperty("byName").GetString());
        Assert.Empty(list.GetProperty("rows").EnumerateArray());
    }

    // L2-101 AC2: a reason is required, and is at most 1,000 characters
    [Theory]
    [InlineData(null, "REQUIRED")]
    [InlineData("   ", "REQUIRED")]
    [InlineData("TOO_LONG", "TOO_LONG")]
    public async Task L2_101_AC2_a_takedown_without_a_reason_is_refused_and_nothing_changes(string? reason, string code)
    {
        var response = await TakeDown(Miriam(), _luzandre.Id, reason == "TOO_LONG" ? new string('x', 1001) : reason);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Contains(code, await response.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com")).StatusCode);
    }

    // L2-101 AC6: a second takedown changes nothing
    [Fact]
    public async Task L2_101_AC6_a_second_takedown_is_a_409()
    {
        await TakeDown(Miriam(), _luzandre.Id);

        var again = await TakeDown(Miriam(), _luzandre.Id);

        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal("ALREADY_TAKEN_DOWN", (await Json(again)).GetProperty("code").GetString());
        await _factory.WithDb(async db => Assert.Equal(1, await db.AuditRecords.CountAsync(a => a.Action == "listing.taken-down")));
    }

    // L2-098 AC5, L2-101 AC6: nobody takes down their own listing
    [Fact]
    public async Task L2_098_AC5_a_member_of_the_team_cannot_take_down_their_own_listing()
    {
        var own = _factory.CreateStaffClient("Naomi Laurent", _naomi.Id.ToString(), "moderator");

        var listing = await Json(await own.GetAsync($"/api/admin/listings/{_luzandre.Id}"));
        var response = await TakeDown(own, _luzandre.Id);

        Assert.True(listing.GetProperty("isOwnListing").GetBoolean());
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(response)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com")).StatusCode);
    }

    // L2-180 AC3: an administrator finds the takedown in the audit log
    [Fact]
    public async Task L2_180_AC3_an_admin_finds_a_takedown_by_actor_target_and_date()
    {
        await TakeDown(Miriam(), _luzandre.Id);
        var admin = _factory.CreateStaffClient("Daniel Osei", "staff|daniel", "admin");

        var byTarget = await Json(await admin.GetAsync($"/api/admin/audit?target={_luzandre.Id}"));
        var byActor = await Json(await admin.GetAsync("/api/admin/audit?actor=Miriam"));
        var before = await Json(await admin.GetAsync($"/api/admin/audit?to={Uri.EscapeDataString(ListingMother.Now.AddDays(-1).ToString("O"))}"));

        Assert.Equal("listing.taken-down", byTarget[0].GetProperty("action").GetString());
        Assert.Equal("listing.taken-down", byActor[0].GetProperty("action").GetString());
        Assert.Empty(before.EnumerateArray());
    }
}
