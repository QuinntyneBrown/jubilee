using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jubilee.Api.Tests.Support;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

// The back-in-stock notice (L2-036 AC2 and AC4 to AC7, L2-064 AC6, L2-068): Naomi owns Luzandre.com,
// whose mug is sold out; Joanna asked to be told when it is back.
public sealed class BackInStockTests : IClassFixture<JubileeApiFactory>, IAsyncLifetime
{
    private const string MugTitle = "Gold cross stoneware mug is back in stock";

    private readonly JubileeApiFactory _factory;
    private Listing _shop = null!;
    private Member _naomi = null!;
    private Member _joanna = null!;
    private Member _ruth = null!;
    private Product _mug = null!;

    public BackInStockTests(JubileeApiFactory factory) => _factory = factory;

    public async Task InitializeAsync()
    {
        await _factory.Reset();
        _naomi = Confirmed("naomi@example.com", "Naomi", "Laurent");
        _joanna = Confirmed("joanna@example.com", "Joanna", "Adeyemi");
        _ruth = Confirmed("ruth@example.com", "Ruth", "Mensah");
        _shop = ListingMother.Public("luzandre-com", "shops", "Luzandre.com");
        _shop.AssignOwner(_naomi.Id.ToString());
        _mug = Product.Create(_shop.Id, "gold-mug", "Gold cross stoneware mug", 2400, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now.AddDays(-30));
        _mug.SetStock(0);
        await _factory.Arrange(_naomi, _joanna, _ruth, _shop, _mug);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static Member Confirmed(string email, string first, string last)
    {
        var member = Member.Join(EmailAddress.TryParse(email)!, first, last, null, "hash", ListingMother.Now);
        member.ConfirmEmail();
        return member;
    }

    private HttpClient Naomi() => _factory.CreateMemberClient("Naomi Laurent", _naomi.Id.ToString());

    private HttpClient As(Member member) => _factory.CreateMemberClient($"{member.FirstName} {member.LastName}", member.Id.ToString());

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private async Task AskToBeTold(Member member, Product? product = null) =>
        Assert.Equal(HttpStatusCode.NoContent, (await As(member).PutAsync($"/api/products/{(product ?? _mug).Id}/stock-alert", null)).StatusCode);

    /// <summary>Naomi saves the mug with this stock, as the product editor does.</summary>
    private async Task<JsonElement> SetStock(int? stock)
    {
        var response = await Naomi().PutAsJsonAsync(
            $"/api/my-business/products/{_mug.Id}",
            new { name = "Gold cross stoneware mug", price = "24.00", stock, description = "Stoneware, 350 ml." });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await Json(response);
    }

    private async Task<List<JsonElement>> NotificationsOf(Member member) =>
        [.. (await Json(await As(member).GetAsync("/api/notifications"))).GetProperty("items").EnumerateArray()];

    private async Task Dispatch()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<OutboxDispatcher>().DispatchDueAsync(CancellationToken.None);
    }

    private IEnumerable<SentEmail> EmailsTo(Member member) => _factory.Emails.Sent.Where(e => e.To == member.Email);

    private Task<int> OpenAlerts() => _factory.Query(db => db.StockAlerts.CountAsync(a => a.NotifiedAt == null));

    [Fact]
    public async Task L2_036_AC4_a_member_who_asked_is_notified_in_the_app_when_the_owner_restocks()
    {
        await AskToBeTold(_joanna);

        await SetStock(5);

        var notification = Assert.Single(await NotificationsOf(_joanna));
        Assert.Equal("product", notification.GetProperty("kind").GetString());
        Assert.Equal(MugTitle, notification.GetProperty("title").GetString());
        Assert.Equal("Luzandre.com has it again. You asked to be told.", notification.GetProperty("detail").GetString());
        Assert.Equal("/b/luzandre-com/p/gold-mug", notification.GetProperty("target").GetString());
        Assert.False(notification.GetProperty("read").GetBoolean());
        Assert.Equal(0, await OpenAlerts());
    }

    [Fact]
    public async Task L2_036_AC5_the_member_is_e_mailed_once_with_the_link_and_an_unsubscribe_link()
    {
        await AskToBeTold(_joanna);

        await SetStock(5);
        await Dispatch();

        var email = Assert.Single(EmailsTo(_joanna));
        Assert.Equal(MugTitle, email.Subject);
        Assert.Contains("Hi Joanna,", email.Body);
        Assert.Contains("Luzandre.com has Gold cross stoneware mug again. You asked us to tell you.", email.Body);
        Assert.Contains("See it here: https://jubilee.test/b/luzandre-com/p/gold-mug", email.Body);
        Assert.Contains("Jubilee doesn't take payment. Luzandre.com confirms stock and tells you how to pay.", email.Body);
        Assert.NotNull(email.UnsubscribeUrl);
        Assert.Contains("/api/email/unsubscribe/", email.UnsubscribeUrl);
    }

    [Fact]
    public async Task L2_068_AC2_a_member_who_turned_request_updates_off_gets_no_e_mail_and_is_still_notified()
    {
        await AskToBeTold(_joanna);
        await _factory.WithDb(async db =>
        {
            (await db.Members.SingleAsync(m => m.Id == _joanna.Id)).SetEmailPreference(EmailCategories.Requests, false);
            await db.SaveChangesAsync();
        });

        await SetStock(5);
        await Dispatch();

        Assert.Empty(EmailsTo(_joanna));
        Assert.Single(await NotificationsOf(_joanna));
    }

    [Fact]
    public async Task L2_036_AC5_a_member_whose_address_is_not_confirmed_is_notified_in_the_app_only()
    {
        var esther = Member.Join(EmailAddress.TryParse("esther@example.com")!, "Esther", "Baptiste", null, "hash", ListingMother.Now);
        await _factory.Arrange(esther);
        await AskToBeTold(esther);

        await SetStock(5);
        await Dispatch();

        Assert.Empty(EmailsTo(esther));
        Assert.Single(await NotificationsOf(esther));
    }

    [Fact]
    public async Task L2_036_AC6_a_member_is_told_once_and_again_only_after_asking_again()
    {
        await AskToBeTold(_joanna);
        await SetStock(5);
        await SetStock(0);

        // Back a second time: Joanna was told the first time and has not asked again.
        await SetStock(3);
        await Dispatch();

        Assert.Single(await NotificationsOf(_joanna));
        Assert.Single(EmailsTo(_joanna));

        // She asks again while it is sold out, and is told the next time.
        await SetStock(0);
        var page = await _factory.GetJson("/api/listings/luzandre-com/products/gold-mug", As(_joanna));
        Assert.False(page.GetProperty("stockAlertRequested").GetBoolean());
        await AskToBeTold(_joanna);
        await SetStock(2);
        await Dispatch();

        Assert.Equal(2, (await NotificationsOf(_joanna)).Count);
        Assert.Equal(2, EmailsTo(_joanna).Count());
    }

    [Fact]
    public async Task L2_036_AC7_only_the_members_who_asked_are_told()
    {
        await AskToBeTold(_joanna);

        await SetStock(5);
        await Dispatch();

        Assert.Empty(await NotificationsOf(_ruth));
        Assert.Empty(EmailsTo(_ruth));
        Assert.Empty(await NotificationsOf(_naomi));
    }

    [Fact]
    public async Task L2_036_AC4_every_member_who_asked_is_told()
    {
        await AskToBeTold(_joanna);
        await AskToBeTold(_ruth);

        await SetStock(5);
        await Dispatch();

        Assert.Single(await NotificationsOf(_joanna));
        Assert.Single(await NotificationsOf(_ruth));
        Assert.Single(EmailsTo(_joanna));
        Assert.Single(EmailsTo(_ruth));
    }

    [Fact]
    public async Task L2_036_AC7_stock_that_stays_at_zero_or_stays_above_zero_tells_nobody()
    {
        await AskToBeTold(_joanna);

        await SetStock(0);
        Assert.Empty(await NotificationsOf(_joanna));
        Assert.Equal(1, await OpenAlerts());

        await SetStock(4);
        await SetStock(9);

        Assert.Single(await NotificationsOf(_joanna));
    }

    [Fact]
    public async Task L2_036_AC7_a_shop_that_is_not_public_tells_nobody_and_keeps_the_alert_for_the_next_time()
    {
        await AskToBeTold(_joanna);
        await _factory.WithDb(async db =>
        {
            (await db.Listings.SingleAsync(l => l.Id == _shop.Id)).Pause();
            await db.SaveChangesAsync();
        });

        await SetStock(5);
        await Dispatch();

        Assert.Empty(await NotificationsOf(_joanna));
        Assert.Empty(EmailsTo(_joanna));
        Assert.Equal(1, await OpenAlerts());
    }

    [Fact]
    public async Task L2_036_AC4_untracked_stock_counts_as_back_in_stock()
    {
        await AskToBeTold(_joanna);

        await SetStock(null);

        Assert.Single(await NotificationsOf(_joanna));
    }

    [Fact]
    public async Task L2_036_AC4_a_product_with_options_is_back_when_one_option_is()
    {
        var tee = Product.Create(_shop.Id, "faith-tee", "Faith heavyweight tee, charcoal", 3400, false, TileTint.Ink, TileIcon.Shirt, ListingMother.Now);
        tee.SetOptions("Size", [new("S", 0), new("M", 0)]);
        await _factory.Arrange(tee);
        await AskToBeTold(_joanna, tee);

        var response = await Naomi().PutAsJsonAsync($"/api/my-business/products/{tee.Id}", new
        {
            name = tee.Name,
            price = "34.00",
            optionName = "Size",
            options = new[] { new { label = "S", stock = 0 }, new { label = "M", stock = 6 } },
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var notification = Assert.Single(await NotificationsOf(_joanna));
        Assert.Equal("Faith heavyweight tee, charcoal is back in stock", notification.GetProperty("title").GetString());
        Assert.Equal("/b/luzandre-com/p/faith-tee", notification.GetProperty("target").GetString());
    }

    [Fact]
    public async Task L2_036_AC4_a_confirmed_order_taken_back_tells_the_member_who_asked()
    {
        // One mug left: Samuel's order takes it, Joanna asks to be told, and Naomi takes the confirmation back.
        await SetStock(1);
        var order = Request.AskForOrder(
            "member|samuel", "Samuel Park", _shop.Id, _mug.Id, _mug.Name, null, 1, new OrderAmounts(2400, 2400, 0), "Pickup", null, null,
            Guid.NewGuid().ToString(), ListingMother.Now);
        await _factory.Arrange(order);
        Assert.Equal(HttpStatusCode.OK, (await Naomi().PostAsync($"/api/my-business/requests/{order.Id}/confirm", null)).StatusCode);
        await AskToBeTold(_joanna);

        var undone = await Naomi().PostAsync($"/api/my-business/requests/{order.Id}/confirm/undo", null);

        Assert.Equal(HttpStatusCode.OK, undone.StatusCode);
        var notification = Assert.Single(await NotificationsOf(_joanna));
        Assert.Equal(MugTitle, notification.GetProperty("title").GetString());
    }
}
