using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

// Reading reviews: L2-225 AC1, AC2, AC4, AC5, AC7; L2-228; L2-231 AC4; L2-237 AC1; L2-238 AC1.
public sealed partial class ReviewTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Joanna = "member|joanna";
    private const string David = "member|david";
    private const string Trevor = "member|trevor";

    private readonly JubileeApiFactory _factory;
    private Listing _listing = null!;
    private Service _discovery = null!;
    private Service _estate = null!;

    public ReviewTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _listing = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        _listing.AssignOwner(Trevor);
        _discovery = Service.Create(_listing.Id, 1, "Discovery meeting", "30 min", ServicePrice.Free, ServiceAction.Book);
        _estate = Service.Create(_listing.Id, 2, "Estate & legacy plan", "Two sessions", ServicePrice.Ask, ServiceAction.Book);
        await _factory.Arrange(_listing, _discovery, _estate);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient AsJoanna() => _factory.CreateMemberClient("Joanna Adeyemi", Joanna);

    private HttpClient AsDavid() => _factory.CreateMemberClient("David Chen", David);

    private HttpClient AsTrevor() => _factory.CreateMemberClient("Trevor Chew", Trevor);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private Task<T> Read<T>(Func<Infrastructure.Persistence.AppDbContext, Task<T>> work) => _factory.Query(work);

    private Review ReviewBy(string subject, string name, int rating, Service service, int daysAgo, string? text = null) =>
        Review.Write(
            _listing.Id, new ReviewItem(service.Id, null, service.Name), subject, name, rating,
            text ?? $"The {service.Name.ToLowerInvariant()} was honest, clear and worth the time it took us.",
            Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-daysAgo));

    /// <summary>A request of <paramref name="subject"/> for the listing, moved to <paramref name="status"/> by the owner.</summary>
    private Request RequestOf(string subject, string name, RequestStatus status)
    {
        var request = Request.Book(
            subject, name, _listing.Id, _discovery.Id, _discovery.Name, ListingMother.Now.AddDays(-5), TimeSpan.FromMinutes(30),
            MeetingMode.Video, null, null, Guid.NewGuid().ToString(), ListingMother.Now.AddDays(-6));
        switch (status)
        {
            case RequestStatus.Confirmed:
                request.Confirm(Trevor, ListingMother.Now.AddDays(-6));
                break;
            case RequestStatus.Completed:
                request.Confirm(Trevor, ListingMother.Now.AddDays(-6));
                request.Complete(Trevor, ListingMother.Now.AddDays(-5));
                break;
            case RequestStatus.Declined:
                request.Decline(Trevor, ListingMother.Now.AddDays(-6));
                break;
            case RequestStatus.Cancelled:
                request.Cancel(subject, ListingMother.Now.AddDays(-6));
                break;
        }

        return request;
    }

    private async Task<JsonElement> Reviews(HttpClient? client = null, string slug = "legacy-financial") =>
        await _factory.GetJson($"/api/listings/{slug}/reviews", client);

    // L2-237 AC1, L2-228 AC2, AC3, L2-238 AC1
    [Fact]
    public async Task L2_234_AC1_anyone_reads_the_summary_and_the_reviews_newest_first()
    {
        var grace = ReviewBy("member|grace", "Grace Adebayo", 5, _estate, 7);
        grace.ReplyWith("Trevor Chew", "Thank you, Grace.", ListingMother.Now.AddDays(-6));
        await _factory.Arrange(grace, ReviewBy("member|marcus", "Marcus Thompson", 5, _discovery, 20), ReviewBy("member|esther", "Esther Lau", 3, _discovery, 2));

        var page = await Reviews();

        var summary = page.GetProperty("summary");
        Assert.Equal(4.3m, summary.GetProperty("average").GetDecimal());
        Assert.Equal(3, summary.GetProperty("count").GetInt32());
        Assert.Equal([2, 0, 1, 0, 0], summary.GetProperty("breakdown").EnumerateArray().Select(e => e.GetInt32()));
        var items = page.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(["Esther L.", "Grace A.", "Marcus T."], items.Select(i => i.GetProperty("author").GetString()));
        var first = items[1];
        Assert.Equal("GA", first.GetProperty("initials").GetString());
        Assert.Equal(5, first.GetProperty("rating").GetInt32());
        Assert.Equal("Estate & legacy plan", first.GetProperty("itemName").GetString());
        Assert.Equal(_estate.Id, first.GetProperty("itemId").GetGuid());
        Assert.False(first.GetProperty("mine").GetBoolean());
        Assert.Equal(JsonValueKind.Null, first.GetProperty("editedAt").ValueKind);
        var reply = first.GetProperty("reply");
        Assert.Equal("Trevor Chew", reply.GetProperty("from").GetString());
        Assert.Equal("Thank you, Grace.", reply.GetProperty("text").GetString());
        var raw = page.GetRawText();
        Assert.DoesNotContain("member|grace", raw);
        Assert.DoesNotContain("Adebayo", raw);
        Assert.Equal("visitor", page.GetProperty("viewer").GetString());
        Assert.Equal("sign-in", page.GetProperty("writing").GetString());
    }

    // L2-228 AC6
    [Fact]
    public async Task L2_225_AC6_a_listing_without_reviews_answers_an_empty_summary()
    {
        var page = await Reviews();

        Assert.Equal(0, page.GetProperty("summary").GetProperty("count").GetInt32());
        Assert.Equal(0m, page.GetProperty("summary").GetProperty("average").GetDecimal());
        Assert.Empty(page.GetProperty("items").EnumerateArray());
    }

    // L2-225 AC1
    [Theory]
    [InlineData(RequestStatus.Confirmed)]
    [InlineData(RequestStatus.Completed)]
    public async Task L2_222_AC1_a_member_with_a_confirmed_or_completed_request_may_write(RequestStatus status)
    {
        await _factory.Arrange(RequestOf(Joanna, "Joanna Adeyemi", status));

        var page = await Reviews(AsJoanna());

        Assert.Equal("member", page.GetProperty("viewer").GetString());
        Assert.Equal("eligible", page.GetProperty("writing").GetString());
    }

    // L2-225 AC2
    [Theory]
    [InlineData(RequestStatus.New)]
    [InlineData(RequestStatus.Declined)]
    [InlineData(RequestStatus.Cancelled)]
    public async Task L2_222_AC2_a_member_without_a_confirmed_request_may_not_write(RequestStatus status)
    {
        await _factory.Arrange(RequestOf(Joanna, "Joanna Adeyemi", status), RequestOf(David, "David Chen", RequestStatus.Confirmed));

        var page = await Reviews(AsJoanna());

        Assert.Equal("not-eligible", page.GetProperty("writing").GetString());
    }

    // L2-225 AC4
    [Fact]
    public async Task L2_222_AC4_the_owner_is_told_it_is_their_listing()
    {
        var page = await Reviews(AsTrevor());

        Assert.Equal("owner", page.GetProperty("viewer").GetString());
        Assert.Equal("owner", page.GetProperty("writing").GetString());
    }

    // L2-225 AC5, L2-228 AC7
    [Fact]
    public async Task L2_222_AC5_a_member_with_a_review_has_written_and_their_review_is_marked_mine()
    {
        await _factory.Arrange(RequestOf(Joanna, "Joanna Adeyemi", RequestStatus.Confirmed), ReviewBy(Joanna, "Joanna Adeyemi", 4, _discovery, 1));

        var page = await Reviews(AsJoanna());

        Assert.Equal("written", page.GetProperty("writing").GetString());
        Assert.True(page.GetProperty("items")[0].GetProperty("mine").GetBoolean());
        Assert.False((await Reviews(AsDavid())).GetProperty("items")[0].GetProperty("mine").GetBoolean());
    }

    // L2-236 AC3, AC5
    [Fact]
    public async Task L2_233_AC5_a_review_taken_down_is_shown_nowhere()
    {
        var gone = ReviewBy(Joanna, "Joanna Adeyemi", 1, _discovery, 3);
        gone.TakeDown("It names another person.", ListingMother.Now.AddDays(-1));
        await _factory.Arrange(gone, ReviewBy(David, "David Chen", 5, _discovery, 4), RequestOf(Joanna, "Joanna Adeyemi", RequestStatus.Confirmed));

        var page = await Reviews(AsJoanna());

        Assert.Equal(1, page.GetProperty("summary").GetProperty("count").GetInt32());
        Assert.Equal(["David C."], page.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("author").GetString()));
        Assert.Equal("eligible", page.GetProperty("writing").GetString());
    }

    // L2-225 AC7
    [Fact]
    public async Task L2_222_AC7_the_reviews_of_a_listing_that_is_not_public_are_not_found()
    {
        await _factory.Arrange(ListingMother.NonPublic(NonPublicState.Paused, "paused-one"));

        var response = await _factory.CreateClient().GetAsync("/api/listings/paused-one/reviews");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // L2-231 AC4
    [Fact]
    public async Task L2_228_AC4_the_reviews_of_one_product_are_answered_by_its_slug()
    {
        var shop = ListingMother.Public("luzandre", "shops", "Luzandre.com");
        var mug = Product.Create(shop.Id, "gold-cross-stoneware-mug", "Gold cross stoneware mug", 2400, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now);
        var tee = Product.Create(shop.Id, "faith-tee", "Faith tee", 3400, false, TileTint.Ink, TileIcon.Shirt, ListingMother.Now);
        var aboutMug = Review.Write(shop.Id, new ReviewItem(null, mug.Id, mug.Name), "member|ruth", "Ruth Mensah", 5, new string('m', 60), "k1", ListingMother.Now);
        var aboutTee = Review.Write(shop.Id, new ReviewItem(null, tee.Id, tee.Name), "member|kofi", "Kofi Boateng", 3, new string('t', 60), "k2", ListingMother.Now);
        await _factory.Arrange(shop, mug, tee, aboutMug, aboutTee);

        var page = await _factory.GetJson("/api/listings/luzandre/reviews?product=gold-cross-stoneware-mug");
        var unknown = await _factory.CreateClient().GetAsync("/api/listings/luzandre/reviews?product=no-such-thing");

        Assert.Equal(["Ruth M."], page.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("author").GetString()));
        Assert.Equal(1, page.GetProperty("summary").GetProperty("count").GetInt32());
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
    }
}
