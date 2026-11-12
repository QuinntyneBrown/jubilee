using System.Net;
using System.Net.Http.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Api.Tests;

public sealed class VerificationTeamEmailFactory : JubileeApiFactory
{
    protected override void ConfigureSettings(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder) =>
        builder.UseSetting("Verification:TeamEmail", "verification@jubilee.test");
}

// Acceptance Test
// Traces to: L2-087 AC6
// Description: a change of the name or category of a live listing is live at once, and the verification team
// and the owner are told that the listing is looked at again within two business days (ADR 0051).
public sealed class RecheckNoticeTests(VerificationTeamEmailFactory factory) : IClassFixture<VerificationTeamEmailFactory>, IAsyncLifetime
{
    private Member _naomi = null!;
    private Listing _listing = null!;

    public async Task InitializeAsync()
    {
        await factory.Reset();
        _naomi = Member.Join(EmailAddress.TryParse("naomi@luzandre.example")!, "Naomi", "Laurent", null, "hash", ListingMother.Now);
        _listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com", tagline: "Custom church team tees");
        _listing.AssignOwner(_naomi.Id.ToString());
        await factory.Arrange(_naomi, _listing);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private HttpClient Naomi() => factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString());

    private static object Body(int version, string name = "Luzandre.com", string category = "shops", string tagline = "Custom church team tees") =>
        new { version, name, tagline, category, about = "We print.", where = "Leslieville", hours = "Mon to Fri, 10 to 6", website = "", highlight = "" };

    [Fact]
    public async Task L2_087_AC6_a_new_name_e_mails_the_team_the_old_and_new_values_with_the_listing_in_the_admin_application()
    {
        var response = await Naomi().PutAsJsonAsync("/api/my-business/listing", Body(0, name: "Luzandre Print Co.", category: "media"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "verification@jubilee.test");
            Assert.Equal("Re-check: Luzandre Print Co. changed its name or category", mail.Subject);
            Assert.Null(mail.MemberId);
            Assert.Contains("Name: Luzandre.com → Luzandre Print Co.", mail.TextBody);
            Assert.Contains("Category: Shops → Media", mail.TextBody);
            Assert.Contains("within two business days", mail.TextBody);
            Assert.Contains($"https://admin.jubilee.test/verifications/{_listing.Id}", mail.TextBody);
            Assert.Contains("Naomi Laurent", mail.TextBody);
        });
    }

    [Fact]
    public async Task L2_087_AC6_the_owner_is_e_mailed_and_notified_that_the_change_is_live_and_will_be_re_checked()
    {
        await Naomi().PutAsJsonAsync("/api/my-business/listing", Body(0, name: "Luzandre Print Co."));

        await factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync(m => m.ToAddress == "naomi@luzandre.example");
            Assert.Equal("We’ll re-check Luzandre Print Co.", mail.Subject);
            Assert.Equal(_naomi.Id, mail.MemberId);
            Assert.Contains("Hi Naomi,", mail.TextBody);
            Assert.Contains(
                "Your change is live now. Because the name or category changed, the verification team looks at the listing again within two business days. You don’t need to do anything.",
                mail.TextBody);
            Assert.Contains("https://jubilee.test/b/luzandre-com", mail.TextBody);
            var notice = await db.Notifications.AsNoTracking().SingleAsync(n => n.MemberSubject == _naomi.Id.ToString());
            Assert.Equal("listing", notice.Kind);
            Assert.Equal("We’ll re-check Luzandre Print Co.", notice.Title);
            Assert.Equal("/my-business", notice.Target);
        });
        var listed = await factory.GetJson("/api/notifications", Naomi());
        Assert.Equal("We’ll re-check Luzandre Print Co.", listed.GetProperty("items")[0].GetProperty("title").GetString());
    }

    [Fact]
    public async Task L2_087_AC6_a_save_that_changes_neither_the_name_nor_the_category_tells_nobody()
    {
        var response = await Naomi().PutAsJsonAsync("/api/my-business/listing", Body(0, tagline: "Church tees, printed in Toronto"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDb(async db =>
        {
            Assert.Empty(await db.OutboxMessages.AsNoTracking().ToListAsync());
            Assert.Empty(await db.Notifications.AsNoTracking().ToListAsync());
        });
    }

    [Fact]
    public async Task L2_087_AC6_a_listing_that_is_not_live_yet_asks_for_no_re_check()
    {
        await factory.Reset();
        var waiting = ListingMother.NonPublic(NonPublicState.ReadyToReview, "luzandre-com", "shops");
        waiting.AssignOwner(_naomi.Id.ToString());
        await factory.Arrange(_naomi, waiting);

        var response = await Naomi().PutAsJsonAsync("/api/my-business/listing", Body(0, name: "Luzandre Print Co."));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDb(async db => Assert.Empty(await db.OutboxMessages.AsNoTracking().ToListAsync()));
    }

    [Fact]
    public async Task L2_087_AC6_a_save_that_is_refused_tells_nobody()
    {
        var stale = await Naomi().PutAsJsonAsync("/api/my-business/listing", Body(7, name: "Luzandre Print Co."));

        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        await factory.WithDb(async db => Assert.Empty(await db.OutboxMessages.AsNoTracking().ToListAsync()));
    }
}

/// <summary>With no address of its own, the re-check goes where the team already reads its mail (ADR 0051).</summary>
public sealed class RecheckNoticeFallbackTests(LaunchTeamEmailFactory factory) : IClassFixture<LaunchTeamEmailFactory>, IAsyncLifetime
{
    public Task InitializeAsync() => factory.Reset();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task L2_087_AC6_without_an_address_of_its_own_the_re_check_goes_to_the_launch_team_address()
    {
        var listing = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        listing.AssignOwner("member|naomi");
        await factory.Arrange(listing);

        await factory.CreateMemberClient("Naomi Laurent", "member|naomi").PutAsJsonAsync("/api/my-business/listing", new
        {
            version = 0, name = "Luzandre Print Co.", tagline = "Custom church team tees", category = "shops",
            about = "", where = "", hours = "By appointment", website = "", highlight = "",
        });

        await factory.WithDb(async db =>
        {
            var mail = await db.OutboxMessages.AsNoTracking().SingleAsync();
            Assert.Equal("team@jubilee.test", mail.ToAddress);
            Assert.StartsWith("Re-check: Luzandre Print Co.", mail.Subject);
        });
    }
}
