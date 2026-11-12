using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Request a quote: L2-043, L2-045, L2-005 AC2, L2-126 and L2-132.
// "Today" is Tuesday 10 November 2026, 10:00 in Toronto (ListingMother.Now).
public sealed class QuoteTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string NaomiId = "member|naomi";

    private readonly JubileeApiFactory _factory;
    private Guid _customWork;

    public QuoteTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var shop = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        shop.AssignOwner(NaomiId);
        shop.Describe(new ListingProfile("Naomi Luzandre", [], null, "Toronto", null, null, null, null));
        shop.SetMedianResponseMinutes(120);
        var custom = Service.Create(shop.Id, 1, "Custom work", "Tees, mugs, banners", ServicePrice.Ask, ServiceAction.Ask);
        var other = ListingMother.Public("wise-plumbing", "home-property", "Wise Plumbing");
        var otherService = Service.Create(other.Id, 1, "Estimate", "Ask", ServicePrice.Ask, ServiceAction.Ask);
        await _factory.Arrange(shop, custom, other, otherService);
        _customWork = custom.Id;
        _otherService = otherService.Id;
    }

    private Guid _otherService;

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private Task<HttpResponseMessage> Ask(
        HttpClient client,
        string? description = "150 tees and 60 mugs for our church's 25th anniversary.",
        string? neededBy = null,
        string? budget = null,
        string? phone = null,
        Guid? service = null,
        string slug = "luzandre-com",
        string? key = null) =>
        client.PostAsJsonAsync("/api/requests/quotes", new
        {
            listingSlug = slug,
            serviceId = service,
            description,
            neededBy,
            budget,
            phone,
            idempotencyKey = key ?? Guid.NewGuid().ToString(),
        });

    private async Task<int> RequestCount()
    {
        var count = 0;
        await _factory.WithDb(async db => count = await db.Requests.CountAsync());
        return count;
    }

    // L2-045 AC1
    [Fact]
    public async Task L2_045_AC1_the_options_name_the_business_the_owner_and_how_soon_they_reply()
    {
        var options = await _factory.GetJson("/api/listings/luzandre-com/quote", Joanna());

        Assert.Equal("Luzandre.com", options.GetProperty("business").GetProperty("name").GetString());
        Assert.Equal("Naomi", options.GetProperty("ownerFirstName").GetString());
        Assert.Equal("within a few hours", options.GetProperty("usuallyReplies").GetString());
    }

    // L2-045 AC7: a member with a phone in the profile, signed in as that member.
    private async Task<(Member Member, HttpClient Client)> AMember(string firstName, string? phone)
    {
        var member = Member.Join(EmailAddress.TryParse($"{firstName.ToLowerInvariant()}@example.com")!, firstName, "Mensah", null, "hash", ListingMother.Now);
        member.ConfirmEmail();
        member.UpdateProfile(firstName, "Mensah", phone, null, null, null, null, ListingMother.Now);
        await _factory.Arrange(member);
        return (member, _factory.CreateMemberClient($"{firstName} Mensah", member.Id.ToString()));
    }

    // L2-045 AC7
    [Fact]
    public async Task L2_045_AC7_the_options_carry_the_phone_of_the_members_profile_written_with_dashes()
    {
        var (_, ruth) = await AMember("Ruth", "4165550142");

        var options = await _factory.GetJson("/api/listings/luzandre-com/quote", ruth);

        Assert.Equal("416-555-0142", options.GetProperty("phone").GetString());
    }

    // L2-045 AC7
    [Fact]
    public async Task L2_045_AC7_a_member_with_no_phone_in_the_profile_gets_none_and_nobody_gets_another_members()
    {
        await AMember("Ruth", "4165550142");
        var (_, esther) = await AMember("Esther", null);

        var without = await _factory.GetJson("/api/listings/luzandre-com/quote", esther);
        var noRecord = await _factory.GetJson("/api/listings/luzandre-com/quote", Joanna());

        Assert.Equal(JsonValueKind.Null, without.GetProperty("phone").ValueKind);
        Assert.Equal(JsonValueKind.Null, noRecord.GetProperty("phone").ValueKind);
    }

    // L2-045 AC7: the number sent goes with the request only
    [Theory]
    [InlineData("647-555-0199", "6475550199")]
    [InlineData(null, null)]
    public async Task L2_045_AC7_a_phone_changed_or_cleared_in_the_dialog_is_kept_on_the_request_and_the_profile_stays(string? sent, string? stored)
    {
        var (member, ruth) = await AMember("Ruth", "4165550142");

        var response = await Ask(ruth, phone: sent);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        await _factory.WithDb(async db =>
        {
            Assert.Equal(stored, (await db.Requests.AsNoTracking().SingleAsync()).Phone);
            Assert.Equal("4165550142", (await db.Members.AsNoTracking().SingleAsync(m => m.Id == member.Id)).Phone);
        });
        var options = await _factory.GetJson("/api/listings/luzandre-com/quote", ruth);
        Assert.Equal("416-555-0142", options.GetProperty("phone").GetString());
    }

    [Fact]
    public async Task L2_045_the_options_of_a_business_that_is_not_listed_are_not_found()
    {
        var response = await Joanna().GetAsync("/api/listings/no-such-business/quote");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // L2-045 AC5, L2-043 AC1
    [Fact]
    public async Task L2_045_AC5_a_valid_request_is_created_new_and_awaiting_a_reply()
    {
        var response = await Ask(Joanna(), neededBy: "2027-02-14", budget: "About $4,000", phone: "416-555-0142", service: _customWork);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("new", body.GetProperty("status").GetString());
        Assert.Equal("Awaiting reply", body.GetProperty("memberStatus").GetString());
        Request saved = default!;
        await _factory.WithDb(async db => saved = await db.Requests.AsNoTracking().SingleAsync());
        Assert.Equal(RequestKind.Quote, saved.Kind);
        Assert.Equal("member|joanna", saved.MemberSubject);
        Assert.Equal("150 tees and 60 mugs for our church's 25th anniversary.", saved.Note);
        Assert.Equal(new DateOnly(2027, 2, 14), saved.NeededBy);
        Assert.Equal("About $4,000", saved.Budget);
        Assert.Equal("4165550142", saved.Phone);
        Assert.Equal("Custom work", saved.ServiceName);
    }

    [Fact]
    public async Task L2_045_the_optional_fields_may_be_left_out()
    {
        var response = await Ask(Joanna());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Request saved = default!;
        await _factory.WithDb(async db => saved = await db.Requests.AsNoTracking().SingleAsync());
        Assert.Null(saved.NeededBy);
        Assert.Null(saved.Budget);
        Assert.Null(saved.Phone);
        Assert.Null(saved.ServiceId);
    }

    // L2-045 AC3: a phone is stored as ten digits however it was typed
    [Theory]
    [InlineData("(416) 555-0142")]
    [InlineData("416.555.0142")]
    [InlineData("4165550142")]
    public async Task L2_045_AC3_a_phone_is_kept_as_ten_digits(string phone)
    {
        await Ask(Joanna(), phone: phone);

        Request saved = default!;
        await _factory.WithDb(async db => saved = await db.Requests.AsNoTracking().SingleAsync());
        Assert.Equal("4165550142", saved.Phone);
    }

    // L2-045 AC2, AC3, AC4, AC6 and L2-126 AC4: the server repeats the browser's rules
    [Theory]
    [InlineData(null, null, null, "description", "REQUIRED")]
    [InlineData("   ", null, null, "description", "REQUIRED")]
    [InlineData("x", "416-555-01", null, "phone", "INVALID_PHONE")]
    [InlineData("x", "abc", null, "phone", "INVALID_PHONE")]
    [InlineData("x", null, "2026-11-09", "neededBy", "IN_THE_PAST")]
    [InlineData("x", null, "soon", "neededBy", "INVALID")]
    public async Task L2_045_AC2_AC3_AC4_an_invalid_request_is_refused_with_a_field_code_and_nothing_is_created(
        string? description, string? phone, string? neededBy, string field, string code)
    {
        var response = await Ask(Joanna(), description: description, phone: phone, neededBy: neededBy);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty(field).GetString());
        Assert.Equal(0, await RequestCount());
    }

    // L2-045 AC4: today itself is allowed
    [Fact]
    public async Task L2_045_AC4_today_is_not_in_the_past()
    {
        var response = await Ask(Joanna(), neededBy: "2026-11-10");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // L2-045 AC6
    [Fact]
    public async Task L2_045_AC6_the_limits_are_2000_for_the_description_and_60_for_the_budget()
    {
        Assert.Equal(HttpStatusCode.Created, (await Ask(Joanna(), description: new string('d', 2000), budget: new string('b', 60))).StatusCode);

        var long1 = await Ask(Joanna(), description: new string('d', 2001));
        var long2 = await Ask(Joanna(), budget: new string('b', 61));

        Assert.Equal("TOO_LONG", (await Json(long1)).GetProperty("errors").GetProperty("description").GetString());
        Assert.Equal("TOO_LONG", (await Json(long2)).GetProperty("errors").GetProperty("budget").GetString());
        Assert.Equal(1, await RequestCount());
    }

    [Fact]
    public async Task L2_045_the_owner_gets_an_e_mail_with_the_description_and_the_phone()
    {
        var naomi = Member.Join(EmailAddress.TryParse("naomi@luzandre.example")!, "Naomi", "Luzandre", null, "hash", ListingMother.Now);
        await _factory.WithDb(async db =>
        {
            db.Members.Add(naomi);
            var listing = await db.Listings.SingleAsync(l => l.Slug == "luzandre-com");
            listing.AssignOwner(naomi.Id.ToString());
            await db.SaveChangesAsync();
        });

        await Ask(Joanna(), budget: "About $4,000", phone: "416-555-0142");

        OutboxMessage mail = default!;
        await _factory.WithDb(async db => mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "naomi@luzandre.example"));
        Assert.Contains("Joanna", mail.Subject);
        Assert.Contains("quote", mail.Subject);
        Assert.Contains("150 tees", mail.TextBody);
        Assert.Contains("About $4,000", mail.TextBody);
        Assert.Contains("416-555-0142", mail.TextBody);
    }

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Luzandre", NaomiId);

    private async Task<List<JsonElement>> NotificationsOf(HttpClient client) =>
        [.. (await _factory.GetJson("/api/notifications", client)).GetProperty("items").EnumerateArray()];

    // L2-045 AC8, L2-043 AC1, L2-064 AC6: the owner is told in the app and finds the request under New; the member is not told yet
    [Fact]
    public async Task L2_045_AC8_the_owner_gets_an_in_app_notification_and_the_request_is_new_in_incoming_requests()
    {
        var sent = await Json(await Ask(Joanna(), neededBy: "2027-02-14", service: _customWork));

        var told = Assert.Single(await NotificationsOf(Naomi()));
        Assert.Equal("New quote request from Joanna Adeyemi", told.GetProperty("title").GetString());
        Assert.Equal("Custom work", told.GetProperty("detail").GetString());
        Assert.Equal("request", told.GetProperty("kind").GetString());
        Assert.Equal("/my-business/requests", told.GetProperty("target").GetString());
        Assert.False(told.GetProperty("read").GetBoolean());
        Assert.Equal(1, (await _factory.GetJson("/api/me/navigation", Naomi())).GetProperty("unreadNotificationCount").GetInt32());
        Assert.Empty(await NotificationsOf(Joanna()));
        Assert.Empty(await NotificationsOf(_factory.CreateMemberClient("Sam Stranger", "member|sam")));
        var row = Assert.Single((await _factory.GetJson("/api/my-business/requests?tab=new", Naomi())).GetProperty("rows").EnumerateArray());
        Assert.Equal(sent.GetProperty("id").GetGuid(), row.GetProperty("id").GetGuid());
        Assert.Equal("quote", row.GetProperty("kind").GetString());
        Assert.Equal("New", row.GetProperty("statusLabel").GetString());
        Assert.Equal("Joanna Adeyemi", row.GetProperty("customerName").GetString());
    }

    // L2-045 AC8: without a service the notification says what was asked for
    [Fact]
    public async Task L2_045_AC8_without_a_service_the_owners_notification_carries_the_description()
    {
        await Ask(Joanna(), description: "A banner for our harvest supper.");

        var told = Assert.Single(await NotificationsOf(Naomi()));
        Assert.Equal("A banner for our harvest supper.", told.GetProperty("detail").GetString());
    }

    // L2-045 AC8, L2-132: a repeated send tells the owner once
    [Fact]
    public async Task L2_045_AC8_a_repeated_key_tells_the_owner_once()
    {
        await Ask(Joanna(), key: "same-key-12345");
        await Ask(Joanna(), key: "same-key-12345");

        Assert.Single(await NotificationsOf(Naomi()));
    }

    // L2-045 AC8: a request that is refused tells nobody
    [Fact]
    public async Task L2_045_AC8_a_refused_request_tells_nobody()
    {
        await Ask(Joanna(), description: " ");
        await Ask(Joanna(), phone: "416-555-01");

        Assert.Empty(await NotificationsOf(Naomi()));
    }

    // L2-045 AC8, L2-064 AC6: the member is told in the app when the owner confirms or declines
    [Theory]
    [InlineData("confirm", "Luzandre.com confirmed your quote request")]
    [InlineData("decline", "Luzandre.com declined your quote request")]
    public async Task L2_045_AC8_the_member_is_told_in_the_app_when_the_owner_answers(string answer, string title)
    {
        var id = (await Json(await Ask(Joanna(), service: _customWork))).GetProperty("id").GetGuid();
        Assert.Empty(await NotificationsOf(Joanna()));

        var answered = answer == "confirm"
            ? await Naomi().PostAsync($"/api/my-business/requests/{id}/confirm", null)
            : await Naomi().PostAsJsonAsync($"/api/my-business/requests/{id}/decline", new { reason = "something-else", message = "Not something we print." });

        Assert.Equal(HttpStatusCode.OK, answered.StatusCode);
        var told = Assert.Single(await NotificationsOf(Joanna()));
        Assert.Equal(title, told.GetProperty("title").GetString());
        Assert.Equal("Custom work", told.GetProperty("detail").GetString());
        Assert.Equal("request", told.GetProperty("kind").GetString());
        Assert.Equal($"/requests/{id}", told.GetProperty("target").GetString());
        Assert.False(told.GetProperty("read").GetBoolean());
        Assert.Single(await NotificationsOf(Naomi()));
    }

    // L2-045 AC8, L2-057 AC8: the quote request is a card in the conversation of the member and the business
    [Fact]
    public async Task L2_045_AC8_a_quote_card_appears_in_the_conversation_with_the_business()
    {
        var started = await Json(await Joanna().PostAsJsonAsync(
            "/api/conversations", new { listingSlug = "luzandre-com", body = "Do you print banners?", idempotencyKey = Guid.NewGuid().ToString() }));
        var conversation = started.GetProperty("conversationId").GetString();
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));

        await Ask(Joanna(), neededBy: "2027-02-14", service: _customWork);

        var card = Assert.Single((await _factory.GetJson($"/api/conversations/{conversation}", Joanna())).GetProperty("requests").EnumerateArray());
        Assert.Equal("Quote request", card.GetProperty("kindLabel").GetString());
        Assert.Equal("Custom work", card.GetProperty("title").GetString());
        Assert.Equal("Needed by Sun 14 Feb", card.GetProperty("detail").GetString());
        Assert.Equal("Awaiting reply", card.GetProperty("statusLabel").GetString());
        var owners = Assert.Single((await _factory.GetJson($"/api/conversations/{conversation}", Naomi())).GetProperty("requests").EnumerateArray());
        Assert.Equal("Quote request", owners.GetProperty("kindLabel").GetString());
    }

    // L2-045: a business that is not listed, or a service of another business
    [Fact]
    public async Task L2_045_a_business_that_is_not_listed_is_not_found_and_nothing_is_created()
    {
        var response = await Ask(Joanna(), slug: "no-such-business");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(0, await RequestCount());
    }

    [Fact]
    public async Task L2_045_a_service_of_another_business_is_not_found()
    {
        var response = await Ask(Joanna(), service: _otherService);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(0, await RequestCount());
    }

    [Fact]
    public async Task L2_045_an_owner_cannot_ask_their_own_business()
    {
        var response = await Ask(_factory.CreateMemberClient("Naomi Luzandre", NaomiId));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_045_a_visitor_is_told_to_sign_in()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Ask(_factory.CreateClient())).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com/quote")).StatusCode);
    }

    // L2-005 AC2
    [Fact]
    public async Task L2_005_AC2_a_member_with_an_unconfirmed_e_mail_cannot_ask_for_a_quote()
    {
        await _factory.CreateClient().PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Una", lastName = "Confirmed", email = "una@example.com", password = "correct horse 13",
            homeChurch = (string?)null, agreementAccepted = true,
        });
        Member member = default!;
        await _factory.WithDb(async db => member = await db.Members.AsNoTracking().SingleAsync(m => m.EmailKey == "una@example.com"));

        var response = await Ask(_factory.CreateMemberClient("Una Confirmed", member.Id.ToString()));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("EMAIL_UNCONFIRMED", (await Json(response)).GetProperty("code").GetString());
        Assert.Equal(0, await RequestCount());
    }

    // L2-132
    [Fact]
    public async Task L2_132_a_repeated_key_returns_the_first_request_and_creates_no_second()
    {
        var first = await Ask(Joanna(), key: "same-key-12345");
        var second = await Ask(Joanna(), key: "same-key-12345");

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal((await Json(first)).GetProperty("id").GetGuid(), (await Json(second)).GetProperty("id").GetGuid());
        Assert.Equal(1, await RequestCount());
    }

    [Fact]
    public async Task L2_132_the_same_key_from_another_member_is_a_different_request()
    {
        await Ask(Joanna(), key: "same-key-12345");
        await Ask(_factory.CreateMemberClient("Sam Stranger", "member|sam"), key: "same-key-12345");

        Assert.Equal(2, await RequestCount());
    }
}
