using System.Globalization;
using System.Text.RegularExpressions;
using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Application.Listings;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Requests;

public sealed record OrderOptionDto(string Label, int MaxQuantity);

public sealed record OrderProductDto(
    Guid Id,
    string Slug,
    string Name,
    int PriceCents,
    bool PerUnit,
    string? OptionName,
    IReadOnlyList<OrderOptionDto> Options,
    int MinimumQuantity,
    int MaxQuantity);

public sealed record DeliveryMethodDto(Guid Id, string Kind, string Label, string Detail, int FeeCents);

/// <summary>What the order dialog needs to open (L2-046 AC1, AC2, AC4).</summary>
public sealed record OrderOptionsDto(
    BusinessRef Shop,
    string OwnerFirstName,
    string? UsuallyReplies,
    string? LeadTime,
    OrderProductDto Product,
    IReadOnlyList<DeliveryMethodDto> DeliveryMethods,
    int? FreeShippingOverCents,
    string? LastShippingAddress);

internal static class Orderable
{
    public static async Task<Product> PublicProduct(IAppDbContext db, Listing shop, string productSlug, CancellationToken cancellationToken) =>
        await db.Products.Include(p => p.Options).Include(p => p.Attributes).AsNoTracking()
            .SingleOrDefaultAsync(p => p.ListingId == shop.Id && p.Slug == productSlug && !p.IsDeleted, cancellationToken)
        ?? throw new NotFoundException("product_not_found", "There is no such product.");

    /// <summary>"5–7 days, made to order" becomes "Made to order: ready in 5–7 days."</summary>
    public static string? LeadTime(Product product)
    {
        var ready = product.Attributes.FirstOrDefault(a => a.Label.Equals("Ready in", StringComparison.OrdinalIgnoreCase))?.Value;
        if (string.IsNullOrWhiteSpace(ready))
        {
            return null;
        }

        var parts = ready.Split(',', 2, StringSplitOptions.TrimEntries);
        return parts.Length == 2 && parts[1].Contains("made to order", StringComparison.OrdinalIgnoreCase)
            ? $"Made to order: ready in {parts[0]}."
            : $"Ready in {ready}.";
    }
}

public sealed record GetOrderOptionsQuery(string Subject, string ShopSlug, string ProductSlug) : IRequest<OrderOptionsDto>;

public sealed class GetOrderOptionsQueryHandler(IAppDbContext db) : IRequestHandler<GetOrderOptionsQuery, OrderOptionsDto>
{
    public async Task<OrderOptionsDto> Handle(GetOrderOptionsQuery request, CancellationToken cancellationToken)
    {
        var shop = await Bookable.PublicListing(db, request.ShopSlug, cancellationToken);
        var product = await Orderable.PublicProduct(db, shop, request.ProductSlug, cancellationToken);
        var methods = await db.DeliveryMethods.AsNoTracking()
            .Where(d => d.ListingId == shop.Id)
            .OrderBy(d => d.Position)
            .ToListAsync(cancellationToken);
        var last = await db.Requests.AsNoTracking()
            .Where(r => r.MemberSubject == request.Subject && r.ShippingAddress != null)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => r.ShippingAddress)
            .FirstOrDefaultAsync(cancellationToken);
        return new OrderOptionsDto(
            new BusinessRef(shop.Name, shop.Slug),
            Bookable.OwnerFirstName(shop),
            WireValues.Of(shop.ReplyTimeBand) switch
            {
                "few-hours" => "within a few hours",
                "day" => "within a day",
                "few-days" => "within a few days",
                _ => null,
            },
            Orderable.LeadTime(product),
            new OrderProductDto(
                product.Id,
                product.Slug,
                product.Name,
                product.PriceCents,
                product.IsPerUnit,
                product.OptionName,
                [.. product.OrderedOptions.Select(o => new OrderOptionDto(o.Label, o.MaxQuantity))],
                product.MinimumQuantity,
                product.MaxQuantity),
            [.. methods.Select(m => new DeliveryMethodDto(m.Id, m.Kind == DeliveryKind.Ship ? "ship" : "pickup", m.Label, m.Estimate, m.FeeCents))],
            shop.FreeShippingOverCents,
            last);
    }
}

/// <summary>
/// A member asks a shop for a product (L2-046). It carries no price, shipping or total: the server
/// computes them from stored data (L2-133 AC4). Nothing is charged.
/// </summary>
public sealed record RequestItemCommand(
    string Subject,
    string Name,
    string ShopSlug,
    string? ProductSlug,
    string? Option,
    int Quantity,
    Guid? DeliveryMethodId,
    string? ShippingAddress,
    string? Note,
    string? IdempotencyKey) : IRequest<BookedRequestDto>;

public sealed partial class RequestItemCommandHandler(IAppDbContext db, TimeProvider clock, AccountSettings settings)
    : IRequestHandler<RequestItemCommand, BookedRequestDto>
{
    [GeneratedRegex(@"[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d")]
    private static partial Regex PostalCode();

    public async Task<BookedRequestDto> Handle(RequestItemCommand command, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(command.IdempotencyKey) ? Guid.NewGuid().ToString() : command.IdempotencyKey.Trim();
        var earlier = await db.Requests.AsNoTracking()
            .SingleOrDefaultAsync(r => r.MemberSubject == command.Subject && r.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            return new BookedRequestDto(earlier.Id, RequestLabels.Wire(earlier.Status), RequestLabels.ForMember(earlier.Status));
        }

        var shop = await Bookable.PublicListing(db, command.ShopSlug, cancellationToken);
        var product = await Orderable.PublicProduct(db, shop, command.ProductSlug ?? string.Empty, cancellationToken);
        if (shop.OwnerId == command.Subject)
        {
            throw new ConflictException("OWN_LISTING", "You can't request an item from your own shop.");
        }

        var errors = new Dictionary<string, string>();
        var option = ChooseOption(product, command.Option, errors);
        var method = await ChooseMethod(shop, command.DeliveryMethodId, errors, cancellationToken);
        CheckQuantity(product, option, command.Quantity, errors);
        string? address = null;
        if (method?.Kind == DeliveryKind.Ship)
        {
            address = command.ShippingAddress?.Trim();
            if (string.IsNullOrEmpty(address) || !PostalCode().IsMatch(address))
            {
                errors["shippingAddress"] = "REQUIRED";
            }
        }

        var note = command.Note?.Trim();
        if ((note?.Length ?? 0) > Request.MaxNoteLength)
        {
            errors["note"] = "TOO_LONG";
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        var now = clock.GetUtcNow();
        var amounts = OrderPricing.For(product, command.Quantity, method!, shop.FreeShippingOverCents);
        var request = Request.AskForOrder(
            command.Subject, command.Name, shop.Id, product.Id, product.Name, option?.Label, command.Quantity, amounts,
            method!.Label, address, note, key, now);
        db.Requests.Add(request);
        await QueueOwnerEmail(shop, request, product.OptionName, now, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new BookedRequestDto(request.Id, RequestLabels.Wire(request.Status), RequestLabels.ForMember(request.Status));
    }

    private static ProductOption? ChooseOption(Product product, string? label, Dictionary<string, string> errors)
    {
        if (product.Options.Count == 0)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(label))
        {
            errors["option"] = "REQUIRED";
            return null;
        }

        var option = product.Options.FirstOrDefault(o => o.Label.Equals(label.Trim(), StringComparison.OrdinalIgnoreCase));
        if (option is null)
        {
            errors["option"] = "INVALID";
        }

        return option;
    }

    private async Task<DeliveryMethod?> ChooseMethod(Listing shop, Guid? id, Dictionary<string, string> errors, CancellationToken cancellationToken)
    {
        if (id is null || id == Guid.Empty)
        {
            errors["deliveryMethodId"] = "REQUIRED";
            return null;
        }

        var method = await db.DeliveryMethods.AsNoTracking().SingleOrDefaultAsync(d => d.Id == id && d.ListingId == shop.Id, cancellationToken);
        if (method is null)
        {
            errors["deliveryMethodId"] = "INVALID";
        }

        return method;
    }

    /// <summary>Stock is checked when sending, not reserved: confirming a request reduces it (L2-046 AC7).</summary>
    private static void CheckQuantity(Product product, ProductOption? option, int quantity, Dictionary<string, string> errors)
    {
        if (quantity < 1)
        {
            errors["quantity"] = "INVALID";
            return;
        }

        if (quantity < product.MinimumQuantity)
        {
            errors["quantity"] = "BELOW_MINIMUM";
            return;
        }

        if (product.Options.Count > 0 && option is null)
        {
            return;
        }

        var stock = option is null ? product.Stock : option.Stock;
        var most = option?.MaxQuantity ?? product.MaxQuantity;
        if (quantity > most)
        {
            errors["quantity"] = stock is null ? "TOO_MANY" : $"ONLY_LEFT:{most}";
        }
    }

    private async Task QueueOwnerEmail(Listing shop, Request request, string? optionName, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(shop.OwnerId, out var ownerId))
        {
            return;
        }

        var owner = await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == ownerId, cancellationToken);
        if (owner is null)
        {
            return;
        }

        static string Money(int cents) => (cents / 100m).ToString("C2", CultureInfo.GetCultureInfo("en-CA"));
        var item = request.OptionLabel is null
            ? $"{request.ServiceName} × {request.Quantity}"
            : $"{request.ServiceName}\n{optionName ?? "Option"} {request.OptionLabel} × {request.Quantity}";
        var where = request.ShippingAddress is null ? request.DeliveryLabel : $"{request.DeliveryLabel}: {request.ShippingAddress}";
        var note = request.Note is null ? string.Empty : $"\nNote: {request.Note}\n";
        db.OutboxMessages.Add(OutboxMessage.Email(
            owner.Id,
            owner.Email,
            $"New order request from {request.MemberName}",
            $"Hi {owner.FirstName},\n\n{request.MemberName} would like to order.\n\n{item}\n{where}\nItem {Money(request.ItemCents!.Value)} · shipping {Money(request.ShippingCents!.Value)} · estimated total {Money(request.TotalCents!.Value)} + tax\n{note}\nConfirm stock and arrange payment: {settings.PublicBaseUrl.TrimEnd('/')}/my-business/requests\n\nJubilee · Toronto's Christian marketplace\n",
            now));
    }
}
