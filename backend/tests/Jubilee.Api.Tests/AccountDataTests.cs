using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

/// <summary>Download your data and delete your account: L2-017, L2-018, L2-133, L2-140, L2-146, L2-148, L2-180, L2-182.</summary>
public sealed partial class AccountDataTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Password = "correct horse 13";
    private const string Trevor = "member|trevor";

    private readonly JubileeApiFactory _factory;

    public AccountDataTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<HttpClient> Join(string email, string first, string last)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.CookieSessionHeader, "1");
        var response = await client.PostAsJsonAsync("/api/account/join", new
        {
            firstName = first,
            lastName = last,
            email,
            password = Password,
            homeChurch = "Grace Toronto Church",
            agreementAccepted = true,
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var token = Xsrf().Match(string.Join(';', response.Headers.GetValues("Set-Cookie"))).Groups[1].Value;
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", token);
        return client;
    }

    [GeneratedRegex("XSRF-TOKEN=([^;]+)")]
    private static partial Regex Xsrf();

    [GeneratedRegex(@"/account/data/([A-Za-z0-9_-]+)")]
    private static partial Regex DownloadLink();

    private async Task<(HttpClient Client, Member Member)> Joanna()
    {
        var client = await Join("joanna@example.com", "Joanna", "Adeyemi");
        var member = await Read(db => db.Members.SingleAsync(m => m.EmailKey == "joanna@example.com"));
        return (client, member);
    }

    private async Task<T> Read<T>(Func<Infrastructure.Persistence.AppDbContext, Task<T>> work)
    {
        T result = default!;
        await _factory.WithDb(async db => result = await work(db));
        return result;
    }

    private async Task Run(Func<IServiceProvider, Task> work)
    {
        using var scope = _factory.Services.CreateScope();
        await work(scope.ServiceProvider);
    }

    private Task BuildExports() => Run(s => s.GetRequiredService<DataExportBuilder>().BuildDueAsync(CancellationToken.None));

    private async Task<string> LinkTokenFor(Member member)
    {
        var mail = await Read(db => db.OutboxMessages.Where(o => o.MemberId == member.Id && o.Subject.Contains("data")).SingleAsync());
        return DownloadLink().Match(mail.TextBody).Groups[1].Value;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static HttpRequestMessage Delete(string confirmation) =>
        new(HttpMethod.Delete, "/api/account") { Content = JsonContent.Create(new { confirmation }) };

    // ---- download your data (L2-018) --------------------------------------------------------

    [Fact]
    public async Task L2_018_AC1_A_request_is_accepted_and_waits_for_the_background_job()
    {
        var (client, _) = await Joanna();

        var response = await client.PostAsync("/api/account/data-exports", null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal("requested", (await Json(response)).GetProperty("status").GetString());
        var current = await _factory.GetJson("/api/account/data-exports/current", client);
        Assert.Equal("requested", current.GetProperty("status").GetString());
        Assert.Equal(0, await Read(db => db.OutboxMessages.CountAsync(o => o.Subject.Contains("data"))));
    }

    [Fact]
    public async Task L2_018_A_second_request_while_one_waits_returns_the_same_export()
    {
        var (client, member) = await Joanna();

        await client.PostAsync("/api/account/data-exports", null);
        var second = await client.PostAsync("/api/account/data-exports", null);

        Assert.Equal(HttpStatusCode.Accepted, second.StatusCode);
        Assert.Equal(1, await Read(db => db.DataExports.CountAsync(e => e.MemberId == member.Id)));
    }

    [Fact]
    public async Task L2_018_A_fourth_request_in_a_day_is_refused()
    {
        var (client, _) = await Joanna();
        for (var i = 0; i < DataExport.RequestsPerDay; i++)
        {
            Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsync("/api/account/data-exports", null)).StatusCode);
            await BuildExports();
        }

        var refused = await client.PostAsync("/api/account/data-exports", null);

        Assert.Equal((HttpStatusCode)429, refused.StatusCode);
    }

    [Fact]
    public async Task L2_018_AC1_The_job_builds_the_archive_and_e_mails_the_member_a_link()
    {
        var (client, member) = await Joanna();
        await client.PostAsync("/api/account/data-exports", null);

        await BuildExports();

        var mail = await Read(db => db.OutboxMessages.Where(o => o.MemberId == member.Id && o.Subject.Contains("data")).SingleAsync());
        Assert.Equal("joanna@example.com", mail.ToAddress);
        Assert.Matches(@"/account/data/[A-Za-z0-9_-]{40,}", mail.TextBody);
        Assert.Contains("7 days", mail.TextBody);
        var current = await _factory.GetJson("/api/account/data-exports/current", client);
        Assert.Equal("ready", current.GetProperty("status").GetString());
        Assert.NotNull(current.GetProperty("expiresAt").GetString());
    }

    [Fact]
    public async Task L2_140_The_token_is_stored_only_as_a_hash()
    {
        var (client, member) = await Joanna();
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();

        var token = await LinkTokenFor(member);
        var export = await Read(db => db.DataExports.SingleAsync(e => e.MemberId == member.Id));

        Assert.NotEqual(token, export.TokenHash);
        Assert.Equal(LinkTokens.Hash(token), export.TokenHash);
    }

    [Fact]
    public async Task L2_018_AC1_The_archive_holds_profile_saved_list_requests_messages_and_notification_settings()
    {
        var (client, member) = await Joanna();
        var subject = member.Id.ToString();
        var listing = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        listing.AssignOwner(Trevor);
        var conversation = Conversation.Start(listing.Id, subject, "Joanna Adeyemi", ListingMother.Now);
        var message = Message.Send(conversation.Id, subject, "Joanna Adeyemi", false, "Could we meet on Friday?", "k1", null, false, ListingMother.Now);
        var request = Request.Book(
            subject, "Joanna Adeyemi", listing.Id, Guid.NewGuid(), "Planning call", ListingMother.Now.AddDays(3), TimeSpan.FromMinutes(30),
            MeetingMode.Video, null, "Bring last year's statement", "b1", ListingMother.Now);
        await _factory.Arrange(listing, conversation, message, request, SavedItem.Business(subject, listing.Id, ListingMother.Now));
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();

        var response = await client.GetAsync($"/api/account/data-exports/{await LinkTokenFor(member)}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("attachment", response.Content.Headers.ContentDisposition?.ToString());
        Assert.Contains("no-store", response.Headers.CacheControl?.ToString());
        Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
        var text = await response.Content.ReadAsStringAsync();
        var archive = JsonDocument.Parse(text).RootElement;
        Assert.Equal("Joanna", archive.GetProperty("profile").GetProperty("firstName").GetString());
        Assert.Equal("joanna@example.com", archive.GetProperty("profile").GetProperty("email").GetString());
        Assert.Equal("Legacy Financial", archive.GetProperty("savedList")[0].GetProperty("name").GetString());
        Assert.Equal("Planning call", archive.GetProperty("requests")[0].GetProperty("service").GetString());
        Assert.Equal(
            "Could we meet on Friday?",
            archive.GetProperty("conversations")[0].GetProperty("messages")[0].GetProperty("body").GetString());
        Assert.True(archive.GetProperty("notificationSettings").GetProperty("messages").GetBoolean());
        Assert.DoesNotContain("argon2", text, StringComparison.OrdinalIgnoreCase);
        Assert.False(archive.TryGetProperty("listings", out _));
    }

    [Fact]
    public async Task L2_018_AC3_An_owner_s_archive_also_holds_the_listing_products_services_and_incoming_requests()
    {
        var (client, member) = await Joanna();
        var subject = member.Id.ToString();
        var listing = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        listing.AssignOwner(subject);
        var customer = Request.Book(
            Trevor, "Trevor Chew", listing.Id, Guid.NewGuid(), "Planning call", ListingMother.Now.AddDays(3), TimeSpan.FromMinutes(30),
            MeetingMode.Video, null, null, "b1", ListingMother.Now);
        await _factory.Arrange(listing, customer);
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();

        var archive = await Json(await client.GetAsync($"/api/account/data-exports/{await LinkTokenFor(member)}"));

        Assert.Equal("Legacy Financial", archive.GetProperty("listings")[0].GetProperty("name").GetString());
        Assert.Equal("Trevor Chew", archive.GetProperty("incomingRequests")[0].GetProperty("from").GetString());
    }

    [Fact]
    public async Task L2_146_The_archive_never_holds_the_church_reference_s_private_answer()
    {
        var (client, member) = await Joanna();
        var listing = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        listing.AssignOwner(member.Id.ToString());
        var link = ReferenceLink.Issue(listing.Id, "hash", "pastor@grace.example", "Grace Toronto Church", ReferenceLinkKind.Initial, ListingMother.Now);
        var answer = ReferenceAnswer.Record(
            listing.Id, link.Id, ReferenceAnswerKind.Vouches, "Pastor Okoro", "Lead pastor", "PRIVATE-NOTE-ABOUT-THE-OWNER", ListingMother.Now);
        await _factory.Arrange(listing, link, answer);
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();

        var text = await (await client.GetAsync($"/api/account/data-exports/{await LinkTokenFor(member)}")).Content.ReadAsStringAsync();

        Assert.DoesNotContain("PRIVATE-NOTE-ABOUT-THE-OWNER", text);
        Assert.DoesNotContain("pastor@grace.example", text);
        Assert.DoesNotContain("Pastor Okoro", text);
    }

    [Fact]
    public async Task L2_018_AC2_Another_member_and_a_visitor_cannot_open_the_link()
    {
        var (client, member) = await Joanna();
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();
        var token = await LinkTokenFor(member);
        var other = await Join("trevor@example.com", "Trevor", "Chew");

        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/account/data-exports/{token}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync($"/api/account/data-exports/{token}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/account/data-exports/not-a-token")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/account/data-exports/{token}")).StatusCode);
    }

    [Fact]
    public async Task L2_018_AC2_The_link_works_for_7_days_and_the_file_is_then_deleted()
    {
        var (client, member) = await Joanna();
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();
        var token = await LinkTokenFor(member);

        _factory.Clock.Advance(TimeSpan.FromDays(6));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/account/data-exports/{token}")).StatusCode);

        _factory.Clock.Advance(TimeSpan.FromDays(2));
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/account/data-exports/{token}")).StatusCode);
        await Run(s => s.GetRequiredService<DataExportBuilder>().ExpireAsync(CancellationToken.None));
        var export = await Read(db => db.DataExports.SingleAsync(e => e.MemberId == member.Id));
        Assert.Equal(DataExportStatus.Expired, export.Status);
        Assert.Null(export.ArchiveJson);
        var current = await _factory.GetJson("/api/account/data-exports/current", client);
        Assert.Equal("expired", current.GetProperty("status").GetString());
    }

    [Fact]
    public async Task L2_182_A_build_that_keeps_failing_is_tried_5_times_and_then_marked_failed()
    {
        var (client, member) = await Joanna();
        await client.PostAsync("/api/account/data-exports", null);
        await _factory.WithDb(async db =>
        {
            // The member the export belongs to is gone, so every build fails.
            db.Members.Remove(await db.Members.SingleAsync(m => m.Id == member.Id));
            await db.SaveChangesAsync();
        });

        for (var i = 0; i < DataExport.MaxAttempts; i++)
        {
            await BuildExports();
        }

        var export = await Read(db => db.DataExports.SingleAsync());
        Assert.Equal(DataExportStatus.Failed, export.Status);
        Assert.Equal(DataExport.MaxAttempts, export.Attempts);
    }

    [Fact]
    public async Task L2_133_Asking_for_an_export_needs_a_signed_in_member()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().PostAsync("/api/account/data-exports", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/account/data-exports/current")).StatusCode);
    }

    // ---- delete your account (L2-017) -------------------------------------------------------

    [Fact]
    public async Task L2_017_AC1_The_summary_names_the_account_and_counts_what_is_deleted()
    {
        var (client, member) = await Joanna();
        var subject = member.Id.ToString();
        var listing = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        listing.AssignOwner(Trevor);
        var conversation = Conversation.Start(listing.Id, subject, "Joanna Adeyemi", ListingMother.Now);
        var open = Request.Book(
            subject, "Joanna Adeyemi", listing.Id, Guid.NewGuid(), "Planning call", ListingMother.Now.AddDays(3), TimeSpan.FromMinutes(30),
            MeetingMode.Video, null, null, "b1", ListingMother.Now);
        var declined = Request.Book(
            subject, "Joanna Adeyemi", listing.Id, Guid.NewGuid(), "Planning call", ListingMother.Now.AddDays(4), TimeSpan.FromMinutes(30),
            MeetingMode.Video, null, null, "b2", ListingMother.Now);
        declined.Decline(Trevor, ListingMother.Now);
        await _factory.Arrange(listing, conversation, open, declined);

        var summary = await _factory.GetJson("/api/account/deletion-summary", client);

        Assert.Equal("Joanna Adeyemi", summary.GetProperty("name").GetString());
        Assert.Equal("joanna@example.com", summary.GetProperty("email").GetString());
        Assert.Equal(1, summary.GetProperty("conversations").GetInt32());
        Assert.Equal(1, summary.GetProperty("openRequests").GetInt32());
    }

    [Theory]
    [InlineData("")]
    [InlineData("delete")]
    [InlineData("DELETE ME")]
    [InlineData("Delete")]
    public async Task L2_017_AC2_Anything_but_exactly_DELETE_deletes_nothing(string typed)
    {
        var (client, member) = await Joanna();

        var response = await client.SendAsync(Delete(typed));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("CONFIRMATION_MISMATCH", (await Json(response)).GetProperty("errors").GetProperty("confirmation").GetString());
        Assert.Null((await Read(db => db.Members.SingleAsync(m => m.Id == member.Id))).DeletedAt);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/account")).StatusCode);
    }

    [Fact]
    public async Task L2_017_AC3_Deleting_ends_every_session_and_nothing_can_sign_in_again()
    {
        var (client, member) = await Joanna();
        var other = _factory.CreateClient();
        other.DefaultRequestHeaders.Add(TestAuthHandler.CookieSessionHeader, "1");
        var signIn = await other.PostAsJsonAsync("/api/account/sign-in", new { email = "joanna@example.com", password = Password });
        Assert.True(signIn.IsSuccessStatusCode);

        var response = await client.SendAsync(Delete("DELETE"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.NotNull((await Read(db => db.Members.SingleAsync(m => m.Id == member.Id))).DeletedAt);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/account")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await other.GetAsync("/api/account")).StatusCode);
        var again = await _factory.CreateClient().PostAsJsonAsync("/api/account/sign-in", new { email = "joanna@example.com", password = Password });
        Assert.Equal(HttpStatusCode.Unauthorized, again.StatusCode);
    }

    [Fact]
    public async Task L2_017_AC3_Open_requests_are_cancelled_and_the_businesses_are_told()
    {
        var (client, member) = await Joanna();
        var subject = member.Id.ToString();
        var listing = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        listing.AssignOwner(Trevor);
        var open = Request.Book(
            subject, "Joanna Adeyemi", listing.Id, Guid.NewGuid(), "Planning call", ListingMother.Now.AddDays(3), TimeSpan.FromMinutes(30),
            MeetingMode.Video, null, null, "b1", ListingMother.Now);
        var saved = SavedItem.Business(subject, listing.Id, ListingMother.Now);
        await _factory.Arrange(listing, open, saved);

        await client.SendAsync(Delete("DELETE"));

        Assert.Equal(RequestStatus.Cancelled, (await Read(db => db.Requests.SingleAsync())).Status);
        var told = await Read(db => db.Notifications.Where(n => n.MemberSubject == Trevor).ToListAsync());
        Assert.Contains(told, n => n.Kind == "request" && n.Title.Contains("cancelled"));
        Assert.Equal(0, await Read(db => db.SavedItems.CountAsync(s => s.MemberSubject == subject)));
    }

    [Fact]
    public async Task L2_017_AC3_A_confirmation_e_mail_is_sent()
    {
        var (client, member) = await Joanna();

        await client.SendAsync(Delete("DELETE"));

        var mail = await Read(db => db.OutboxMessages.Where(o => o.ToAddress == "joanna@example.com" && o.Subject.Contains("deleted")).SingleAsync());
        Assert.Contains("30 days", mail.TextBody);
    }

    [Fact]
    public async Task L2_017_AC4_The_member_s_listing_is_unpublished_and_leaves_browse_at_once()
    {
        var (client, member) = await Joanna();
        var listing = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        listing.AssignOwner(member.Id.ToString());
        await _factory.Arrange(listing);
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/listings/legacy-financial")).StatusCode);

        await client.SendAsync(Delete("DELETE"));

        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/legacy-financial")).StatusCode);
        Assert.NotNull((await Read(db => db.Listings.SingleAsync())).DeletedAt);
    }

    [Fact]
    public async Task L2_180_Deleting_an_account_is_written_to_the_audit_log()
    {
        var (client, member) = await Joanna();

        await client.SendAsync(Delete("DELETE"));

        var record = await Read(db => db.AuditRecords.SingleAsync(a => a.Action == "account.deleted"));
        Assert.Equal(member.Id.ToString(), record.TargetId);
        Assert.DoesNotContain("joanna@example.com", record.Before ?? string.Empty);
    }

    [Fact]
    public async Task L2_017_AC5_A_failed_deletion_removes_nothing()
    {
        var (client, member) = await Joanna();
        _factory.Database.Unavailable = true;

        var response = await client.SendAsync(Delete("DELETE"));
        _factory.Database.Unavailable = false;

        Assert.False(response.IsSuccessStatusCode);
        Assert.Null((await Read(db => db.Members.SingleAsync(m => m.Id == member.Id))).DeletedAt);
    }

    [Fact]
    public async Task L2_017_AC6_After_30_days_the_personal_data_is_erased_and_messages_stay_from_a_former_member()
    {
        var (client, member) = await Joanna();
        var subject = member.Id.ToString();
        var listing = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        listing.AssignOwner(Trevor);
        var conversation = Conversation.Start(listing.Id, subject, "Joanna Adeyemi", ListingMother.Now);
        var message = Message.Send(conversation.Id, subject, "Joanna Adeyemi", false, "Could we meet on Friday?", "k1", null, false, ListingMother.Now);
        var request = Request.Book(
            subject, "Joanna Adeyemi", listing.Id, Guid.NewGuid(), "Planning call", ListingMother.Now.AddDays(3), TimeSpan.FromMinutes(30),
            MeetingMode.Video, null, null, "b1", ListingMother.Now);
        await _factory.Arrange(listing, conversation, message, request);
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();
        await client.SendAsync(Delete("DELETE"));

        _factory.Clock.Advance(TimeSpan.FromDays(29));
        await Run(s => s.GetRequiredService<AccountErasure>().EraseDueAsync(CancellationToken.None));
        Assert.Equal("Joanna", (await Read(db => db.Members.SingleAsync(m => m.Id == member.Id))).FirstName);

        _factory.Clock.Advance(TimeSpan.FromDays(2));
        await Run(s => s.GetRequiredService<AccountErasure>().EraseDueAsync(CancellationToken.None));

        var erased = await Read(db => db.Members.SingleAsync(m => m.Id == member.Id));
        Assert.NotNull(erased.ErasedAt);
        Assert.DoesNotContain("joanna", erased.Email);
        Assert.Equal("Former", erased.FirstName);
        Assert.Null(erased.HomeChurch);
        Assert.Equal("Former member", (await Read(db => db.Conversations.SingleAsync())).MemberName);
        Assert.Equal("Former member", (await Read(db => db.Messages.SingleAsync())).SenderName);
        Assert.Equal("Former member", (await Read(db => db.Requests.SingleAsync())).MemberName);
        Assert.Equal("Could we meet on Friday?", (await Read(db => db.Messages.SingleAsync())).Body);
        Assert.Equal(0, await Read(db => db.DataExports.CountAsync()));
        Assert.Equal(0, await Read(db => db.Notifications.CountAsync(n => n.MemberSubject == subject)));
    }

    [Fact]
    public async Task L2_017_An_account_that_is_not_yet_deleted_is_not_erased()
    {
        var (_, member) = await Joanna();

        _factory.Clock.Advance(TimeSpan.FromDays(90));
        await Run(s => s.GetRequiredService<AccountErasure>().EraseDueAsync(CancellationToken.None));

        Assert.Equal("Joanna", (await Read(db => db.Members.SingleAsync(m => m.Id == member.Id))).FirstName);
    }
}
