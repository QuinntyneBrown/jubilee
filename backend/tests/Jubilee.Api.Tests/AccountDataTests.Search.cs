using Jubilee.Tests.Shared;

namespace Jubilee.Api.Tests;

/// <summary>A deleted member's listing leaves search at once: search reads the listings, so no index waits (L2-017 AC4, L2-182).</summary>
public sealed partial class AccountDataTests
{
    // L2-017 AC4: when the account is deleted, its listing is removed from search immediately.
    [Fact]
    public async Task L2_017_AC4_The_member_s_listing_leaves_search_at_once()
    {
        var (client, member) = await Joanna();
        var listing = ListingMother.Public("larkspur-plumbing", "home-property", "Larkspur Plumbing");
        listing.AssignOwner(member.Id.ToString());
        await _factory.Arrange(listing);
        Assert.Contains("Larkspur Plumbing", await _factory.CreateClient().GetStringAsync("/api/search?q=larkspur"));

        await client.SendAsync(Delete("DELETE"));

        Assert.DoesNotContain("Larkspur Plumbing", await _factory.CreateClient().GetStringAsync("/api/search?q=larkspur"));
    }
}
