using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Onboarding;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// List a business: L2-005 AC2, L2-071 to L2-079, L2-132 and L2-133. A member fills in a draft, saves it
// on the way and submits it; the listing then goes to the verification team, ready to review. "Today" is Tuesday
// 10 November 2026 (ListingMother.Now).
public sealed class ListingOnboardingTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private readonly JubileeApiFactory _factory;

    public ListingOnboardingTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Joanna() => _factory.CreateMemberClient("Joanna Adeyemi", "member|joanna");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Dictionary<string, object?> Body(
        string kind = "products",
        string? name = "Luzandre.com",
        string? tagline = "Unique & custom Christian apparel, artworks & gifts that bring joy",
        string? category = "shops",
        string? place = "Online · ships across Canada",
        bool agreed = true,
        object[]? items = null,
        string? key = null) => new()
        {
            ["kind"] = kind,
            ["name"] = name,
            ["tagline"] = tagline,
            ["categorySlug"] = category,
            ["highlight"] = null,
            ["place"] = place,
            ["agreed"] = agreed,
            ["items"] = items ?? [],
            ["idempotencyKey"] = key ?? Guid.NewGuid().ToString(),
        };

    private static object Item(string name, int? cents = 3400, string kind = "amount", string? detail = null) =>
        new { name, detail, priceKind = kind, priceCents = cents };

    private async Task<JsonElement> SaveNew(HttpClient client, Dictionary<string, object?>? body = null)
    {
        var response = await client.PostAsJsonAsync("/api/listing-drafts", body ?? Body());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await Json(response);
    }

    private Task<HttpResponseMessage> Submit(HttpClient client, Guid draftId, Dictionary<string, object?>? body = null) =>
        client.PostAsJsonAsync($"/api/listing-drafts/{draftId}/submit", body ?? Body());

    private async Task<Listing> ListingOf(string slug)
    {
        Listing listing = default!;
        await _factory.WithDb(async db => listing = await db.Listings.AsNoTracking().SingleAsync(l => l.Slug == slug));
        return listing;
    }

    // L2-071 AC4
    [Fact]
    public async Task L2_071_AC4_a_visitor_is_told_to_sign_in()
    {
        var visitor = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.GetAsync("/api/listing-drafts/current")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await visitor.PostAsJsonAsync("/api/listing-drafts", Body())).StatusCode);
    }

    // L2-077 AC1, AC2: saving needs no valid field and everything comes back
    [Fact]
    public async Task L2_077_AC1_a_part_filled_form_is_saved_without_validation_and_loads_with_every_value()
    {
        var saved = await SaveNew(Joanna(), Body(
            kind: "services", name: null, tagline: null, category: null, place: "GTA", agreed: false,
            items: [Item("Wedding day coverage", 220000, detail: "8 hours · two photographers")]));

        Assert.NotEqual(Guid.Empty, saved.GetProperty("id").GetGuid());
        Assert.NotEqual(JsonValueKind.Null, saved.GetProperty("updatedAt").ValueKind);
        var loaded = await _factory.GetJson("/api/listing-drafts/current", Joanna());
        Assert.Equal(saved.GetProperty("id").GetGuid(), loaded.GetProperty("id").GetGuid());
        Assert.Equal("services", loaded.GetProperty("kind").GetString());
        Assert.Equal("GTA", loaded.GetProperty("place").GetString());
        Assert.False(loaded.GetProperty("agreed").GetBoolean());
        var items = loaded.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal("Wedding day coverage", items[0].GetProperty("name").GetString());
        Assert.Equal("8 hours · two photographers", items[0].GetProperty("detail").GetString());
        Assert.Equal(220000, items[0].GetProperty("priceCents").GetInt32());
    }

    [Fact]
    public async Task L2_077_AC2_there_is_no_current_draft_before_one_is_saved()
    {
        var response = await Joanna().GetAsync("/api/listing-drafts/current");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task L2_077_a_saved_draft_can_be_saved_again_and_replaces_its_values_and_items()
    {
        var first = await SaveNew(Joanna(), Body(items: [Item("Tee"), Item("Mug", 2400)]));
        var id = first.GetProperty("id").GetGuid();

        var response = await Joanna().PutAsJsonAsync($"/api/listing-drafts/{id}", Body(name: "Luzandre", items: [Item("Mug", 2400)]));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var again = await Json(response);
        Assert.Equal("Luzandre", again.GetProperty("name").GetString());
        Assert.Equal(["Mug"], again.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("name").GetString()));
    }

    // L2-072 AC4, L2-072 AC3: limits on what is kept
    [Fact]
    public async Task L2_072_AC4_a_name_over_120_characters_is_cut_to_120_in_a_draft()
    {
        var saved = await SaveNew(Joanna(), Body(name: new string('n', 200)));

        Assert.Equal(120, saved.GetProperty("name").GetString()!.Length);
    }

    // L2-133 AC2: another member's draft is not there
    [Fact]
    public async Task L2_133_AC2_another_members_draft_is_not_found()
    {
        var mine = await SaveNew(Joanna());
        var id = mine.GetProperty("id").GetGuid();
        var sam = _factory.CreateMemberClient("Sam Stranger", "member|sam");

        Assert.Equal(HttpStatusCode.NotFound, (await sam.GetAsync($"/api/listing-drafts/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await sam.PutAsJsonAsync($"/api/listing-drafts/{id}", Body())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Submit(sam, id)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await sam.GetAsync("/api/listing-drafts/current")).StatusCode);
    }

    // L2-133 AC4
    [Theory]
    [InlineData("stage")]
    [InlineData("ownerId")]
    [InlineData("verified")]
    public async Task L2_133_AC4_a_body_with_a_field_the_member_may_not_set_is_refused_with_400(string field)
    {
        var body = Body();
        body[field] = field == "verified" ? true : "x";

        var response = await Joanna().PostAsJsonAsync("/api/listing-drafts", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Joanna().GetAsync("/api/listing-drafts/current")).StatusCode);
    }

    // L2-078 AC1, L2-075 AC2: a valid draft, with no church and no pastor named, goes straight to the verification team
    [Fact]
    public async Task L2_078_AC1_a_valid_submission_creates_a_listing_that_is_ready_to_review()
    {
        var draft = await SaveNew(Joanna(), Body(items: [Item("Faith heavyweight tee, charcoal"), Item("Gold cross stoneware mug", 2400)]));
        var id = draft.GetProperty("id").GetGuid();

        var response = await Submit(Joanna(), id, Body(items: [Item("Faith heavyweight tee, charcoal"), Item("Gold cross stoneware mug", 2400)]));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("luzandre-com", body.GetProperty("slug").GetString());
        Assert.Equal("Luzandre.com", body.GetProperty("name").GetString());
        Assert.Equal("products", body.GetProperty("kind").GetString());
        Assert.Equal("ready-to-review", body.GetProperty("stage").GetString());
        Assert.False(body.TryGetProperty("church", out _));
        Assert.False(body.TryGetProperty("pastorEmail", out _));
        var listing = await ListingOf("luzandre-com");
        Assert.Equal(ListingStage.ReadyToReview, listing.Stage);
        Assert.Equal("member|joanna", listing.OwnerId);
        Assert.Equal(ListingKind.Shop, listing.Kind);
        Assert.Equal("shops", listing.CategorySlug);
        Assert.Equal("Online · ships across Canada", listing.Where);
        Assert.False(listing.IsPublic());
        await _factory.WithDb(async db =>
        {
            var products = await db.Products.Where(p => p.ListingId == listing.Id).OrderBy(p => p.Name).ToListAsync();
            Assert.Equal(["Faith heavyweight tee, charcoal", "Gold cross stoneware mug"], products.Select(p => p.Name));
            Assert.Equal(3400, products[0].PriceCents);
            Assert.Equal(0, await db.ListingDrafts.CountAsync());
            Assert.Equal(ListingMother.Now, (await db.ListingSubmissions.AsNoTracking().SingleAsync()).ReadyAt);
        });
    }

    // L2-073 AC4: items added during onboarding are not public
    [Fact]
    public async Task L2_073_AC4_the_products_of_a_listing_that_is_not_live_are_not_public()
    {
        var draft = await SaveNew(Joanna(), Body(items: [Item("Tee")]));
        await Submit(Joanna(), draft.GetProperty("id").GetGuid(), Body(items: [Item("Tee")]));

        var page = await _factory.CreateClient().GetAsync("/api/listings/luzandre-com/products/tee");
        var listing = await _factory.CreateClient().GetAsync("/api/listings/luzandre-com");

        Assert.Equal(HttpStatusCode.NotFound, page.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, listing.StatusCode);
    }

    // L2-073 AC2: services keep their detail and price
    [Fact]
    public async Task L2_073_AC2_services_are_kept_with_their_detail_and_price()
    {
        var items = new[] { Item("Wedding day coverage", 220000, "amount", "8 hours · two photographers"), Item("Baptism and dedication", 35000), Item("Church events", null, "ask") };
        var body = Body(kind: "services", category: "media", place: "GTA", items: items);
        var draft = await SaveNew(Joanna(), body);

        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid(), body);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var listing = await ListingOf("luzandre-com");
        Assert.Equal(ListingKind.Services, listing.Kind);
        await _factory.WithDb(async db =>
        {
            var services = await db.Services.Where(s => s.ListingId == listing.Id).OrderBy(s => s.Position).ToListAsync();
            Assert.Equal(["Wedding day coverage", "Baptism and dedication", "Church events"], services.Select(s => s.Name));
            Assert.Equal("8 hours · two photographers", services[0].Detail);
            Assert.Equal(220000, services[0].PriceCents);
            Assert.Equal(ServicePriceKind.Ask, services[2].PriceKind);
        });
    }

    // L2-073 AC1, AC2: the draft keeps what the product editor and the service editor ask
    [Fact]
    public async Task L2_073_AC1_a_draft_keeps_every_field_of_the_editors()
    {
        var product = new { name = "Walnut prayer bench", detail = (string?)null, priceKind = "amount", priceCents = 18500, stock = 3, description = "Solid walnut kneeling bench, oiled finish, folds flat." };
        var saved = await SaveNew(Joanna(), Body(items: [product]));

        var item = saved.GetProperty("items")[0];
        Assert.Equal(3, item.GetProperty("stock").GetInt32());
        Assert.Equal("Solid walnut kneeling bench, oiled finish, folds flat.", item.GetProperty("description").GetString());

        var service = new { name = "Engagement session", detail = "45 min", priceKind = "free", priceCents = (int?)null, action = "book", durationMinutes = 45, offersVideo = true, offersInPerson = true, inPersonPlace = "12 Queen St E, Toronto" };
        var again = await Json(await Joanna().PutAsJsonAsync($"/api/listing-drafts/{saved.GetProperty("id").GetGuid()}", Body(kind: "services", items: [service])));

        item = again.GetProperty("items")[0];
        Assert.Equal("book", item.GetProperty("action").GetString());
        Assert.Equal(45, item.GetProperty("durationMinutes").GetInt32());
        Assert.True(item.GetProperty("offersVideo").GetBoolean());
        Assert.True(item.GetProperty("offersInPerson").GetBoolean());
        Assert.Equal("12 Queen St E, Toronto", item.GetProperty("inPersonPlace").GetString());
    }

    // L2-073 AC5: a product becomes a product of the listing with its stock and description
    [Fact]
    public async Task L2_073_AC5_a_product_is_submitted_with_its_stock_and_description()
    {
        var items = new object[]
        {
            new { name = "Walnut prayer bench", detail = (string?)null, priceKind = "amount", priceCents = 18500, stock = 3, description = "Solid walnut kneeling bench." },
            new { name = "Gold cross stoneware mug", detail = (string?)null, priceKind = "amount", priceCents = 2400, stock = 0, description = (string?)null },
            new { name = "Tee", detail = (string?)null, priceKind = "amount", priceCents = 3400, stock = 12000, description = new string('x', 1200) },
        };
        var draft = await SaveNew(Joanna(), Body(items: items));

        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid(), Body(items: items));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var listing = await ListingOf("luzandre-com");
        await _factory.WithDb(async db =>
        {
            var products = (await db.Products.Where(p => p.ListingId == listing.Id).ToListAsync()).ToDictionary(p => p.Name);
            Assert.Equal(3, products["Walnut prayer bench"].Stock);
            Assert.Equal("Solid walnut kneeling bench.", products["Walnut prayer bench"].Description);
            Assert.Equal(18500, products["Walnut prayer bench"].PriceCents);
            Assert.True(products["Gold cross stoneware mug"].IsSoldOut);
            Assert.Null(products["Gold cross stoneware mug"].Description);

            // A stock the product editor would refuse is not tracked; a description is cut to its limit.
            Assert.Null(products["Tee"].Stock);
            Assert.Equal(Product.MaxDescriptionLength, products["Tee"].Description!.Length);
        });
    }

    // L2-073 AC5: a service members can book keeps its meeting length and how it meets
    [Fact]
    public async Task L2_073_AC5_a_service_members_can_book_keeps_its_length_and_how_it_meets()
    {
        var items = new object[]
        {
            new { name = "Engagement session", detail = "45 min", priceKind = "free", priceCents = (int?)null, action = "book", durationMinutes = 45, offersVideo = true, offersInPerson = true, inPersonPlace = "12 Queen St E, Toronto" },
            new { name = "Wedding day coverage", detail = "8 hours", priceKind = "amount", priceCents = 220000, action = "ask", durationMinutes = (int?)null, offersVideo = true, offersInPerson = false, inPersonPlace = (string?)null },
        };
        var body = Body(kind: "services", category: "media", place: "GTA", items: items);
        var draft = await SaveNew(Joanna(), body);

        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid(), body);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var listing = await ListingOf("luzandre-com");
        await _factory.WithDb(async db =>
        {
            var services = await db.Services.Where(s => s.ListingId == listing.Id).OrderBy(s => s.Position).ToListAsync();
            Assert.Equal(ServiceAction.Book, services[0].Action);
            Assert.Equal(45, services[0].DurationMinutes);
            Assert.True(services[0].OffersVideo);
            Assert.True(services[0].OffersInPerson);
            Assert.Equal("12 Queen St E, Toronto", services[0].InPersonPlace);
            Assert.Equal(ServiceAction.Ask, services[1].Action);
            Assert.Null(services[1].DurationMinutes);
        });
    }

    // L2-073 AC5: booking details the service editor's endpoint would refuse fall back to "Ask for a quote"
    [Theory]
    [InlineData(10, true, false, null)]
    [InlineData(481, true, false, null)]
    [InlineData(null, true, false, null)]
    [InlineData(30, false, false, null)]
    [InlineData(30, false, true, " ")]
    public async Task L2_073_AC5_a_service_with_booking_details_the_api_would_not_accept_is_kept_as_ask(int? minutes, bool video, bool inPerson, string? place)
    {
        var items = new object[]
        {
            new { name = "Engagement session", detail = "45 min", priceKind = "free", priceCents = (int?)null, action = "book", durationMinutes = minutes, offersVideo = video, offersInPerson = inPerson, inPersonPlace = place },
        };
        var body = Body(kind: "services", category: "media", place: "GTA", items: items);
        var draft = await SaveNew(Joanna(), body);

        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid(), body);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var listing = await ListingOf("luzandre-com");
        await _factory.WithDb(async db =>
        {
            var service = await db.Services.SingleAsync(s => s.ListingId == listing.Id);
            Assert.Equal(ServiceAction.Ask, service.Action);
            Assert.Null(service.DurationMinutes);
            Assert.False(service.OffersInPerson);
        });
    }

    // L2-073 AC3
    [Fact]
    public async Task L2_073_AC3_a_listing_with_no_products_or_services_may_be_submitted()
    {
        var draft = await SaveNew(Joanna());

        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // L2-072 AC7: the highlight is kept to 30 characters and the listing carries it
    [Fact]
    public async Task L2_072_AC7_a_highlight_is_cut_to_30_characters_and_the_submitted_listing_carries_it()
    {
        var body = Body();
        body["highlight"] = "  Ships across Canada and the United States  ";

        var draft = await SaveNew(Joanna(), body);
        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid(), body);

        Assert.Equal("Ships across Canada and the Un", draft.GetProperty("highlight").GetString());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("Ships across Canada and the Un", (await ListingOf("luzandre-com")).Highlight);
    }

    [Fact]
    public async Task L2_072_AC7_a_listing_submitted_without_a_highlight_has_none()
    {
        var body = Body();
        body["highlight"] = "   ";
        var draft = await SaveNew(Joanna(), body);

        await Submit(Joanna(), draft.GetProperty("id").GetGuid(), body);

        Assert.Equal(JsonValueKind.Null, draft.GetProperty("highlight").ValueKind);
        Assert.Null((await ListingOf("luzandre-com")).Highlight);
    }

    // L2-072 AC5: a unique slug, with a number when taken
    [Fact]
    public async Task L2_072_AC5_the_slug_comes_from_the_name_and_takes_a_number_when_it_is_taken()
    {
        var first = await SaveNew(Joanna());
        await Submit(Joanna(), first.GetProperty("id").GetGuid());
        var second = await SaveNew(Joanna());

        var response = await Submit(Joanna(), second.GetProperty("id").GetGuid());

        Assert.Equal("luzandre-com-2", (await Json(response)).GetProperty("slug").GetString());
    }

    // L2-072 AC2, AC3, L2-075 AC1, L2-078 AC2
    [Theory]
    [InlineData("name", null, "REQUIRED")]
    [InlineData("name", "   ", "REQUIRED")]
    [InlineData("tagline", null, "REQUIRED")]
    [InlineData("categorySlug", null, "REQUIRED")]
    [InlineData("categorySlug", "nonsense", "REQUIRED")]
    [InlineData("agreed", false, "REQUIRED")]
    public async Task L2_078_AC2_an_invalid_submission_is_refused_with_a_code_for_each_field(string field, object? value, string code)
    {
        var body = Body();
        body[field] = value;
        var draft = await SaveNew(Joanna());

        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid(), body);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty(field).GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.Listings.CountAsync()));
    }

    [Fact]
    public async Task L2_078_AC2_every_invalid_field_is_named_at_once_and_the_draft_is_kept()
    {
        var body = Body(name: null, tagline: null, agreed: false);
        var draft = await SaveNew(Joanna());

        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid(), body);

        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal(["agreed", "name", "tagline"], errors.EnumerateObject().Select(p => p.Name).OrderBy(n => n));
        await _factory.WithDb(async db => Assert.Equal(1, await db.ListingDrafts.CountAsync()));
    }

    // L2-072 AC3
    [Fact]
    public async Task L2_072_AC3_a_tagline_over_90_characters_is_refused_with_its_length()
    {
        var draft = await SaveNew(Joanna());

        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid(), Body(tagline: new string('t', 94)));

        Assert.Equal("TOO_LONG:94", (await Json(response)).GetProperty("errors").GetProperty("tagline").GetString());
    }

    [Fact]
    public async Task L2_072_AC3_a_tagline_of_exactly_90_characters_is_accepted()
    {
        var draft = await SaveNew(Joanna());

        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid(), Body(tagline: new string('t', 90)));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // L2-072 AC6
    [Theory]
    [InlineData("Visit luzandre.com for deals")]
    [InlineData("Call 416-555-0142")]
    [InlineData("Write hello@luzandre.example")]
    [InlineData("Use code SAVE20 at checkout")]
    public async Task L2_072_AC6_a_tagline_with_contact_details_or_a_code_is_accepted_but_flagged(string tagline)
    {
        var draft = await SaveNew(Joanna());

        var response = await Submit(Joanna(), draft.GetProperty("id").GetGuid(), Body(tagline: tagline));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Contains("CONTACT_IN_TEXT", await FlagsOf("luzandre-com"));
    }

    [Fact]
    public async Task L2_072_AC6_plain_text_is_not_flagged()
    {
        var draft = await SaveNew(Joanna());
        await Submit(Joanna(), draft.GetProperty("id").GetGuid());

        Assert.Empty(await FlagsOf("luzandre-com"));
    }

    private async Task<IReadOnlyList<string>> FlagsOf(string slug)
    {
        IReadOnlyList<string> flags = [];
        await _factory.WithDb(async db =>
        {
            var listing = await db.Listings.AsNoTracking().SingleAsync(l => l.Slug == slug);
            flags = (await db.ListingSubmissions.AsNoTracking().SingleAsync(s => s.ListingId == listing.Id)).Flags.ToList();
        });
        return flags;
    }

    // L2-075 AC2
    [Fact]
    public async Task L2_075_AC2_the_agreement_is_recorded_with_the_time_and_the_version()
    {
        var draft = await SaveNew(Joanna());
        await Submit(Joanna(), draft.GetProperty("id").GetGuid());

        await _factory.WithDb(async db =>
        {
            var submission = await db.ListingSubmissions.AsNoTracking().SingleAsync();
            Assert.Equal("2026-11-02", submission.StatementVersion);
            Assert.Equal(ListingMother.Now, submission.AgreedAt);
            Assert.Equal("member|joanna", submission.OwnerSubject);
        });
    }

    // L2-078 AC1: nobody outside Jubilee is written to about a submission
    [Fact]
    public async Task L2_078_AC1_a_submission_e_mails_no_third_party()
    {
        var draft = await SaveNew(Joanna());
        await Submit(Joanna(), draft.GetProperty("id").GetGuid());

        await _factory.WithDb(async db => Assert.Empty(await db.OutboxMessages.AsNoTracking().Where(m => m.TextBody.Contains("/reference/")).ToListAsync()));
    }

    // L2-132
    [Fact]
    public async Task L2_132_a_repeated_key_returns_the_first_listing_and_creates_no_second()
    {
        var draft = await SaveNew(Joanna());
        var id = draft.GetProperty("id").GetGuid();
        var body = Body(key: "same-key-12345");

        var first = await Submit(Joanna(), id, body);
        var second = await Submit(Joanna(), id, body);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal((await Json(first)).GetProperty("listingId").GetGuid(), (await Json(second)).GetProperty("listingId").GetGuid());
        await _factory.WithDb(async db =>
        {
            Assert.Equal(1, await db.Listings.CountAsync());
            Assert.Equal(1, await db.ListingSubmissions.CountAsync());
        });
    }

    // L2-005 AC2, L2-071 AC5
    [Fact]
    public async Task L2_071_AC5_a_member_with_an_unconfirmed_e_mail_can_save_a_draft_but_not_submit()
    {
        await _factory.CreateClient().PostAsJsonAsync("/api/account/join", new
        {
            firstName = "Una", lastName = "Confirmed", email = "una@example.com", password = "correct horse 13",
            homeChurch = (string?)null, agreementAccepted = true,
        });
        Member member = default!;
        await _factory.WithDb(async db => member = await db.Members.AsNoTracking().SingleAsync(m => m.EmailKey == "una@example.com"));
        var una = _factory.CreateMemberClient("Una Confirmed", member.Id.ToString());

        var draft = await SaveNew(una);
        var response = await Submit(una, draft.GetProperty("id").GetGuid());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("EMAIL_UNCONFIRMED", (await Json(response)).GetProperty("code").GetString());
        await _factory.WithDb(async db => Assert.Equal(0, await db.Listings.CountAsync()));
    }

    // L2-079 AC1: a member may own more than one listing
    [Fact]
    public async Task L2_079_AC1_a_second_draft_starts_beside_the_first_listing()
    {
        var first = await SaveNew(Joanna());
        await Submit(Joanna(), first.GetProperty("id").GetGuid());

        var second = await SaveNew(Joanna(), Body(name: "Laurent Photography", kind: "services", category: "media"));

        Assert.NotEqual(first.GetProperty("id").GetGuid(), second.GetProperty("id").GetGuid());
        var current = await _factory.GetJson("/api/listing-drafts/current", Joanna());
        Assert.Equal("Laurent Photography", current.GetProperty("name").GetString());
    }

    // L2-079 AC2
    [Fact]
    public async Task L2_079_AC2_a_sixth_listing_is_refused_with_how_to_ask_for_more()
    {
        for (var i = 1; i <= 5; i++)
        {
            await SaveNew(Joanna(), Body(name: $"Business {i}"));
        }

        var response = await Joanna().PostAsJsonAsync("/api/listing-drafts", Body(name: "Business 6"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await Json(response);
        Assert.Equal("LISTING_LIMIT", problem.GetProperty("code").GetString());
        Assert.Contains("You can list up to 5 businesses. Write to help@jubilee.example for more.", problem.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task L2_079_AC2_submitted_listings_count_toward_the_limit_too()
    {
        for (var i = 1; i <= 5; i++)
        {
            var draft = await SaveNew(Joanna(), Body(name: $"Business {i}"));
            await Submit(Joanna(), draft.GetProperty("id").GetGuid(), Body(name: $"Business {i}"));
        }

        var response = await Joanna().PostAsJsonAsync("/api/listing-drafts", Body(name: "Business 6"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    // L2-077 AC5: a draft untouched for 180 days is e-mailed, then deleted 14 days later
    [Fact]
    public async Task L2_077_AC5_a_draft_untouched_for_180_days_is_e_mailed_and_deleted_14_days_later()
    {
        var owner = Member.Join(EmailAddress.TryParse("joanna@example.com")!, "Joanna", "Adeyemi", null, "hash", ListingMother.Now);
        owner.ConfirmEmail();
        await _factory.WithDb(async db =>
        {
            db.Members.Add(owner);
            await db.SaveChangesAsync();
        });
        var client = _factory.CreateMemberClient("Joanna Adeyemi", owner.Id.ToString());
        await SaveNew(client);

        _factory.Clock.Advance(TimeSpan.FromDays(179));
        await Sweep();
        await _factory.WithDb(async db => Assert.Equal(1, await db.ListingDrafts.CountAsync()));
        Assert.Equal(0, await Mails("joanna@example.com"));

        _factory.Clock.Advance(TimeSpan.FromDays(2));
        await Sweep();
        await Sweep();
        Assert.Equal(1, await Mails("joanna@example.com"));
        await _factory.WithDb(async db => Assert.Equal(1, await db.ListingDrafts.CountAsync()));

        _factory.Clock.Advance(TimeSpan.FromDays(14));
        await Sweep();
        await _factory.WithDb(async db => Assert.Equal(0, await db.ListingDrafts.CountAsync()));
    }

    [Fact]
    public async Task L2_077_AC5_saving_a_draft_again_starts_the_180_days_over()
    {
        var saved = await SaveNew(Joanna());
        _factory.Clock.Advance(TimeSpan.FromDays(170));
        await Joanna().PutAsJsonAsync($"/api/listing-drafts/{saved.GetProperty("id").GetGuid()}", Body());
        _factory.Clock.Advance(TimeSpan.FromDays(30));

        await Sweep();
        _factory.Clock.Advance(TimeSpan.FromDays(30));
        await Sweep();

        await _factory.WithDb(async db => Assert.Equal(1, await db.ListingDrafts.CountAsync()));
    }

    // L2-077 AC5, L2-182 AC1: the expiry runs at most once a day across instances and records its last success
    [Fact]
    public async Task L2_077_AC5_the_draft_expiry_job_runs_once_a_day_across_instances_and_records_its_last_success()
    {
        var owner = Member.Join(EmailAddress.TryParse("joanna@example.com")!, "Joanna", "Adeyemi", null, "hash", ListingMother.Now);
        owner.ConfirmEmail();
        await _factory.WithDb(async db =>
        {
            db.Members.Add(owner);
            await db.SaveChangesAsync();
        });
        await SaveNew(_factory.CreateMemberClient("Joanna Adeyemi", owner.Id.ToString()));
        _factory.Clock.Advance(TimeSpan.FromDays(181));
        var now = _factory.Clock.GetUtcNow();

        var first = await Tick();
        _factory.Clock.Advance(TimeSpan.FromMinutes(5));
        var second = await Tick();

        Assert.Equal(1, first);
        Assert.Null(second);
        Assert.Equal(1, await Mails("joanna@example.com"));
        List<JobRun> runs = [];
        await _factory.WithDb(async db => runs = await db.JobRuns.AsNoTracking().ToListAsync());
        var run = Assert.Single(runs);
        Assert.Equal(RunListingDraftExpiryJobCommand.Job, run.Job);
        Assert.Equal("listing-draft-expiry", run.Job);
        Assert.Equal(now, run.SucceededAt);

        _factory.Clock.Advance(TimeSpan.FromDays(14));
        Assert.Equal(1, await Tick());
        await _factory.WithDb(async db => Assert.Equal(0, await db.ListingDrafts.CountAsync()));
    }

    private async Task<int?> Tick()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(new RunListingDraftExpiryJobCommand());
    }

    private async Task Sweep()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<ISender>().Send(new ExpireListingDraftsCommand());
    }

    private async Task<int> Mails(string to)
    {
        var count = 0;
        await _factory.WithDb(async db => count = await db.OutboxMessages.CountAsync(m => m.ToAddress == to));
        return count;
    }
}
