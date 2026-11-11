using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Message a business: L2-055 to L2-063, L2-133, L2-137, L2-138.
public sealed class MessagingTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string JoannaId = "member|joanna";
    private const string TrevorId = "member|trevor";
    private const string NaomiId = "member|naomi";

    private readonly JubileeApiFactory _factory;

    public MessagingTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        var legacy = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        legacy.AssignOwner(TrevorId);
        legacy.Describe(new ListingProfile("Trevor Chew, CKA®", [], null, null, null, null, null, null));
        await _factory.Arrange(legacy);
        var books = ListingMother.Public("christian-bookstores", "shops", "Christian Bookstores");
        books.AssignOwner(NaomiId);
        await _factory.Arrange(books);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", JoannaId);

    private HttpClient Trevor() => _factory.CreateMemberClient("Trevor Chew", TrevorId);

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Clarke", NaomiId);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Task<HttpResponseMessage> Start(
        HttpClient client, string listing = "legacy-financial", string body = "Hello, I have a question.", string? key = null) =>
        client.PostAsJsonAsync("/api/conversations", new { listingSlug = listing, body, idempotencyKey = key ?? Guid.NewGuid().ToString() });

    private static Task<HttpResponseMessage> Send(HttpClient client, string conversation, string body, string? key = null) =>
        client.PostAsJsonAsync($"/api/conversations/{conversation}/messages", new { body, idempotencyKey = key ?? Guid.NewGuid().ToString() });

    private static async Task<string> StartedId(HttpClient client, string listing = "legacy-financial", string body = "Hello, I have a question.")
    {
        var response = await Start(client, listing, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("conversationId").GetString()!;
    }

    private async Task<int> Count<T>(Func<Infrastructure.Persistence.AppDbContext, IQueryable<T>> set)
    {
        var count = 0;
        await _factory.WithDb(async db => count = await set(db).CountAsync());
        return count;
    }

    // L2-055 AC3
    [Fact]
    public async Task L2_055_AC3_a_valid_message_creates_the_conversation_and_adds_the_message()
    {
        var response = await Start(Joanna());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(1, await Count(db => db.Conversations));
        Assert.Equal(1, await Count(db => db.Messages));
    }

    [Fact]
    public async Task L2_055_AC3_an_existing_conversation_with_the_business_is_reused()
    {
        var first = await StartedId(Joanna());
        var second = await StartedId(Joanna(), body: "One more thing.");

        Assert.Equal(first, second);
        Assert.Equal(1, await Count(db => db.Conversations));
        Assert.Equal(2, await Count(db => db.Messages));
    }

    // L2-055 AC2, AC5 and L2-126 AC5
    [Theory]
    [InlineData("", "REQUIRED")]
    [InlineData("   \n ", "REQUIRED")]
    public async Task L2_055_AC2_an_empty_message_is_refused_with_a_field_code(string body, string code)
    {
        var response = await Start(Joanna(), body: body);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty("body").GetString());
        Assert.Equal(0, await Count(db => db.Messages));
    }

    [Fact]
    public async Task L2_055_AC5_a_message_over_4000_characters_is_refused_and_one_of_4000_is_kept()
    {
        var tooLong = await Start(Joanna(), body: new string('a', 4001));
        var exact = await Start(Joanna(), body: new string('b', 4000));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, tooLong.StatusCode);
        Assert.Equal("TOO_LONG", (await Json(tooLong)).GetProperty("errors").GetProperty("body").GetString());
        Assert.Equal(HttpStatusCode.Created, exact.StatusCode);
    }

    [Fact]
    public async Task L2_055_a_visitor_is_told_to_sign_in()
    {
        var response = await Start(_factory.CreateClient());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task L2_055_a_listing_that_is_not_public_or_does_not_exist_is_not_found()
    {
        var hidden = ListingMother.NonPublic(NonPublicState.Paused, "paused-shop");
        await _factory.Arrange(hidden);

        Assert.Equal(HttpStatusCode.NotFound, (await Start(Joanna(), "paused-shop")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Start(Joanna(), "no-such-business")).StatusCode);
    }

    [Fact]
    public async Task L2_055_the_owner_cannot_message_their_own_listing()
    {
        var response = await Start(Trevor());

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(response)).GetProperty("code").GetString());
    }

    // L2-005 AC2
    [Fact]
    public async Task L2_005_AC2_a_member_with_an_unconfirmed_e_mail_cannot_start_a_conversation()
    {
        var joined = await _factory.CreateClient().PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Una", lastName = "Confirmed", email = "una@example.com", password = "correct horse 13",
            homeChurch = (string?)null, agreementAccepted = true,
        });
        Assert.Equal(HttpStatusCode.Created, joined.StatusCode);
        Member member = default!;
        await _factory.WithDb(async db => member = await db.Members.AsNoTracking().SingleAsync(m => m.EmailKey == "una@example.com"));
        var asUna = _factory.CreateMemberClient("Una Confirmed", member.Id.ToString());

        var response = await Start(asUna);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("EMAIL_UNCONFIRMED", (await Json(response)).GetProperty("code").GetString());
    }

    // L2-132 AC1, AC2
    [Fact]
    public async Task L2_132_a_repeated_idempotency_key_returns_the_original_and_creates_nothing()
    {
        var joanna = Joanna();
        var first = await Start(joanna, key: "key-1");
        var again = await Start(joanna, key: "key-1");

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal((await Json(first)).GetProperty("messageId").GetString(), (await Json(again)).GetProperty("messageId").GetString());
        Assert.Equal(1, await Count(db => db.Messages));
    }

    // L2-056 AC1, AC2, AC3
    [Fact]
    public async Task L2_056_AC1_the_inbox_lists_conversations_newest_first_with_unread_and_a_preview()
    {
        var joanna = Joanna();
        var legacy = await StartedId(joanna);
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        await Send(Trevor(), legacy, "Thursday at 10:00 works.");
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        var books = await StartedId(joanna, "christian-bookstores", "Do you have this in stock?");

        var inbox = await Json(await joanna.GetAsync("/api/conversations"));

        Assert.Equal(2, inbox.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, inbox.GetProperty("unreadCount").GetInt32());
        var rows = inbox.GetProperty("conversations").EnumerateArray().ToList();
        Assert.Equal(books, rows[0].GetProperty("id").GetString());
        Assert.Equal("You: Do you have this in stock?", rows[0].GetProperty("preview").GetString());
        Assert.False(rows[0].GetProperty("unread").GetBoolean());
        Assert.Equal("Christian Bookstores", rows[0].GetProperty("title").GetString());
        Assert.Equal(legacy, rows[1].GetProperty("id").GetString());
        Assert.Equal("Trevor: Thursday at 10:00 works.", rows[1].GetProperty("preview").GetString());
        Assert.True(rows[1].GetProperty("unread").GetBoolean());
    }

    // L2-056 AC4
    [Fact]
    public async Task L2_056_AC4_a_member_without_conversations_gets_an_empty_inbox()
    {
        var inbox = await Json(await Joanna().GetAsync("/api/conversations"));

        Assert.Equal(0, inbox.GetProperty("totalCount").GetInt32());
        Assert.Empty(inbox.GetProperty("conversations").EnumerateArray());
    }

    // L2-056 AC6
    [Fact]
    public async Task L2_056_AC6_an_owner_sees_the_conversations_addressed_to_their_business_labelled_with_it()
    {
        var conversation = await StartedId(Joanna());
        await StartedId(Trevor(), "christian-bookstores", "Hi Naomi, a question about wholesale.");

        var inbox = await Json(await Trevor().GetAsync("/api/conversations"));

        var rows = inbox.GetProperty("conversations").EnumerateArray().ToList();
        Assert.Equal(2, rows.Count);
        var addressed = rows.Single(r => r.GetProperty("id").GetString() == conversation);
        Assert.Equal("Joanna Adeyemi", addressed.GetProperty("title").GetString());
        Assert.Equal("Legacy Financial", addressed.GetProperty("businessName").GetString());
        Assert.True(addressed.GetProperty("unread").GetBoolean());
    }

    // L2-057 AC1, AC2
    [Fact]
    public async Task L2_057_AC1_AC2_opening_a_conversation_shows_the_header_and_messages_and_marks_them_read()
    {
        var joanna = Joanna();
        var id = await StartedId(joanna);
        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await Send(Trevor(), id, "Happy to help.");
        Assert.Equal(1, (await Json(await joanna.GetAsync("/api/me/navigation"))).GetProperty("unreadConversationCount").GetInt32());

        var conversation = await Json(await joanna.GetAsync($"/api/conversations/{id}"));

        Assert.Equal("Legacy Financial", conversation.GetProperty("business").GetProperty("name").GetString());
        Assert.Equal("legacy-financial", conversation.GetProperty("business").GetProperty("slug").GetString());
        Assert.Equal("Trevor Chew", conversation.GetProperty("counterpart").GetProperty("name").GetString());
        var messages = conversation.GetProperty("messages").EnumerateArray().ToList();
        Assert.Equal(["Hello, I have a question.", "Happy to help."], messages.Select(m => m.GetProperty("body").GetString()));
        Assert.True(messages[0].GetProperty("mine").GetBoolean());
        Assert.False(messages[1].GetProperty("mine").GetBoolean());
        Assert.Equal("Trevor", messages[1].GetProperty("senderFirstName").GetString());
        Assert.Equal(0, (await Json(await joanna.GetAsync("/api/me/navigation"))).GetProperty("unreadConversationCount").GetInt32());
    }

    // L2-057 AC6 and L2-133 AC2, L2-063 AC3
    [Fact]
    public async Task L2_057_AC6_a_stranger_staff_and_a_visitor_cannot_open_or_write_to_a_conversation()
    {
        var id = await StartedId(Joanna());
        var stranger = _factory.CreateMemberClient("Sam Stranger", "member|sam");
        var verifier = _factory.CreateMemberClient("Vera Verifier", "member|vera", role: "verifier");

        foreach (var client in new[] { stranger, verifier })
        {
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/conversations/{id}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await Send(client, id, "Let me in")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/conversations/{id}/mute", new { muted = true })).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync($"/api/conversations/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Joanna().GetAsync($"/api/conversations/{Guid.NewGuid()}")).StatusCode);
    }

    // L2-057 AC7
    [Fact]
    public async Task L2_057_AC7_the_latest_50_messages_load_first_and_older_ones_follow()
    {
        var joanna = Joanna();
        var id = await StartedId(joanna, body: "message 1");
        for (var number = 2; number <= 120; number++)
        {
            _factory.Clock.Advance(TimeSpan.FromMinutes(1));
            await Send(joanna, id, $"message {number}", key: $"k{number}");
        }

        var latest = await Json(await joanna.GetAsync($"/api/conversations/{id}"));
        var latestMessages = latest.GetProperty("messages").EnumerateArray().ToList();
        Assert.Equal(50, latestMessages.Count);
        Assert.Equal("message 71", latestMessages[0].GetProperty("body").GetString());
        Assert.Equal("message 120", latestMessages[^1].GetProperty("body").GetString());
        Assert.True(latest.GetProperty("hasMore").GetBoolean());

        var before = latestMessages[0].GetProperty("id").GetString();
        var older = await Json(await joanna.GetAsync($"/api/conversations/{id}?before={before}"));
        var olderMessages = older.GetProperty("messages").EnumerateArray().ToList();
        Assert.Equal(50, olderMessages.Count);
        Assert.Equal("message 21", olderMessages[0].GetProperty("body").GetString());
        Assert.Equal("message 70", olderMessages[^1].GetProperty("body").GetString());
    }

    // L2-058 AC3, AC5
    [Fact]
    public async Task L2_058_AC3_sending_again_with_the_same_key_never_duplicates_the_message()
    {
        var joanna = Joanna();
        var id = await StartedId(joanna);

        var first = await Send(joanna, id, "Can we do Thursday?", key: "retry-1");
        var retried = await Send(joanna, id, "Can we do Thursday?", key: "retry-1");

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal((await Json(first)).GetProperty("id").GetString(), (await Json(retried)).GetProperty("id").GetString());
        Assert.Equal(2, await Count(db => db.Messages));
    }

    [Fact]
    public async Task L2_058_AC5_a_whitespace_only_message_is_not_sent()
    {
        var joanna = Joanna();
        var id = await StartedId(joanna);

        var response = await Send(joanna, id, "  \n ");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(1, await Count(db => db.Messages));
    }

    // L2-059
    [Fact]
    public async Task L2_059_AC1_searching_finds_conversations_by_business_person_or_message_text()
    {
        var joanna = Joanna();
        var legacy = await StartedId(joanna, body: "I need a will");
        var books = await StartedId(joanna, "christian-bookstores", "Do you stock Bibles?");

        async Task<List<string>> Search(string q) =>
            (await Json(await joanna.GetAsync($"/api/conversations?q={Uri.EscapeDataString(q)}")))
                .GetProperty("conversations").EnumerateArray().Select(r => r.GetProperty("id").GetString()!).ToList();

        Assert.Equal([legacy], await Search("legacy"));
        Assert.Equal([books], await Search("bibles"));
        Assert.Equal([legacy], await Search("will"));
        Assert.Equal([legacy], await Search("TREVOR"));
        Assert.Empty(await Search("roofing"));
    }

    [Fact]
    public async Task L2_059_AC3_search_never_reaches_other_peoples_conversations()
    {
        await StartedId(Joanna(), body: "My private question about a will");

        var other = _factory.CreateMemberClient("Sam Stranger", "member|sam");
        var found = await Json(await other.GetAsync("/api/conversations?q=will"));

        Assert.Empty(found.GetProperty("conversations").EnumerateArray());
    }

    // L2-061
    [Fact]
    public async Task L2_061_a_member_can_mute_and_unmute_a_conversation_and_unread_counts_still_update()
    {
        var joanna = Joanna();
        var id = await StartedId(joanna);

        Assert.Equal(HttpStatusCode.NoContent, (await joanna.PutAsJsonAsync($"/api/conversations/{id}/mute", new { muted = true })).StatusCode);
        await Send(Trevor(), id, "A reply");

        var inbox = await Json(await joanna.GetAsync("/api/conversations"));
        var row = inbox.GetProperty("conversations").EnumerateArray().Single();
        Assert.True(row.GetProperty("muted").GetBoolean());
        Assert.True(row.GetProperty("unread").GetBoolean());

        await joanna.PutAsJsonAsync($"/api/conversations/{id}/mute", new { muted = false });
        var again = await Json(await joanna.GetAsync("/api/conversations"));
        Assert.False(again.GetProperty("conversations").EnumerateArray().Single().GetProperty("muted").GetBoolean());
    }

    // L2-062
    [Fact]
    public async Task L2_062_an_owner_who_is_away_is_shown_until_the_return_date_passes()
    {
        var id = await StartedId(Joanna());
        await _factory.WithDb(async db =>
        {
            var listing = await db.Listings.SingleAsync(l => l.Slug == "legacy-financial");
            listing.SetAway(ListingMother.Now.AddDays(3));
            await db.SaveChangesAsync();
        });

        var away = await Json(await Joanna().GetAsync($"/api/conversations/{id}"));
        Assert.Equal(ListingMother.Now.AddDays(3), away.GetProperty("awayUntil").GetDateTimeOffset());

        _factory.Clock.Advance(TimeSpan.FromDays(4));
        var back = await Json(await Joanna().GetAsync($"/api/conversations/{id}"));
        Assert.Equal(JsonValueKind.Null, back.GetProperty("awayUntil").ValueKind);
    }

    // L2-063 AC1, AC2
    [Fact]
    public async Task L2_063_AC1_a_participant_can_report_a_conversation_and_a_member_can_block_the_business()
    {
        var id = await StartedId(Joanna());

        var report = await Joanna().PostAsJsonAsync($"/api/conversations/{id}/report", new { reason = "Spam", block = true });
        var ownerReport = await Trevor().PostAsJsonAsync($"/api/conversations/{id}/report", new { reason = "Harassment", block = false });

        Assert.Equal(HttpStatusCode.NoContent, report.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, ownerReport.StatusCode);
        Assert.Equal(2, await Count(db => db.ConversationReports));
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await Joanna().PostAsJsonAsync($"/api/conversations/{id}/report", new { reason = "", block = false })).StatusCode);
    }

    [Fact]
    public async Task L2_063_AC2_a_blocked_business_is_not_told_and_the_member_never_sees_its_messages()
    {
        var id = await StartedId(Joanna());
        await Joanna().PostAsJsonAsync($"/api/conversations/{id}/report", new { reason = "Spam", block = true });

        var sent = await Send(Trevor(), id, "Are you still there?");

        Assert.Equal(HttpStatusCode.Created, sent.StatusCode);
        var asMember = await Json(await Joanna().GetAsync($"/api/conversations/{id}"));
        Assert.DoesNotContain(asMember.GetProperty("messages").EnumerateArray(), m => m.GetProperty("body").GetString() == "Are you still there?");
        Assert.Equal(0, (await Json(await Joanna().GetAsync("/api/me/navigation"))).GetProperty("unreadConversationCount").GetInt32());
    }

    // L2-137 AC1
    [Fact]
    public async Task L2_137_AC1_the_31st_message_in_ten_minutes_is_refused_with_retry_after()
    {
        var joanna = Joanna();
        var id = await StartedId(joanna, body: "m0");
        for (var number = 1; number < 30; number++)
        {
            Assert.Equal(HttpStatusCode.Created, (await Send(joanna, id, $"m{number}")).StatusCode);
        }

        var refused = await Send(joanna, id, "one too many");

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.NotNull(refused.Headers.RetryAfter);

        _factory.Clock.Advance(TimeSpan.FromMinutes(11));
        Assert.Equal(HttpStatusCode.Created, (await Send(joanna, id, "later")).StatusCode);
    }

    [Fact]
    public async Task L2_137_AC1_the_11th_new_conversation_in_a_day_is_refused()
    {
        for (var number = 1; number <= 11; number++)
        {
            var listing = ListingMother.Public($"business-{number}", "shops", $"Business {number}");
            listing.AssignOwner($"member|owner{number}");
            await _factory.Arrange(listing);
        }

        var joanna = Joanna();
        for (var number = 1; number <= 10; number++)
        {
            Assert.Equal(HttpStatusCode.Created, (await Start(joanna, $"business-{number}")).StatusCode);
        }

        var refused = await Start(joanna, "business-11");

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.NotNull(refused.Headers.RetryAfter);
    }

    // L2-060, L2-138
    private static byte[] Png(int width = 1, int height = 1, bool withText = true)
    {
        using var stream = new MemoryStream();
        stream.Write([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        Chunk(stream, "IHDR", [.. BigEndian(width), .. BigEndian(height), 8, 2, 0, 0, 0]);
        if (withText)
        {
            Chunk(stream, "tEXt", "Author\0Secret Photographer"u8.ToArray());
        }

        Chunk(stream, "IDAT", [0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x06, 0x00, 0x05]);
        Chunk(stream, "IEND", []);
        return stream.ToArray();
    }

    private static byte[] BigEndian(int value) => [(byte)(value >> 24), (byte)(value >> 16), (byte)(value >> 8), (byte)value];

    private static void Chunk(Stream stream, string type, byte[] data)
    {
        stream.Write(BigEndian(data.Length));
        var body = System.Text.Encoding.ASCII.GetBytes(type).Concat(data).ToArray();
        stream.Write(body);
        stream.Write(BigEndian((int)Crc32(body)));
    }

    private static uint Crc32(byte[] bytes)
    {
        var crc = 0xFFFFFFFFu;
        foreach (var b in bytes)
        {
            crc ^= b;
            for (var bit = 0; bit < 8; bit++)
            {
                crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xEDB88320u : crc >> 1;
            }
        }

        return ~crc;
    }

    private async Task<byte[]> StoredAttachment(Guid id)
    {
        byte[] bytes = [];
        await _factory.WithDb(async db => bytes = (await db.MessageAttachments.AsNoTracking().SingleAsync(a => a.Id == id)).Content);
        return bytes;
    }

    private static byte[] Jpeg() =>
    [
        0xFF, 0xD8,
        0xFF, 0xE1, 0x00, 0x0A, (byte)'E', (byte)'x', (byte)'i', (byte)'f', 0, 0, 1, 2,
        0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
        0xFF, 0xD9,
    ];

    private static Task<HttpResponseMessage> Upload(HttpClient client, string conversation, byte[] bytes, string type = "image/png", string name = "photo.png")
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(type);
        content.Add(file, "file", name);
        return client.PostAsync($"/api/conversations/{conversation}/attachments", content);
    }

    [Fact]
    public async Task L2_060_AC1_a_png_is_stored_stripped_of_metadata_and_delivered_with_the_message()
    {
        var joanna = Joanna();
        var id = await StartedId(joanna);

        var upload = await Upload(joanna, id, Png());
        Assert.Equal(HttpStatusCode.Created, upload.StatusCode);
        var attachmentId = (await Json(upload)).GetProperty("id").GetString();
        var sent = await joanna.PostAsJsonAsync($"/api/conversations/{id}/messages",
            new { body = "Here is the photo", idempotencyKey = Guid.NewGuid().ToString(), attachmentId });

        Assert.Equal(HttpStatusCode.Created, sent.StatusCode);
        var conversation = await Json(await joanna.GetAsync($"/api/conversations/{id}"));
        var attachment = conversation.GetProperty("messages").EnumerateArray().Last().GetProperty("attachment");
        var url = attachment.GetProperty("url").GetString()!;
        var download = await _factory.CreateClient().GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("image/png", download.Content.Headers.ContentType!.MediaType);
        Assert.Equal("nosniff", download.Headers.GetValues("X-Content-Type-Options").Single());
        var stored = await download.Content.ReadAsByteArrayAsync();
        Assert.DoesNotContain("Secret Photographer", System.Text.Encoding.ASCII.GetString(stored));
    }

    [Fact]
    public async Task L2_138_AC1_a_jpeg_loses_its_exif_segment()
    {
        var joanna = Joanna();
        var id = await StartedId(joanna);

        var upload = await Upload(joanna, id, Jpeg(), "image/jpeg", "photo.jpg");

        Assert.Equal(HttpStatusCode.Created, upload.StatusCode);
        var stored = await StoredAttachment((await Json(upload)).GetProperty("id").GetGuid());
        Assert.DoesNotContain("Exif", System.Text.Encoding.ASCII.GetString(stored));
        Assert.Equal(0xFF, stored[0]);
        Assert.Equal(0xD8, stored[1]);
    }

    [Theory]
    [InlineData("text")]
    [InlineData("gif")]
    [InlineData("liar")]
    public async Task L2_060_AC3_L2_138_AC1_a_file_that_is_not_a_jpeg_or_png_is_refused_by_its_content_not_its_name(string kind)
    {
        var joanna = Joanna();
        var id = await StartedId(joanna);
        var bytes = kind switch
        {
            "text" => "just words"u8.ToArray(),
            "gif" => "GIF89a\x01\x00\x01\x00"u8.ToArray(),
            _ => "<html><script>alert(1)</script></html>"u8.ToArray(),
        };

        var upload = await Upload(joanna, id, bytes, "image/png", "photo.png");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, upload.StatusCode);
        Assert.Equal("INVALID_IMAGE", (await Json(upload)).GetProperty("code").GetString());
        Assert.Equal(0, await Count(db => db.MessageAttachments));
    }

    [Fact]
    public async Task L2_060_AC2_L2_138_AC1_a_photo_over_5_mb_or_8000_pixels_wide_is_refused()
    {
        var joanna = Joanna();
        var id = await StartedId(joanna);
        var large = Png().Concat(new byte[5 * 1024 * 1024]).ToArray();

        var tooBig = await Upload(joanna, id, large);
        var tooWide = await Upload(joanna, id, Png(8001, 10));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, tooBig.StatusCode);
        Assert.Equal("TOO_LARGE", (await Json(tooBig)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, tooWide.StatusCode);
    }

    [Fact]
    public async Task L2_060_AC4_a_signed_link_expires_after_five_minutes_and_cannot_be_forged()
    {
        var joanna = Joanna();
        var id = await StartedId(joanna);
        var attachmentId = (await Json(await Upload(joanna, id, Png()))).GetProperty("id").GetString();
        await joanna.PostAsJsonAsync($"/api/conversations/{id}/messages", new { body = "photo", idempotencyKey = "p1", attachmentId });
        var url = (await Json(await joanna.GetAsync($"/api/conversations/{id}"))).GetProperty("messages").EnumerateArray().Last()
            .GetProperty("attachment").GetProperty("url").GetString()!;
        var anonymous = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync(url.Replace("sig=", "sig=0"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/attachments/{Guid.NewGuid()}?expires=9999999999&sig=abc")).StatusCode);

        _factory.Clock.Advance(TimeSpan.FromMinutes(6));
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync(url)).StatusCode);
    }

    [Fact]
    public async Task L2_060_only_a_participant_can_attach_to_a_conversation()
    {
        var id = await StartedId(Joanna());
        var stranger = _factory.CreateMemberClient("Sam Stranger", "member|sam");

        var upload = await Upload(stranger, id, Png());

        Assert.Equal(HttpStatusCode.NotFound, upload.StatusCode);
    }

    // L2-056 / navigation: the badge counts conversations with something unread.
    [Fact]
    public async Task L2_056_the_navigation_summary_counts_unread_conversations_for_members_and_owners()
    {
        var id = await StartedId(Joanna());

        Assert.Equal(1, (await Json(await Trevor().GetAsync("/api/me/navigation"))).GetProperty("unreadConversationCount").GetInt32());
        Assert.Equal(0, (await Json(await Joanna().GetAsync("/api/me/navigation"))).GetProperty("unreadConversationCount").GetInt32());

        await Trevor().GetAsync($"/api/conversations/{id}");
        Assert.Equal(0, (await Json(await Trevor().GetAsync("/api/me/navigation"))).GetProperty("unreadConversationCount").GetInt32());
    }
}
