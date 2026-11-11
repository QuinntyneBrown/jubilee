using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Reference;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// Answer a church reference: L2-080 to L2-084, L2-140, L2-146 and L2-126. Naomi lists Luzandre.com and
// names Pastor Daniel Okoro; he answers through the link in his e-mail without an account. "Today"
// is Tuesday 10 November 2026 (ListingMother.Now).
public sealed partial class ChurchReferenceTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string PastorEmail = "daniel.okoro@gracetoronto.example";

    private readonly JubileeApiFactory _factory;

    public ChurchReferenceTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [GeneratedRegex(@"/reference/([0-9a-f]+)")]
    private static partial Regex TokenInMail();

    private Guid _listingId;

    private HttpClient _naomi = default!;

    private async Task<HttpClient> NaomiLists(string pastorEmail = PastorEmail)
    {
        var naomi = Member.Join(EmailAddress.TryParse("naomi@example.com")!, "Naomi", "Laurent", null, "hash", ListingMother.Now);
        naomi.ConfirmEmail();
        await _factory.WithDb(async db =>
        {
            db.Members.Add(naomi);
            await db.SaveChangesAsync();
        });
        _naomi = _factory.CreateMemberClient("Naomi Laurent", naomi.Id.ToString());
        var draft = await _naomi.PostAsJsonAsync("/api/listing-drafts", Body(pastorEmail));
        var id = JsonDocument.Parse(await draft.Content.ReadAsStringAsync()).RootElement.GetProperty("id").GetGuid();
        var submitted = await _naomi.PostAsJsonAsync($"/api/listing-drafts/{id}/submit", Body(pastorEmail));
        Assert.Equal(HttpStatusCode.Created, submitted.StatusCode);
        _listingId = JsonDocument.Parse(await submitted.Content.ReadAsStringAsync()).RootElement.GetProperty("listingId").GetGuid();
        return _naomi;
    }

    private static Dictionary<string, object?> Body(string pastorEmail) => new()
    {
        ["kind"] = "products",
        ["name"] = "Luzandre.com",
        ["tagline"] = "Christian apparel and gifts",
        ["categorySlug"] = "shops",
        ["highlight"] = null,
        ["place"] = "Online",
        ["church"] = "Grace Toronto Church",
        ["pastorEmail"] = pastorEmail,
        ["agreed"] = true,
        ["items"] = Array.Empty<object>(),
        ["idempotencyKey"] = Guid.NewGuid().ToString(),
    };

    /// <summary>The links of the reference e-mails sent so far, oldest first.</summary>
    private async Task<List<string>> TokensSent(string toAddress = PastorEmail)
    {
        List<string> tokens = [];
        await _factory.WithDb(async db =>
        {
            var mails = await db.OutboxMessages.AsNoTracking().Where(m => m.ToAddress == toAddress).ToListAsync();
            tokens = [.. mails.Select(m => TokenInMail().Match(m.TextBody)).Where(m => m.Success).Select(m => m.Groups[1].Value)];
        });
        return tokens;
    }

    /// <summary>The token of the link that is open now (the newest one sent).</summary>
    private async Task<string> Token()
    {
        var sent = await TokensSent();
        string? hash = null;
        await _factory.WithDb(async db =>
            hash = (await db.ReferenceLinks.AsNoTracking().Where(l => l.ClosedAt == null).ToListAsync())
                .OrderByDescending(l => l.IssuedAt).FirstOrDefault()?.TokenHash);
        return sent.FirstOrDefault(token => ReferenceTokens.Hash(token) == hash) ?? sent.Last();
    }

    private HttpClient Pastor => _factory.CreateClient();

    private Task<HttpResponseMessage> Open(string token) => Pastor.PostAsJsonAsync("/api/reference-requests/open", new { token });

    private Task<HttpResponseMessage> Answer(string token, string? answer = "vouches", string? name = "Daniel Okoro", string? role = "Lead pastor", string? note = null) =>
        Pastor.PostAsJsonAsync("/api/reference-requests/answer", new { token, answer, name, role, note });

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private Task<JsonElement> Status() => _factory.GetJson($"/api/listings/{_listingId}/reference", _naomi);

    private async Task<ListingStage> StageOfListing()
    {
        var stage = default(ListingStage);
        await _factory.WithDb(async db => stage = (await db.Listings.AsNoTracking().SingleAsync(l => l.Id == _listingId)).Stage);
        return stage;
    }

    // L2-080 AC1
    [Fact]
    public async Task L2_080_AC1_the_e_mail_names_the_owner_the_business_and_the_church_and_links_to_the_form()
    {
        await NaomiLists();

        OutboxMessage mail = default!;
        await _factory.WithDb(async db => mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == PastorEmail));
        Assert.Contains("Naomi Laurent", mail.TextBody);
        Assert.Contains("Luzandre.com", mail.TextBody);
        Assert.Contains("Grace Toronto Church", mail.TextBody);
        Assert.Matches(@"/reference/[0-9a-f]{64}", mail.TextBody);
    }

    // L2-080 AC2, L2-140
    [Fact]
    public async Task L2_080_AC2_the_token_has_256_bits_and_only_its_hash_is_stored()
    {
        await NaomiLists();
        var token = await Token();

        Assert.Equal(64, token.Length);
        await _factory.WithDb(async db =>
        {
            var link = await db.ReferenceLinks.AsNoTracking().SingleAsync();
            Assert.Equal(ReferenceTokens.Hash(token), link.TokenHash);
            Assert.NotEqual(token, link.TokenHash);
            Assert.Equal(PastorEmail, link.ReferenceEmail);
            Assert.Equal(_listingId, link.ListingId);
            Assert.Equal(ListingMother.Now.AddDays(14), link.ExpiresAt);
        });
    }

    [Fact]
    public async Task L2_080_AC2_two_requests_get_different_tokens()
    {
        await NaomiLists();
        await _naomi.PostAsync($"/api/listings/{_listingId}/reference/resend", null);

        var tokens = await TokensSent();

        Assert.Equal(2, tokens.Count);
        Assert.NotEqual(tokens[0], tokens[1]);
    }

    // L2-081 AC1, AC2
    [Fact]
    public async Task L2_081_AC1_a_valid_link_opens_the_form_worded_with_the_owners_first_name()
    {
        await NaomiLists();

        var response = await Open(await Token());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var view = await Json(response);
        Assert.Equal("Naomi Laurent", view.GetProperty("ownerName").GetString());
        Assert.Equal("Luzandre.com", view.GetProperty("business").GetString());
        Assert.Equal("Grace Toronto Church", view.GetProperty("church").GetString());
        Assert.Equal(
            "Naomi is listing Luzandre.com on Jubilee, Toronto’s Christian marketplace, and named you at Grace Toronto Church as Naomi’s church reference. Your answer is private: Naomi and the public never see it.",
            view.GetProperty("intro").GetString());
        Assert.Equal("How well do you know Naomi?", view.GetProperty("question").GetString());
        var answers = view.GetProperty("answers").EnumerateArray().Select(a => a.GetProperty("value").GetString()).ToList();
        Assert.Equal(["vouches", "cant-vouch", "doesnt-know"], answers);
    }

    [Fact]
    public async Task L2_081_AC1_the_form_needs_no_account_and_never_shows_the_tagline_or_the_owners_e_mail()
    {
        await NaomiLists();

        var body = await (await Open(await Token())).Content.ReadAsStringAsync();

        Assert.DoesNotContain("Christian apparel and gifts", body);
        Assert.DoesNotContain("naomi@example.com", body);
    }

    // L2-081 AC3, L2-126
    [Fact]
    public async Task L2_081_AC3_an_answer_without_a_choice_and_a_role_is_refused_with_both_codes()
    {
        await NaomiLists();

        var response = await Answer(await Token(), answer: null, role: " ");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("ANSWER_REQUIRED", errors.GetProperty("answer").GetString());
        Assert.Equal("ROLE_REQUIRED", errors.GetProperty("role").GetString());
        Assert.False(errors.TryGetProperty("name", out _));
        Assert.Equal(ListingStage.PendingReference, await StageOfListing());
    }

    [Fact]
    public async Task L2_081_AC2_a_note_over_1000_characters_is_refused_and_1000_is_kept()
    {
        await NaomiLists();
        var token = await Token();

        var tooLong = await Answer(token, note: new string('n', 1001));
        var fits = await Answer(token, note: new string('n', 1000));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, tooLong.StatusCode);
        Assert.Equal("NOTE_TOO_LONG", (await Json(tooLong)).GetProperty("errors").GetProperty("note").GetString());
        Assert.Equal(HttpStatusCode.NoContent, fits.StatusCode);
    }

    // L2-081 AC4, L2-083 AC1
    [Fact]
    public async Task L2_081_AC4_a_valid_answer_is_stored_privately_and_the_link_stops_working()
    {
        await NaomiLists();
        var token = await Token();

        var response = await Answer(token, note: "Naomi has served on our hospitality team for six years.");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await _factory.WithDb(async db =>
        {
            var answer = await db.ReferenceAnswers.AsNoTracking().SingleAsync();
            Assert.Equal(ReferenceAnswerKind.Vouches, answer.Kind);
            Assert.Equal("Daniel Okoro", answer.Name);
            Assert.Equal("Lead pastor", answer.Role);
            Assert.Equal("Naomi has served on our hospitality team for six years.", answer.Note);
        });
        Assert.Equal(HttpStatusCode.Gone, (await Open(token)).StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await Answer(token)).StatusCode);
    }

    [Fact]
    public async Task L2_083_AC1_vouching_moves_the_listing_to_ready_to_review()
    {
        await NaomiLists();

        await Answer(await Token(), "vouches");

        Assert.Equal(ListingStage.ReadyToReview, await StageOfListing());
        Assert.Equal("answered", (await Status()).GetProperty("state").GetString());
    }

    // L2-083 AC2
    [Fact]
    public async Task L2_083_AC2_a_reference_who_cannot_vouch_moves_the_listing_to_needs_a_decision()
    {
        await NaomiLists();

        await Answer(await Token(), "cant-vouch");

        Assert.Equal(ListingStage.NeedsDecision, await StageOfListing());
        Assert.Equal("under-review", (await Status()).GetProperty("state").GetString());
    }

    // L2-083 AC3
    [Fact]
    public async Task L2_083_AC3_a_reference_who_does_not_know_the_owner_leaves_the_listing_unpublished_and_the_owner_is_told()
    {
        await NaomiLists();

        await Answer(await Token(), "doesnt-know");

        Assert.Equal(ListingStage.NeedsDecision, await StageOfListing());
        Assert.Equal("not-known", (await Status()).GetProperty("state").GetString());
    }

    // L2-083 AC4, L2-146
    [Theory]
    [InlineData("vouches")]
    [InlineData("cant-vouch")]
    [InlineData("doesnt-know")]
    public async Task L2_083_AC4_the_owner_never_sees_the_answer_the_name_the_role_or_the_note(string answer)
    {
        await NaomiLists();
        await Answer(await Token(), answer, name: "Daniel Okoro", role: "Lead pastor", note: "A private remark about Naomi.");

        var raw = await (await _naomi.GetAsync($"/api/listings/{_listingId}/reference")).Content.ReadAsStringAsync();

        Assert.DoesNotContain("Lead pastor", raw);
        Assert.DoesNotContain("A private remark", raw);
        Assert.DoesNotContain("Daniel Okoro", raw);
        Assert.DoesNotContain("vouch", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task L2_146_another_member_cannot_read_the_stage_of_a_reference()
    {
        await NaomiLists();
        var stranger = _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/listings/{_listingId}/reference")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsync($"/api/listings/{_listingId}/reference/resend", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync($"/api/listings/{_listingId}/reference")).StatusCode);
    }

    // L2-081 AC5
    [Fact]
    public async Task L2_081_AC5_reporting_an_unexpected_request_closes_the_link_and_flags_the_listing()
    {
        await NaomiLists();
        var token = await Token();

        var response = await Pastor.PostAsJsonAsync("/api/reference-requests/report", new { token });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await Open(token)).StatusCode);
        Assert.Equal(ListingStage.NeedsDecision, await StageOfListing());
        await _factory.WithDb(async db =>
            Assert.Contains("REFERENCE_REPORTED", (await db.ListingSubmissions.AsNoTracking().SingleAsync()).Flags));
        Assert.Equal("under-review", (await Status()).GetProperty("state").GetString());
    }

    // L2-082 AC1
    [Fact]
    public async Task L2_082_AC1_a_link_older_than_14_days_is_closed()
    {
        await NaomiLists();
        var token = await Token();
        _factory.Clock.Advance(TimeSpan.FromDays(14));

        var response = await Open(token);

        Assert.Equal(HttpStatusCode.Gone, response.StatusCode);
        Assert.Equal("REFERENCE_LINK_CLOSED", (await Json(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_082_AC1_a_link_works_on_the_last_day()
    {
        await NaomiLists();
        var token = await Token();
        _factory.Clock.Advance(TimeSpan.FromDays(14) - TimeSpan.FromMinutes(1));

        Assert.Equal(HttpStatusCode.OK, (await Open(token)).StatusCode);
    }

    [Fact]
    public async Task L2_082_AC1_a_replaced_link_is_closed()
    {
        await NaomiLists();
        var old = await Token();
        await _naomi.PostAsync($"/api/listings/{_listingId}/reference/resend", null);

        Assert.Equal(HttpStatusCode.Gone, (await Open(old)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Open(await Token())).StatusCode);
    }

    // L2-082 AC2
    [Theory]
    [InlineData("0000000000000000000000000000000000000000000000000000000000000000")]
    [InlineData("not-a-token")]
    [InlineData("")]
    public async Task L2_082_AC2_an_unknown_token_is_a_404_that_reveals_nothing(string token)
    {
        await NaomiLists();

        var response = await Open(token);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal("REFERENCE_LINK_CLOSED", JsonDocument.Parse(body).RootElement.GetProperty("code").GetString());
        Assert.DoesNotContain("Luzandre", body);
        Assert.DoesNotContain("Naomi", body);
    }

    // L2-082 AC3
    [Fact]
    public async Task L2_082_AC3_a_failure_while_loading_carries_the_reference_JB_REF_502()
    {
        await NaomiLists();
        var token = await Token();
        _factory.Database.Unavailable = true;

        var response = await Open(token);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-REF-502", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-133 AC4
    [Fact]
    public async Task L2_133_AC4_an_answer_with_an_unknown_field_is_refused()
    {
        await NaomiLists();
        var token = await Token();

        var response = await Pastor.PostAsJsonAsync("/api/reference-requests/answer", new
        {
            token, answer = "vouches", name = "D", role = "R", stage = "Live",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ListingStage.PendingReference, await StageOfListing());
    }

    // L2-080 AC3
    [Fact]
    public async Task L2_080_AC3_sending_the_request_again_sends_a_fresh_link_and_the_old_one_stops_working()
    {
        await NaomiLists();
        var first = await Token();

        var response = await _naomi.PostAsync($"/api/listings/{_listingId}/reference/resend", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var tokens = await TokensSent();
        Assert.Equal(2, tokens.Count);
        Assert.Equal(HttpStatusCode.Gone, (await Open(first)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Open(await Token())).StatusCode);
        Assert.Equal(2, (await Json(response)).GetProperty("resendsLeft").GetInt32());
    }

    [Fact]
    public async Task L2_080_AC3_a_fourth_resend_within_24_hours_is_refused_and_allowed_again_after_the_window()
    {
        await NaomiLists();
        for (var i = 0; i < 3; i++)
        {
            Assert.Equal(HttpStatusCode.OK, (await _naomi.PostAsync($"/api/listings/{_listingId}/reference/resend", null)).StatusCode);
        }

        var fourth = await _naomi.PostAsync($"/api/listings/{_listingId}/reference/resend", null);

        Assert.Equal((HttpStatusCode)429, fourth.StatusCode);
        Assert.Equal("REFERENCE_RESEND_LIMIT", (await Json(fourth)).GetProperty("code").GetString());
        Assert.NotNull(fourth.Headers.RetryAfter);

        _factory.Clock.Advance(TimeSpan.FromHours(24) + TimeSpan.FromMinutes(1));
        Assert.Equal(HttpStatusCode.OK, (await _naomi.PostAsync($"/api/listings/{_listingId}/reference/resend", null)).StatusCode);
    }

    [Fact]
    public async Task L2_080_AC3_a_listing_that_is_not_waiting_cannot_send_the_request_again()
    {
        await NaomiLists();
        await Answer(await Token());

        var response = await _naomi.PostAsync($"/api/listings/{_listingId}/reference/resend", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    // L2-084 AC1
    [Fact]
    public async Task L2_084_AC1_after_7_days_the_owner_is_offered_a_reminder()
    {
        await NaomiLists();
        Assert.False((await Status()).GetProperty("reminderDue").GetBoolean());

        _factory.Clock.Advance(TimeSpan.FromDays(7));

        var status = await Status();
        Assert.True(status.GetProperty("reminderDue").GetBoolean());
        Assert.True(status.GetProperty("canRemind").GetBoolean());
        Assert.Equal("waiting", status.GetProperty("state").GetString());
        Assert.Equal(PastorEmail, status.GetProperty("referenceEmail").GetString());
        Assert.Equal("Grace Toronto Church", status.GetProperty("church").GetString());
    }

    // L2-084 AC2
    [Fact]
    public async Task L2_084_AC2_a_reminder_sends_a_new_link_and_only_one_per_72_hours()
    {
        await NaomiLists();
        var first = await Token();
        _factory.Clock.Advance(TimeSpan.FromDays(7));

        var response = await _naomi.PostAsync($"/api/listings/{_listingId}/reference/remind", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var tokens = await TokensSent();
        Assert.Equal(2, tokens.Count);
        Assert.Equal(HttpStatusCode.Gone, (await Open(first)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Open(await Token())).StatusCode);
        Assert.False((await Json(response)).GetProperty("canRemind").GetBoolean());

        var again = await _naomi.PostAsync($"/api/listings/{_listingId}/reference/remind", null);
        Assert.Equal((HttpStatusCode)429, again.StatusCode);
        Assert.Equal("REFERENCE_REMINDER_LIMIT", (await Json(again)).GetProperty("code").GetString());

        _factory.Clock.Advance(TimeSpan.FromHours(72) + TimeSpan.FromMinutes(1));
        Assert.Equal(HttpStatusCode.OK, (await _naomi.PostAsync($"/api/listings/{_listingId}/reference/remind", null)).StatusCode);
    }

    // L2-084 AC3
    [Fact]
    public async Task L2_084_AC3_changing_the_reference_closes_the_old_link_and_sends_a_request_to_the_new_one()
    {
        await NaomiLists();
        var old = await Token();

        var response = await _naomi.PostAsJsonAsync(
            $"/api/listings/{_listingId}/reference/change", new { church = "St Anne's", pastorEmail = "Anne.Lee@stannes.example" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await Open(old)).StatusCode);
        var fresh = (await TokensSent("Anne.Lee@stannes.example")).Single();
        var view = await Json(await Open(fresh));
        Assert.Equal("St Anne's", view.GetProperty("church").GetString());
        var status = await Status();
        Assert.Equal("St Anne's", status.GetProperty("church").GetString());
        Assert.Equal("waiting", status.GetProperty("state").GetString());
    }

    [Fact]
    public async Task L2_084_AC3_after_a_reference_who_did_not_know_the_owner_a_new_reference_restarts_the_wait()
    {
        await NaomiLists();
        await Answer(await Token(), "doesnt-know");

        var response = await _naomi.PostAsJsonAsync(
            $"/api/listings/{_listingId}/reference/change", new { church = "St Anne's", pastorEmail = "anne.lee@stannes.example" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ListingStage.PendingReference, await StageOfListing());
        Assert.Equal("waiting", (await Status()).GetProperty("state").GetString());
    }

    [Fact]
    public async Task L2_084_AC3_a_new_reference_needs_a_church_and_an_e_mail_other_than_the_owners()
    {
        await NaomiLists();

        var response = await _naomi.PostAsJsonAsync(
            $"/api/listings/{_listingId}/reference/change", new { church = " ", pastorEmail = "naomi@example.com" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REQUIRED", errors.GetProperty("church").GetString());
        Assert.Equal("OWN_EMAIL", errors.GetProperty("pastorEmail").GetString());
        Assert.Single(await TokensSent());
    }

    // L2-084 AC4
    [Fact]
    public async Task L2_084_AC4_after_14_days_unanswered_the_owner_is_e_mailed_once_and_can_send_a_new_request()
    {
        await NaomiLists();
        _factory.Clock.Advance(TimeSpan.FromDays(14) + TimeSpan.FromMinutes(1));

        var sent = await Sweep();
        var again = await Sweep();

        Assert.Equal(1, sent);
        Assert.Equal(0, again);
        await _factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "naomi@example.com");
            Assert.Contains("didn’t answer", mail.Subject);
        });
        var status = await Status();
        Assert.Equal("expired", status.GetProperty("state").GetString());
        Assert.False(status.GetProperty("canRemind").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, (await _naomi.PostAsync($"/api/listings/{_listingId}/reference/resend", null)).StatusCode);
        Assert.Equal("waiting", (await Status()).GetProperty("state").GetString());
    }

    [Fact]
    public async Task L2_084_AC4_an_answered_reference_is_not_reported_as_expired()
    {
        await NaomiLists();
        await Answer(await Token());
        _factory.Clock.Advance(TimeSpan.FromDays(20));

        Assert.Equal(0, await Sweep());
    }

    private async Task<int> Sweep()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<MediatR.ISender>().Send(new NotifyExpiredReferencesCommand());
    }
}
