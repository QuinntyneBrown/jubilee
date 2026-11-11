using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Verification;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Moderation;

public sealed record FeaturedListingDto(Guid Id, string Name, string Slug, string Tagline, string CategorySlug, string State);

public sealed record FeaturedWeekDto(string StartDate, string EndDate, bool Active, IReadOnlyList<FeaturedListingDto> Listings);

public sealed record FeaturedWeeksDto(IReadOnlyList<FeaturedWeekDto> Weeks);

public sealed record FeaturedCandidatesDto(IReadOnlyList<FeaturedListingDto> Items);

internal static class FeaturedWeekReader
{
    public static FeaturedListingDto Row(Listing listing) =>
        new(listing.Id, listing.Name, listing.Slug, listing.Tagline, listing.CategorySlug, ReportWire.ListingState(listing));

    public static async Task<IReadOnlyList<FeaturedWeekDto>> Weeks(IAppDbContext db, DateOnly today, CancellationToken cancellationToken)
    {
        var earliest = today.AddDays(1 - FeaturedSlot.DurationDays);
        var slots = await db.FeaturedSlots.AsNoTracking().Where(s => s.StartsOn >= earliest).ToListAsync(cancellationToken);
        var ids = slots.Select(s => s.ListingId).Distinct().ToList();
        var listings = await db.Listings.AsNoTracking().Where(l => ids.Contains(l.Id)).ToDictionaryAsync(l => l.Id, cancellationToken);
        return
        [
            .. slots.GroupBy(s => s.StartsOn).OrderBy(g => g.Key).Select(g => new FeaturedWeekDto(
                g.Key.ToString("yyyy-MM-dd"),
                g.Key.AddDays(FeaturedSlot.DurationDays - 1).ToString("yyyy-MM-dd"),
                g.Key <= today,
                [.. g.OrderBy(s => s.Position).Select(s => Row(listings[s.ListingId]))])),
        ];
    }
}

/// <summary>The current and the coming featured weeks (L2-106).</summary>
public sealed record GetFeaturedWeeksQuery : IRequest<FeaturedWeeksDto>;

public sealed class GetFeaturedWeeksQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<GetFeaturedWeeksQuery, FeaturedWeeksDto>
{
    public async Task<FeaturedWeeksDto> Handle(GetFeaturedWeeksQuery request, CancellationToken cancellationToken) =>
        new(await FeaturedWeekReader.Weeks(db, TorontoClock.Today(clock.GetUtcNow()), cancellationToken));
}

/// <summary>The live listings a verifier can feature, found by name (L2-106 AC1).</summary>
public sealed record GetFeaturedCandidatesQuery(string? Search) : IRequest<FeaturedCandidatesDto>;

public sealed class GetFeaturedCandidatesQueryHandler(IAppDbContext db) : IRequestHandler<GetFeaturedCandidatesQuery, FeaturedCandidatesDto>
{
    public const int Limit = 50;

    public async Task<FeaturedCandidatesDto> Handle(GetFeaturedCandidatesQuery request, CancellationToken cancellationToken)
    {
        var term = request.Search?.Trim();
        var listings = db.Listings.AsNoTracking().WherePublic();
        if (!string.IsNullOrEmpty(term))
        {
            var lowered = term.ToLowerInvariant();
            listings = listings.Where(l => l.Name.ToLower().Contains(lowered));
        }

        var found = await listings.OrderBy(l => l.SortName).Take(Limit).ToListAsync(cancellationToken);
        return new FeaturedCandidatesDto([.. found.Select(FeaturedWeekReader.Row)]);
    }
}

/// <summary>
/// Replaces the selection of one featured week, so a repeat has no further effect (L2-106 AC1). Up to five live
/// listings; a week starts today or later (Toronto) and no other week may start within six days of it.
/// </summary>
public sealed record SetFeaturedWeekCommand(Reviewer Reviewer, DateOnly StartDate, IReadOnlyList<Guid>? ListingIds) : IRequest<FeaturedWeekDto>;

public sealed class SetFeaturedWeekCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SetFeaturedWeekCommand, FeaturedWeekDto>
{
    public const int MaxSlots = 5;

    public async Task<FeaturedWeekDto> Handle(SetFeaturedWeekCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var today = TorontoClock.Today(now);
        var ids = request.ListingIds ?? [];
        var errors = new Dictionary<string, string>();

        if (request.StartDate < today)
        {
            errors["startDate"] = "START_IN_PAST";
        }
        else if (await db.FeaturedSlots.AnyAsync(
            s => s.StartsOn != request.StartDate
                && s.StartsOn > request.StartDate.AddDays(-FeaturedSlot.DurationDays)
                && s.StartsOn < request.StartDate.AddDays(FeaturedSlot.DurationDays),
            cancellationToken))
        {
            errors["startDate"] = "WEEK_OVERLAPS";
        }

        if (ids.Count > MaxSlots)
        {
            errors["listingIds"] = "TOO_MANY";
        }
        else if (ids.Distinct().Count() != ids.Count)
        {
            errors["listingIds"] = "DUPLICATE";
        }
        else if (ids.Count > 0
            && await db.Listings.WherePublic().CountAsync(l => ids.Contains(l.Id), cancellationToken) != ids.Count)
        {
            errors["listingIds"] = "NOT_LIVE";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var existing = await db.FeaturedSlots.Where(s => s.StartsOn == request.StartDate).ToListAsync(cancellationToken);
        var names = await db.Listings.AsNoTracking()
            .Where(l => ids.Contains(l.Id) || existing.Select(s => s.ListingId).Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name, cancellationToken);
        var before = string.Join(", ", existing.OrderBy(s => s.Position).Select(s => names[s.ListingId]));
        var after = string.Join(", ", ids.Select(id => names[id]));

        db.FeaturedSlots.RemoveRange(existing);
        for (var i = 0; i < ids.Count; i++)
        {
            db.FeaturedSlots.Add(FeaturedSlot.Create(ids[i], i + 1, request.StartDate));
        }

        AuditLog.Record(
            db, request.Reviewer, "featured.set", "featured-week", request.StartDate.ToString("yyyy-MM-dd"), before, after, null, now);
        await db.SaveChangesAsync(cancellationToken);
        var week = (await FeaturedWeekReader.Weeks(db, today, cancellationToken))
            .FirstOrDefault(w => w.StartDate == request.StartDate.ToString("yyyy-MM-dd"));
        return week ?? new FeaturedWeekDto(
            request.StartDate.ToString("yyyy-MM-dd"), request.StartDate.AddDays(FeaturedSlot.DurationDays - 1).ToString("yyyy-MM-dd"),
            request.StartDate <= today, []);
    }
}
