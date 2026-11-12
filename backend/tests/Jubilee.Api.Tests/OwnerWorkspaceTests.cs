using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;
using SkiaSharp;

namespace Jubilee.Api.Tests;

// Run a business listing: L2-028, L2-065, L2-085 to L2-088, L2-096, L2-097, L2-126, L2-127, L2-133 and L2-138.
// Naomi owns Luzandre.com, a live shop approved on 9 November 2026. "Now" is ListingMother.Now.
public sealed class OwnerWorkspaceTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string NaomiId = "member|naomi";

    private readonly JubileeApiFactory _factory;
    private Listing _listing = null!;

    public OwnerWorkspaceTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", tagline: "Custom church team tees");
        _listing.AssignOwner(NaomiId);
        await _factory.Arrange(_listing);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", NaomiId);

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static object Body(int version, string name = "Luzandre.com", string tagline = "Custom church team tees", string category = "shops",
        string? hours = "Mon to Fri, 10 to 6", string? website = "https://luzandre.com", string? about = "We print.", string? highlight = "Ships in 5 days") =>
        new { version, name, tagline, category, about, where = "Leslieville", hours, website, highlight };

    private static ByteArrayContent Photo(string name = "front.jpg", int width = 800, int height = 600)
    {
        using var bitmap = new SKBitmap(width, height);
        bitmap.Erase(new SKColor(200, 120, 40));
        using var image = SKImage.FromBitmap(bitmap);
        using var encoded = image.Encode(SKEncodedImageFormat.Jpeg, 90);
        return Upload(encoded.ToArray(), name);
    }

    private static ByteArrayContent Upload(byte[] bytes, string name)
    {
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Headers.ContentDisposition = new System.Net.Http.Headers.ContentDispositionHeaderValue("form-data") { Name = "file", FileName = name };
        return content;
    }

    private static Task<HttpResponseMessage> AddPhoto(HttpClient client, ByteArrayContent file) =>
        client.PostAsync("/api/my-business/photos", new MultipartFormDataContent { { file, "file", "front.jpg" } });

    // L2-085
    [Fact]
    public async Task L2_085_the_overview_of_a_live_listing_shows_the_week_in_numbers()
    {
        var yesterday = ListingMother.Now.AddHours(-5);
        var quote = Request.AskForQuote(
            "member|david", "David Chen", _listing.Id, null, "Church merch package", "150 tees", null, null, null, Guid.NewGuid().ToString(), yesterday);
        await _factory.Arrange(
            quote,
            ListingView.Record(_listing.Id, "a", ListingMother.Now.AddDays(-1)),
            ListingView.Record(_listing.Id, "b", ListingMother.Now.AddDays(-2)),
            ListingView.Record(_listing.Id, "c", ListingMother.Now.AddDays(-9)));

        var overview = await Json(await Naomi().GetAsync("/api/my-business"));

        Assert.Equal("live", overview.GetProperty("state").GetString());
        Assert.Equal("Verified · live since November 2026", overview.GetProperty("subtitle").GetString());
        var stats = overview.GetProperty("stats");
        Assert.Equal(2, stats.GetProperty("views").GetProperty("value").GetInt32());
        Assert.Equal(1, stats.GetProperty("views").GetProperty("change").GetInt32());
        Assert.Equal(1, stats.GetProperty("openRequests").GetInt32());
        Assert.Equal(1, stats.GetProperty("newSinceYesterday").GetInt32());
        Assert.Equal("David Chen", overview.GetProperty("needsReply")[0].GetProperty("customerName").GetString());
        Assert.Equal(1, overview.GetProperty("newRequests").GetInt32());
    }

    // L2-085 AC2 and AC6: how many members saved the business or one of its products, and how many of them first did so this week
    [Fact]
    public async Task L2_085_AC6_saved_by_members_counts_each_member_once_with_those_who_first_saved_this_week()
    {
        var mug = Product.Create(_listing.Id, "mug", "Mug", 2400, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now);
        var other = ListingMother.Public("someone-else");
        await _factory.Arrange(
            mug,
            other,
            // Ruth saved the business a month ago and a product yesterday: one member, not new this week.
            SavedItem.Business("member|ruth", _listing.Id, ListingMother.Now.AddDays(-30)),
            SavedItem.Product("member|ruth", mug.Id, ListingMother.Now.AddDays(-1)),
            // David saved the business eight days ago: not new this week.
            SavedItem.Business("member|david", _listing.Id, ListingMother.Now.AddDays(-8)),
            // Samuel saved the business six days ago and Esther a product today: both new this week.
            SavedItem.Business("member|samuel", _listing.Id, ListingMother.Now.AddDays(-6)),
            SavedItem.Product("member|esther", mug.Id, ListingMother.Now.AddHours(-1)),
            // A save of another business is not counted.
            SavedItem.Business("member|joanna", other.Id, ListingMother.Now.AddDays(-1)));

        var saved = (await Json(await Naomi().GetAsync("/api/my-business"))).GetProperty("stats").GetProperty("saved");

        Assert.Equal(4, saved.GetProperty("value").GetInt32());
        Assert.Equal(2, saved.GetProperty("change").GetInt32());
    }

    [Fact]
    public async Task L2_085_AC6_a_business_nobody_saved_shows_zero_and_no_change()
    {
        var saved = (await Json(await Naomi().GetAsync("/api/my-business"))).GetProperty("stats").GetProperty("saved");

        Assert.Equal(0, saved.GetProperty("value").GetInt32());
        Assert.Equal(0, saved.GetProperty("change").GetInt32());
    }

    // L2-085 AC1, L2-086
    [Fact]
    public async Task L2_086_a_listing_that_is_not_live_shows_where_it_stands_and_no_numbers()
    {
        await _factory.Reset();
        var waiting = ListingMother.NonPublic(NonPublicState.ReadyToReview, "luzandre-com", "shops");
        waiting.AssignOwner(NaomiId);
        await _factory.Arrange(waiting);

        var overview = await Json(await Naomi().GetAsync("/api/my-business"));

        Assert.Equal("ready-to-review", overview.GetProperty("state").GetString());
        Assert.StartsWith("Pending verification · submitted", overview.GetProperty("subtitle").GetString());
        Assert.Equal(JsonValueKind.Null, overview.GetProperty("stats").ValueKind);
    }

    [Fact]
    public async Task L2_086_a_member_with_no_business_sees_the_empty_state()
    {
        var overview = await Json(await Joanna().GetAsync("/api/my-business"));

        Assert.Equal("none", overview.GetProperty("state").GetString());
        Assert.Equal(JsonValueKind.Null, overview.GetProperty("listingId").ValueKind);
    }

    private async Task<Listing> SecondListing()
    {
        var second = ListingMother.NonPublic(NonPublicState.ReadyToReview, "laurent-photography", "media");
        second.Reword("Laurent Photography", "Portraits and church events", "media", null);
        second.AssignOwner(NaomiId);
        await _factory.Arrange(second);
        return second;
    }

    // L2-079 AC4: the switcher names each listing with its stage and each draft not yet submitted
    [Fact]
    public async Task L2_079_AC4_the_overview_names_each_of_the_owners_businesses_and_drafts()
    {
        var second = await SecondListing();
        var draft = await Json(await Naomi().PostAsJsonAsync("/api/listing-drafts", new { kind = "services", name = "Laurent Studio", agreed = false }));
        var someoneElses = ListingMother.Public("someone-else");
        someoneElses.AssignOwner("member|joanna");
        await _factory.Arrange(someoneElses);

        var overview = await Json(await Naomi().GetAsync("/api/my-business"));

        Assert.Equal("Luzandre.com", overview.GetProperty("name").GetString());
        var businesses = overview.GetProperty("businesses").EnumerateArray().ToList();
        Assert.Equal(
            ["Luzandre.com|listing|Live|True", "Laurent Photography|listing|Pending verification|False", "Laurent Studio|draft|Draft|False"],
            businesses.Select(b => $"{b.GetProperty("name").GetString()}|{b.GetProperty("kind").GetString()}|{b.GetProperty("stageLabel").GetString()}|{b.GetProperty("current").GetBoolean()}"));
        Assert.Equal(_listing.Id, businesses[0].GetProperty("id").GetGuid());
        Assert.Equal(second.Id, businesses[1].GetProperty("id").GetGuid());
        Assert.Equal(draft.GetProperty("id").GetGuid(), businesses[2].GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task L2_079_AC4_an_owner_with_one_business_has_one_entry_and_a_paused_listing_says_so()
    {
        var naomi = Naomi();
        await naomi.PostAsync("/api/my-business/pause", null);

        var businesses = (await Json(await naomi.GetAsync("/api/my-business"))).GetProperty("businesses");

        Assert.Equal(1, businesses.GetArrayLength());
        Assert.Equal("Paused", businesses[0].GetProperty("stageLabel").GetString());
        Assert.Empty((await Json(await Joanna().GetAsync("/api/my-business"))).GetProperty("businesses").EnumerateArray());
    }

    // L2-079 AC5: the choice moves every page of the workspace and is kept
    [Fact]
    public async Task L2_079_AC5_choosing_another_business_moves_the_whole_workspace_to_it_until_the_owner_chooses_again()
    {
        var second = await SecondListing();
        var naomi = Naomi();
        await _factory.Arrange(Request.AskForQuote(
            "member|david", "David Chen", second.Id, null, "Church portraits", "Forty families", null, null, null, Guid.NewGuid().ToString(), ListingMother.Now.AddHours(-2)));

        var chosen = await naomi.PutAsJsonAsync("/api/my-business/current", new { listingId = second.Id });

        Assert.Equal(HttpStatusCode.NoContent, chosen.StatusCode);
        var overview = await Json(await naomi.GetAsync("/api/my-business"));
        Assert.Equal("Laurent Photography", overview.GetProperty("name").GetString());
        Assert.Equal("ready-to-review", overview.GetProperty("state").GetString());
        Assert.Equal(
            ["Luzandre.com|False", "Laurent Photography|True"],
            overview.GetProperty("businesses").EnumerateArray().Select(b => $"{b.GetProperty("name").GetString()}|{b.GetProperty("current").GetBoolean()}"));
        Assert.Equal("Laurent Photography", (await Json(await naomi.GetAsync("/api/my-business/listing"))).GetProperty("name").GetString());
        Assert.Equal("Laurent Photography", (await Json(await naomi.GetAsync("/api/my-business/products"))).GetProperty("business").GetString());
        var requests = await Json(await naomi.GetAsync("/api/my-business/requests"));
        Assert.Contains("Church portraits", requests.GetRawText());

        _factory.Clock.Advance(TimeSpan.FromMinutes(1));
        await naomi.PutAsJsonAsync("/api/my-business/current", new { listingId = _listing.Id });

        Assert.Equal("Luzandre.com", (await Json(await naomi.GetAsync("/api/my-business"))).GetProperty("name").GetString());
        Assert.DoesNotContain("Church portraits", (await Json(await naomi.GetAsync("/api/my-business/requests"))).GetRawText());
    }

    // L2-079 AC5, L2-133: the choice is the owner's own
    [Fact]
    public async Task L2_079_AC5_a_listing_of_another_member_cannot_be_chosen_and_nothing_changes()
    {
        var theirs = ListingMother.Public("someone-else");
        theirs.AssignOwner("member|joanna");
        await _factory.Arrange(theirs);
        var naomi = Naomi();

        var refused = await naomi.PutAsJsonAsync("/api/my-business/current", new { listingId = theirs.Id });
        var unknown = await naomi.PutAsJsonAsync("/api/my-business/current", new { listingId = Guid.NewGuid() });
        var extra = await naomi.PutAsJsonAsync("/api/my-business/current", new { listingId = _listing.Id, ownerId = "member|naomi" });
        var visitor = await _factory.CreateClient().PutAsJsonAsync("/api/my-business/current", new { listingId = _listing.Id });

        Assert.Equal(HttpStatusCode.Forbidden, refused.StatusCode);
        Assert.Equal("FORBIDDEN", (await Json(refused)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Forbidden, unknown.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, extra.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, visitor.StatusCode);
        Assert.Equal("Luzandre.com", (await Json(await naomi.GetAsync("/api/my-business"))).GetProperty("name").GetString());
        await _factory.WithDb(async db => Assert.Null((await db.Listings.SingleAsync(l => l.Id == theirs.Id)).WorkspaceChosenAt));
    }

    // ADR 0051: a form opened on one business is not saved onto another after a switch in a second tab
    [Fact]
    public async Task L2_087_AC8_a_save_from_an_editor_opened_on_another_business_is_refused()
    {
        var second = await SecondListing();
        var naomi = Naomi();
        await naomi.PutAsJsonAsync("/api/my-business/current", new { listingId = second.Id });

        var stale = await naomi.PutAsJsonAsync("/api/my-business/listing", new
        {
            listingId = _listing.Id, version = 0, name = "Luzandre.com", tagline = "Custom church team tees", category = "shops",
            about = "We print.", where = "Leslieville", hours = "Mon to Fri, 10 to 6", website = "", highlight = "",
        });

        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("LISTING_CHANGED", (await Json(stale)).GetProperty("code").GetString());
        await _factory.WithDb(async db => Assert.Equal("Laurent Photography", (await db.Listings.SingleAsync(l => l.Id == second.Id)).Name));
    }

    // L2-097, L2-133
    [Fact]
    public async Task L2_097_only_the_owner_reaches_the_editor_photos_and_pause()
    {
        var joanna = Joanna();
        var photo = await AddPhoto(joanna, Photo());

        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.GetAsync("/api/my-business/listing")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.PutAsJsonAsync("/api/my-business/listing", Body(0))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, photo.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await joanna.PostAsync("/api/my-business/pause", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/my-business")).StatusCode);
    }

    // L2-087
    [Fact]
    public async Task L2_087_the_owner_saves_the_listing_and_the_public_page_shows_it()
    {
        var response = await Naomi().PutAsJsonAsync("/api/my-business/listing", Body(0, tagline: "Church tees, printed in Toronto", website: "https://luzandre.com/shop"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await Json(response);
        Assert.Equal(1, saved.GetProperty("version").GetInt32());
        Assert.Equal("https://luzandre.com/shop", saved.GetProperty("website").GetString());
        var page = await _factory.GetJson("/api/listings/luzandre-com");
        Assert.Equal("Church tees, printed in Toronto", page.GetProperty("tagline").GetString());
    }

    [Fact]
    public async Task L2_087_each_invalid_field_is_named()
    {
        var response = await Naomi().PutAsJsonAsync("/api/my-business/listing",
            Body(0, name: " ", tagline: new string('x', 91), hours: " ", website: "luzandre.com", about: new string('a', 1501), highlight: new string('h', 31)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REQUIRED", errors.GetProperty("name").GetString());
        Assert.Equal("TOO_LONG", errors.GetProperty("tagline").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("hours").GetString());
        Assert.Equal("INVALID", errors.GetProperty("website").GetString());
        Assert.Equal("TOO_LONG", errors.GetProperty("about").GetString());
        Assert.Equal("TOO_LONG", errors.GetProperty("highlight").GetString());
    }

    [Fact]
    public async Task L2_087_an_edit_made_from_an_older_version_is_refused()
    {
        var naomi = Naomi();
        await naomi.PutAsJsonAsync("/api/my-business/listing", Body(0));

        var stale = await naomi.PutAsJsonAsync("/api/my-business/listing", Body(0, tagline: "Another"));

        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("LISTING_CHANGED", (await Json(stale)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_087_changing_the_name_of_a_live_listing_asks_the_team_to_look_again_and_keeps_it_public()
    {
        var response = await Naomi().PutAsJsonAsync("/api/my-business/listing", Body(0, name: "Luzandre Print Co."));

        Assert.True((await Json(response)).GetProperty("recheckRequested").GetBoolean());
        await _factory.WithDb(async db =>
        {
            Assert.Contains(await db.AuditRecords.ToListAsync(), a => a.Action == "listing.recheck-requested" && a.TargetId == _listing.Id.ToString());
        });
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com")).StatusCode);
    }

    [Fact]
    public async Task L2_087_the_request_cannot_set_anything_but_the_page_fields()
    {
        var response = await Naomi().PutAsJsonAsync("/api/my-business/listing", new { version = 0, name = "x", stage = "live", ownerId = "member|joanna" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task L2_087_an_editor_that_cannot_load_carries_the_reference_JB_LST_503()
    {
        _factory.Database.Unavailable = true;

        var response = await Naomi().GetAsync("/api/my-business/listing");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("JB-LST-503", (await Json(response)).GetProperty("reference").GetString());
    }

    // L2-088, L2-138
    [Fact]
    public async Task L2_088_a_photo_becomes_renditions_with_a_default_description()
    {
        var response = await AddPhoto(Naomi(), Photo());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var photo = (await Json(response)).GetProperty("photos")[0];
        Assert.Equal("Luzandre.com photo 1", photo.GetProperty("alt").GetString());
        var key = photo.GetProperty("key").GetString()!;
        Assert.Equal(32, key.Length);
        var media = await _factory.CreateClient().GetAsync($"/media/{key}/640.jpg");
        Assert.Equal(HttpStatusCode.OK, media.StatusCode);
        Assert.Equal("image/jpeg", media.Content.Headers.ContentType!.MediaType);
        Assert.Equal("nosniff", media.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Contains("immutable", media.Headers.CacheControl!.ToString());
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync($"/media/{key}/1280.webp")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync($"/media/{key}/999.jpg")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/media/not-a-key/640.jpg")).StatusCode);
    }

    // L2-221 AC1 and AC2: the public page gives the photos in the owner's order, with what a srcset needs
    [Fact]
    public async Task L2_221_the_public_page_gives_the_photos_in_the_owners_order_with_their_size_and_alt_text()
    {
        var naomi = Naomi();
        var visitor = _factory.CreateClient();
        // The page is read, and so cached, before any photo exists (L2-221 AC4).
        Assert.Equal(0, (await _factory.GetJson("/api/listings/luzandre-com")).GetProperty("photos").GetArrayLength());

        await AddPhoto(naomi, Photo(width: 800, height: 600));
        var editor = await Json(await AddPhoto(naomi, Photo(width: 2000, height: 1000)));
        var wide = editor.GetProperty("photos")[1];
        await naomi.PutAsJsonAsync($"/api/my-business/photos/{wide.GetProperty("id").GetGuid()}/alt", new { alt = "The studio in Leslieville" });

        // Each change of the photos reaches the cached page on the next request (ADR 0003).
        var photos = (await Json(await visitor.GetAsync("/api/listings/luzandre-com"))).GetProperty("photos");
        Assert.Equal(2, photos.GetArrayLength());
        Assert.Equal("Luzandre.com photo 1", photos[0].GetProperty("alt").GetString());
        Assert.Equal(800, photos[0].GetProperty("width").GetInt32());
        Assert.Equal(600, photos[0].GetProperty("height").GetInt32());
        Assert.Equal("The studio in Leslieville", photos[1].GetProperty("alt").GetString());
        Assert.Equal(2000, photos[1].GetProperty("width").GetInt32());
        Assert.Equal(wide.GetProperty("key").GetString(), photos[1].GetProperty("key").GetString());
        Assert.False(photos[0].TryGetProperty("id", out _));

        await naomi.PutAsJsonAsync($"/api/my-business/photos/{wide.GetProperty("id").GetGuid()}/position", new { position = 1 });
        var moved = (await Json(await visitor.GetAsync("/api/listings/luzandre-com"))).GetProperty("photos");
        Assert.Equal("The studio in Leslieville", moved[0].GetProperty("alt").GetString());
        Assert.Equal("Luzandre.com photo 2", moved[1].GetProperty("alt").GetString());

        await naomi.DeleteAsync($"/api/my-business/photos/{wide.GetProperty("id").GetGuid()}");
        var left = (await Json(await visitor.GetAsync("/api/listings/luzandre-com"))).GetProperty("photos");
        Assert.Equal(1, left.GetArrayLength());
        Assert.Equal("Luzandre.com photo 1", left[0].GetProperty("alt").GetString());
    }

    // L2-221 AC5: the photos of a listing that is not public are its owner's preview only
    [Fact]
    public async Task L2_221_AC5_the_photos_of_a_paused_listing_are_given_to_its_owner_only()
    {
        var naomi = Naomi();
        await AddPhoto(naomi, Photo());
        await naomi.PostAsync("/api/my-business/pause", null);

        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Joanna().GetAsync("/api/listings/luzandre-com")).StatusCode);
        Assert.Equal(1, (await Json(await naomi.GetAsync("/api/listings/luzandre-com"))).GetProperty("photos").GetArrayLength());
    }

    [Fact]
    public async Task L2_138_a_file_that_is_not_an_image_is_refused_whatever_it_is_called()
    {
        var response = await AddPhoto(Naomi(), Upload("<script>alert(1)</script>"u8.ToArray(), "front.jpg"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("NOT_AN_IMAGE", (await Json(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_138_a_photo_over_five_megabytes_is_refused()
    {
        var response = await AddPhoto(Naomi(), Upload(new byte[5 * 1024 * 1024 + 1], "big.jpg"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("TOO_LARGE", (await Json(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_088_a_listing_holds_six_photos()
    {
        var naomi = Naomi();
        for (var i = 0; i < 6; i++)
        {
            Assert.Equal(HttpStatusCode.Created, (await AddPhoto(naomi, Photo())).StatusCode);
        }

        var seventh = await AddPhoto(naomi, Photo());

        Assert.Equal(HttpStatusCode.Conflict, seventh.StatusCode);
        Assert.Equal("TOO_MANY_PHOTOS", (await Json(seventh)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task L2_088_photos_can_be_moved_described_and_removed()
    {
        var naomi = Naomi();
        await AddPhoto(naomi, Photo());
        var two = await Json(await AddPhoto(naomi, Photo()));
        var second = two.GetProperty("photos")[1];
        var secondId = second.GetProperty("id").GetString();
        var secondKey = second.GetProperty("key").GetString();

        var moved = await Json(await naomi.PutAsJsonAsync($"/api/my-business/photos/{secondId}/position", new { position = 1 }));
        Assert.Equal(secondId, moved.GetProperty("photos")[0].GetProperty("id").GetString());

        var described = await Json(await naomi.PutAsJsonAsync($"/api/my-business/photos/{secondId}/alt", new { alt = "The shop front on Queen Street" }));
        Assert.Equal("The shop front on Queen Street", described.GetProperty("photos")[0].GetProperty("alt").GetString());

        var tooLong = await naomi.PutAsJsonAsync($"/api/my-business/photos/{secondId}/alt", new { alt = new string('a', 126) });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, tooLong.StatusCode);

        var removed = await Json(await naomi.DeleteAsync($"/api/my-business/photos/{secondId}"));
        Assert.Equal(1, removed.GetProperty("photos").GetArrayLength());
        Assert.Equal("Luzandre.com photo 1", removed.GetProperty("photos")[0].GetProperty("alt").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync($"/media/{secondKey}/640.jpg")).StatusCode);
    }

    [Fact]
    public async Task L2_097_a_member_cannot_touch_another_owners_photo()
    {
        var added = await Json(await AddPhoto(Naomi(), Photo()));
        var id = added.GetProperty("photos")[0].GetProperty("id").GetString();
        var other = ListingMother.Public("trade-shop", "shops", "Trade Shop");
        other.AssignOwner("member|joanna");
        await _factory.Arrange(other);

        Assert.Equal(HttpStatusCode.NotFound, (await Joanna().DeleteAsync($"/api/my-business/photos/{id}")).StatusCode);
    }

    // L2-096, L2-028
    [Fact]
    public async Task L2_096_a_paused_listing_is_hidden_and_its_owner_can_resume_it()
    {
        var naomi = Naomi();

        var paused = await Json(await naomi.PostAsync("/api/my-business/pause", null));

        Assert.True(paused.GetProperty("paused").GetBoolean());
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com")).StatusCode);
        var overview = await Json(await naomi.GetAsync("/api/my-business"));
        Assert.Equal("paused", overview.GetProperty("state").GetString());
        Assert.True(overview.GetProperty("paused").GetBoolean());

        var resumed = await Json(await naomi.PostAsync("/api/my-business/resume", null));

        Assert.False(resumed.GetProperty("paused").GetBoolean());
        Assert.False(resumed.GetProperty("needsReview").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com")).StatusCode);
    }

    [Fact]
    public async Task L2_096_a_listing_paused_for_a_year_goes_back_to_verification_when_resumed()
    {
        var naomi = Naomi();
        await naomi.PostAsync("/api/my-business/pause", null);
        _factory.Clock.Advance(TimeSpan.FromDays(366));

        var resumed = await Json(await naomi.PostAsync("/api/my-business/resume", null));

        Assert.True(resumed.GetProperty("needsReview").GetBoolean());
        Assert.Equal("ready-to-review", resumed.GetProperty("state").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/listings/luzandre-com")).StatusCode);
    }

    [Fact]
    public async Task L2_096_a_listing_that_is_not_live_cannot_be_paused()
    {
        await _factory.Reset();
        var draft = ListingMother.NonPublic(NonPublicState.ChangesRequested, "luzandre-com", "shops");
        draft.AssignOwner(NaomiId);
        await _factory.Arrange(draft);

        var response = await Naomi().PostAsync("/api/my-business/pause", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task L2_096_pausing_twice_is_refused_as_is_resuming_a_listing_that_runs()
    {
        var naomi = Naomi();

        Assert.Equal(HttpStatusCode.Conflict, (await naomi.PostAsync("/api/my-business/resume", null)).StatusCode);
        await naomi.PostAsync("/api/my-business/pause", null);
        Assert.Equal(HttpStatusCode.Conflict, (await naomi.PostAsync("/api/my-business/pause", null)).StatusCode);
    }
}
