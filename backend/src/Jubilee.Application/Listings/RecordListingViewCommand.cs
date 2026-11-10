using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Listings;

/// <summary>
/// A listing page was shown (L2-037 AC3). <paramref name="ClientAddress"/> and
/// <paramref name="UserAgent"/> identify a caller without a session; they are hashed, never stored.
/// </summary>
public sealed record RecordListingViewCommand(string Slug, Viewer Viewer, string? ClientAddress, string? UserAgent) : IRequest;

public sealed partial class RecordListingViewCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<RecordListingViewCommand>
{
    public async Task Handle(RecordListingViewCommand request, CancellationToken cancellationToken)
    {
        var slug = request.Slug.Trim().ToLowerInvariant();
        var listing = await db.Listings.AsNoTracking().WherePublic()
            .Where(l => l.Slug == slug)
            .Select(l => new { l.Id, l.OwnerId })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(GetListingPageQueryHandler.NotFoundCode, "There is no such business.");

        // The owner's own visits and known bots are not views.
        if (listing.OwnerId is not null && listing.OwnerId == request.Viewer.Subject)
        {
            return;
        }

        if (request.UserAgent is { } agent && KnownBot().IsMatch(agent))
        {
            return;
        }

        var now = clock.GetUtcNow();
        var visitor = request.Viewer.Subject is { } subject ? $"member:{subject}" : Hash(request.ClientAddress, request.UserAgent);
        var since = now - ListingView.RepeatWindow;
        var seen = await db.ListingViews.AnyAsync(
            v => v.ListingId == listing.Id && v.VisitorKey == visitor && v.ViewedAt > since,
            cancellationToken);
        if (seen)
        {
            return;
        }

        db.ListingViews.Add(ListingView.Record(listing.Id, visitor, now));
        await db.SaveChangesAsync(cancellationToken);
    }

    private static string Hash(string? address, string? agent) =>
        "visitor:" + Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes($"{address}|{agent}")));

    [GeneratedRegex(@"bot\b|crawl|spider|slurp|facebookexternalhit|bingpreview", RegexOptions.IgnoreCase)]
    private static partial Regex KnownBot();
}
