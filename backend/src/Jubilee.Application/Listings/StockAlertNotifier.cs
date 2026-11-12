using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Notifications;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Listings;

/// <summary>
/// Tells the members who asked that a product is back in stock (L2-036 AC4 to AC7, ADR 0045): once
/// per alert, in the app and by e-mail. It runs in the handler that changed the stock, so the
/// notices are saved with the stock change or not at all.
/// </summary>
public static class StockAlertNotifier
{
    public const string Kind = "product";

    /// <summary>
    /// Closes every open alert of the product and tells its member. Nobody is told while the shop is
    /// not public; the alerts then stay open for the next time. The caller saves.
    /// </summary>
    /// <returns>How many members were told.</returns>
    public static async Task<int> TellAsync(
        IAppDbContext db, AccountSettings settings, Product product, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var shop = await db.Listings.AsNoTracking().WherePublic().SingleOrDefaultAsync(l => l.Id == product.ListingId, cancellationToken);
        if (shop is null || product.IsDeleted)
        {
            return 0;
        }

        var alerts = await db.StockAlerts.Where(a => a.ProductId == product.Id && a.NotifiedAt == null).ToListAsync(cancellationToken);
        var path = $"/b/{shop.Slug}/p/{product.Slug}";
        var title = $"{product.Name} is back in stock";
        foreach (var alert in alerts)
        {
            alert.MarkNotified(now);
            NotificationRules.Tell(
                db, alert.MemberSubject, Kind, title, $"{shop.Name} has it again. You asked to be told.", path, now, product.Id);
            if (!Guid.TryParse(alert.MemberSubject, out var memberId))
            {
                continue;
            }

            var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == memberId, cancellationToken);
            if (member is not null && member.EmailStatus == EmailStatus.Confirmed)
            {
                // "Request updates": the alert is something the member asked a shop for (L2-068 AC2).
                EmailPolicy.Queue(
                    db,
                    member,
                    EmailCategories.Requests,
                    title,
                    $"Hi {member.FirstName},\n\n{shop.Name} has {product.Name} again. You asked us to tell you.\n\nSee it here: {settings.PublicBaseUrl.TrimEnd('/')}{path}\n\nJubilee doesn't take payment. {shop.Name} confirms stock and tells you how to pay.\n\nJubilee · Toronto's Christian marketplace\n",
                    now,
                    null,
                    product.Id);
            }
        }

        return alerts.Count;
    }
}
