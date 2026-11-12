using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Writing a review: L2-225 AC2, AC4, AC5; L2-227 AC3; L2-230 AC5; L2-234 AC1; L2-237 AC2, AC3, AC4, AC6, AC7, AC8.
public sealed partial class ReviewTests
{
    private const string GoodText = "Trevor took the time to understand what we needed. Clear, honest and no pressure.";

    private static Task<HttpResponseMessage> Post(
        HttpClient client, object body, string slug = "legacy-financial", string? key = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/listings/{slug}/reviews") { Content = JsonContent.Create(body) };
        request.Headers.Add("Idempotency-Key", key ?? Guid.NewGuid().ToString());
        return client.SendAsync(request);
    }

    private object Body(int? rating = 5, Guid? itemId = null, string? text = GoodText) => new { rating, itemId = itemId ?? _discovery.Id, text };

    private Task Eligible(string subject = Joanna, string name = "Joanna Adeyemi") => _factory.Arrange(RequestOf(subject, name, RequestStatus.Confirmed));

    // L2-237 AC2
    [Fact]
    public async Task L2_234_AC2_the_form_answers_the_listing_its_items_and_the_name_shown()
    {
        await Eligible();

        var form = await _factory.GetJson("/api/listings/legacy-financial/reviews/new", AsJoanna());

        Assert.Equal("Legacy Financial", form.GetProperty("listing").GetProperty("name").GetString());
        Assert.Equal("Financial & insurance", form.GetProperty("listing").GetProperty("categoryName").GetString());
        Assert.Equal("service", form.GetProperty("itemLegend").GetString());
        Assert.Equal(["Discovery meeting", "Estate & legacy plan"], form.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("name").GetString()));
        Assert.Equal("Joanna A.", form.GetProperty("authorName").GetString());
    }

    // L2-237 AC2, L2-225 AC2, AC4, AC5
    [Fact]
    public async Task L2_234_AC2_the_form_refuses_a_member_who_may_not_write()
    {
        var notEligible = await AsJoanna().GetAsync("/api/listings/legacy-financial/reviews/new");
        var owner = await AsTrevor().GetAsync("/api/listings/legacy-financial/reviews/new");
        await Eligible(David, "David Chen");
        await _factory.Arrange(ReviewBy(David, "David Chen", 4, _discovery, 1));
        var written = await AsDavid().GetAsync("/api/listings/legacy-financial/reviews/new");

        Assert.Equal(HttpStatusCode.Forbidden, notEligible.StatusCode);
        Assert.Equal("NOT_ELIGIBLE", (await Json(notEligible)).GetProperty("code").GetString());
        Assert.Equal("OWN_LISTING", (await Json(owner)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Conflict, written.StatusCode);
        Assert.Equal("ALREADY_REVIEWED", (await Json(written)).GetProperty("code").GetString());
    }

    // L2-226 AC3: a space is about the stay; a listing with no services is about "Their service"
    [Fact]
    public async Task L2_223_AC3_a_space_and_a_listing_without_items_ask_for_no_item()
    {
        var suite = ListingMother.Space("guest-suite", SpaceTerm.ShortStay, 120);
        var plain = ListingMother.Public("deeks-insurance", "financial-insurance", "Deeks Insurance");
        await _factory.Arrange(suite, plain);
        await _factory.Arrange(ConfirmedQuote(suite), ConfirmedQuote(plain));

        var plainForm = await _factory.GetJson("/api/listings/deeks-insurance/reviews/new", AsJoanna());
        var suiteForm = await _factory.GetJson("/api/listings/guest-suite/reviews/new", AsJoanna());
        var plainReview = await Post(AsJoanna(), new { rating = 4, itemId = (Guid?)null, text = GoodText }, "deeks-insurance");
        var suiteReview = await Post(AsJoanna(), new { rating = 5, itemId = (Guid?)null, text = GoodText }, "guest-suite");

        Assert.Equal(JsonValueKind.Null, plainForm.GetProperty("itemLegend").ValueKind);
        Assert.Empty(plainForm.GetProperty("items").EnumerateArray());
        Assert.Equal(JsonValueKind.Null, suiteForm.GetProperty("itemLegend").ValueKind);
        Assert.Equal("space", suiteForm.GetProperty("listing").GetProperty("kind").GetString());
        Assert.Equal("Their service", (await Json(plainReview)).GetProperty("itemName").GetString());
        Assert.Equal("My stay", (await Json(suiteReview)).GetProperty("itemName").GetString());
    }

    private static Request ConfirmedQuote(Listing listing)
    {
        var request = Request.AskForQuote(
            Joanna, "Joanna Adeyemi", listing.Id, null, null, "A job description for this one.", null, null, null, Guid.NewGuid().ToString(), ListingMother.Now);
        request.Confirm("member|someone", ListingMother.Now);
        return request;
    }

    // L2-237 AC3, L2-227 AC3
    [Fact]
    public async Task L2_234_AC3_an_eligible_member_posts_a_review_with_themselves_as_its_author()
    {
        await Eligible();

        var response = await Post(AsJoanna(), new { rating = 5, itemId = _estate.Id, text = "  " + GoodText + "  ", authorSubject = "member|evil" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var created = await Post(AsJoanna(), new { rating = 5, itemId = _estate.Id, text = "  " + GoodText + "  " });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var json = await Json(created);
        Assert.Equal("Joanna A.", json.GetProperty("author").GetString());
        Assert.True(json.GetProperty("mine").GetBoolean());
        var review = await Read(db => db.Reviews.SingleAsync());
        Assert.Equal(Joanna, review.AuthorSubject);
        Assert.Equal(GoodText, review.Text);
        Assert.Equal("Estate & legacy plan", review.ItemName);
        Assert.Equal(_estate.Id, review.ServiceId);
    }

    // L2-237 AC3, L2-132
    [Fact]
    public async Task L2_234_AC3_a_repeat_with_the_same_key_answers_the_first_review()
    {
        await Eligible();

        var first = await Json(await Post(AsJoanna(), Body(), key: "same-key"));
        var again = await Post(AsJoanna(), Body(rating: 2), key: "same-key");

        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
        Assert.Equal(first.GetProperty("id").GetGuid(), (await Json(again)).GetProperty("id").GetGuid());
        Assert.Equal(1, await Read(db => db.Reviews.CountAsync()));
    }

    // L2-237 AC4
    [Theory]
    [InlineData(null, "rating", "RATING_REQUIRED")]
    [InlineData(0, "rating", "RATING_REQUIRED")]
    [InlineData(6, "rating", "RATING_REQUIRED")]
    public async Task L2_234_AC4_a_rating_outside_one_to_five_is_refused(int? rating, string field, string code)
    {
        await Eligible();

        var response = await Post(AsJoanna(), Body(rating: rating));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(code, (await Json(response)).GetProperty("errors").GetProperty(field).GetString());
        Assert.Equal(0, await Read(db => db.Reviews.CountAsync()));
    }

    // L2-237 AC4, L2-227 AC2
    [Fact]
    public async Task L2_234_AC4_text_is_held_between_40_and_2000_characters_once_trimmed()
    {
        await Eligible();

        var tooShort = await Post(AsJoanna(), Body(text: "  " + new string('a', 39) + "     "));
        var tooLong = await Post(AsJoanna(), Body(text: new string('a', 2001)));
        var unknownItem = await Post(AsJoanna(), Body(itemId: Guid.NewGuid()));
        var shortest = await Post(AsJoanna(), Body(text: new string('a', 40)));

        Assert.Equal("TOO_SHORT", (await Json(tooShort)).GetProperty("errors").GetProperty("text").GetString());
        Assert.Equal("TOO_LONG", (await Json(tooLong)).GetProperty("errors").GetProperty("text").GetString());
        Assert.Equal("ITEM_UNKNOWN", (await Json(unknownItem)).GetProperty("errors").GetProperty("itemId").GetString());
        Assert.Equal(HttpStatusCode.Created, shortest.StatusCode);
    }

    // L2-225 AC2, AC4, AC5, L2-237 AC7
    [Fact]
    public async Task L2_222_a_member_who_may_not_write_is_refused()
    {
        var notEligible = await Post(AsJoanna(), Body());
        var owner = await Post(AsTrevor(), Body());
        var visitor = await Post(_factory.CreateClient(), Body());
        await Eligible();
        await Post(AsJoanna(), Body());
        var second = await Post(AsJoanna(), Body());

        Assert.Equal("NOT_ELIGIBLE", (await Json(notEligible)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Forbidden, owner.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(owner)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized, visitor.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("ALREADY_REVIEWED", (await Json(second)).GetProperty("code").GetString());
        Assert.Equal(1, await Read(db => db.Reviews.CountAsync()));
    }

    // L2-230 AC5, L2-237 AC9
    [Fact]
    public async Task L2_227_AC5_a_posted_review_is_counted_on_the_listing()
    {
        await _factory.Arrange(
            RequestOf(Joanna, "Joanna Adeyemi", RequestStatus.Confirmed),
            RequestOf(David, "David Chen", RequestStatus.Confirmed),
            RequestOf("member|ruth", "Ruth Mensah", RequestStatus.Completed));
        await _factory.GetJson("/api/categories/financial-insurance/listings");

        await Post(AsJoanna(), Body(rating: 5));
        await Post(AsDavid(), Body(rating: 4));
        await Post(_factory.CreateMemberClient("Ruth Mensah", "member|ruth"), Body(rating: 4));

        var card = (await _factory.GetJson("/api/categories/financial-insurance/listings")).GetProperty("businesses")[0];
        Assert.Equal(4.3m, card.GetProperty("rating").GetProperty("average").GetDecimal());
        Assert.Equal(3, card.GetProperty("rating").GetProperty("count").GetInt32());
    }

    // L2-234 AC1
    [Fact]
    public async Task L2_231_AC1_the_owner_is_told_of_a_new_review()
    {
        await Eligible();

        await Post(AsJoanna(), Body(rating: 4));

        var notification = await Read(db => db.Notifications.SingleAsync());
        Assert.Equal(Trevor, notification.MemberSubject);
        Assert.Equal("review", notification.Kind);
        Assert.Equal("New review of Legacy Financial", notification.Title);
        Assert.Equal("Joanna A. gave it 4 of 5 stars for Discovery meeting.", notification.Detail);
        Assert.Equal("/b/legacy-financial", notification.Target);
    }

    // L2-237 AC6
    [Fact]
    public async Task L2_234_AC6_more_than_five_new_reviews_in_a_day_are_slowed_down()
    {
        var listings = Enumerable.Range(1, 6).Select(i => ListingMother.Public($"listing-{i}", "home-property", $"Listing {i}")).ToList();
        await _factory.Arrange([.. listings]);
        await _factory.Arrange([.. listings.Select(ConfirmedQuote)]);

        var answers = new List<HttpStatusCode>();
        foreach (var listing in listings)
        {
            answers.Add((await Post(AsJoanna(), new { rating = 5, itemId = (Guid?)null, text = GoodText }, listing.Slug)).StatusCode);
        }

        Assert.Equal(Enumerable.Repeat(HttpStatusCode.Created, 5).Append(HttpStatusCode.TooManyRequests), answers);
    }
}
