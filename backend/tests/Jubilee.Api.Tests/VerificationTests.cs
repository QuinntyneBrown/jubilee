using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Verification;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Verify a listing: L2-098 to L2-104, L2-143, L2-146, L2-150 and L2-180. Naomi lists Luzandre.com, her
// pastor vouches, and Esther of the verification team reviews it. "Today" is Tuesday 10 November 2026.
public sealed partial class VerificationTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public VerificationTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [GeneratedRegex(@"/reference/([0-9a-f]+)")]
    private static partial Regex TokenInMail();

    // A fresh staff session each time: a staff session ends after 30 minutes without a request (L2-190),
    // and these tests move the clock by days.
    private HttpClient Esther => _factory.CreateStaffClient("Esther Mensah", "member|esther", "verifier");

    private HttpClient Admin => _factory.CreateStaffClient("Ada Admin", "member|ada", "admin");

    private sealed record Submitted(Guid Id, HttpClient Owner, string Token, string OwnerEmail);

    private async Task<Submitted> Submit(
        string business = "Luzandre.com", string first = "Naomi", string tagline = "Christian apparel and gifts", string category = "shops")
    {
        var email = $"{first.ToLowerInvariant()}.{business.ToLowerInvariant().Replace(".", string.Empty).Replace(" ", string.Empty)}@example.com";
        var pastor = $"pastor.{business.ToLowerInvariant().Replace(".", string.Empty).Replace(" ", string.Empty)}@church.example";
        var owner = Member.Join(EmailAddress.TryParse(email)!, first, "Laurent", null, "hash", ListingMother.Now);
        owner.ConfirmEmail();
        await _factory.WithDb(async db =>
        {
            db.Members.Add(owner);
            await db.SaveChangesAsync();
        });
        var client = _factory.CreateMemberClient($"{first} Laurent", owner.Id.ToString());
        var body = new Dictionary<string, object?>
        {
            ["kind"] = category == "shops" ? "products" : "services",
            ["name"] = business,
            ["tagline"] = tagline,
            ["categorySlug"] = category,
            ["highlight"] = null,
            ["place"] = "Toronto",
            ["church"] = "Grace Toronto Church",
            ["pastorEmail"] = pastor,
            ["agreed"] = true,
            ["items"] = Array.Empty<object>(),
            ["idempotencyKey"] = Guid.NewGuid().ToString(),
        };
        var draft = await client.PostAsJsonAsync("/api/listing-drafts", body);
        var draftId = (await Json(draft)).GetProperty("id").GetGuid();
        var submitted = await client.PostAsJsonAsync($"/api/listing-drafts/{draftId}/submit", body);
        Assert.Equal(HttpStatusCode.Created, submitted.StatusCode);
        var id = (await Json(submitted)).GetProperty("listingId").GetGuid();
        string token = string.Empty;
        await _factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == pastor);
            token = TokenInMail().Match(mail.TextBody).Groups[1].Value;
        });
        return new Submitted(id, client, token, email);
    }

    private async Task Answer(Submitted listing, string answer = "vouches", string note = "Naomi has served on our hospitality team for six years.")
    {
        var response = await _factory.CreateClient().PostAsJsonAsync(
            "/api/reference-requests/answer",
            new { token = listing.Token, answer, name = "Daniel Okoro", role = "Lead pastor", note });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private async Task<Submitted> Ready(string business = "Luzandre.com", string first = "Naomi", string tagline = "Christian apparel and gifts")
    {
        var listing = await Submit(business, first, tagline);
        await Answer(listing);
        return listing;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private async Task<ListingStage> StageOf(Guid id)
    {
        var stage = default(ListingStage);
        await _factory.WithDb(async db => stage = (await db.Listings.AsNoTracking().SingleAsync(l => l.Id == id)).Stage);
        return stage;
    }

    private Task<HttpResponseMessage> Post(HttpClient client, Guid id, string action, object? body = null) =>
        client.PostAsJsonAsync($"/api/admin/verifications/{id}/{action}", body ?? new { });

    private async Task TickAll(Guid id) =>
        await Esther.PutAsJsonAsync($"/api/admin/verifications/{id}/checklist", new { ticked = ChecklistItems.All.Select(i => i.Key) });

    // L2-098 AC1, L2-143 AC1
    [Fact]
    public async Task L2_098_AC1_a_member_session_gets_403_from_every_admin_endpoint()
    {
        var listing = await Ready();
        var member = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

        var responses = new[]
        {
            await member.GetAsync("/api/admin/verifications"),
            await member.GetAsync($"/api/admin/verifications/{listing.Id}"),
            await Post(member, listing.Id, "approve"),
            await Post(member, listing.Id, "request-changes", new { areas = new[] { "tagline" }, message = "x" }),
            await Post(member, listing.Id, "decline", new { reason = "x" }),
            await member.PutAsJsonAsync($"/api/admin/verifications/{listing.Id}/checklist", new { ticked = new[] { "reference" } }),
        };

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode));
        Assert.Equal("STAFF_SESSION_REQUIRED", (await Json(responses[0])).GetProperty("code").GetString());
        Assert.Equal(ListingStage.ReadyToReview, await StageOf(listing.Id));
    }

    [Fact]
    public async Task L2_098_AC1_a_visitor_is_told_to_sign_in()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/admin/verifications")).StatusCode);
    }

    [Fact]
    public async Task L2_143_AC1_a_failed_authorization_is_logged_with_the_actor_and_the_address()
    {
        var member = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

        await member.GetAsync("/api/admin/verifications");

        var entry = Assert.Single(_factory.Logs.Entries, e => e.Message.Contains("Failed authorization"));
        Assert.Contains("member|joanna", entry.Message);
        Assert.Contains("/api/admin/verifications", entry.Message);
    }

    // L2-098 AC3, L2-190 AC7
    [Fact]
    public async Task L2_098_AC3_the_staff_session_counts_the_listings_ready_to_review()
    {
        await Ready();
        await Ready("Second Shop", "Ruth");
        await Submit("Waiting Shop", "Mary");

        var session = await _factory.GetJson("/api/staff/session", Esther);

        Assert.Equal("Esther Mensah", session.GetProperty("displayName").GetString());
        Assert.Equal("EM", session.GetProperty("initials").GetString());
        Assert.Equal(["verifier"], session.GetProperty("roles").EnumerateArray().Select(r => r.GetString()));
        Assert.Equal(2, session.GetProperty("verificationCount").GetInt32());
    }

    // L2-098 AC5
    [Fact]
    public async Task L2_098_AC5_a_verifier_cannot_decide_on_their_own_listing()
    {
        var owner = Member.Join(EmailAddress.TryParse("esther@example.com")!, "Esther", "Mensah", null, "hash", ListingMother.Now);
        owner.ConfirmEmail();
        await _factory.WithDb(async db =>
        {
            db.Members.Add(owner);
            await db.SaveChangesAsync();
        });
        var esther = _factory.CreateMemberClient("Esther Mensah", owner.Id.ToString());
        // Her staff account's e-mail matches her confirmed member e-mail, so her staff session is her (ADR 0040).
        var staff = _factory.CreateStaffClient("Esther Mensah", owner.Id.ToString(), "verifier");
        var body = new Dictionary<string, object?>
        {
            ["kind"] = "products", ["name"] = "Esther Co", ["tagline"] = "Gifts", ["categorySlug"] = "shops", ["highlight"] = null, ["place"] = null,
            ["church"] = "Grace", ["pastorEmail"] = "p@church.example", ["agreed"] = true, ["items"] = Array.Empty<object>(), ["idempotencyKey"] = "k1",
        };
        var draft = await esther.PostAsJsonAsync("/api/listing-drafts", body);
        var submitted = await esther.PostAsJsonAsync($"/api/listing-drafts/{(await Json(draft)).GetProperty("id").GetGuid()}/submit", body);
        var id = (await Json(submitted)).GetProperty("listingId").GetGuid();
        await _factory.WithDb(async db =>
        {
            var listing = await db.Listings.SingleAsync(l => l.Id == id);
            listing.MoveTo(ListingStage.ReadyToReview);
            await db.SaveChangesAsync();
        });

        var approve = await Post(staff, id, "approve");
        var changes = await Post(staff, id, "request-changes", new { areas = new[] { "tagline" }, message = "x" });
        var review = await staff.GetAsync($"/api/admin/verifications/{id}");

        Assert.Equal(HttpStatusCode.Forbidden, approve.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(approve)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Forbidden, changes.StatusCode);
        Assert.True((await Json(review)).GetProperty("isOwnListing").GetBoolean());
        Assert.Equal(ListingStage.ReadyToReview, await StageOf(id));
    }

    // L2-099 AC1, AC2
    [Fact]
    public async Task L2_099_AC1_the_queue_counts_each_stage_and_the_oldest_wait()
    {
        await Ready("Oldest Shop", "Ruth");
        _factory.Clock.Advance(TimeSpan.FromDays(4));
        await Ready("Luzandre.com", "Naomi");
        await Submit("Waiting Shop", "Mary");
        var unknown = await Submit("Unknown Shop", "Lydia");
        await Answer(unknown, "doesnt-know");

        var queue = await _factory.GetJson("/api/admin/verifications", Esther);

        Assert.Equal(4, queue.GetProperty("total").GetInt32());
        Assert.Equal(2, queue.GetProperty("readyToReview").GetInt32());
        Assert.Equal(4, queue.GetProperty("oldestWaitingDays").GetInt32());
        var tabs = queue.GetProperty("tabs").EnumerateArray().ToDictionary(t => t.GetProperty("stage").GetString()!, t => t.GetProperty("count").GetInt32());
        Assert.Equal(2, tabs["ready-to-review"]);
        Assert.Equal(1, tabs["waiting-on-reference"]);
        Assert.Equal(1, tabs["needs-a-decision"]);
        Assert.Equal(0, tabs["changes-requested"]);
    }

    [Fact]
    public async Task L2_099_AC2_the_rows_show_the_reference_and_are_ordered_oldest_submitted_first()
    {
        await Ready("Oldest Shop", "Ruth");
        _factory.Clock.Advance(TimeSpan.FromDays(1));
        await Submit("Waiting Shop", "Mary");
        _factory.Clock.Advance(TimeSpan.FromDays(1));
        var unknown = await Submit("Unknown Shop", "Lydia");
        await Answer(unknown, "doesnt-know");
        var cant = await Submit("Cant Shop", "Anna");
        await Answer(cant, "cant-vouch");

        var queue = await _factory.GetJson("/api/admin/verifications", Esther);

        var rows = queue.GetProperty("rows").EnumerateArray().ToList();
        Assert.Equal(["Oldest Shop", "Waiting Shop", "Unknown Shop", "Cant Shop"], rows.Select(r => r.GetProperty("name").GetString()));
        Assert.Equal(["confirmed", "waiting", "doesnt-know", "cant-vouch"], rows.Select(r => r.GetProperty("reference").GetString()));
        Assert.Equal("Ruth Laurent", rows[0].GetProperty("ownerName").GetString());
        Assert.Equal("Shops", rows[0].GetProperty("categoryName").GetString());
        Assert.Equal("Grace Toronto Church", rows[0].GetProperty("church").GetString());
        Assert.Equal("Ready to review", rows[0].GetProperty("stageLabel").GetString());
    }

    [Fact]
    public async Task L2_099_AC3_a_filter_with_nothing_in_it_has_no_rows_and_a_zero_count()
    {
        await Ready();

        var queue = await _factory.GetJson("/api/admin/verifications?stage=changes-requested", Esther);

        Assert.Equal("changes-requested", queue.GetProperty("filter").GetString());
        Assert.Empty(queue.GetProperty("rows").EnumerateArray());
        Assert.Equal(1, queue.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task L2_099_search_finds_a_business_by_name_owner_or_church()
    {
        await Ready("Luzandre.com", "Naomi");
        await Ready("Other Shop", "Ruth");

        var byName = await _factory.GetJson("/api/admin/verifications?q=luzandre", Esther);
        var byOwner = await _factory.GetJson("/api/admin/verifications?q=ruth", Esther);
        var none = await _factory.GetJson("/api/admin/verifications?q=zzz", Esther);

        Assert.Equal(["Luzandre.com"], byName.GetProperty("rows").EnumerateArray().Select(r => r.GetProperty("name").GetString()));
        Assert.Equal(["Other Shop"], byOwner.GetProperty("rows").EnumerateArray().Select(r => r.GetProperty("name").GetString()));
        Assert.Empty(none.GetProperty("rows").EnumerateArray());
    }

    // L2-099 AC4
    [Fact]
    public async Task L2_099_AC4_an_empty_queue_is_a_total_of_zero()
    {
        var queue = await _factory.GetJson("/api/admin/verifications", Esther);

        Assert.Equal(0, queue.GetProperty("total").GetInt32());
        Assert.Empty(queue.GetProperty("rows").EnumerateArray());
        Assert.Equal(JsonValueKind.Null, queue.GetProperty("oldestWaitingDays").ValueKind);
    }

    // L2-099 AC5
    [Fact]
    public async Task L2_099_AC5_a_listing_ready_for_more_than_two_business_days_is_overdue()
    {
        await Ready();
        _factory.Clock.Advance(TimeSpan.FromDays(2));
        var thursday = await _factory.GetJson("/api/admin/verifications", Esther);
        _factory.Clock.Advance(TimeSpan.FromDays(1));
        var friday = await _factory.GetJson("/api/admin/verifications", Esther);

        Assert.False(thursday.GetProperty("rows")[0].GetProperty("overdue").GetBoolean());
        Assert.True(friday.GetProperty("rows")[0].GetProperty("overdue").GetBoolean());
    }

    [Fact]
    public async Task L2_099_AC5_weekends_do_not_count_towards_overdue()
    {
        _factory.Clock.Advance(TimeSpan.FromDays(3));
        await Ready();
        _factory.Clock.Advance(TimeSpan.FromDays(3));

        var monday = await _factory.GetJson("/api/admin/verifications", Esther);

        Assert.Equal(DayOfWeek.Monday, _factory.Clock.GetUtcNow().DayOfWeek);
        Assert.False(monday.GetProperty("rows")[0].GetProperty("overdue").GetBoolean());
    }

    // L2-099 AC6
    [Fact]
    public async Task L2_099_AC6_a_queue_that_cannot_load_carries_the_reference_JB_ADM_503()
    {
        var esther = Esther;
        _factory.Database.Unavailable = true;

        var response = await esther.GetAsync("/api/admin/verifications");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-ADM-503", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-100 AC1, L2-146
    [Fact]
    public async Task L2_100_AC1_the_review_shows_the_listing_the_owner_and_the_reference_answer()
    {
        var listing = await Ready();

        var review = await _factory.GetJson($"/api/admin/verifications/{listing.Id}", Esther);

        Assert.Equal("Luzandre.com", review.GetProperty("name").GetString());
        Assert.Equal("Shops", review.GetProperty("categoryName").GetString());
        Assert.Equal("ready-to-review", review.GetProperty("stage").GetString());
        var owner = review.GetProperty("owner");
        Assert.Equal("Naomi Laurent", owner.GetProperty("name").GetString());
        Assert.Equal(listing.OwnerEmail, owner.GetProperty("email").GetString());
        Assert.True(owner.GetProperty("emailConfirmed").GetBoolean());
        Assert.Equal(0, owner.GetProperty("otherListings").GetInt32());
        var reference = review.GetProperty("reference");
        Assert.Equal("Grace Toronto Church", reference.GetProperty("church").GetString());
        Assert.Equal("confirmed", reference.GetProperty("state").GetString());
        Assert.Equal("Daniel Okoro", reference.GetProperty("answeredByName").GetString());
        Assert.Equal("Lead pastor", reference.GetProperty("answeredByRole").GetString());
        Assert.Equal("vouches", reference.GetProperty("answer").GetString());
        Assert.Equal("Naomi has served on our hospitality team for six years.", reference.GetProperty("note").GetString());
        Assert.Equal(5, review.GetProperty("checklist").GetArrayLength());
    }

    // L2-150 AC1
    [Fact]
    public async Task L2_150_AC1_reading_the_reference_answer_is_recorded_with_the_listing_as_the_reason()
    {
        var waiting = await Submit("Waiting Shop", "Mary");
        var answered = await Ready();

        await Esther.GetAsync($"/api/admin/verifications/{waiting.Id}");
        Assert.Empty(await Audit("reference.viewed"));
        await Esther.GetAsync($"/api/admin/verifications/{answered.Id}");

        var record = Assert.Single(await Audit("reference.viewed"));
        Assert.Equal("member|esther", record.Actor);
        Assert.Equal(answered.Id.ToString(), record.TargetId);
        Assert.Equal($"Review of listing {answered.Id}", record.Reason);
        Assert.Equal(ListingMother.Now, record.At);
    }

    private async Task<List<AuditRecord>> Audit(string? action = null)
    {
        List<AuditRecord> records = [];
        await _factory.WithDb(async db =>
            records = (await db.AuditRecords.AsNoTracking().ToListAsync()).Where(a => action is null || a.Action == action).ToList());
        return records;
    }

    // L2-100 AC3
    [Fact]
    public async Task L2_100_AC3_ticks_are_saved_with_the_reviewer_and_the_time()
    {
        var listing = await Ready();

        var response = await Esther.PutAsJsonAsync($"/api/admin/verifications/{listing.Id}/checklist", new { ticked = new[] { "owner-name", "reference" } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var review = await _factory.GetJson($"/api/admin/verifications/{listing.Id}", Esther);
        var checks = review.GetProperty("checklist").EnumerateArray().ToList();
        Assert.Equal(["owner-name", "reference"], checks.Where(c => c.GetProperty("ticked").GetBoolean()).Select(c => c.GetProperty("key").GetString()));
        Assert.Equal("Esther Mensah", checks[0].GetProperty("tickedBy").GetString());
        Assert.Equal(ListingMother.Now, checks[0].GetProperty("tickedAt").GetDateTimeOffset());

        await Esther.PutAsJsonAsync($"/api/admin/verifications/{listing.Id}/checklist", new { ticked = new[] { "reference" } });
        var after = await _factory.GetJson($"/api/admin/verifications/{listing.Id}", Esther);
        Assert.Equal(["reference"], after.GetProperty("checklist").EnumerateArray().Where(c => c.GetProperty("ticked").GetBoolean()).Select(c => c.GetProperty("key").GetString()));
    }

    // L2-100 AC4
    [Fact]
    public async Task L2_100_AC4_flags_from_the_submission_are_shown()
    {
        var listing = await Ready(tagline: "Visit www.luzandre.com or call 416 555 0123");

        var review = await _factory.GetJson($"/api/admin/verifications/{listing.Id}", Esther);

        Assert.Contains("CONTACT_IN_TEXT", review.GetProperty("flags").EnumerateArray().Select(f => f.GetString()));
    }

    // L2-100 AC5
    [Fact]
    public async Task L2_100_AC5_a_listing_waiting_on_its_reference_cannot_be_approved()
    {
        var listing = await Submit();

        var review = await _factory.GetJson($"/api/admin/verifications/{listing.Id}", Esther);
        var approve = await Post(Esther, listing.Id, "approve", new { note = "ok" });

        Assert.Equal("Waiting for the church reference.", review.GetProperty("cannotDecideBecause").GetString());
        Assert.Equal(HttpStatusCode.Conflict, approve.StatusCode);
        Assert.Equal("WAITING_ON_REFERENCE", (await Json(approve)).GetProperty("code").GetString());
    }

    // L2-100 AC6
    [Fact]
    public async Task L2_100_AC6_a_review_that_cannot_load_carries_the_reference_JB_ADM_502()
    {
        var listing = await Ready();
        var esther = Esther;
        _factory.Database.Unavailable = true;

        var response = await esther.GetAsync($"/api/admin/verifications/{listing.Id}");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-ADM-502", (await Json(response)).GetProperty("reference").GetString());
    }

    [Fact]
    public async Task L2_100_an_unknown_listing_is_a_404()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await Esther.GetAsync($"/api/admin/verifications/{Guid.NewGuid()}")).StatusCode);
    }

    // L2-100 AC7
    [Fact]
    public async Task L2_100_AC7_a_second_decision_on_the_same_listing_is_a_409()
    {
        var listing = await Ready();
        await TickAll(listing.Id);
        var other = _factory.CreateStaffClient("Peter Osei", "member|peter", "verifier");

        var first = await Post(Esther, listing.Id, "approve");
        var second = await Post(other, listing.Id, "request-changes", new { areas = new[] { "tagline" }, message = "x" });
        var third = await Post(other, listing.Id, "approve");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("ALREADY_DECIDED", (await Json(second)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Conflict, third.StatusCode);
        var review = await _factory.GetJson($"/api/admin/verifications/{listing.Id}", other);
        Assert.Equal("Approved", review.GetProperty("decision").GetProperty("kind").GetString());
        Assert.Equal("Esther Mensah", review.GetProperty("decision").GetProperty("decidedByName").GetString());
    }

    // L2-101 AC2
    [Fact]
    public async Task L2_101_AC2_approving_makes_the_listing_live_and_verified_and_e_mails_the_owner()
    {
        var listing = await Ready();
        await TickAll(listing.Id);

        var response = await Post(Esther, listing.Id, "approve");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await Json(response);
        Assert.Equal("live", result.GetProperty("stage").GetString());
        Assert.Equal("Esther Mensah", result.GetProperty("decidedByName").GetString());
        Assert.Equal("Naomi", result.GetProperty("ownerFirstName").GetString());
        Assert.Equal(ListingStage.Live, await StageOf(listing.Id));
        var page = await _factory.GetJson("/api/listings/luzandre-com", _factory.CreateClient());
        Assert.True(page.GetProperty("verified").GetBoolean());
        await _factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == listing.OwnerEmail && m.Subject.Contains("verified and live"));
            Assert.Contains("Luzandre.com is verified and live", mail.TextBody);
            Assert.Contains("Shops", mail.TextBody);
            var saved = await db.Listings.AsNoTracking().SingleAsync(l => l.Id == listing.Id);
            Assert.Equal(ListingMother.Now, saved.ReferenceConfirmedOn);
            Assert.Equal("member|esther", saved.ApprovedBy);
        });
    }

    // L2-101 AC3
    [Fact]
    public async Task L2_101_AC3_approving_with_unticked_items_needs_a_note()
    {
        var listing = await Ready();
        await Esther.PutAsJsonAsync($"/api/admin/verifications/{listing.Id}/checklist", new { ticked = new[] { "reference" } });

        var refused = await Post(Esther, listing.Id, "approve", new { note = " " });
        var allowed = await Post(Esther, listing.Id, "approve", new { note = "Photos to follow; the owner is well known to us." });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, refused.StatusCode);
        Assert.Equal("NOTE_REQUIRED", (await Json(refused)).GetProperty("errors").GetProperty("note").GetString());
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        var record = Assert.Single(await Audit("listing.approved"));
        Assert.Equal("Photos to follow; the owner is well known to us.", record.Reason);
        Assert.Contains("owner-name", record.After!);
    }

    // L2-101 AC5, L2-180 AC1
    [Fact]
    public async Task L2_101_AC5_an_approval_is_audited_with_the_verifier_the_time_and_the_checklist()
    {
        var listing = await Ready();
        await TickAll(listing.Id);

        await Post(Esther, listing.Id, "approve");

        var record = Assert.Single(await Audit("listing.approved"));
        Assert.Equal("member|esther", record.Actor);
        Assert.Equal("Esther Mensah", record.ActorName);
        Assert.Equal("listing", record.TargetType);
        Assert.Equal(listing.Id.ToString(), record.TargetId);
        Assert.Equal(ListingMother.Now, record.At);
        Assert.Equal("ready-to-review", record.Before);
        var after = JsonDocument.Parse(record.After!).RootElement;
        Assert.Equal("live", after.GetProperty("stage").GetString());
        Assert.Equal(5, after.GetProperty("ticked").GetArrayLength());
    }

    [Fact]
    public async Task L2_133_AC4_a_decision_with_an_unknown_field_is_refused()
    {
        var listing = await Ready();

        var response = await Esther.PostAsJsonAsync($"/api/admin/verifications/{listing.Id}/approve", new { note = "x", stage = "Live" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ListingStage.ReadyToReview, await StageOf(listing.Id));
    }

    // L2-102 AC1..AC3
    [Fact]
    public async Task L2_102_AC3_requesting_changes_keeps_the_listing_unpublished_and_tells_the_owner()
    {
        var listing = await Ready();

        var response = await Post(Esther, listing.Id, "request-changes", new { areas = new[] { "tagline", "photos" }, message = "Add two photos and shorten the tagline." });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ListingStage.ChangesRequested, await StageOf(listing.Id));
        await _factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == listing.OwnerEmail && m.Subject.Contains("changes needed"));
            Assert.Contains("Add two photos and shorten the tagline.", mail.TextBody);
            Assert.Contains("Esther", mail.TextBody);
        });
        var owner = await _factory.GetJson($"/api/listings/{listing.Id}/verification", listing.Owner);
        Assert.Equal("changes-requested", owner.GetProperty("stage").GetString());
        var changes = owner.GetProperty("changesRequested");
        Assert.Equal(["Tagline or description", "Photos"], changes.GetProperty("areas").EnumerateArray().Select(a => a.GetString()));
        Assert.Equal("Add two photos and shorten the tagline.", changes.GetProperty("message").GetString());
        Assert.Equal("Esther", changes.GetProperty("reviewerFirstName").GetString());
        var queue = await _factory.GetJson("/api/admin/verifications", Esther);
        Assert.Equal("changes-requested", queue.GetProperty("rows")[0].GetProperty("stage").GetString());
    }

    // L2-102 AC2
    [Fact]
    public async Task L2_102_AC2_an_empty_message_or_no_area_is_refused_and_nothing_changes()
    {
        var listing = await Ready();

        var response = await Post(Esther, listing.Id, "request-changes", new { areas = Array.Empty<string>(), message = "  " });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("MESSAGE_REQUIRED", errors.GetProperty("message").GetString());
        Assert.Equal("AREA_REQUIRED", errors.GetProperty("areas").GetString());
        Assert.Equal(ListingStage.ReadyToReview, await StageOf(listing.Id));
        Assert.Empty(await Audit("listing.changes-requested"));
    }

    // L2-103 AC1, AC2
    [Fact]
    public async Task L2_103_AC1_resubmitting_returns_the_listing_to_the_queue_with_its_original_date()
    {
        var listing = await Ready();
        var submittedAt = (await _factory.GetJson($"/api/admin/verifications/{listing.Id}", Esther)).GetProperty("submittedAt").GetDateTimeOffset();
        await Post(Esther, listing.Id, "request-changes", new { areas = new[] { "tagline" }, message = "Shorten the tagline." });
        _factory.Clock.Advance(TimeSpan.FromDays(2));

        var response = await listing.Owner.PostAsJsonAsync(
            $"/api/listings/{listing.Id}/verification/resubmit", new { tagline = "Christian apparel", name = (string?)null, categorySlug = (string?)null, about = (string?)null });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ListingStage.ReadyToReview, await StageOf(listing.Id));
        var review = await _factory.GetJson($"/api/admin/verifications/{listing.Id}", Esther);
        Assert.Equal(submittedAt, review.GetProperty("submittedAt").GetDateTimeOffset());
        Assert.Equal(["tagline"], review.GetProperty("changedSinceRequest").EnumerateArray().Select(c => c.GetString()));
    }

    [Fact]
    public async Task L2_103_AC1_only_a_listing_with_changes_requested_can_be_resubmitted()
    {
        var listing = await Ready();

        var response = await listing.Owner.PostAsJsonAsync($"/api/listings/{listing.Id}/verification/resubmit", new { });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task L2_103_a_resubmission_with_a_tagline_over_90_characters_is_refused()
    {
        var listing = await Ready();
        await Post(Esther, listing.Id, "request-changes", new { areas = new[] { "tagline" }, message = "Shorten." });

        var response = await listing.Owner.PostAsJsonAsync(
            $"/api/listings/{listing.Id}/verification/resubmit", new { tagline = new string('x', 95) });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("TOO_LONG:95", (await Json(response)).GetProperty("errors").GetProperty("tagline").GetString());
        Assert.Equal(ListingStage.ChangesRequested, await StageOf(listing.Id));
    }

    // L2-102 AC5
    [Fact]
    public async Task L2_102_AC5_a_request_about_the_church_reference_sends_a_new_request_before_the_listing_returns()
    {
        var listing = await Ready();
        await Post(Esther, listing.Id, "request-changes", new { areas = new[] { "reference" }, message = "Please name an elder as well." });

        await listing.Owner.PostAsJsonAsync($"/api/listings/{listing.Id}/verification/resubmit", new { });

        Assert.Equal(ListingStage.PendingReference, await StageOf(listing.Id));
        await _factory.WithDb(async db =>
            Assert.Equal(2, await db.OutboxMessages.CountAsync(m => m.ToAddress.StartsWith("pastor.luzandrecom"))));
    }

    // L2-104 AC1
    [Fact]
    public async Task L2_104_AC1_declining_a_listing_that_needs_a_decision_closes_it_and_e_mails_the_reason()
    {
        var listing = await Submit();
        await Answer(listing, "doesnt-know");

        var response = await Post(Esther, listing.Id, "decline", new { reason = "Your reference does not know you. Name another pastor." });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ListingStage.Declined, await StageOf(listing.Id));
        await _factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == listing.OwnerEmail && m.Subject.Contains("couldn’t verify"));
            Assert.Contains("Your reference does not know you. Name another pastor.", mail.TextBody);
        });
        var owner = await _factory.GetJson($"/api/listings/{listing.Id}/verification", listing.Owner);
        Assert.Equal("Your reference does not know you. Name another pastor.", owner.GetProperty("declined").GetProperty("reason").GetString());
        Assert.Single(await Audit("listing.declined"));
    }

    [Fact]
    public async Task L2_104_AC1_a_reason_is_required_and_only_a_listing_that_needs_a_decision_can_be_declined()
    {
        var needs = await Submit("Needs Shop", "Mary");
        await Answer(needs, "cant-vouch");
        var ready = await Ready();

        var noReason = await Post(Esther, needs.Id, "decline", new { reason = " " });
        var wrongStage = await Post(Esther, ready.Id, "decline", new { reason = "no" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, noReason.StatusCode);
        Assert.Equal("REASON_REQUIRED", (await Json(noReason)).GetProperty("errors").GetProperty("reason").GetString());
        Assert.Equal(HttpStatusCode.Conflict, wrongStage.StatusCode);
        Assert.Equal("NOT_NEEDS_DECISION", (await Json(wrongStage)).GetProperty("code").GetString());
    }

    // L2-104 AC2, L2-101 AC5, L2-146
    [Fact]
    public async Task L2_104_AC2_ninety_days_after_a_decline_the_reference_answer_is_deleted()
    {
        var listing = await Submit();
        await Answer(listing, "doesnt-know");
        await Post(Esther, listing.Id, "decline", new { reason = "no" });

        _factory.Clock.Advance(TimeSpan.FromDays(89));
        Assert.Equal(0, await Retention());
        await _factory.WithDb(async db => Assert.Equal(1, await db.ReferenceAnswers.CountAsync()));

        _factory.Clock.Advance(TimeSpan.FromDays(1));
        Assert.Equal(1, await Retention());
        Assert.Equal(0, await Retention());
        await _factory.WithDb(async db =>
        {
            Assert.Equal(0, await db.ReferenceAnswers.CountAsync());
            Assert.All(await db.ReferenceLinks.AsNoTracking().ToListAsync(), l => Assert.Equal(string.Empty, l.ReferenceEmail));
            Assert.Equal(string.Empty, (await db.ListingSubmissions.AsNoTracking().SingleAsync()).PastorEmail);
        });
    }

    [Fact]
    public async Task L2_101_AC5_ninety_days_after_an_approval_only_the_month_of_confirmation_remains()
    {
        var listing = await Ready();
        await TickAll(listing.Id);
        await Post(Esther, listing.Id, "approve");

        _factory.Clock.Advance(TimeSpan.FromDays(90));
        await Retention();

        await _factory.WithDb(async db =>
        {
            Assert.Equal(0, await db.ReferenceAnswers.CountAsync());
            var saved = await db.Listings.AsNoTracking().SingleAsync(l => l.Id == listing.Id);
            Assert.Equal(ListingMother.Now, saved.ReferenceConfirmedOn);
            Assert.Equal(ListingStage.Live, saved.Stage);
        });
    }

    [Fact]
    public async Task L2_146_the_answer_of_a_listing_that_was_only_sent_back_for_changes_is_kept()
    {
        var listing = await Ready();
        await Post(Esther, listing.Id, "request-changes", new { areas = new[] { "photos" }, message = "Photos." });

        _factory.Clock.Advance(TimeSpan.FromDays(120));

        Assert.Equal(0, await Retention());
        await _factory.WithDb(async db => Assert.Equal(1, await db.ReferenceAnswers.CountAsync()));
    }

    private async Task<int> Retention()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<MediatR.ISender>().Send(new DeleteDecidedReferenceDataCommand());
    }

    // L2-180 AC1, AC3
    [Fact]
    public async Task L2_180_AC3_an_admin_searches_the_audit_log_by_actor_target_and_date()
    {
        var one = await Ready();
        var two = await Ready("Second Shop", "Ruth");
        await TickAll(one.Id);
        await Post(Esther, one.Id, "approve");
        _factory.Clock.Advance(TimeSpan.FromDays(3));
        await Post(_factory.CreateStaffClient("Peter Osei", "member|peter", "verifier"), two.Id, "request-changes", new { areas = new[] { "photos" }, message = "Photos." });

        var byActor = await _factory.GetJson("/api/admin/audit?actor=member%7Cesther", Admin);
        var byTarget = await _factory.GetJson($"/api/admin/audit?target={two.Id}", Admin);
        var byDate = await _factory.GetJson($"/api/admin/audit?from={Uri.EscapeDataString(ListingMother.Now.AddDays(2).ToString("O"))}", Admin);

        Assert.Equal(["listing.approved"], byActor.EnumerateArray().Select(r => r.GetProperty("action").GetString()));
        Assert.Equal(["listing.changes-requested"], byTarget.EnumerateArray().Select(r => r.GetProperty("action").GetString()));
        Assert.Equal(["listing.changes-requested"], byDate.EnumerateArray().Select(r => r.GetProperty("action").GetString()));
    }

    [Fact]
    public async Task L2_180_the_audit_log_is_for_admins_only()
    {
        Assert.Equal(HttpStatusCode.Forbidden, (await Esther.GetAsync("/api/admin/audit")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna").GetAsync("/api/admin/audit")).StatusCode);
    }

    // L2-180 AC2
    [Fact]
    public async Task L2_180_AC2_the_audit_log_cannot_be_edited_or_deleted_through_the_application()
    {
        var listing = await Ready();
        await TickAll(listing.Id);
        await Post(Esther, listing.Id, "approve");
        var id = (await Audit("listing.approved")).Single().Id;

        var put = await Admin.PutAsJsonAsync($"/api/admin/audit/{id}", new { reason = "changed" });
        var delete = await Admin.DeleteAsync($"/api/admin/audit/{id}");
        var post = await Admin.PostAsJsonAsync("/api/admin/audit", new { });

        // No such operation exists. An unmatched route falls to the members' fallback policy, which a
        // staff session never satisfies (L2-191 AC4), so it may also be refused as unauthenticated.
        Assert.All([put, delete, post], r => Assert.True(
            r.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.MethodNotAllowed or HttpStatusCode.Unauthorized));
        Assert.Single(await Audit("listing.approved"));
    }

    // L2-146: the owner's endpoints never carry the reference's answer
    [Fact]
    public async Task L2_146_the_owners_view_of_the_verification_never_carries_the_answer()
    {
        var listing = await Ready();
        await Post(Esther, listing.Id, "request-changes", new { areas = new[] { "photos" }, message = "More photos please." });

        var raw = await (await listing.Owner.GetAsync($"/api/listings/{listing.Id}/verification")).Content.ReadAsStringAsync();

        Assert.DoesNotContain("Daniel Okoro", raw);
        Assert.DoesNotContain("Lead pastor", raw);
        Assert.DoesNotContain("hospitality team", raw);
    }

    [Fact]
    public async Task L2_146_another_member_cannot_read_the_verification_of_a_listing()
    {
        var listing = await Ready();
        var stranger = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/listings/{listing.Id}/verification")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsJsonAsync($"/api/listings/{listing.Id}/verification/resubmit", new { })).StatusCode);
    }
}
