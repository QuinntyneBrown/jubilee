using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Directory;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Listings;

public sealed record ReportedDto(Guid Id);

/// <summary>A member reports a listing privately to the verification team (L2-039).</summary>
public sealed record ReportListingCommand(string Subject, string Slug, string? Reason, string? Description, string? IdempotencyKey)
    : IRequest<ReportedDto>;

public sealed class ReportListingCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ReportListingCommand, ReportedDto>
{
    public const string OwnListingCode = "OWN_LISTING";

    /// <summary>Entries one member may send in an hour; more are slowed down (L2-127).</summary>
    public const int EntriesPerHour = 10;

    public static readonly IReadOnlyDictionary<string, ReportReason> Reasons = new Dictionary<string, ReportReason>
    {
        ["not-real"] = ReportReason.NotRealBusiness,
        ["misleading"] = ReportReason.Misleading,
        ["bad-experience"] = ReportReason.BadExperience,
        ["other"] = ReportReason.Other,
    };

    public async Task<ReportedDto> Handle(ReportListingCommand request, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? Guid.NewGuid().ToString() : request.IdempotencyKey.Trim();
        var earlier = await db.ListingReportEntries.AsNoTracking()
            .SingleOrDefaultAsync(e => e.ReporterSubject == request.Subject && e.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            return new ReportedDto(earlier.ReportId);
        }

        var errors = new Dictionary<string, string>();
        ReportReason reason = default;
        if (request.Reason is null || !Reasons.TryGetValue(request.Reason, out reason))
        {
            errors["reason"] = "REASON_REQUIRED";
        }

        var description = request.Description?.Trim() ?? string.Empty;
        if (description.Length == 0)
        {
            errors["description"] = "DESCRIPTION_REQUIRED";
        }
        else if (description.Length > ListingReport.MaxDescriptionLength)
        {
            errors["description"] = "DESCRIPTION_TOO_LONG";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var listing = await db.Listings.WherePublic().SingleOrDefaultAsync(l => l.Slug == request.Slug, cancellationToken)
            ?? throw new NotFoundException("listing_not_found", "There is no such business.");
        if (listing.OwnerId == request.Subject)
        {
            throw new ForbiddenException(OwnListingCode, "You can't report your own business.");
        }

        var now = clock.GetUtcNow();
        var recent = (await db.ListingReportEntries.AsNoTracking()
            .Where(e => e.ReporterSubject == request.Subject).ToListAsync(cancellationToken))
            .Where(e => now - e.CreatedAt < TimeSpan.FromHours(1)).OrderBy(e => e.CreatedAt).ToList();
        if (recent.Count >= EntriesPerHour)
        {
            throw new RateLimitedException("rate_limited", recent[recent.Count - EntriesPerHour].CreatedAt + TimeSpan.FromHours(1) - now);
        }

        var report = (await db.ListingReports.Where(r => r.ListingId == listing.Id && r.ReporterSubject == request.Subject)
            .Include(r => r.Entries).ToListAsync(cancellationToken))
            .OrderByDescending(r => r.CreatedAt).FirstOrDefault();
        if (report is null || !report.AcceptsAdditionAt(now))
        {
            report = ListingReport.Open(listing.Id, request.Subject, now);
            db.ListingReports.Add(report);
        }

        db.ListingReportEntries.Add(report.Add(reason, description, key, now));
        await db.SaveChangesAsync(cancellationToken);
        return new ReportedDto(report.Id);
    }
}

/// <summary>The page a chat or social app fetches to preview a shared link (L2-038 AC4): Open Graph tags and nothing else.</summary>
public sealed record GetSharePreviewQuery(string Slug) : IRequest<string>;

public sealed class GetSharePreviewQueryHandler(IAppDbContext db, AccountSettings settings) : IRequestHandler<GetSharePreviewQuery, string>
{
    public async Task<string> Handle(GetSharePreviewQuery request, CancellationToken cancellationToken)
    {
        var listing = await db.Listings.AsNoTracking().WherePublic().SingleOrDefaultAsync(l => l.Slug == request.Slug, cancellationToken)
            ?? throw new NotFoundException("listing_not_found", "There is no such business.");
        var baseUrl = settings.PublicBaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/b/{listing.Slug}";
        var title = $"{listing.Name} · Jubilee";
        static string E(string text) =>
            text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;").Replace("'", "&#39;");
        return $$"""
            <!doctype html>
            <html lang="en-CA">
            <head>
            <meta charset="utf-8">
            <title>{{E(title)}}</title>
            <link rel="canonical" href="{{E(url)}}">
            <meta name="description" content="{{E(listing.Tagline)}}">
            <meta property="og:type" content="website">
            <meta property="og:site_name" content="Jubilee">
            <meta property="og:title" content="{{E(title)}}">
            <meta property="og:description" content="{{E(listing.Tagline)}}">
            <meta property="og:url" content="{{E(url)}}">
            <meta property="og:image" content="{{E(baseUrl)}}/og-image.png">
            <meta name="twitter:card" content="summary_large_image">
            </head>
            <body><p><a href="{{E(url)}}">{{E(listing.Name)}} on Jubilee</a></p></body>
            </html>
            """;
    }
}
