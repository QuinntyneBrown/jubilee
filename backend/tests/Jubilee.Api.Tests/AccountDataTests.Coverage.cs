using System.Net;
using System.Text.Json;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using Jubilee.Tests.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Api.Tests;

/// <summary>
/// What Jubilee has stored about a member since ADR 0034 — sessions with device and network, statement-of-faith
/// agreements, back-in-stock alerts, photos — is in the archive, and leaves with the deletion and the erasure
/// (L2-018 AC4, L2-017 AC3 and AC6; ADR 0069).
/// </summary>
public sealed partial class AccountDataTests
{
    private sealed record Owned(Member Member, HttpClient Client, Listing Listing, Product Product, Listing Other, Request Order);

    /// <summary>
    /// Joanna owns a shop with a photo on it and on its product, agreed to the statement of faith, asked to be told when a
    /// product is back, started a listing draft, sent a photo in a message, ordered with a delivery address and reported
    /// a listing.
    /// </summary>
    private async Task<Owned> JoannaWithEverything()
    {
        var (client, member) = await Joanna();
        var subject = member.Id.ToString();
        var shop = ListingMother.Public("joannas-pottery", "home-property", "Joanna’s Pottery");
        shop.AssignOwner(subject);
        var product = Product.Create(shop.Id, "blue-bowl", "Blue bowl", 3200, false, TileTint.Gold, TileIcon.Mug, ListingMother.Now);
        var productPhoto = ProductPhoto.Upload(shop.Id, "0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a", 1280, 960, ListingMother.Now);
        product.ShowPhoto(productPhoto);
        var shopPhoto = ListingPhoto.Add(shop.Id, "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b", 0, 1280, 960, ListingMother.Now);
        var other = ListingMother.Public("legacy-financial", "financial-insurance", "Legacy Financial");
        other.AssignOwner(Trevor);
        var theirs = Product.Create(other.Id, "planner", "Planner", 1500, false, TileTint.Ink, TileIcon.Mug, ListingMother.Now);
        var conversation = Conversation.Start(other.Id, subject, "Joanna Adeyemi", ListingMother.Now);
        var attachment = MessageAttachment.Store(conversation.Id, subject, "image/jpeg", "0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c", ListingMother.Now);
        var message = Message.Send(conversation.Id, subject, "Joanna Adeyemi", false, "Here is the room", "k1", attachment.Id, false, ListingMother.Now);
        var order = Request.AskForOrder(
            subject, "Joanna Adeyemi", other.Id, theirs.Id, theirs.Name, null, 1, new OrderAmounts(1500, 1500, 0), "Delivery",
            "12 Pape Avenue, Toronto", null, "o1", ListingMother.Now);
        order.Decline(Trevor, ListingMother.Now);
        await _factory.Arrange(
            shop, product, productPhoto, shopPhoto, other, theirs, conversation, attachment, message, order,
            StatementAgreement.Record(subject, "2026-1", ListingMother.Now),
            StockAlert.Request(subject, theirs.Id, ListingMother.Now),
            ListingDraft.Start(subject, ListingMother.Now),
            ListingReport.Open(other.Id, subject, "Joanna Adeyemi", ListingMother.Now));
        foreach (var key in new[] { productPhoto.Key, shopPhoto.Key, attachment.Key })
        {
            await _factory.Media.Save(key, 640, "jpeg", [1, 2, 3], CancellationToken.None);
        }

        return new Owned(member, client, shop, product, other, order);
    }

    private async Task<JsonElement> ArchiveOf(Member member, HttpClient client)
    {
        await client.PostAsync("/api/account/data-exports", null);
        await BuildExports();
        var response = await client.GetAsync($"/api/account/data-exports/{await LinkTokenFor(member)}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await Json(response);
    }

    // L2-018 AC4: sessions with device and network, agreements and alerts are in the archive; photos are counted.
    [Fact]
    public async Task L2_018_AC4_The_archive_holds_sessions_agreements_alerts_and_counts_photos()
    {
        var joanna = await JoannaWithEverything();

        var archive = await ArchiveOf(joanna.Member, joanna.Client);

        var session = Assert.Single(archive.GetProperty("sessions").EnumerateArray());
        Assert.True(session.TryGetProperty("device", out _));
        Assert.True(session.TryGetProperty("network", out _));
        Assert.True(session.TryGetProperty("started", out _));
        Assert.Equal("2026-1", Assert.Single(archive.GetProperty("statementAgreements").EnumerateArray()).GetProperty("version").GetString());
        Assert.Equal("Planner", Assert.Single(archive.GetProperty("stockAlerts").EnumerateArray()).GetProperty("product").GetString());
        var sent = Assert.Single(Assert.Single(archive.GetProperty("conversations").EnumerateArray()).GetProperty("messages").EnumerateArray());
        Assert.True(sent.GetProperty("photo").GetBoolean());
        Assert.Equal(1, Assert.Single(archive.GetProperty("listings").EnumerateArray()).GetProperty("photos").GetInt32());
        Assert.True(Assert.Single(archive.GetProperty("products").EnumerateArray()).GetProperty("photo").GetBoolean());
        Assert.DoesNotContain("0a0a0a0a", archive.GetRawText());
    }

    // L2-017 AC3: the member's listing drafts and back-in-stock alerts go with the deletion.
    [Fact]
    public async Task L2_017_AC3_The_member_s_drafts_and_alerts_go_with_the_deletion()
    {
        var joanna = await JoannaWithEverything();
        var subject = joanna.Member.Id.ToString();

        await joanna.Client.SendAsync(Delete("DELETE"));

        Assert.Equal(0, await Read(db => db.ListingDrafts.CountAsync(d => d.OwnerSubject == subject)));
        Assert.Equal(0, await Read(db => db.StockAlerts.CountAsync(a => a.MemberSubject == subject)));
    }

    // L2-017 AC6: the erasure removes sessions, agreements, the phone and address of requests, the reporter's name and the
    // photos of the member's listings; a photo sent in a message stays for the business.
    [Fact]
    public async Task L2_017_AC6_Erasure_removes_sessions_agreements_request_details_report_names_and_listing_photos()
    {
        var joanna = await JoannaWithEverything();
        var subject = joanna.Member.Id.ToString();
        await joanna.Client.SendAsync(Delete("DELETE"));

        _factory.Clock.Advance(TimeSpan.FromDays(31));
        await Run(s => s.GetRequiredService<AccountErasure>().EraseDueAsync(CancellationToken.None));

        Assert.Equal(0, await Read(db => db.Sessions.CountAsync(s => s.MemberId == joanna.Member.Id)));
        Assert.Equal(0, await Read(db => db.StatementAgreements.CountAsync(a => a.OwnerSubject == subject)));
        var order = await Read(db => db.Requests.SingleAsync(r => r.Id == joanna.Order.Id));
        Assert.Equal("Former member", order.MemberName);
        Assert.Null(order.ShippingAddress);
        Assert.Null(order.Phone);
        Assert.Equal("Former member", (await Read(db => db.ListingReports.SingleAsync())).ReporterName);
        Assert.Equal(["0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c"], _factory.Media.Keys.ToArray());
        Assert.Equal(0, await Read(db => db.ListingPhotos.CountAsync()));
        Assert.Equal(0, await Read(db => db.ProductPhotos.CountAsync()));
        Assert.Equal("Here is the room", (await Read(db => db.Messages.SingleAsync())).Body);
        Assert.NotNull((await Read(db => db.Messages.SingleAsync())).AttachmentId);
    }
}
