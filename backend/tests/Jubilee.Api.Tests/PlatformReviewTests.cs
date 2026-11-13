using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>A member reviews a software platform on their own statement that they have used it (L2-258, L2-259).</summary>
public sealed class PlatformReviewTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Founder = "member|abigail";
    private const string Joanna = "member|joanna";
    private const string GoodText = "We log every book the children finish. The weekly goal keeps all of us reading.";

    private readonly JubileeApiFactory _factory;
    private Listing _lanternread = null!;

    public PlatformReviewTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _lanternread = ListingMother.Platform("lanternread", "Lanternread");
        _lanternread.AssignOwner(Founder);
        await _factory.Arrange(_lanternread);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient AsJoanna() => _factory.CreateMemberClient("Joanna Adeyemi", Joanna);

    private HttpClient AsAbigail() => _factory.CreateMemberClient("Abigail Thornton", Founder);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Task<HttpResponseMessage> Post(HttpClient client, object body, string slug = "lanternread")
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/listings/{slug}/reviews") { Content = JsonContent.Create(body) };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        return client.SendAsync(request);
    }

    private Task<List<Review>> Stored() => _factory.Query(db => db.Reviews.AsNoTracking().ToListAsync());

    [Fact]
    public async Task L2_258_AC1_a_member_who_never_sent_the_platform_anything_may_write()
    {
        var member = await _factory.GetJson("/api/listings/lanternread/reviews", AsJoanna());
        var visitor = await _factory.GetJson("/api/listings/lanternread/reviews");
        var founder = await _factory.GetJson("/api/listings/lanternread/reviews", AsAbigail());

        Assert.Equal("eligible", member.GetProperty("writing").GetString());
        Assert.Equal("sign-in", visitor.GetProperty("writing").GetString());
        Assert.Equal("owner", founder.GetProperty("writing").GetString());
    }

    [Fact]
    public async Task L2_259_AC7_the_form_of_a_platform_has_no_item_to_choose()
    {
        var form = await _factory.GetJson("/api/listings/lanternread/reviews/new", AsJoanna());

        Assert.Equal("platform", form.GetProperty("listing").GetProperty("kind").GetString());
        Assert.Equal("Software platforms", form.GetProperty("listing").GetProperty("categoryName").GetString());
        Assert.Empty(form.GetProperty("items").EnumerateArray());
        Assert.Equal(JsonValueKind.Null, form.GetProperty("itemLegend").ValueKind);
        Assert.Equal("Joanna A.", form.GetProperty("authorName").GetString());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(null)]
    public async Task L2_258_AC3_a_review_without_the_statement_of_use_is_refused_and_nothing_is_stored(bool? usedIt)
    {
        var response = await Post(AsJoanna(), new { rating = 5, text = GoodText, usedIt });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("STATEMENT_REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("usedIt").GetString());
        Assert.Empty(await Stored());
    }

    [Fact]
    public async Task L2_259_AC2_the_statement_is_named_beside_the_other_fields_that_are_wrong()
    {
        var response = await Post(AsJoanna(), new { rating = (int?)null, text = "Short" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("RATING_REQUIRED", errors.GetProperty("rating").GetString());
        Assert.Equal("TOO_SHORT", errors.GetProperty("text").GetString());
        Assert.Equal("STATEMENT_REQUIRED", errors.GetProperty("usedIt").GetString());
    }

    [Fact]
    public async Task L2_258_AC3_with_the_statement_the_review_is_stored_with_its_time_and_is_about_their_platform()
    {
        var response = await Post(AsJoanna(), new { rating = 5, text = GoodText, usedIt = true });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var review = await Json(response);
        Assert.Equal("Their platform", review.GetProperty("itemName").GetString());
        Assert.Equal("Joanna A.", review.GetProperty("author").GetString());
        var stored = Assert.Single(await Stored());
        Assert.NotNull(stored.StatedUseAt);
        Assert.Equal(stored.CreatedAt, stored.StatedUseAt);
        Assert.Null(stored.ServiceId);
        Assert.Null(stored.ProductId);
        var page = await _factory.GetJson("/api/listings/lanternread/reviews", AsJoanna());
        Assert.Equal("written", page.GetProperty("writing").GetString());
        Assert.Equal(1, page.GetProperty("summary").GetProperty("count").GetInt32());
    }

    [Fact]
    public async Task L2_261_AC4_no_answer_shows_the_statement_or_calls_the_review_verified()
    {
        await Post(AsJoanna(), new { rating = 5, text = GoodText, usedIt = true });

        var raw = (await _factory.GetJson("/api/listings/lanternread/reviews")).GetRawText();

        Assert.DoesNotContain("statedUse", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("usedIt", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("verified", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(Joanna, raw);
    }

    [Fact]
    public async Task L2_258_AC4_the_founder_cannot_review_their_own_platform()
    {
        var response = await Post(AsAbigail(), new { rating = 5, text = GoodText, usedIt = true });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("OWN_LISTING", (await Json(response)).GetProperty("code").GetString());
        Assert.Empty(await Stored());
    }

    [Fact]
    public async Task L2_258_AC4_a_visitor_cannot_send_a_review()
    {
        var response = await Post(_factory.CreateClient(), new { rating = 5, text = GoodText, usedIt = true });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task L2_258_AC5_a_member_keeps_one_review_per_platform()
    {
        await Post(AsJoanna(), new { rating = 5, text = GoodText, usedIt = true });

        var second = await Post(AsJoanna(), new { rating = 4, text = GoodText, usedIt = true });
        var form = await AsJoanna().GetAsync("/api/listings/lanternread/reviews/new");

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("ALREADY_REVIEWED", (await Json(second)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Conflict, form.StatusCode);
        Assert.Single(await Stored());
    }

    [Fact]
    public async Task L2_258_AC7_a_paused_platform_takes_no_review()
    {
        await _factory.WithDb(async db =>
        {
            var listing = await db.Listings.SingleAsync(l => l.Slug == "lanternread");
            listing.Pause(ListingMother.Now);
            await db.SaveChangesAsync();
        });

        var response = await Post(AsJoanna(), new { rating = 5, text = GoodText, usedIt = true });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Empty(await Stored());
    }

    [Fact]
    public async Task L2_258_AC8_a_statement_of_use_does_not_open_a_business_to_review()
    {
        var bakery = ListingMother.Public("rise-bakery", name: "Rise Bakery");
        bakery.AssignOwner("member|ruth");
        await _factory.Arrange(bakery);

        var with = await Post(AsJoanna(), new { rating = 5, text = GoodText, usedIt = true }, "rise-bakery");
        var without = await Post(AsJoanna(), new { rating = 5, text = GoodText }, "rise-bakery");
        var page = await _factory.GetJson("/api/listings/rise-bakery/reviews", AsJoanna());

        Assert.Equal(HttpStatusCode.Forbidden, with.StatusCode);
        Assert.Equal("NOT_ELIGIBLE", (await Json(with)).GetProperty("code").GetString());
        Assert.Equal("NOT_ELIGIBLE", (await Json(without)).GetProperty("code").GetString());
        Assert.Equal("not-eligible", page.GetProperty("writing").GetString());
        Assert.Empty(await Stored());
    }

    [Fact]
    public async Task L2_260_AC6_the_founder_is_told_of_a_new_review_in_the_words_of_any_listing()
    {
        await Post(AsJoanna(), new { rating = 5, text = GoodText, usedIt = true });

        var told = await _factory.Query(db => db.Notifications.AsNoTracking().Where(n => n.MemberSubject == Founder).ToListAsync());

        var notice = Assert.Single(told);
        Assert.Equal("New review of Lanternread", notice.Title);
        Assert.Equal("Joanna A. gave it 5 of 5 stars for Their platform.", notice.Detail);
    }
}
