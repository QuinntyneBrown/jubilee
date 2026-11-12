using System.Text.Json;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Jubilee.Application.Accounts;

/// <summary>Where a member's request for a copy of their data stands (L2-018).</summary>
public sealed record DataExportStatusDto(string Status, DateTimeOffset? RequestedAt, DateTimeOffset? ReadyAt, DateTimeOffset? ExpiresAt);

internal static class DataExportWire
{
    /// <summary><c>none</c>, <c>requested</c>, <c>ready</c>, <c>expired</c> or <c>failed</c>; a ready export past its date is expired already.</summary>
    public static DataExportStatusDto Of(DataExport? export, DateTimeOffset now)
    {
        if (export is null)
        {
            return new DataExportStatusDto("none", null, null, null);
        }

        var status = export.Status switch
        {
            DataExportStatus.Requested => "requested",
            DataExportStatus.Failed => "failed",
            DataExportStatus.Expired => "expired",
            _ => export.ExpiresAt is { } until && now >= until ? "expired" : "ready",
        };
        return new DataExportStatusDto(status, export.RequestedAt, export.ReadyAt, export.ExpiresAt);
    }
}

/// <summary>
/// "Download my data": records the request and leaves the building to the worker. A request that is still waiting is
/// returned as it is, so nothing is built twice (L2-018 AC1).
/// </summary>
public sealed record RequestDataExportCommand(Guid MemberId) : IRequest<DataExportStatusDto>;

public sealed class RequestDataExportCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<RequestDataExportCommand, DataExportStatusDto>
{
    public async Task<DataExportStatusDto> Handle(RequestDataExportCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        if (!await db.Members.AnyAsync(m => m.Id == request.MemberId && m.DeletedAt == null, cancellationToken))
        {
            throw new NotFoundException("MEMBER_NOT_FOUND", "There is no such account.");
        }

        var mine = (await db.DataExports.Where(e => e.MemberId == request.MemberId).ToListAsync(cancellationToken))
            .OrderByDescending(e => e.RequestedAt).ToList();
        if (mine.FirstOrDefault(e => e.Status == DataExportStatus.Requested) is { } waiting)
        {
            return DataExportWire.Of(waiting, now);
        }

        var today = mine.Where(e => e.RequestedAt > now - TimeSpan.FromDays(1)).ToList();
        if (today.Count >= DataExport.RequestsPerDay)
        {
            throw new RateLimitedException("DATA_EXPORT_LIMIT", today.Min(e => e.RequestedAt) + TimeSpan.FromDays(1) - now);
        }

        var export = DataExport.Request(request.MemberId, now);
        db.DataExports.Add(export);
        await db.SaveChangesAsync(cancellationToken);
        return DataExportWire.Of(export, now);
    }
}

public sealed record GetDataExportStatusQuery(Guid MemberId) : IRequest<DataExportStatusDto>;

public sealed class GetDataExportStatusQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<GetDataExportStatusQuery, DataExportStatusDto>
{
    public async Task<DataExportStatusDto> Handle(GetDataExportStatusQuery request, CancellationToken cancellationToken)
    {
        var latest = (await db.DataExports.AsNoTracking().Where(e => e.MemberId == request.MemberId).ToListAsync(cancellationToken))
            .OrderByDescending(e => e.RequestedAt).FirstOrDefault();
        return DataExportWire.Of(latest, clock.GetUtcNow());
    }
}

/// <summary>
/// The e-mailed link: the archive, for the signed-in owner of the data until the link expires. An unknown, expired or
/// foreign token is the same "not found", and the attempt is logged (L2-018 AC2, L2-133).
/// </summary>
public sealed record DownloadDataExportQuery(Guid MemberId, string Token) : IRequest<string>;

public sealed class DownloadDataExportQueryHandler(IAppDbContext db, TimeProvider clock, ILogger<DownloadDataExportQueryHandler> logger)
    : IRequestHandler<DownloadDataExportQuery, string>
{
    public async Task<string> Handle(DownloadDataExportQuery request, CancellationToken cancellationToken)
    {
        var hash = LinkTokens.Hash(request.Token);
        var export = await db.DataExports.AsNoTracking().SingleOrDefaultAsync(e => e.TokenHash == hash, cancellationToken);
        if (export is null || !export.IsDownloadableBy(request.MemberId, clock.GetUtcNow()))
        {
            logger.LogWarning("Security event: DataDownload refused");
            throw new NotFoundException("DATA_LINK_UNAVAILABLE", "This link has expired or isn’t yours.");
        }

        logger.LogInformation("Security event: DataDownload served");
        return export.ArchiveJson!;
    }
}

/// <summary>
/// The worker's side of "Download my data": builds each waiting archive, stores it, mails the link, and later deletes
/// the files whose link has expired (L2-018, L2-182). A build that fails is tried again, up to 5 times.
/// </summary>
public sealed class DataExportBuilder(IAppDbContext db, AccountSettings settings, TimeProvider clock, ILogger<DataExportBuilder> logger)
{
    public async Task<int> BuildDueAsync(CancellationToken cancellationToken)
    {
        var waiting = (await db.DataExports.Where(e => e.Status == DataExportStatus.Requested).ToListAsync(cancellationToken))
            .OrderBy(e => e.RequestedAt).ToList();
        var built = 0;
        foreach (var export in waiting)
        {
            try
            {
                var now = clock.GetUtcNow();
                var member = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == export.MemberId && m.DeletedAt == null, cancellationToken)
                    ?? throw new InvalidOperationException("The member of the export is gone.");
                var archive = await DataArchive.BuildAsync(db, member, now, cancellationToken);
                var token = LinkTokens.NewValue();
                export.MarkReady(archive, LinkTokens.Hash(token), now);
                db.OutboxMessages.Add(OutboxMessage.Email(
                    member.Id,
                    member.Email,
                    "Your Jubilee data is ready to download",
                    $"Hi {member.FirstName},\n\nYou asked for a copy of your data. Open this link, signed in to your account, within 7 days to download it as a JSON file:\n\n{settings.PublicBaseUrl.TrimEnd('/')}/account/data/{token}\n\nIf it wasn't you, you can ignore this e-mail. The file is deleted after 7 days.\n\nJubilee · Toronto's Christian marketplace\n",
                    now));
                await db.SaveChangesAsync(cancellationToken);
                built++;
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogError(exception, "The data export {ExportId} could not be built.", export.Id);
                export.RecordFailedAttempt();
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        return built;
    }

    /// <summary>Deletes the archive of every export whose link no longer works (L2-018 AC2).</summary>
    public async Task<int> ExpireAsync(CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var stale = (await db.DataExports.Where(e => e.Status == DataExportStatus.Ready).ToListAsync(cancellationToken))
            .Where(e => e.ExpiresAt is { } until && now >= until).ToList();
        foreach (var export in stale)
        {
            export.Expire();
        }

        await db.SaveChangesAsync(cancellationToken);
        return stale.Count;
    }
}

/// <summary>
/// The JSON archive of one member (L2-018). Every section reads the member's own rows only.
/// </summary>
internal static class DataArchive
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static async Task<string> BuildAsync(IAppDbContext db, Member member, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var subject = member.Id.ToString();
        var document = new Dictionary<string, object?>
        {
            ["generatedAt"] = now,
            ["profile"] = new
            {
                member.FirstName,
                member.LastName,
                member.Email,
                member.Phone,
                member.PostalCode,
                member.HomeChurch,
                member.HomeChurchAddress,
                member.Pronouns,
                memberSince = member.CreatedAt,
            },
            ["notificationSettings"] = new
            {
                messages = member.EmailMessages,
                requests = member.EmailRequests,
                reminders = member.EmailReminders,
                newBusinesses = member.EmailNewBusinesses,
                tips = member.EmailTips,
                frequency = member.EmailDailySummary ? "daily-summary" : "as-it-happens",
            },
            ["savedList"] = await Saved(db, subject, cancellationToken),
            ["requests"] = await Requests(db, subject, cancellationToken),
            ["conversations"] = await Conversations(db, subject, cancellationToken),
            ["feedback"] = await FeedbackOf(db, subject, cancellationToken),
        };

        var owned = await db.Listings.AsNoTracking().Where(l => l.OwnerId == subject && l.DeletedAt == null).ToListAsync(cancellationToken);
        if (owned.Count > 0)
        {
            var ids = owned.Select(l => l.Id).ToList();
            var names = owned.ToDictionary(l => l.Id, l => l.Name);
            document["listings"] = owned.OrderBy(l => l.SortName).Select(l => new
            {
                l.Name,
                l.Slug,
                l.Tagline,
                l.About,
                category = l.CategorySlug,
                l.Where,
                l.Hours,
                l.Languages,
                l.Website,
                stage = l.Stage.ToString(),
                paused = l.IsPaused,
            }).ToList();
            document["products"] = (await db.Products.AsNoTracking().Where(p => ids.Contains(p.ListingId) && !p.IsDeleted).ToListAsync(cancellationToken))
                .OrderBy(p => p.Position).Select(p => new { business = names[p.ListingId], p.Name, p.PriceCents, p.Description }).ToList();
            document["services"] = (await db.Services.AsNoTracking().Where(s => ids.Contains(s.ListingId)).ToListAsync(cancellationToken))
                .OrderBy(s => s.Position).Select(s => new { business = names[s.ListingId], s.Name, s.Detail, s.PriceCents, s.DurationMinutes }).ToList();
            document["incomingRequests"] = (await db.Requests.AsNoTracking().Where(r => ids.Contains(r.ListingId)).ToListAsync(cancellationToken))
                .OrderBy(r => r.CreatedAt)
                .Select(r => new
                {
                    business = names[r.ListingId],
                    from = r.MemberName,
                    kind = r.Kind.ToString(),
                    status = r.Status.ToString(),
                    service = r.ServiceName,
                    r.Note,
                    received = r.CreatedAt,
                }).ToList();
        }

        return JsonSerializer.Serialize(document, Options);
    }

    private static async Task<object> Saved(IAppDbContext db, string subject, CancellationToken cancellationToken)
    {
        var items = (await db.SavedItems.AsNoTracking().Where(s => s.MemberSubject == subject).ToListAsync(cancellationToken)).OrderBy(s => s.SavedAt).ToList();
        var listings = items.Where(i => i.Kind == SavedItemKind.Business).Select(i => i.TargetId).ToList();
        var products = items.Where(i => i.Kind == SavedItemKind.Product).Select(i => i.TargetId).ToList();
        var listingNames = await db.Listings.AsNoTracking().Where(l => listings.Contains(l.Id)).ToDictionaryAsync(l => l.Id, l => l.Name, cancellationToken);
        var productNames = await db.Products.AsNoTracking().Where(p => products.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, cancellationToken);
        return items.Select(i => new
        {
            kind = i.Kind.ToString(),
            name = (i.Kind == SavedItemKind.Business ? listingNames : productNames).GetValueOrDefault(i.TargetId) ?? "(no longer listed)",
            savedAt = i.SavedAt,
        }).ToList();
    }

    /// <summary>Everything the member sent as feedback, check-ins too (L2-214 AC12). A screenshot is counted, not copied.</summary>
    private static async Task<object> FeedbackOf(IAppDbContext db, string subject, CancellationToken cancellationToken)
    {
        var feedback = (await db.Feedback.AsNoTracking().Where(f => f.MemberSubject == subject).ToListAsync(cancellationToken))
            .OrderBy(f => f.CreatedAt).ToList();
        var screenshots = (await db.FeedbackScreenshots.AsNoTracking()
            .Where(s => s.UploaderSubject == subject && s.FeedbackId != null).Select(s => s.FeedbackId).ToListAsync(cancellationToken))
            .GroupBy(id => id!.Value).ToDictionary(g => g.Key, g => g.Count());
        return feedback.Select(f => new
        {
            kind = f.Kind.ToString(),
            status = f.Status.ToString(),
            sent = f.CreatedAt,
            f.Rating,
            f.Note,
            areas = new { finding = f.FindingScore, listing = f.ListingScore, messaging = f.MessagingScore, trust = f.TrustScore },
            f.Reference,
            where = f.Place,
            f.Happened,
            f.Expected,
            frequency = f.Frequency?.ToString(),
            f.Screen,
            f.UserAgent,
            f.AppVersion,
            screenshots = screenshots.GetValueOrDefault(f.Id),
            business = f.BusinessName,
            chips = f.ChipList,
            f.ShowOnPage,
            moment = f.Moment?.ToString(),
            f.MayContact,
            f.Reply,
        }).ToList();
    }

    private static async Task<object> Requests(IAppDbContext db, string subject, CancellationToken cancellationToken)
    {
        var requests = (await db.Requests.AsNoTracking().Where(r => r.MemberSubject == subject).ToListAsync(cancellationToken)).OrderBy(r => r.CreatedAt).ToList();
        var ids = requests.Select(r => r.ListingId).Distinct().ToList();
        var names = await db.Listings.AsNoTracking().Where(l => ids.Contains(l.Id)).ToDictionaryAsync(l => l.Id, l => l.Name, cancellationToken);
        return requests.Select(r => new
        {
            business = names.GetValueOrDefault(r.ListingId),
            kind = r.Kind.ToString(),
            status = r.Status.ToString(),
            service = r.ServiceName,
            r.Note,
            r.StartsAt,
            r.NeededBy,
            r.Budget,
            r.Quantity,
            r.TotalCents,
            sent = r.CreatedAt,
        }).ToList();
    }

    private static async Task<object> Conversations(IAppDbContext db, string subject, CancellationToken cancellationToken)
    {
        var conversations = (await db.Conversations.AsNoTracking().Where(c => c.MemberSubject == subject).ToListAsync(cancellationToken))
            .OrderBy(c => c.CreatedAt).ToList();
        var ids = conversations.Select(c => c.Id).ToList();
        var listingIds = conversations.Select(c => c.ListingId).Distinct().ToList();
        var names = await db.Listings.AsNoTracking().Where(l => listingIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, l => l.Name, cancellationToken);
        var messages = (await db.Messages.AsNoTracking().Where(m => ids.Contains(m.ConversationId) && !m.HiddenFromMember).ToListAsync(cancellationToken))
            .OrderBy(m => m.CreatedAt).ToList();
        return conversations.Select(c => new
        {
            business = names.GetValueOrDefault(c.ListingId),
            started = c.CreatedAt,
            messages = messages.Where(m => m.ConversationId == c.Id).Select(m => new { from = m.SenderName, fromBusiness = m.FromOwner, m.Body, at = m.CreatedAt }).ToList(),
        }).ToList();
    }
}
