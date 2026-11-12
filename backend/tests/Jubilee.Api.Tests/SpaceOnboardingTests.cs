using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

/// <summary>Listing a space (L2-198 to L2-200): its draft, its fields and their validation, submission and review.</summary>
public sealed class SpaceOnboardingTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string Address = "27 Curzon St, Toronto ON M4M 3B4";
    private readonly JubileeApiFactory _factory;

    public SpaceOnboardingTests(JubileeApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => _factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Ruth() => _factory.CreateMemberClient("Ruth Mensah", "member|ruth");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static Dictionary<string, object?> Space(
        string term = "room",
        int? rent = 950,
        string? available = "Now",
        int? minimumStay = 4,
        string? neighbourhood = "Leslieville",
        string? address = Address,
        string? household = "Ruth and Kwame with our daughter Abena (14) and a very calm cat.") => new()
        {
            ["term"] = term,
            ["rent"] = rent,
            ["available"] = available,
            ["minimumStay"] = minimumStay,
            ["neighbourhood"] = neighbourhood,
            ["address"] = address,
            ["place"] = "Private room",
            ["facts"] = new[] { "Double bed", "Shared bath", "Furnished", "Desk", "A fifth fact is dropped" },
            ["included"] = new[] { "Utilities", "Wi-Fi", "Not a chip" },
            ["household"] = household,
            ["rules"] = new[] { "No overnight guests", "Share the chore rota" },
        };

    private static Dictionary<string, object?> Body(Dictionary<string, object?>? space = null, bool agreed = true, string? name = "Furnished room in a family home, Leslieville") => new()
    {
        ["kind"] = "space",
        ["name"] = name,
        ["tagline"] = "Quiet room with a desk, shared bath, home-cooked Sunday dinners",
        ["categorySlug"] = null,
        ["highlight"] = null,
        ["place"] = null,
        ["agreed"] = agreed,
        ["items"] = Array.Empty<object>(),
        ["space"] = space ?? Space(),
        ["idempotencyKey"] = Guid.NewGuid().ToString(),
    };

    private async Task<Guid> Draft(HttpClient client, Dictionary<string, object?> body)
    {
        var response = await client.PostAsJsonAsync("/api/listing-drafts", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task L2_198_AC4_L2_199_AC10_a_space_draft_keeps_its_term_and_every_field()
    {
        await Draft(Ruth(), Body(Space(rent: null, neighbourhood: null)));

        var draft = await _factory.GetJson("/api/listing-drafts/current", Ruth());

        Assert.Equal("space", draft.GetProperty("kind").GetString());
        var space = draft.GetProperty("space");
        Assert.Equal("room", space.GetProperty("term").GetString());
        Assert.Equal(JsonValueKind.Null, space.GetProperty("rent").ValueKind);
        Assert.Equal(4, space.GetProperty("minimumStay").GetInt32());
        Assert.Equal(Address, space.GetProperty("address").GetString());
        Assert.Equal("Private room", space.GetProperty("place").GetString());
        Assert.Equal(["Double bed", "Shared bath", "Furnished", "Desk"], space.GetProperty("facts").EnumerateArray().Select(f => f.GetString()));
        Assert.Equal(["Utilities", "Wi-Fi"], space.GetProperty("included").EnumerateArray().Select(f => f.GetString()));
        Assert.StartsWith("Ruth and Kwame", space.GetProperty("household").GetString());
    }

    [Fact]
    public async Task L2_200_AC2_a_valid_space_is_submitted_into_rooms_and_rentals_ready_to_review()
    {
        var id = await Draft(Ruth(), Body());

        var response = await Ruth().PostAsJsonAsync($"/api/listing-drafts/{id}/submit", Body());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var submitted = await Json(response);
        Assert.Equal("space", submitted.GetProperty("kind").GetString());
        Assert.Equal("ready-to-review", submitted.GetProperty("stage").GetString());

        await _factory.WithDb(async db =>
        {
            var listing = await db.Listings.AsNoTracking().SingleAsync(l => l.Slug == submitted.GetProperty("slug").GetString());
            Assert.Equal(Category.RoomsSlug, listing.CategorySlug);
            Assert.Equal(ListingKind.Space, listing.Kind);
            Assert.Equal(SpaceTerm.Room, listing.Space!.Term);
            Assert.Equal(950, listing.Space.Rent);
            Assert.Equal(Address, listing.Space.Address);
            Assert.Equal("Ruth Mensah", listing.OwnerName);
            Assert.Equal(ListingStage.ReadyToReview, listing.Stage);
        });
    }

    [Fact]
    public async Task L2_199_AC6_AC7_AC8_an_incomplete_space_is_refused_field_by_field_and_needs_no_category()
    {
        var id = await Draft(Ruth(), Body());

        var response = await Ruth().PostAsJsonAsync(
            $"/api/listing-drafts/{id}/submit",
            Body(Space(rent: 0, available: " ", neighbourhood: null, address: "", household: null)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("REQUIRED", errors.GetProperty("space.rent").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("space.available").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("space.neighbourhood").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("space.address").GetString());
        Assert.Equal("REQUIRED", errors.GetProperty("space.household").GetString());
        Assert.False(errors.TryGetProperty("categorySlug", out _));
    }

    [Fact]
    public async Task L2_199_AC6_a_rent_over_fifty_thousand_is_refused()
    {
        var id = await Draft(Ruth(), Body());

        var response = await Ruth().PostAsJsonAsync($"/api/listing-drafts/{id}/submit", Body(Space(rent: 50_001)));

        Assert.Equal("TOO_HIGH", (await Json(response)).GetProperty("errors").GetProperty("space.rent").GetString());
    }

    [Fact]
    public async Task L2_199_AC4_a_long_term_space_needs_no_household()
    {
        var id = await Draft(Ruth(), Body());

        var response = await Ruth().PostAsJsonAsync(
            $"/api/listing-drafts/{id}/submit", Body(Space(term: "long-term", minimumStay: 12, household: null)));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task L2_200_AC1_the_agreement_is_required()
    {
        var id = await Draft(Ruth(), Body());

        var response = await Ruth().PostAsJsonAsync($"/api/listing-drafts/{id}/submit", Body(agreed: false));

        Assert.Equal("REQUIRED", (await Json(response)).GetProperty("errors").GetProperty("agreed").GetString());
    }

    [Fact]
    public async Task L2_200_AC3_the_verification_team_reviews_the_space_without_its_address()
    {
        var id = await Draft(Ruth(), Body());
        var submitted = await Json(await Ruth().PostAsJsonAsync($"/api/listing-drafts/{id}/submit", Body()));
        var listingId = submitted.GetProperty("listingId").GetGuid();
        var miriam = _factory.CreateStaffClient("Miriam Castillo", "member|miriam", "verifier");

        var raw = await miriam.GetStringAsync($"/api/admin/verifications/{listingId}");
        var review = JsonDocument.Parse(raw).RootElement;

        Assert.Equal("space", review.GetProperty("kind").GetString());
        var space = review.GetProperty("space");
        Assert.Equal("room", space.GetProperty("term").GetString());
        Assert.Equal(950, space.GetProperty("rent").GetInt32());
        Assert.Equal("4 months", space.GetProperty("minimumStayLabel").GetString());
        Assert.StartsWith("Ruth and Kwame", space.GetProperty("household").GetString());
        Assert.DoesNotContain("Curzon", raw, StringComparison.OrdinalIgnoreCase);
    }
}
