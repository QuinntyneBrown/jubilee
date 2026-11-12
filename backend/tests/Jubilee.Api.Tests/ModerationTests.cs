using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Moderate reports and feature businesses: L2-063 AC3, L2-105, L2-106, L2-133, L2-150 AC1 and L2-180.
// Joanna reports Legacy Financial, which Trevor owns; Miriam of the verification team resolves the report.
// "Today" is Tuesday 10 November 2026.
public sealed class ModerationTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Joanna = "member|joanna";
    private const string Trevor = "member|trevor";
    private const string Note = "Checked the listing against the report.";

    private readonly JubileeApiFactory _factory;

    public ModerationTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient AsJoanna() => _factory.CreateMemberClient("Joanna Adeyemi", Joanna);

    private HttpClient AsTrevor() => _factory.CreateMemberClient("Trevor Chew", Trevor);

    private HttpClient AsMiriam() => _factory.CreateStaffClient("Miriam Castillo", "member|miriam", "verifier");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private async Task<T> Read<T>(Func<Infrastructure.Persistence.AppDbContext, Task<T>> work)
    {
        T result = default!;
        await _factory.WithDb(async db => result = await work(db));
        return result;
    }

    /// <summary>Legacy Financial is owned by Trevor; Joanna reports it. Returns the report's id.</summary>
    private async Task<Guid> ReportedListing(string description = "The office address on the listing is closed.")
    {
        await _factory.Arrange(OwnedBy(ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial"), Trevor));
        var response = await AsJoanna().PostAsJsonAsync(
            "/api/listings/legacy-financial/reports", new { reason = "misleading", description });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    private static Listing OwnedBy(Listing listing, string owner)
    {
        listing.AssignOwner(owner);
        return listing;
    }

    private static Task<HttpResponseMessage> Act(HttpClient client, Guid id, string kind, string? note = Note, string? text = null) =>
        client.PostAsJsonAsync($"/api/admin/reports/{id}/actions", new { kind, resolutionNote = note, messageText = text });

    private static Task<HttpResponseMessage> Open(HttpClient client, Guid id) =>
        client.PostAsync($"/api/admin/reports/{id}/open", null);

    // L2-105 AC1
    [Fact]
    public async Task L2_105_AC1_a_new_report_is_listed_with_listing_reason_description_reporter_time_and_status()
    {
        var id = await ReportedListing();

        var response = await AsMiriam().GetAsync("/api/admin/reports");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = Assert.Single((await Json(response)).GetProperty("items").EnumerateArray());
        Assert.Equal(id, item.GetProperty("id").GetGuid());
        Assert.Equal("listing", item.GetProperty("type").GetString());
        Assert.Equal("Legacy Financial", item.GetProperty("listing").GetProperty("name").GetString());
        Assert.Equal("legacy-financial", item.GetProperty("listing").GetProperty("slug").GetString());
        Assert.Equal("Misleading", item.GetProperty("reason").GetString());
        Assert.Equal("The office address on the listing is closed.", item.GetProperty("description").GetString());
        Assert.Equal("Joanna Adeyemi", item.GetProperty("reporterName").GetString());
        Assert.Equal("open", item.GetProperty("status").GetString());
        Assert.False(item.GetProperty("overdue").GetBoolean());
        Assert.True(item.TryGetProperty("createdAt", out _));
    }

    // L2-105 AC1: a report of a conversation is listed too
    [Fact]
    public async Task L2_105_AC1_a_reported_conversation_is_listed_with_the_business_and_the_reason()
    {
        var (_, conversation) = await ReportedConversation();

        var item = Assert.Single((await Json(await AsMiriam().GetAsync("/api/admin/reports"))).GetProperty("items").EnumerateArray());

        Assert.Equal(conversation, item.GetProperty("id").GetGuid());
        Assert.Equal("conversation", item.GetProperty("type").GetString());
        Assert.Equal("Legacy Financial", item.GetProperty("listing").GetProperty("name").GetString());
        Assert.Equal("They keep asking me to pay outside Jubilee.", item.GetProperty("description").GetString());
        Assert.Equal("Joanna Adeyemi", item.GetProperty("reporterName").GetString());
    }

    // L2-105 AC1: statuses
    [Fact]
    public async Task L2_105_AC1_opening_a_report_moves_it_to_in_review_and_a_resolved_report_leaves_the_default_list()
    {
        var id = await ReportedListing();
        var miriam = AsMiriam();

        var opened = await Open(miriam, id);

        Assert.Equal(HttpStatusCode.OK, opened.StatusCode);
        Assert.Equal("in-review", (await Json(opened)).GetProperty("status").GetString());
        Assert.Equal("in-review", Assert.Single((await Json(await miriam.GetAsync("/api/admin/reports"))).GetProperty("items").EnumerateArray())
            .GetProperty("status").GetString());

        await Act(miriam, id, "dismiss");

        Assert.Empty((await Json(await miriam.GetAsync("/api/admin/reports"))).GetProperty("items").EnumerateArray());
        var resolved = Assert.Single((await Json(await miriam.GetAsync("/api/admin/reports?status=resolved"))).GetProperty("items").EnumerateArray());
        Assert.Equal("resolved", resolved.GetProperty("status").GetString());
    }

    // L2-105 AC2
    [Fact]
    public async Task L2_105_AC2_dismissing_a_report_resolves_it_with_the_note_and_the_history_shows_it()
    {
        var id = await ReportedListing();
        var miriam = AsMiriam();
        await Open(miriam, id);

        var response = await Act(miriam, id, "dismiss", "The address is current.");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var detail = await Json(response);
        Assert.Equal("resolved", detail.GetProperty("status").GetString());
        Assert.Equal("The address is current.", detail.GetProperty("resolutionNote").GetString());
        var action = Assert.Single(detail.GetProperty("actions").EnumerateArray());
        Assert.Equal("dismiss", action.GetProperty("kind").GetString());
        Assert.Equal("Miriam Castillo", action.GetProperty("by").GetString());
        var listing = await Read(db => db.Listings.SingleAsync());
        Assert.True(PublicListingFilter.IsSatisfiedBy(listing));
    }

    // L2-105 AC2
    [Theory]
    [InlineData("dismiss")]
    [InlineData("message-reporter")]
    [InlineData("message-owner")]
    [InlineData("hold")]
    [InlineData("remove")]
    public async Task L2_105_AC2_an_action_without_a_resolution_note_is_refused_and_changes_nothing(string kind)
    {
        var id = await ReportedListing();

        var response = await Act(AsMiriam(), id, kind, note: "  ", text: "Hello");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("resolutionNote").GetString());
        Assert.Empty(await Read(db => db.ReportActions.ToListAsync()));
        Assert.True(PublicListingFilter.IsSatisfiedBy(await Read(db => db.Listings.SingleAsync())));
    }

    // L2-105 AC2
    [Theory]
    [InlineData("message-reporter")]
    [InlineData("message-owner")]
    public async Task L2_105_AC2_a_message_action_needs_the_message_text(string kind)
    {
        var id = await ReportedListing();

        var response = await Act(AsMiriam(), id, kind, text: " ");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("messageText").GetString());
    }

    // L2-105 AC2
    [Fact]
    public async Task L2_105_AC2_an_unknown_action_is_refused()
    {
        var id = await ReportedListing();

        var response = await Act(AsMiriam(), id, "ban");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    // L2-105 AC2
    [Fact]
    public async Task L2_105_AC2_a_message_to_the_reporter_reaches_them_from_the_verification_team_and_keeps_the_report_in_review()
    {
        var id = await ReportedListing();
        var miriam = AsMiriam();

        var response = await Act(miriam, id, "message-reporter", text: "Thank you. Could you tell us which address you visited?");

        Assert.Equal("in-review", (await Json(response)).GetProperty("status").GetString());
        var item = Assert.Single((await Json(await AsJoanna().GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray());
        Assert.Equal("Message from the Jubilee verification team", item.GetProperty("title").GetString());
        Assert.Equal("Thank you. Could you tell us which address you visited?", item.GetProperty("detail").GetString());
    }

    // L2-105 AC2, AC5
    [Fact]
    public async Task L2_105_AC2_a_message_to_the_owner_reaches_them_in_the_name_of_the_team_and_never_names_the_reporter()
    {
        var id = await ReportedListing();

        await Act(AsMiriam(), id, "message-owner", text: "Please confirm your office address.");

        var notifications = await (await AsTrevor().GetAsync("/api/notifications")).Content.ReadAsStringAsync();
        Assert.Contains("Please confirm your office address.", notifications);
        Assert.Contains("Message from the Jubilee verification team", notifications);
        Assert.DoesNotContain("Joanna", notifications);
        Assert.DoesNotContain(Joanna, notifications);
    }

    // L2-105 AC3
    [Fact]
    public async Task L2_105_AC3_a_listing_on_hold_leaves_public_pages_and_the_owner_is_told_without_the_reporter()
    {
        var id = await ReportedListing();
        var visitor = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await visitor.GetAsync("/api/listings/legacy-financial")).StatusCode);

        var response = await Act(AsMiriam(), id, "hold");

        Assert.Equal("in-review", (await Json(response)).GetProperty("status").GetString());
        Assert.Equal("on-hold", (await Json(response)).GetProperty("listing").GetProperty("state").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await visitor.GetAsync("/api/listings/legacy-financial")).StatusCode);
        var home = await Json(await visitor.GetAsync("/api/directory/home"));
        Assert.DoesNotContain("Legacy Financial", home.GetRawText());
        var notifications = await (await AsTrevor().GetAsync("/api/notifications")).Content.ReadAsStringAsync();
        Assert.Contains("We’ve paused your listing while we look into a report", notifications);
        Assert.DoesNotContain("Joanna", notifications);
    }

    // L2-105 AC2 (the hold can be lifted)
    [Fact]
    public async Task L2_105_AC2_lifting_the_hold_puts_the_listing_back_and_resolves_the_report()
    {
        var id = await ReportedListing();
        var miriam = AsMiriam();
        await Act(miriam, id, "hold");

        var response = await Act(miriam, id, "lift-hold", "Reviewed; the listing is accurate.");

        var detail = await Json(response);
        Assert.Equal("resolved", detail.GetProperty("status").GetString());
        Assert.Equal("live", detail.GetProperty("listing").GetProperty("state").GetString());
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/listings/legacy-financial")).StatusCode);
    }

    // L2-105 AC2
    [Fact]
    public async Task L2_105_AC2_lifting_a_hold_that_is_not_there_is_refused()
    {
        var id = await ReportedListing();

        var response = await Act(AsMiriam(), id, "lift-hold");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("NOT_ON_HOLD", (await Json(response)).GetProperty("code").GetString());
    }

    // L2-105 AC2
    [Fact]
    public async Task L2_105_AC2_removing_a_listing_takes_it_off_every_public_page_and_resolves_the_report()
    {
        var id = await ReportedListing();

        var response = await Act(AsMiriam(), id, "remove", "Not a real business.");

        var detail = await Json(response);
        Assert.Equal("resolved", detail.GetProperty("status").GetString());
        Assert.Equal("removed", detail.GetProperty("listing").GetProperty("state").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/legacy-financial")).StatusCode);
        var notifications = await (await AsTrevor().GetAsync("/api/notifications")).Content.ReadAsStringAsync();
        Assert.DoesNotContain("Joanna", notifications);
    }

    // L2-105 AC2
    [Fact]
    public async Task L2_105_AC2_a_resolved_report_takes_no_more_actions()
    {
        var id = await ReportedListing();
        var miriam = AsMiriam();
        await Act(miriam, id, "dismiss");

        var response = await Act(miriam, id, "hold");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("REPORT_RESOLVED", (await Json(response)).GetProperty("code").GetString());
        Assert.True(PublicListingFilter.IsSatisfiedBy(await Read(db => db.Listings.SingleAsync())));
    }

    // L2-105 AC4
    [Fact]
    public async Task L2_105_AC4_a_report_open_for_more_than_one_business_day_is_overdue()
    {
        var id = await ReportedListing();

        // Tuesday 15:00 + 1 business day = Wednesday 15:00. A fresh staff session each time: an idle one ends after 30 minutes.
        _factory.Clock.Advance(TimeSpan.FromHours(23));
        Assert.False(Assert.Single((await Json(await AsMiriam().GetAsync("/api/admin/reports"))).GetProperty("items").EnumerateArray())
            .GetProperty("overdue").GetBoolean());

        _factory.Clock.Advance(TimeSpan.FromHours(2));
        var miriam = AsMiriam();
        Assert.True(Assert.Single((await Json(await miriam.GetAsync("/api/admin/reports"))).GetProperty("items").EnumerateArray())
            .GetProperty("overdue").GetBoolean());
        Assert.Equal(id, Assert.Single((await Json(await miriam.GetAsync("/api/admin/reports"))).GetProperty("items").EnumerateArray())
            .GetProperty("id").GetGuid());
    }

    // L2-105 AC4: weekends do not count
    [Fact]
    public async Task L2_105_AC4_a_report_made_on_a_friday_is_not_overdue_over_the_weekend()
    {
        _factory.Clock.Advance(TimeSpan.FromDays(3)); // Friday 13 November, 15:00
        await ReportedListing();

        _factory.Clock.Advance(TimeSpan.FromDays(2) + TimeSpan.FromHours(20)); // Sunday night

        Assert.False(Assert.Single((await Json(await AsMiriam().GetAsync("/api/admin/reports"))).GetProperty("items").EnumerateArray())
            .GetProperty("overdue").GetBoolean());

        _factory.Clock.Advance(TimeSpan.FromDays(1)); // Monday 15 November, after Friday + 1 business day

        Assert.True(Assert.Single((await Json(await AsMiriam().GetAsync("/api/admin/reports"))).GetProperty("items").EnumerateArray())
            .GetProperty("overdue").GetBoolean());
    }

    // L2-105 AC5
    [Fact]
    public async Task L2_105_AC5_the_owner_never_sees_who_reported_the_listing()
    {
        await ReportedListing();
        var trevor = AsTrevor();

        foreach (var url in new[] { "/api/notifications", "/api/listings/legacy-financial", "/api/me/navigation" })
        {
            var text = await (await trevor.GetAsync(url)).Content.ReadAsStringAsync();
            Assert.DoesNotContain("Joanna", text);
            Assert.DoesNotContain(Joanna, text);
        }

        Assert.Equal(HttpStatusCode.Forbidden, (await trevor.GetAsync("/api/admin/reports")).StatusCode);
    }

    // L2-098 AC5 applied to reports
    [Fact]
    public async Task L2_098_AC5_a_verifier_cannot_act_on_a_report_of_their_own_listing()
    {
        await _factory.Arrange(OwnedBy(ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial"), "member|miriam"));
        var created = await AsJoanna().PostAsJsonAsync("/api/listings/legacy-financial/reports", new { reason = "other", description = "x" });
        var id = (await Json(created)).GetProperty("id").GetGuid();

        var response = await Act(AsMiriam(), id, "dismiss");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(response)).GetProperty("code").GetString());
    }

    // L2-133 AC1, AC5, L2-098 AC1
    [Fact]
    public async Task L2_133_a_member_without_the_verifier_role_is_refused_by_every_report_endpoint()
    {
        var id = await ReportedListing();
        var joanna = AsJoanna();

        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.GetAsync("/api/admin/reports")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Open(joanna, id)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Act(joanna, id, "dismiss")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/admin/reports")).StatusCode);
        Assert.Empty(await Read(db => db.ReportActions.ToListAsync()));
    }

    // L2-133 AC4: no mass assignment
    [Fact]
    public async Task L2_133_AC4_an_action_with_fields_the_caller_may_not_set_is_rejected()
    {
        var id = await ReportedListing();

        var response = await AsMiriam().PostAsJsonAsync(
            $"/api/admin/reports/{id}/actions", new { kind = "dismiss", resolutionNote = Note, status = "resolved", listingId = Guid.NewGuid() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await Read(db => db.ReportActions.ToListAsync()));
    }

    [Fact]
    public async Task L2_105_a_report_that_does_not_exist_is_not_found()
    {
        var response = await Open(AsMiriam(), Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // L2-150 AC1, L2-180 AC1
    [Fact]
    public async Task L2_150_AC1_opening_a_report_is_audited_with_the_report_as_the_reason()
    {
        var id = await ReportedListing();

        await Open(AsMiriam(), id);

        var record = Assert.Single(await Read(db => db.AuditRecords.ToListAsync()));
        Assert.Equal("report.opened", record.Action);
        Assert.Equal("member|miriam", record.Actor);
        Assert.Equal("Miriam Castillo", record.ActorName);
        Assert.Equal($"Report {id}", record.Reason);
        Assert.Equal(id.ToString(), record.TargetId);
    }

    // L2-180 AC1
    [Fact]
    public async Task L2_180_AC1_every_report_action_is_audited_with_before_and_after_and_the_note()
    {
        var id = await ReportedListing();
        var miriam = AsMiriam();

        await Act(miriam, id, "hold", "Under review.");
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        await Act(miriam, id, "remove", "Confirmed false.");

        var records = (await Read(db => db.AuditRecords.OrderBy(a => a.At).ToListAsync())).Where(a => a.Action != "report.opened").ToList();
        Assert.Equal(["listing.held", "listing.removed"], records.Select(r => r.Action).ToArray());
        Assert.Equal("Under review.", records[0].Reason);
        Assert.Equal("live", records[0].Before);
        Assert.Equal("on-hold", records[0].After);
        Assert.Equal("Confirmed false.", records[1].Reason);
        Assert.Equal("on-hold", records[1].Before);
        Assert.Equal("removed", records[1].After);
        Assert.All(records, r => Assert.Equal("member|miriam", r.Actor));
    }

    // L2-063 AC3, L2-150 AC1
    [Fact]
    public async Task L2_063_AC3_a_reported_conversation_is_read_only_through_its_open_report_and_the_access_is_audited()
    {
        var (_, id) = await ReportedConversation();

        var response = await Open(AsMiriam(), id);

        var detail = await Json(response);
        var messages = detail.GetProperty("conversation").GetProperty("messages").EnumerateArray().ToList();
        Assert.Equal(2, messages.Count);
        Assert.Equal("Could we settle this outside Jubilee?", messages[0].GetProperty("body").GetString());
        var record = Assert.Single(await Read(db => db.AuditRecords.ToListAsync()));
        Assert.Equal("conversation.viewed", record.Action);
        Assert.Equal($"Report {id}", record.Reason);
    }

    // L2-063 AC3
    [Fact]
    public async Task L2_063_AC3_once_a_report_is_resolved_staff_can_no_longer_read_the_conversation()
    {
        var (_, id) = await ReportedConversation();
        var miriam = AsMiriam();
        await Open(miriam, id);
        await Act(miriam, id, "dismiss");

        var detail = await Json(await Open(miriam, id));

        Assert.Equal(JsonValueKind.Null, detail.GetProperty("conversation").ValueKind);
    }

    // L2-063 AC3: nothing in the admin API reads a conversation that has no report
    [Fact]
    public async Task L2_063_AC3_a_conversation_without_a_report_cannot_be_read_by_staff()
    {
        var (conversation, _) = await ReportedConversation();

        var response = await Open(AsMiriam(), conversation);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Empty(await Read(db => db.AuditRecords.ToListAsync()));
    }

    /// <summary>Joanna's conversation with Legacy Financial and her report of it. Returns (conversation id, report id).</summary>
    private async Task<(Guid Conversation, Guid Report)> ReportedConversation()
    {
        var listing = OwnedBy(ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial"), Trevor);
        await _factory.Arrange(listing);
        var conversation = Conversation.Start(listing.Id, Joanna, "Joanna Adeyemi", ListingMother.Now);
        var first = Message.Send(conversation.Id, Trevor, "Trevor Chew", true, "Could we settle this outside Jubilee?", "k1", null, false, ListingMother.Now);
        var second = Message.Send(conversation.Id, Joanna, "Joanna Adeyemi", false, "No, I would rather stay here.", "k2", null, false, ListingMother.Now.AddMinutes(1));
        await _factory.WithDb(async db =>
        {
            db.Conversations.Add(conversation);
            db.Messages.AddRange(first, second);
            await db.SaveChangesAsync();
        });
        var reported = await AsJoanna().PostAsJsonAsync(
            $"/api/conversations/{conversation.Id}/report", new { reason = "They keep asking me to pay outside Jubilee.", block = false });
        Assert.True(reported.IsSuccessStatusCode, await reported.Content.ReadAsStringAsync());
        var report = await Read(db => db.ConversationReports.SingleAsync());
        return (conversation.Id, report.Id);
    }

    // L2-106 AC1
    [Fact]
    public async Task L2_106_AC1_a_verifier_chooses_up_to_five_live_listings_and_they_show_on_the_browse_home_from_the_start_date()
    {
        var names = new[] { "Alpha", "Bravo", "Charlie", "Delta", "Echo" };
        var ids = new List<Guid>();
        foreach (var name in names)
        {
            var listing = ListingMother.Public(name.ToLowerInvariant(), "home-property", name);
            await _factory.Arrange(listing);
            ids.Add(listing.Id);
        }

        var response = await AsMiriam().PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = ids.AsEnumerable().Reverse() });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var week = await Json(response);
        Assert.Equal("2026-11-10", week.GetProperty("startDate").GetString());
        Assert.Equal("2026-11-16", week.GetProperty("endDate").GetString());
        Assert.Equal(names.Reverse(), week.GetProperty("listings").EnumerateArray().Select(l => l.GetProperty("name").GetString()!).ToArray());
        var home = await Json(await _factory.CreateClient().GetAsync("/api/directory/home"));
        Assert.Equal(names.Reverse(), home.GetProperty("featured").EnumerateArray().Select(l => l.GetProperty("name").GetString()!).ToArray());
    }

    // L2-106 AC1: from the start date, for seven days; outside it the pages show the newest verified listings
    [Fact]
    public async Task L2_106_AC1_the_selection_shows_from_its_start_date_for_seven_days()
    {
        var featured = ListingMother.Public("alpha", "home-property", "Alpha", approvedAt: ListingMother.Now.AddDays(-10));
        var newest = ListingMother.Public("bravo", "home-property", "Bravo");
        await _factory.Arrange(featured, newest);
        await AsMiriam().PutAsJsonAsync("/api/admin/featured-weeks/2026-11-12", new { listingIds = new[] { featured.Id } });
        var visitor = _factory.CreateClient();

        Assert.Equal(["Bravo", "Alpha"], await FeaturedNames(visitor));
        _factory.Clock.Advance(TimeSpan.FromDays(2));
        Assert.Equal(["Alpha"], await FeaturedNames(visitor));
        _factory.Clock.Advance(TimeSpan.FromDays(6));
        Assert.Equal(["Alpha"], await FeaturedNames(visitor));
        _factory.Clock.Advance(TimeSpan.FromDays(1));
        Assert.Equal(["Bravo", "Alpha"], await FeaturedNames(visitor));
    }

    // L2-106 AC1
    [Fact]
    public async Task L2_106_AC1_more_than_five_listings_are_refused()
    {
        var ids = new List<Guid>();
        for (var i = 0; i < 6; i++)
        {
            var listing = ListingMother.Public($"biz-{i}", "home-property", $"Biz {i}");
            await _factory.Arrange(listing);
            ids.Add(listing.Id);
        }

        var response = await AsMiriam().PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = ids });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("TOO_MANY", (await Json(response)).GetProperty("errors").GetProperty("listingIds").GetString());
        Assert.Empty(await Read(db => db.FeaturedSlots.ToListAsync()));
    }

    // L2-106 AC1
    [Fact]
    public async Task L2_106_AC1_a_duplicate_or_a_listing_that_is_not_live_is_refused()
    {
        var live = ListingMother.Public("alpha", "home-property", "Alpha");
        var paused = ListingMother.NonPublic(NonPublicState.Paused, "paused");
        await _factory.Arrange(live, paused);
        var miriam = AsMiriam();

        var duplicate = await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { live.Id, live.Id } });
        var notLive = await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { live.Id, paused.Id } });
        var unknown = await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { Guid.NewGuid() } });

        Assert.Equal("DUPLICATE", (await Json(duplicate)).GetProperty("errors").GetProperty("listingIds").GetString());
        Assert.Equal("NOT_LIVE", (await Json(notLive)).GetProperty("errors").GetProperty("listingIds").GetString());
        Assert.Equal("NOT_LIVE", (await Json(unknown)).GetProperty("errors").GetProperty("listingIds").GetString());
        Assert.Empty(await Read(db => db.FeaturedSlots.ToListAsync()));
    }

    // L2-106 (decision: ADR 0033)
    [Fact]
    public async Task L2_106_a_start_date_in_the_past_or_overlapping_another_week_is_refused()
    {
        var live = ListingMother.Public("alpha", "home-property", "Alpha");
        await _factory.Arrange(live);
        var miriam = AsMiriam();

        var past = await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-09", new { listingIds = new[] { live.Id } });
        await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-12", new { listingIds = new[] { live.Id } });
        var overlap = await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-15", new { listingIds = new[] { live.Id } });
        var next = await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-19", new { listingIds = new[] { live.Id } });

        Assert.Equal("START_IN_PAST", (await Json(past)).GetProperty("errors").GetProperty("startDate").GetString());
        Assert.Equal("WEEK_OVERLAPS", (await Json(overlap)).GetProperty("errors").GetProperty("startDate").GetString());
        Assert.Equal(HttpStatusCode.OK, next.StatusCode);
    }

    // L2-106 AC1: the PUT replaces the week, so a repeat has no further effect
    [Fact]
    public async Task L2_106_AC1_saving_a_week_again_replaces_it()
    {
        var alpha = ListingMother.Public("alpha", "home-property", "Alpha");
        var bravo = ListingMother.Public("bravo", "home-property", "Bravo");
        await _factory.Arrange(alpha, bravo);
        var miriam = AsMiriam();

        await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { alpha.Id, bravo.Id } });
        await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { bravo.Id } });
        await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { bravo.Id } });

        var slot = Assert.Single(await Read(db => db.FeaturedSlots.ToListAsync()));
        Assert.Equal(bravo.Id, slot.ListingId);
        var week = Assert.Single((await Json(await miriam.GetAsync("/api/admin/featured"))).GetProperty("weeks").EnumerateArray());
        Assert.Equal(["Bravo"], week.GetProperty("listings").EnumerateArray().Select(l => l.GetProperty("name").GetString()!).ToArray());
    }

    // L2-106 AC2
    [Fact]
    public async Task L2_106_AC2_a_featured_listing_that_is_paused_or_removed_is_skipped_and_returns_when_live_again()
    {
        var alpha = ListingMother.Public("alpha", "home-property", "Alpha");
        var bravo = ListingMother.Public("bravo", "home-property", "Bravo");
        await _factory.Arrange(alpha, bravo);
        await AsMiriam().PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { alpha.Id, bravo.Id } });
        var visitor = _factory.CreateClient();

        await _factory.WithDb(async db =>
        {
            (await db.Listings.SingleAsync(l => l.Slug == "alpha")).Pause();
            await db.SaveChangesAsync();
        });
        Assert.Equal(["Bravo"], await FeaturedNames(visitor));

        await _factory.WithDb(async db =>
        {
            (await db.Listings.SingleAsync(l => l.Slug == "alpha")).Resume();
            await db.SaveChangesAsync();
        });
        Assert.Equal(["Alpha", "Bravo"], await FeaturedNames(visitor));
    }

    private static async Task<string[]> FeaturedNames(HttpClient client) =>
        (await Json(await client.GetAsync("/api/directory/home"))).GetProperty("featured").EnumerateArray()
            .Select(l => l.GetProperty("name").GetString()!).ToArray();

    // L2-106: what the admin page needs
    [Fact]
    public async Task L2_106_the_candidates_are_live_public_listings_that_match_the_search()
    {
        await _factory.Arrange(
            ListingMother.Public("alpha", "home-property", "Alpha Plumbing"),
            ListingMother.Public("bravo", "home-property", "Bravo Bakery"),
            ListingMother.NonPublic(NonPublicState.Paused, "paused"));

        var all = await Json(await AsMiriam().GetAsync("/api/admin/featured/candidates"));
        var some = await Json(await AsMiriam().GetAsync("/api/admin/featured/candidates?q=bakery"));

        Assert.Equal(2, all.GetProperty("items").GetArrayLength());
        Assert.Equal("Bravo Bakery", Assert.Single(some.GetProperty("items").EnumerateArray()).GetProperty("name").GetString());
    }

    // L2-180 AC1
    [Fact]
    public async Task L2_180_AC1_a_featured_selection_is_audited_with_before_and_after()
    {
        var alpha = ListingMother.Public("alpha", "home-property", "Alpha");
        var bravo = ListingMother.Public("bravo", "home-property", "Bravo");
        await _factory.Arrange(alpha, bravo);
        var miriam = AsMiriam();

        await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { alpha.Id } });
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        await miriam.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { bravo.Id } });

        var records = await Read(db => db.AuditRecords.OrderBy(a => a.At).ToListAsync());
        Assert.Equal(2, records.Count);
        Assert.All(records, r => Assert.Equal("featured.set", r.Action));
        Assert.All(records, r => Assert.Equal("2026-11-10", r.TargetId));
        Assert.Equal("", records[0].Before);
        Assert.Equal("Alpha", records[0].After);
        Assert.Equal("Alpha", records[1].Before);
        Assert.Equal("Bravo", records[1].After);
    }

    // L2-133 AC1, AC5
    [Fact]
    public async Task L2_133_a_member_without_the_verifier_role_is_refused_by_every_featured_endpoint()
    {
        var alpha = ListingMother.Public("alpha", "home-property", "Alpha");
        await _factory.Arrange(alpha);
        var joanna = AsJoanna();

        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.GetAsync("/api/admin/featured")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.GetAsync("/api/admin/featured/candidates")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await joanna.PutAsJsonAsync("/api/admin/featured-weeks/2026-11-10", new { listingIds = new[] { alpha.Id } })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/admin/featured")).StatusCode);
        Assert.Empty(await Read(db => db.FeaturedSlots.ToListAsync()));
    }
}
