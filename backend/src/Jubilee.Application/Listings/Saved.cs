using Jubilee.Application.Abstractions;
using Jubilee.Application.Directory;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Listings;

/// <summary>One saved item. An unavailable one (paused, removed or no longer public) carries no card and cannot be opened.</summary>
public sealed record SavedItemDto(
    Guid Id,
    string Kind,
    string Name,
    DateTimeOffset SavedAt,
    bool Available,
    BusinessCardDto? Business,
    ProductCardDto? Product);

public sealed record SavedListDto(int BusinessCount, int ProductCount, IReadOnlyList<SavedItemDto> Items);

/// <summary>The caller's saved list, newest first (L2-042).</summary>
public sealed record GetSavedListQuery(string MemberSubject) : IRequest<SavedListDto>;

public sealed class GetSavedListQueryHandler(IAppDbContext db) : IRequestHandler<GetSavedListQuery, SavedListDto>
{
    public async Task<SavedListDto> Handle(GetSavedListQuery request, CancellationToken cancellationToken)
    {
        var rows = (await db.SavedItems.AsNoTracking().Where(i => i.MemberSubject == request.MemberSubject).ToListAsync(cancellationToken))
            .OrderByDescending(i => i.SavedAt).ThenBy(i => i.Id).ToList();
        var ids = rows.Select(r => r.TargetId).ToList();
        var products = await db.Products.AsNoTracking().Where(p => ids.Contains(p.Id)).ToListAsync(cancellationToken);
        var listingIds = rows.Where(r => r.Kind == SavedItemKind.Business).Select(r => r.TargetId)
            .Concat(products.Select(p => p.ListingId)).Distinct().ToList();
        var listings = (await db.Listings.AsNoTracking().Where(l => listingIds.Contains(l.Id)).ToListAsync(cancellationToken))
            .ToDictionary(l => l.Id);

        var items = new List<SavedItemDto>();
        foreach (var row in rows)
        {
            if (row.Kind == SavedItemKind.Business)
            {
                if (!listings.TryGetValue(row.TargetId, out var listing))
                {
                    items.Add(new SavedItemDto(row.Id, "business", "A business", row.SavedAt, false, null, null));
                    continue;
                }

                var open = listing.IsPublic();
                items.Add(new SavedItemDto(row.Id, "business", listing.Name, row.SavedAt, open, open ? BusinessCardDto.From(listing) : null, null));
            }
            else
            {
                var product = products.SingleOrDefault(p => p.Id == row.TargetId);
                if (product is null)
                {
                    items.Add(new SavedItemDto(row.Id, "product", "A product", row.SavedAt, false, null, null));
                    continue;
                }

                var shop = listings.GetValueOrDefault(product.ListingId);
                var open = shop is not null && shop.IsPublic() && !product.IsDeleted;
                items.Add(new SavedItemDto(
                    row.Id, "product", product.Name, row.SavedAt, open, null, open ? ProductCardDto.From(product, shop!) : null));
            }
        }

        return new SavedListDto(
            items.Count(i => i.Available && i.Kind == "business"),
            items.Count(i => i.Available && i.Kind == "product"),
            items);
    }
}

/// <summary>The heart, pressed: saving is idempotent, and refused at 500 items (L2-041 AC1 and AC5).</summary>
public sealed record SaveBusinessCommand(string MemberSubject, string ListingSlug) : IRequest;

public sealed record SaveProductCommand(string MemberSubject, string ListingSlug, string ProductSlug) : IRequest;

public static class SavedRules
{
    public const string NotFoundCode = "saved_target_not_found";
    public const string LimitCode = "SAVED_LIMIT_REACHED";
}

public sealed class SaveBusinessCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SaveBusinessCommand>
{
    public async Task Handle(SaveBusinessCommand request, CancellationToken cancellationToken)
    {
        var listing = await db.Listings.AsNoTracking().WherePublic().SingleOrDefaultAsync(l => l.Slug == request.ListingSlug, cancellationToken)
            ?? throw new NotFoundException(SavedRules.NotFoundCode, "There is no such business.");
        await SaveHandler.AddAsync(db, request.MemberSubject, SavedItemKind.Business, listing.Id, clock.GetUtcNow(), cancellationToken);
    }
}

public sealed class SaveProductCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SaveProductCommand>
{
    public async Task Handle(SaveProductCommand request, CancellationToken cancellationToken)
    {
        var shop = await db.Listings.AsNoTracking().WherePublic().SingleOrDefaultAsync(l => l.Slug == request.ListingSlug, cancellationToken)
            ?? throw new NotFoundException(SavedRules.NotFoundCode, "There is no such product.");
        var product = await db.Products.AsNoTracking()
            .SingleOrDefaultAsync(p => p.ListingId == shop.Id && p.Slug == request.ProductSlug && !p.IsDeleted, cancellationToken)
            ?? throw new NotFoundException(SavedRules.NotFoundCode, "There is no such product.");
        await SaveHandler.AddAsync(db, request.MemberSubject, SavedItemKind.Product, product.Id, clock.GetUtcNow(), cancellationToken);
    }
}

internal static class SaveHandler
{
    public static async Task AddAsync(
        IAppDbContext db, string subject, SavedItemKind kind, Guid targetId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (await db.SavedItems.AnyAsync(i => i.MemberSubject == subject && i.Kind == kind && i.TargetId == targetId, cancellationToken))
        {
            return;
        }

        if (await db.SavedItems.CountAsync(i => i.MemberSubject == subject, cancellationToken) >= SavedItem.MaxItems)
        {
            throw new ConflictException(SavedRules.LimitCode, "You can save up to 500 items. Remove some to add more.");
        }

        db.SavedItems.Add(kind == SavedItemKind.Business ? SavedItem.Business(subject, targetId, now) : SavedItem.Product(subject, targetId, now));
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // A second press at the same moment saved it first: the answer is the same. Anything else is a real failure.
            if (!await db.SavedItems.AsNoTracking()
                .AnyAsync(i => i.MemberSubject == subject && i.Kind == kind && i.TargetId == targetId, cancellationToken))
            {
                throw;
            }
        }
    }
}

/// <summary>Takes a business or a product off the list. Removing what is not there succeeds.</summary>
public sealed record UnsaveBusinessCommand(string MemberSubject, string ListingSlug) : IRequest;

public sealed record UnsaveProductCommand(string MemberSubject, string ListingSlug, string ProductSlug) : IRequest;

/// <summary>"Remove" on an unavailable item, whose listing can no longer be named by its address.</summary>
public sealed record UnsaveItemCommand(string MemberSubject, Guid ItemId) : IRequest;

public sealed class UnsaveBusinessCommandHandler(IAppDbContext db) : IRequestHandler<UnsaveBusinessCommand>
{
    public async Task Handle(UnsaveBusinessCommand request, CancellationToken cancellationToken)
    {
        // A paused listing can still be removed from the list: it is looked up by address, whatever its state.
        var listingId = await db.Listings.AsNoTracking().Where(l => l.Slug == request.ListingSlug).Select(l => (Guid?)l.Id)
            .SingleOrDefaultAsync(cancellationToken);
        if (listingId is null)
        {
            return;
        }

        await Remove(db, request.MemberSubject, SavedItemKind.Business, listingId.Value, cancellationToken);
    }

    internal static async Task Remove(IAppDbContext db, string subject, SavedItemKind kind, Guid targetId, CancellationToken cancellationToken)
    {
        var rows = await db.SavedItems.Where(i => i.MemberSubject == subject && i.Kind == kind && i.TargetId == targetId).ToListAsync(cancellationToken);
        if (rows.Count > 0)
        {
            db.SavedItems.RemoveRange(rows);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}

public sealed class UnsaveProductCommandHandler(IAppDbContext db) : IRequestHandler<UnsaveProductCommand>
{
    public async Task Handle(UnsaveProductCommand request, CancellationToken cancellationToken)
    {
        var productId = await db.Products.AsNoTracking()
            .Where(p => p.Slug == request.ProductSlug && db.Listings.Any(l => l.Id == p.ListingId && l.Slug == request.ListingSlug))
            .Select(p => (Guid?)p.Id).SingleOrDefaultAsync(cancellationToken);
        if (productId is null)
        {
            return;
        }

        await UnsaveBusinessCommandHandler.Remove(db, request.MemberSubject, SavedItemKind.Product, productId.Value, cancellationToken);
    }
}

public sealed class UnsaveItemCommandHandler(IAppDbContext db) : IRequestHandler<UnsaveItemCommand>
{
    public async Task Handle(UnsaveItemCommand request, CancellationToken cancellationToken)
    {
        // Only the caller's own row is found; another member's id changes nothing and reveals nothing.
        var rows = await db.SavedItems.Where(i => i.Id == request.ItemId && i.MemberSubject == request.MemberSubject).ToListAsync(cancellationToken);
        if (rows.Count > 0)
        {
            db.SavedItems.RemoveRange(rows);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
