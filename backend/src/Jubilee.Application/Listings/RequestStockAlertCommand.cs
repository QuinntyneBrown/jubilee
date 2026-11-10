using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Listings;

/// <summary>"Tell me when it's back" on a sold-out product, by a signed-in member (L2-036 AC2).</summary>
public sealed record RequestStockAlertCommand(Guid ProductId, string MemberSubject) : IRequest;

public sealed class RequestStockAlertCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<RequestStockAlertCommand>
{
    public const string InStockCode = "product_in_stock";

    public async Task Handle(RequestStockAlertCommand request, CancellationToken cancellationToken)
    {
        // A product is only as visible as its shop (L2-028).
        var product = await db.Products.AsNoTracking()
            .Where(p => p.Id == request.ProductId && !p.IsDeleted)
            .Where(p => db.Listings.WherePublic().Any(l => l.Id == p.ListingId))
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(GetProductPageQueryHandler.NotFoundCode, "There is no such product.");

        if (!product.IsSoldOut)
        {
            throw new ConflictException(InStockCode, "This product is in stock; request it instead.");
        }

        // Asking again while the alert is open changes nothing.
        var open = await db.StockAlerts.AnyAsync(
            a => a.ProductId == product.Id && a.MemberSubject == request.MemberSubject && a.NotifiedAt == null,
            cancellationToken);
        if (open)
        {
            return;
        }

        db.StockAlerts.Add(StockAlert.Request(request.MemberSubject, product.Id, clock.GetUtcNow()));
        await db.SaveChangesAsync(cancellationToken);
    }
}
