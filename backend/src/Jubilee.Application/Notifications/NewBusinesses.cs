using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Jobs;
using Jubilee.Application.Listings;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Notifications;

/// <summary>
/// What "browsed" means (L2-222, ADR 0053): the member, signed in, opened the page of a business in the
/// category in the last 90 days. It is read from the listing views kept for the owner's statistics.
/// </summary>
public static class BrowsedCategories
{
    public static readonly TimeSpan Within = TimeSpan.FromDays(90);

    /// <summary>The categories the member browsed.</summary>
    public static async Task<List<string>> OfAsync(IAppDbContext db, Guid memberId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var key = ListingView.MemberKey(memberId.ToString());
        var since = now - Within;
        var viewed = db.ListingViews.Where(v => v.VisitorKey == key && v.ViewedAt >= since).Select(v => v.ListingId);
        return await db.Listings.AsNoTracking().Where(l => viewed.Contains(l.Id)).Select(l => l.CategorySlug).Distinct().ToListAsync(cancellationToken);
    }

    /// <summary>The members who browsed the category.</summary>
    public static async Task<List<Guid>> MembersAsync(IAppDbContext db, string categorySlug, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var since = now - Within;
        var inCategory = db.Listings.Where(l => l.CategorySlug == categorySlug).Select(l => l.Id);
        var keys = await db.ListingViews.AsNoTracking().Where(v => v.ViewedAt >= since && inCategory.Contains(v.ListingId))
            .Select(v => v.VisitorKey).Distinct().ToListAsync(cancellationToken);
        var prefix = ListingView.MemberKey(string.Empty);
        return [.. keys.Where(k => k.StartsWith(prefix, StringComparison.Ordinal))
            .Select(k => Guid.TryParse(k[prefix.Length..], out var id) ? id : Guid.Empty).Where(id => id != Guid.Empty)];
    }
}

/// <summary>
/// Tells the members who asked to hear of new businesses that one was published in a category they
/// browsed (L2-222 AC1, L2-064 AC6): in the app, as it is published. It runs in the handler that
/// publishes the listing, so the notices are saved with it or not at all (ADR 0057).
/// </summary>
public static class NewBusinessNotifier
{
    public const string Kind = "business";

    /// <summary>The caller saves.</summary>
    /// <returns>How many members were told.</returns>
    public static async Task<int> TellAsync(IAppDbContext db, Listing listing, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var browsed = await BrowsedCategories.MembersAsync(db, listing.CategorySlug, now, cancellationToken);
        var members = (await db.Members.AsNoTracking().Where(m => browsed.Contains(m.Id) && m.EmailNewBusinesses).ToListAsync(cancellationToken))
            .Where(m => m.IsUsable() && m.Id.ToString() != listing.OwnerId).ToList();
        var category = Category.Find(listing.CategorySlug)?.Name ?? listing.CategorySlug;
        foreach (var member in members)
        {
            NotificationRules.Tell(db, member.Id.ToString(), Kind, $"New in {category}: {listing.Name}", listing.Tagline, $"/b/{listing.Slug}", now, listing.Id);
        }

        return members.Count;
    }
}

/// <summary>
/// The weekly note (L2-222 AC2 to AC4): once it is Monday 7:00 a.m. in Toronto, each member with "New
/// businesses" on gets one e-mail of the businesses published in the last 7 days in the categories they
/// browsed. The answer is how many notes were queued, or null when this week's were already sent.
/// </summary>
public sealed record SendNewBusinessNotesCommand : IRequest<int?>
{
    public const string Job = "new-business-note";

    public static readonly TimeOnly At = new(7, 0);

    public static readonly TimeSpan Covers = TimeSpan.FromDays(7);
}

public sealed class SendNewBusinessNotesCommandHandler(
    ScheduledJobs jobs, IAppDbContext db, TimeProvider clock, AccountSettings settings, EmailSettings email)
    : IRequestHandler<SendNewBusinessNotesCommand, int?>
{
    public async Task<int?> Handle(SendNewBusinessNotesCommand command, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var today = TorontoClock.Today(now);
        var monday = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var due = TorontoClock.At(monday, SendNewBusinessNotesCommand.At);
        if (now < due)
        {
            return null;
        }

        int? queued = null;
        await jobs.RunOnceAtAsync(SendNewBusinessNotesCommand.Job, due, async token => queued = await QueueAsync(now, token), cancellationToken);
        return queued;
    }

    private async Task<int> QueueAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        // A promotional e-mail names Jubilee's mailing address or is not sent (L2-149 AC1).
        if (!email.CanSendPromotional)
        {
            return 0;
        }

        var since = now - SendNewBusinessNotesCommand.Covers;
        var fresh = await db.Listings.AsNoTracking().WherePublic().Where(l => l.PublishedAt >= since).ToListAsync(cancellationToken);
        if (fresh.Count == 0)
        {
            return 0;
        }

        var root = settings.PublicBaseUrl.TrimEnd('/');
        var members = await db.Members.AsNoTracking()
            .Where(m => m.EmailNewBusinesses && m.EmailStatus == EmailStatus.Confirmed).ToListAsync(cancellationToken);
        var queued = 0;
        foreach (var member in members.Where(m => m.IsUsable()))
        {
            var browsed = await BrowsedCategories.OfAsync(db, member.Id, now, cancellationToken);
            var theirs = fresh.Where(l => browsed.Contains(l.CategorySlug) && l.OwnerId != member.Id.ToString())
                .OrderBy(l => l.PublishedAt).ThenBy(l => l.Name, StringComparer.Ordinal).ToList();
            if (theirs.Count == 0)
            {
                continue;
            }

            var lines = theirs.Select(l => $"{l.Name} ({Category.Find(l.CategorySlug)?.Name ?? l.CategorySlug})\n{root}/b/{l.Slug}");
            if (EmailPolicy.Queue(
                db,
                member,
                EmailCategories.NewBusinesses,
                "New on Jubilee this week",
                $"Hi {member.FirstName},\n\nThese businesses joined Jubilee this week in categories you’ve browsed.\n\n{string.Join("\n\n", lines)}\n\nBrowse businesses: {root}/\n\nJubilee · Toronto's Christian marketplace\n",
                now))
            {
                queued++;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return queued;
    }
}
