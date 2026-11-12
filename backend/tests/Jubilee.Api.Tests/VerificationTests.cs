using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Verification;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Verify a listing: L2-098 to L2-104, L2-143 and L2-180. Naomi lists Luzandre.com and Esther of the
// verification team reviews it; nobody else is asked about her. "Today" is Tuesday 10 November 2026.
public sealed class VerificationTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public VerificationTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    // A fresh staff session each time: a staff session ends after 30 minutes without a request (L2-190),
    // and these tests move the clock by days.
    private HttpClient Esther => _factory.CreateStaffClient("Esther Mensah", "member|esther", "verifier");

    private HttpClient Admin => _factory.CreateStaffClient("Ada Admin", "member|ada", "admin");

    private sealed record Submitted(Guid Id, HttpClient Owner, string OwnerEmail);

    private async Task<Submitted> Submit(
        string business = "Luzandre.com", string first = "Naomi", string tagline = "Christian apparel and gifts", string category = "shops")
    {
        var email = $"{first.ToLowerInvariant()}.{business.ToLowerInvariant().Replace(".", string.Empty).Replace(" ", string.Empty)}@example.com";
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
            ["agreed"] = true,
            ["items"] = Array.Empty<object>(),
            ["idempotencyKey"] = Guid.NewGuid().ToString(),
        };
        var draft = await client.PostAsJsonAsync("/api/listing-drafts", body);
        var draftId = (await Json(draft)).GetProperty("id").GetGuid();
        var submitted = await client.PostAsJsonAsync($"/api/listing-drafts/{draftId}/submit", body);
        Assert.Equal(HttpStatusCode.Created, submitted.StatusCode);
        var id = (await Json(submitted)).GetProperty("listingId").GetGuid();
        return new Submitted(id, client, email);
    }

    // A submitted listing is ready to review at once (L2-078 AC1).
    private Task<Submitted> Ready(string business = "Luzandre.com", string first = "Naomi", string tagline = "Christian apparel and gifts") =>
        Submit(business, first, tagline);

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
            await member.PutAsJsonAsync($"/api/admin/verifications/{listing.Id}/checklist", new { ticked = new[] { "tagline" } }),
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
        var asked = await Ready("Asked Shop", "Mary");
        await Post(Esther, asked.Id, "request-changes", new { areas = new[] { "photos" }, message = "Photos." });

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
            ["agreed"] = true, ["items"] = Array.Empty<object>(), ["idempotencyKey"] = "k1",
        };
        var draft = await esther.PostAsJsonAsync("/api/listing-drafts", body);
        var submitted = await esther.PostAsJsonAsync($"/api/listing-drafts/{(await Json(draft)).GetProperty("id").GetGuid()}/submit", body);
        var id = (await Json(submitted)).GetProperty("listingId").GetGuid();

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
        foreach (var (business, first) in new[] { ("Asked Shop", "Mary"), ("Other Shop", "Lydia") })
        {
            var asked = await Ready(business, first);
            await Post(Esther, asked.Id, "request-changes", new { areas = new[] { "photos" }, message = "Photos." });
        }

        var queue = await _factory.GetJson("/api/admin/verifications", Esther);

        Assert.Equal(4, queue.GetProperty("total").GetInt32());
        Assert.Equal(2, queue.GetProperty("readyToReview").GetInt32());
        Assert.Equal(4, queue.GetProperty("oldestWaitingDays").GetInt32());
        var tabs = queue.GetProperty("tabs").EnumerateArray().ToDictionary(t => t.GetProperty("stage").GetString()!, t => t.GetProperty("count").GetInt32());
        Assert.Equal(["changes-requested", "ready-to-review"], tabs.Keys.OrderBy(k => k));
        Assert.Equal(2, tabs["ready-to-review"]);
        Assert.Equal(2, tabs["changes-requested"]);
    }

    [Fact]
    public async Task L2_099_AC2_the_rows_name_no_church_and_are_ordered_oldest_submitted_first()
    {
        await Ready("Oldest Shop", "Ruth");
        _factory.Clock.Advance(TimeSpan.FromDays(1));
        await Ready("Middle Shop", "Mary");
        _factory.Clock.Advance(TimeSpan.FromDays(1));
        await Ready("Newest Shop", "Lydia");

        var queue = await _factory.GetJson("/api/admin/verifications", Esther);

        var rows = queue.GetProperty("rows").EnumerateArray().ToList();
        Assert.Equal(["Oldest Shop", "Middle Shop", "Newest Shop"], rows.Select(r => r.GetProperty("name").GetString()));
        Assert.Equal("Ruth Laurent", rows[0].GetProperty("ownerName").GetString());
        Assert.Equal("Shops", rows[0].GetProperty("categoryName").GetString());
        Assert.Equal("Ready to review", rows[0].GetProperty("stageLabel").GetString());
        Assert.False(rows[0].TryGetProperty("church", out _));
        Assert.False(rows[0].TryGetProperty("reference", out _));
    }

    [Fact]
    public async Task L2_099_a_filter_for_a_stage_that_no_longer_exists_shows_every_listing()
    {
        await Ready();

        var queue = await _factory.GetJson("/api/admin/verifications?stage=waiting-on-reference", Esther);

        Assert.Equal("all", queue.GetProperty("filter").GetString());
        Assert.Single(queue.GetProperty("rows").EnumerateArray());
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
    public async Task L2_099_search_finds_a_business_by_name_or_owner()
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

    // L2-100 AC1, AC2
    [Fact]
    public async Task L2_100_AC1_the_review_shows_the_listing_and_the_owner_and_names_no_third_party()
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
        Assert.Empty(owner.GetProperty("otherListings").EnumerateArray());
        Assert.False(review.TryGetProperty("reference", out _));
        Assert.Equal(["tagline", "photos", "category"], review.GetProperty("checklist").EnumerateArray().Select(c => c.GetProperty("key").GetString()));
        Assert.Equal(JsonValueKind.Null, review.GetProperty("cannotDecideBecause").ValueKind);
    }

    private static Dictionary<string, object?> ListingBody(string name, string kind = "products", string category = "shops", params object[] items) => new()
    {
        ["kind"] = kind,
        ["name"] = name,
        ["tagline"] = "Christian apparel and gifts",
        ["categorySlug"] = category,
        ["highlight"] = null,
        ["place"] = "Toronto",
        ["agreed"] = true,
        ["items"] = items,
        ["idempotencyKey"] = Guid.NewGuid().ToString(),
    };

    /// <summary>The owner of a submitted listing lists another business; the answer is the new listing's id.</summary>
    private async Task<Guid> SubmitAnother(HttpClient owner, Dictionary<string, object?> body)
    {
        var draft = await Json(await owner.PostAsJsonAsync("/api/listing-drafts", body));
        var submitted = await owner.PostAsJsonAsync($"/api/listing-drafts/{draft.GetProperty("id").GetGuid()}/submit", body);
        Assert.Equal(HttpStatusCode.Created, submitted.StatusCode);
        return (await Json(submitted)).GetProperty("listingId").GetGuid();
    }

    // L2-073 AC3: the review says how many products or services the listing has, so the screen can say "No products or services yet"
    [Fact]
    public async Task L2_073_AC3_the_review_counts_the_products_or_services_of_the_listing()
    {
        var empty = await Ready();
        var shop = await SubmitAnother(empty.Owner, ListingBody(
            "Luzandre Home", "products", "shops",
            new { name = "Tee", detail = (string?)null, priceKind = "amount", priceCents = 3400 },
            new { name = "Mug", detail = (string?)null, priceKind = "amount", priceCents = 2400 }));
        var services = await SubmitAnother(empty.Owner, ListingBody(
            "Laurent Photography", "services", "media",
            new { name = "Wedding day coverage", detail = "8 hours", priceKind = "ask", priceCents = (int?)null }));

        Assert.Equal(0, (await _factory.GetJson($"/api/admin/verifications/{empty.Id}", Esther)).GetProperty("itemCount").GetInt32());
        Assert.Equal(2, (await _factory.GetJson($"/api/admin/verifications/{shop}", Esther)).GetProperty("itemCount").GetInt32());
        Assert.Equal(1, (await _factory.GetJson($"/api/admin/verifications/{services}", Esther)).GetProperty("itemCount").GetInt32());
    }

    // L2-079 AC3: the owner's other listings with their stages, and each draft not yet submitted
    [Fact]
    public async Task L2_079_AC3_the_review_names_the_owners_other_listings_with_their_stages_and_their_drafts()
    {
        var first = await Ready();
        var second = await SubmitAnother(first.Owner, ListingBody("Laurent Photography", "services", "media"));
        await first.Owner.PostAsJsonAsync("/api/listing-drafts", ListingBody("Laurent Studio"));
        await first.Owner.PostAsJsonAsync("/api/listing-drafts", ListingBody(" "));
        await TickAll(second);
        Assert.Equal(HttpStatusCode.OK, (await Post(Esther, second, "approve")).StatusCode);
        var someoneElse = await Ready("Grace Bakery", "Grace");

        var review = await _factory.GetJson($"/api/admin/verifications/{first.Id}", Esther);
        var others = review.GetProperty("owner").GetProperty("otherListings").EnumerateArray()
            .Select(o => (o.GetProperty("name").GetString(), o.GetProperty("stageLabel").GetString())).ToList();

        // The listing under review is not among them, nor is another owner's listing.
        Assert.Equal([("Laurent Photography", "Live"), ("Laurent Studio", "Draft"), ("Untitled business", "Draft")], others);
        var reverse = await _factory.GetJson($"/api/admin/verifications/{second}", Esther);
        Assert.Contains(
            ("Luzandre.com", "Pending verification"),
            reverse.GetProperty("owner").GetProperty("otherListings").EnumerateArray()
                .Select(o => (o.GetProperty("name").GetString(), o.GetProperty("stageLabel").GetString())));
        Assert.Empty((await _factory.GetJson($"/api/admin/verifications/{someoneElse.Id}", Esther))
            .GetProperty("owner").GetProperty("otherListings").EnumerateArray());
    }

    // L2-079 AC3: a deleted listing is not named
    [Fact]
    public async Task L2_079_AC3_a_deleted_listing_is_not_among_the_other_listings()
    {
        var first = await Ready();
        var second = await SubmitAnother(first.Owner, ListingBody("Laurent Photography", "services", "media"));
        await _factory.WithDb(async db =>
        {
            (await db.Listings.SingleAsync(l => l.Id == second)).Delete(ListingMother.Now);
            await db.SaveChangesAsync();
        });

        var review = await _factory.GetJson($"/api/admin/verifications/{first.Id}", Esther);

        Assert.Empty(review.GetProperty("owner").GetProperty("otherListings").EnumerateArray());
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

        var response = await Esther.PutAsJsonAsync($"/api/admin/verifications/{listing.Id}/checklist", new { ticked = new[] { "tagline", "photos" } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var review = await _factory.GetJson($"/api/admin/verifications/{listing.Id}", Esther);
        var checks = review.GetProperty("checklist").EnumerateArray().ToList();
        Assert.Equal(["tagline", "photos"], checks.Where(c => c.GetProperty("ticked").GetBoolean()).Select(c => c.GetProperty("key").GetString()));
        Assert.Equal("Esther Mensah", checks[0].GetProperty("tickedBy").GetString());
        Assert.Equal(ListingMother.Now, checks[0].GetProperty("tickedAt").GetDateTimeOffset());

        await Esther.PutAsJsonAsync($"/api/admin/verifications/{listing.Id}/checklist", new { ticked = new[] { "photos" } });
        var after = await _factory.GetJson($"/api/admin/verifications/{listing.Id}", Esther);
        Assert.Equal(["photos"], after.GetProperty("checklist").EnumerateArray().Where(c => c.GetProperty("ticked").GetBoolean()).Select(c => c.GetProperty("key").GetString()));
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
    public async Task L2_100_AC5_a_listing_waiting_on_the_owner_cannot_be_approved()
    {
        var listing = await Ready();
        await Post(Esther, listing.Id, "request-changes", new { areas = new[] { "photos" }, message = "Photos." });

        var review = await _factory.GetJson($"/api/admin/verifications/{listing.Id}", Esther);
        var approve = await Post(Esther, listing.Id, "approve", new { note = "ok" });

        Assert.Equal("Waiting on the owner.", review.GetProperty("cannotDecideBecause").GetString());
        Assert.Equal(HttpStatusCode.Conflict, approve.StatusCode);
        Assert.Equal(ListingStage.ChangesRequested, await StageOf(listing.Id));
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
            Assert.Equal(ListingMother.Now, saved.ApprovedAt);
            Assert.Equal("member|esther", saved.ApprovedBy);
        });
    }

    // L2-101 AC3
    [Fact]
    public async Task L2_101_AC3_approving_with_unticked_items_needs_a_note()
    {
        var listing = await Ready();
        await Esther.PutAsJsonAsync($"/api/admin/verifications/{listing.Id}/checklist", new { ticked = new[] { "tagline" } });

        var refused = await Post(Esther, listing.Id, "approve", new { note = " " });
        var allowed = await Post(Esther, listing.Id, "approve", new { note = "Photos to follow; the owner is well known to us." });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, refused.StatusCode);
        Assert.Equal("NOTE_REQUIRED", (await Json(refused)).GetProperty("errors").GetProperty("note").GetString());
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        var record = Assert.Single(await Audit("listing.approved"));
        Assert.Equal("Photos to follow; the owner is well known to us.", record.Reason);
        Assert.Contains("tagline", record.After!);
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
        Assert.Equal(3, after.GetProperty("ticked").GetArrayLength());
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

    // L2-102 AC1: the church reference is no longer an area a verifier can name
    [Fact]
    public async Task L2_102_AC1_a_request_cannot_name_the_church_reference()
    {
        var listing = await Ready();

        var response = await Post(Esther, listing.Id, "request-changes", new { areas = new[] { "reference" }, message = "Please name an elder as well." });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(ListingStage.ReadyToReview, await StageOf(listing.Id));
    }

    // L2-104 AC1
    [Fact]
    public async Task L2_104_AC1_declining_a_listing_that_is_ready_to_review_closes_it_and_e_mails_the_reason()
    {
        var listing = await Ready();

        var response = await Post(Esther, listing.Id, "decline", new { reason = "We could not confirm that this business exists." });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ListingStage.Declined, await StageOf(listing.Id));
        await _factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == listing.OwnerEmail && m.Subject.Contains("couldn’t verify"));
            Assert.Contains("We could not confirm that this business exists.", mail.TextBody);
            Assert.DoesNotContain("reference", mail.TextBody, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("pastor", mail.TextBody, StringComparison.OrdinalIgnoreCase);
        });
        var owner = await _factory.GetJson($"/api/listings/{listing.Id}/verification", listing.Owner);
        Assert.Equal("We could not confirm that this business exists.", owner.GetProperty("declined").GetProperty("reason").GetString());
        Assert.Single(await Audit("listing.declined"));
    }

    [Fact]
    public async Task L2_104_AC1_a_reason_is_required_and_only_a_listing_that_is_ready_to_review_can_be_declined()
    {
        var ready = await Ready("Ready Shop", "Mary");
        var asked = await Ready();
        await Post(Esther, asked.Id, "request-changes", new { areas = new[] { "photos" }, message = "Photos." });

        var noReason = await Post(Esther, ready.Id, "decline", new { reason = " " });
        var wrongStage = await Post(Esther, asked.Id, "decline", new { reason = "no" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, noReason.StatusCode);
        Assert.Equal("REASON_REQUIRED", (await Json(noReason)).GetProperty("errors").GetProperty("reason").GetString());
        Assert.Equal(HttpStatusCode.Conflict, wrongStage.StatusCode);
        Assert.Equal("NOT_READY_TO_REVIEW", (await Json(wrongStage)).GetProperty("code").GetString());
    }

    // L2-104 AC1: the owner may submit again
    [Fact]
    public async Task L2_104_AC1_after_a_decline_the_owner_may_submit_again()
    {
        var listing = await Ready();
        await Post(Esther, listing.Id, "decline", new { reason = "no" });
        var body = new Dictionary<string, object?>
        {
            ["kind"] = "products", ["name"] = "Luzandre Gifts", ["tagline"] = "Gifts", ["categorySlug"] = "shops", ["highlight"] = null, ["place"] = null,
            ["agreed"] = true, ["items"] = Array.Empty<object>(), ["idempotencyKey"] = Guid.NewGuid().ToString(),
        };

        var draft = await listing.Owner.PostAsJsonAsync("/api/listing-drafts", body);
        var again = await listing.Owner.PostAsJsonAsync($"/api/listing-drafts/{(await Json(draft)).GetProperty("id").GetGuid()}/submit", body);

        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
        Assert.Equal("ready-to-review", (await Json(again)).GetProperty("stage").GetString());
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

    // L2-102 AC3: the owner reads what was asked, never the reviewer's checklist
    [Fact]
    public async Task L2_102_AC3_the_owners_view_of_the_verification_carries_the_request_and_no_reference()
    {
        var listing = await Ready();
        await Post(Esther, listing.Id, "request-changes", new { areas = new[] { "photos" }, message = "More photos please." });

        var raw = await (await listing.Owner.GetAsync($"/api/listings/{listing.Id}/verification")).Content.ReadAsStringAsync();

        Assert.Contains("More photos please.", raw);
        Assert.DoesNotContain("reference", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("church", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task L2_145_another_member_cannot_read_the_verification_of_a_listing()
    {
        var listing = await Ready();
        var stranger = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/listings/{listing.Id}/verification")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsJsonAsync($"/api/listings/{listing.Id}/verification/resubmit", new { })).StatusCode);
    }
}
