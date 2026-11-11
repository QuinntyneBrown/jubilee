using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.OwnerWorkspace;

public sealed record OwnerProductOptionDto(string Label, int? Stock);

/// <summary>One row of the owner's products (L2-089).</summary>
public sealed record ProductRowDto(
    Guid Id,
    string Slug,
    string Name,
    int PriceCents,
    bool PerUnit,
    int? Stock,
    bool SoldOut,
    string? Description,
    string Tint,
    string Icon,
    int MinimumQuantity,
    string? OptionName,
    IReadOnlyList<OwnerProductOptionDto> Options,
    int Requests);

public sealed record ProductsDto(string Business, string Slug, string Subtitle, bool Live, int Total, int SoldOut, int Max, IReadOnlyList<ProductRowDto> Rows);

public sealed record OwnerServiceRowDto(
    Guid Id,
    string Name,
    string Detail,
    string PriceKind,
    int? PriceCents,
    string Action,
    int? DurationMinutes,
    bool OffersVideo,
    bool OffersInPerson,
    string? InPersonPlace);

public sealed record ServicesDto(string Business, string Slug, string Subtitle, bool Live, int Total, int Max, IReadOnlyList<OwnerServiceRowDto> Rows);

/// <summary>What deleting an item removed, for the toast and the record (L2-092, L2-095).</summary>
public sealed record DeletedItemDto(Guid Id, string Name, int PastRequests);

/// <summary>The rules the owner's catalogue shares.</summary>
internal static partial class CatalogueRules
{
    public const int MaxOptions = 10;
    public const int MaxOptionLabel = 40;
    public const int MaxPlace = 200;
    public static readonly TimeSpan IdempotencyWindow = TimeSpan.FromHours(24);

    [GeneratedRegex(@"^\d{1,6}(\.\d{1,2})?$")]
    private static partial Regex PriceShape();

    /// <summary>"24.00" to 2400 cents, between 0.01 and 100,000.00 with at most two decimals (L2-091 AC3); null when it is not one.</summary>
    public static int? Cents(string? price)
    {
        var text = price?.Trim();
        if (text is null || !PriceShape().IsMatch(text))
        {
            return null;
        }

        var cents = (int)Math.Round(decimal.Parse(text, CultureInfo.InvariantCulture) * 100m);
        return cents is >= 1 and <= Product.MaxCents ? cents : null;
    }

    public static string Slugify(string name)
    {
        var builder = new StringBuilder();
        foreach (var c in name.Normalize(NormalizationForm.FormD))
        {
            if (char.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(char.IsLetterOrDigit(c) ? char.ToLowerInvariant(c) : '-');
        }

        var slug = Regex.Replace(builder.ToString(), "-+", "-").Trim('-');
        return slug.Length == 0 ? "product" : slug.Length > 100 ? slug[..100].TrimEnd('-') : slug;
    }

    public static ProductRowDto Row(Product product, int requests) => new(
        product.Id,
        product.Slug,
        product.Name,
        product.PriceCents,
        product.IsPerUnit,
        product.Options.Count > 0 ? null : product.Stock,
        product.IsSoldOut,
        product.Description,
        WireValues.Of(product.TileTint),
        WireValues.Of(product.TileIcon),
        product.MinimumQuantity,
        product.OptionName,
        [.. product.OrderedOptions.Select(o => new OwnerProductOptionDto(o.Label, o.Stock))],
        requests);

    public static OwnerServiceRowDto Row(Service service) => new(
        service.Id,
        service.Name,
        service.Detail,
        WireValues.Of(service.PriceKind),
        service.PriceCents,
        service.Action == ServiceAction.Book ? "book" : "ask",
        service.DurationMinutes,
        service.OffersVideo,
        service.OffersInPerson,
        service.InPersonPlace);

    /// <summary>The owner's products in their order, and the same order for renumbering.</summary>
    public static List<Product> Ordered(IEnumerable<Product> products) =>
        [.. products.OrderBy(p => p.Position).ThenByDescending(p => p.CreatedAt).ThenBy(p => p.Slug)];

    public static async Task<Dictionary<Guid, int>> RequestCounts(IAppDbContext db, Guid listingId, CancellationToken cancellationToken) =>
        (await db.Requests.AsNoTracking()
            .Where(r => r.ListingId == listingId && r.Kind == RequestKind.Order && r.ServiceId != null)
            .GroupBy(r => r.ServiceId!.Value)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken))
        .ToDictionary(x => x.Key, x => x.Count);
}

public sealed record ListProductsQuery(string Subject) : IRequest<ProductsDto>;

public sealed class ListProductsQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ListProductsQuery, ProductsDto>
{
    public async Task<ProductsDto> Handle(ListProductsQuery request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var products = CatalogueRules.Ordered(await db.Products.AsNoTracking()
            .Where(p => p.ListingId == listing.Id && !p.IsDeleted).ToListAsync(cancellationToken));
        var counts = await CatalogueRules.RequestCounts(db, listing.Id, cancellationToken);
        return new ProductsDto(
            listing.Name,
            listing.Slug,
            await Workspace.SubtitleOf(db, listing, clock.GetUtcNow(), cancellationToken),
            listing.IsPublic(),
            products.Count,
            products.Count(p => p.IsSoldOut),
            Product.MaxPerListing,
            [.. products.Select(p => CatalogueRules.Row(p, counts.GetValueOrDefault(p.Id)))]);
    }
}

/// <summary>Adds a product, or with an <paramref name="Id"/> changes one (L2-091). A repeat of the same key adds nothing (L2-132).</summary>
public sealed record SaveProductCommand(
    string Subject,
    Guid? Id,
    string? Name,
    string? Price,
    int? Stock,
    string? Description,
    int? MinimumQuantity,
    string? OptionName,
    IReadOnlyList<OwnerProductOptionDto>? Options,
    string? IdempotencyKey) : IRequest<ProductRowDto>;

public sealed class SaveProductCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SaveProductCommand, ProductRowDto>
{
    public async Task<ProductRowDto> Handle(SaveProductCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var now = clock.GetUtcNow();
        var name = request.Name?.Trim() ?? string.Empty;
        var description = request.Description?.Trim() ?? string.Empty;
        var errors = new Dictionary<string, string>();
        if (name.Length == 0)
        {
            errors["name"] = "REQUIRED";
        }
        else if (name.Length > Product.MaxNameLength)
        {
            errors["name"] = "TOO_LONG";
        }

        var cents = CatalogueRules.Cents(request.Price);
        if (cents is null)
        {
            errors["price"] = string.IsNullOrWhiteSpace(request.Price) ? "REQUIRED" : "INVALID";
        }

        var options = request.Options ?? [];
        if (request.Stock is < 0 or > Product.MaxStock)
        {
            errors["stock"] = "INVALID";
        }

        if (description.Length > Product.MaxDescriptionLength)
        {
            errors["description"] = "TOO_LONG";
        }

        if (request.MinimumQuantity is < 1 or > 999)
        {
            errors["minimumQuantity"] = "INVALID";
        }

        if (options.Count > CatalogueRules.MaxOptions
            || options.Any(o => string.IsNullOrWhiteSpace(o.Label) || o.Label.Trim().Length > CatalogueRules.MaxOptionLabel
                || o.Stock is < 0 or > Product.MaxStock)
            || options.Select(o => o.Label.Trim().ToLowerInvariant()).Distinct().Count() != options.Count)
        {
            errors["options"] = "INVALID";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var key = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim();
        var counts = await CatalogueRules.RequestCounts(db, listing.Id, cancellationToken);
        if (request.Id is null)
        {
            if (key is not null)
            {
                var earlier = await db.Products.AsNoTracking().FirstOrDefaultAsync(
                    p => p.ListingId == listing.Id && p.IdempotencyKey == key && p.CreatedAt > now - CatalogueRules.IdempotencyWindow,
                    cancellationToken);
                if (earlier is not null)
                {
                    return CatalogueRules.Row(earlier, 0);
                }
            }

            var live = await db.Products.Where(p => p.ListingId == listing.Id && !p.IsDeleted).ToListAsync(cancellationToken);
            if (live.Count >= Product.MaxPerListing)
            {
                throw new ConflictException("PRODUCT_LIMIT", $"You can list up to {Product.MaxPerListing} products.");
            }

            var all = await db.Products.AsNoTracking().Where(p => p.ListingId == listing.Id).Select(p => p.Slug).ToListAsync(cancellationToken);
            var slug = Unique(CatalogueRules.Slugify(name), all);
            var created = Product.Create(listing.Id, slug, name, cents!.Value, false, (TileTint)(live.Count % 4), TileIcon.Bag, now);
            created.Place(live.Count == 0 ? 1 : live.Max(p => p.Position) + 1, key);
            Apply(created, request, options);
            db.Products.Add(created);
            await db.SaveChangesAsync(cancellationToken);
            return CatalogueRules.Row(created, 0);
        }

        var product = await db.Products.SingleOrDefaultAsync(p => p.Id == request.Id && p.ListingId == listing.Id && !p.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("product_not_found", "We can't find that product.");
        product.Revise(name, cents!.Value, description);
        Apply(product, request, options);
        await db.SaveChangesAsync(cancellationToken);
        return CatalogueRules.Row(product, counts.GetValueOrDefault(product.Id));
    }

    private static void Apply(Product product, SaveProductCommand request, IReadOnlyList<OwnerProductOptionDto> options)
    {
        if (request.MinimumQuantity is { } minimum)
        {
            product.SetMinimumQuantity(minimum);
        }

        if (request.Options is not null)
        {
            product.SetOptions(request.OptionName, [.. options.Select(o => new ProductOption(o.Label, o.Stock))]);
        }

        if (product.Options.Count == 0)
        {
            product.SetStock(request.Stock);
        }
    }

    private static string Unique(string slug, List<string> taken)
    {
        var candidate = slug;
        for (var n = 2; taken.Contains(candidate); n++)
        {
            candidate = $"{slug}-{n}";
        }

        return candidate;
    }
}

public sealed record DeleteProductCommand(string Subject, Guid Id) : IRequest<DeletedItemDto>;

public sealed class DeleteProductCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<DeleteProductCommand, DeletedItemDto>
{
    public async Task<DeletedItemDto> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var product = await db.Products.SingleOrDefaultAsync(p => p.Id == request.Id && p.ListingId == listing.Id && !p.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("product_not_found", "We can't find that product.");
        var counts = await CatalogueRules.RequestCounts(db, listing.Id, cancellationToken);
        product.Delete(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
        return new DeletedItemDto(product.Id, product.Name, counts.GetValueOrDefault(product.Id));
    }
}

public sealed record MoveProductCommand(string Subject, Guid Id, int Position) : IRequest<ProductsDto>;

public sealed class MoveProductCommandHandler(IAppDbContext db, IMediator mediator) : IRequestHandler<MoveProductCommand, ProductsDto>
{
    public async Task<ProductsDto> Handle(MoveProductCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var products = CatalogueRules.Ordered(await db.Products.Where(p => p.ListingId == listing.Id && !p.IsDeleted).ToListAsync(cancellationToken));
        var moving = products.SingleOrDefault(p => p.Id == request.Id)
            ?? throw new NotFoundException("product_not_found", "We can't find that product.");
        products.Remove(moving);
        products.Insert(Math.Clamp(request.Position - 1, 0, products.Count), moving);
        for (var i = 0; i < products.Count; i++)
        {
            products[i].MoveTo(i + 1);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await mediator.Send(new ListProductsQuery(request.Subject), cancellationToken);
    }
}

public sealed record ListServicesQuery(string Subject) : IRequest<ServicesDto>;

public sealed class ListServicesQueryHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ListServicesQuery, ServicesDto>
{
    public async Task<ServicesDto> Handle(ListServicesQuery request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var services = (await db.Services.AsNoTracking().Where(s => s.ListingId == listing.Id).ToListAsync(cancellationToken))
            .OrderBy(s => s.Position).ToList();
        return new ServicesDto(listing.Name, listing.Slug, await Workspace.SubtitleOf(db, listing, clock.GetUtcNow(), cancellationToken), listing.IsPublic(), services.Count, Service.MaxPerListing, [.. services.Select(CatalogueRules.Row)]);
    }
}

/// <summary>Adds a service, or with an <paramref name="Id"/> changes one (L2-094).</summary>
public sealed record SaveServiceCommand(
    string Subject,
    Guid? Id,
    string? Name,
    string? Detail,
    string? Pricing,
    string? Price,
    string? Action,
    int? DurationMinutes,
    bool OffersVideo,
    bool OffersInPerson,
    string? Place,
    string? IdempotencyKey) : IRequest<OwnerServiceRowDto>;

public sealed class SaveServiceCommandHandler(IAppDbContext db) : IRequestHandler<SaveServiceCommand, OwnerServiceRowDto>
{
    public async Task<OwnerServiceRowDto> Handle(SaveServiceCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var name = request.Name?.Trim() ?? string.Empty;
        var detail = request.Detail?.Trim() ?? string.Empty;
        var errors = new Dictionary<string, string>();
        if (name.Length == 0)
        {
            errors["name"] = "REQUIRED";
        }
        else if (name.Length > Service.MaxNameLength)
        {
            errors["name"] = "TOO_LONG";
        }

        if (detail.Length > Service.MaxDetailLength)
        {
            errors["detail"] = "TOO_LONG";
        }

        ServicePrice? price = null;
        switch (request.Pricing?.ToLowerInvariant())
        {
            case "free":
                price = ServicePrice.Free;
                break;
            case "ask":
                price = ServicePrice.Ask;
                break;
            case "amount" or "fixed":
                if (CatalogueRules.Cents(request.Price) is { } cents)
                {
                    price = ServicePrice.Amount(cents);
                }
                else
                {
                    errors["price"] = string.IsNullOrWhiteSpace(request.Price) ? "REQUIRED" : "INVALID";
                }

                break;
            default:
                errors["pricing"] = "INVALID";
                break;
        }

        var books = string.Equals(request.Action, "book", StringComparison.OrdinalIgnoreCase);
        if (!books && !string.Equals(request.Action, "ask", StringComparison.OrdinalIgnoreCase))
        {
            errors["action"] = "INVALID";
        }

        if (books)
        {
            if (request.DurationMinutes is not (>= 15 and <= 480))
            {
                errors["duration"] = "INVALID";
            }

            if (!request.OffersVideo && !request.OffersInPerson)
            {
                errors["modes"] = "REQUIRED";
            }
            else if (request.OffersInPerson && string.IsNullOrWhiteSpace(request.Place))
            {
                errors["place"] = "REQUIRED";
            }
            else if ((request.Place?.Trim().Length ?? 0) > CatalogueRules.MaxPlace)
            {
                errors["place"] = "TOO_LONG";
            }
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var action = books ? ServiceAction.Book : ServiceAction.Ask;
        var key = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim();
        if (request.Id is null)
        {
            if (key is not null)
            {
                var earlier = await db.Services.AsNoTracking().FirstOrDefaultAsync(s => s.ListingId == listing.Id && s.IdempotencyKey == key, cancellationToken);
                if (earlier is not null)
                {
                    return CatalogueRules.Row(earlier);
                }
            }

            var existing = await db.Services.Where(s => s.ListingId == listing.Id).ToListAsync(cancellationToken);
            if (existing.Count >= Service.MaxPerListing)
            {
                throw new ConflictException("SERVICE_LIMIT", $"You can list up to {Service.MaxPerListing} services.");
            }

            var created = Service.Create(listing.Id, existing.Count == 0 ? 1 : existing.Max(s => s.Position) + 1, name, detail, price!, action);
            created.Revise(name, detail, price!, action, request.DurationMinutes, request.OffersVideo, request.OffersInPerson, request.Place);
            created.Remember(key);
            db.Services.Add(created);
            await db.SaveChangesAsync(cancellationToken);
            return CatalogueRules.Row(created);
        }

        var service = await db.Services.SingleOrDefaultAsync(s => s.Id == request.Id && s.ListingId == listing.Id, cancellationToken)
            ?? throw new NotFoundException("service_not_found", "We can't find that service.");
        service.Revise(name, detail, price!, action, request.DurationMinutes, request.OffersVideo, request.OffersInPerson, request.Place);
        await db.SaveChangesAsync(cancellationToken);
        return CatalogueRules.Row(service);
    }
}

public sealed record DeleteServiceCommand(string Subject, Guid Id) : IRequest<DeletedItemDto>;

public sealed class DeleteServiceCommandHandler(IAppDbContext db) : IRequestHandler<DeleteServiceCommand, DeletedItemDto>
{
    public async Task<DeletedItemDto> Handle(DeleteServiceCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var service = await db.Services.SingleOrDefaultAsync(s => s.Id == request.Id && s.ListingId == listing.Id, cancellationToken)
            ?? throw new NotFoundException("service_not_found", "We can't find that service.");
        var open = await db.Requests.AsNoTracking().CountAsync(r => r.ServiceId == service.Id && r.Kind != RequestKind.Order, cancellationToken);
        db.Services.Remove(service);
        var rest = (await db.Services.Where(s => s.ListingId == listing.Id && s.Id != service.Id).ToListAsync(cancellationToken))
            .OrderBy(s => s.Position).ToList();
        for (var i = 0; i < rest.Count; i++)
        {
            rest[i].MoveTo(i + 1);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new DeletedItemDto(service.Id, service.Name, open);
    }
}

public sealed record MoveServiceCommand(string Subject, Guid Id, int Position) : IRequest<ServicesDto>;

public sealed class MoveServiceCommandHandler(IAppDbContext db, IMediator mediator) : IRequestHandler<MoveServiceCommand, ServicesDto>
{
    public async Task<ServicesDto> Handle(MoveServiceCommand request, CancellationToken cancellationToken)
    {
        var listing = await Workspace.Owned(db, request.Subject, cancellationToken);
        var services = (await db.Services.Where(s => s.ListingId == listing.Id).ToListAsync(cancellationToken)).OrderBy(s => s.Position).ToList();
        var moving = services.SingleOrDefault(s => s.Id == request.Id)
            ?? throw new NotFoundException("service_not_found", "We can't find that service.");
        services.Remove(moving);
        services.Insert(Math.Clamp(request.Position - 1, 0, services.Count), moving);
        for (var i = 0; i < services.Count; i++)
        {
            services[i].MoveTo(i + 1);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await mediator.Send(new ListServicesQuery(request.Subject), cancellationToken);
    }
}
