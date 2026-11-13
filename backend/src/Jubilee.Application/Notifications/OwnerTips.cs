using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Jobs;
using Jubilee.Application.Listings;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Notifications;

/// <summary>One tip: what the subject names, what it says, and where its button leads. <c>{listing}</c> is the owner's business.</summary>
public sealed record OwnerTip(string Title, string Body, string Action, string Path);

/// <summary>
/// The tips for business owners (L2-223, ADR 0053): a short series, sent in this order, one a month,
/// each once. Every tip names something the owner can do in Jubilee today. None promises custom,
/// revenue or rank: the customer is a neighbour to serve well (docs/scripture.md, Matthew 22:39 and
/// "What Jubilee never says").
/// </summary>
public static class OwnerTips
{
    public static IReadOnlyList<OwnerTip> Series { get; } =
    [
        new(
            "show your work with photos",
            "A member who has never met you sees your listing first. Photos of your work, your shop or your team tell them what you do before they write to you.\n\nAdd photos to {listing} and choose the one that leads.",
            "Add photos",
            "/my-business/listing"),
        new(
            "answer within a day",
            "A member who writes to {listing} is a neighbour asking for help, and a prompt answer honours them.\n\nWhen you have answered at least three requests in the last 30 days and your usual first reply comes within 24 hours, your listing shows “Replies fast”.",
            "See your requests",
            "/my-business/requests"),
        new(
            "say when you can meet",
            "If you offer meetings, members are offered times inside the days and hours you set. Keep them to times you can keep, so that a member who books {listing} finds you there.",
            "Set your meeting hours",
            "/my-business/services"),
        new(
            "keep your products current",
            "If you sell products, mark what is sold out. A member who wants it can ask to be told, and Jubilee tells them when {listing} has it again.",
            "Update your products",
            "/my-business/products"),
    ];
}

/// <summary>
/// The monthly tip (L2-223): once it is 7:00 a.m. in Toronto on the first day of a month, each owner of
/// a public listing with "Tips for business owners" on gets the next tip they have not had. The answer
/// is how many tips were queued, or null when this month's were already sent.
/// </summary>
public sealed record SendOwnerTipsCommand : IRequest<int?>
{
    public const string Job = "owner-tips";

    public static readonly TimeOnly At = new(7, 0);
}

public sealed class SendOwnerTipsCommandHandler(ScheduledJobs jobs, IAppDbContext db, TimeProvider clock, AccountSettings settings, EmailSettings email)
    : IRequestHandler<SendOwnerTipsCommand, int?>
{
    public async Task<int?> Handle(SendOwnerTipsCommand command, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var today = TorontoClock.Today(now);
        var due = TorontoClock.At(new DateOnly(today.Year, today.Month, 1), SendOwnerTipsCommand.At);
        if (now < due)
        {
            return null;
        }

        int? queued = null;
        await jobs.RunOnceAtAsync(SendOwnerTipsCommand.Job, due, async token => queued = await QueueAsync(now, token), cancellationToken);
        return queued;
    }

    private async Task<int> QueueAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        // A promotional e-mail names Jubilee's mailing address or is not sent (L2-149 AC1).
        if (!email.CanSendPromotional)
        {
            return 0;
        }

        var total = OwnerTips.Series.Count;
        var root = settings.PublicBaseUrl.TrimEnd('/');
        var members = await db.Members
            .Where(m => m.EmailTips && m.EmailStatus == EmailStatus.Confirmed && m.TipsSent < total).ToListAsync(cancellationToken);
        var queued = 0;
        foreach (var member in members)
        {
            var owner = member.Id.ToString();
            var listing = (await db.Listings.AsNoTracking().WherePublic().Where(l => l.OwnerId == owner).ToListAsync(cancellationToken))
                .OrderBy(l => l.PublishedAt).FirstOrDefault();
            if (listing is null)
            {
                continue;
            }

            var tip = OwnerTips.Series[member.TipsSent];
            var queuedOne = EmailPolicy.Queue(
                db,
                member,
                EmailCategories.Tips,
                $"A tip for your Jubilee listing: {tip.Title}",
                $"Hi {member.FirstName},\n\n{tip.Body.Replace("{listing}", listing.Name, StringComparison.Ordinal)}\n\n{tip.Action}: {root}{tip.Path}\n\nThis is tip {member.TipsSent + 1} of {total}. We send one a month.\n\nJubilee · Toronto's Christian marketplace\n",
                now);
            if (queuedOne)
            {
                member.MarkTipSent();
                queued++;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return queued;
    }
}
