using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Merch;

public sealed record MerchOrderLineDto(string Fit, string Size, int Quantity);

/// <summary>What the return page reads: nothing of the buyer (L2-269 AC7).</summary>
public sealed record MerchOrderDto(string Number, string Status, string Delivery, IReadOnlyList<MerchOrderLineDto> Lines, int TotalCents);

public sealed record GetMerchOrderQuery(string Reference) : IRequest<MerchOrderDto>;

public sealed class GetMerchOrderQueryHandler(IAppDbContext db) : IRequestHandler<GetMerchOrderQuery, MerchOrderDto>
{
    public async Task<MerchOrderDto> Handle(GetMerchOrderQuery request, CancellationToken cancellationToken)
    {
        var order = await db.MerchOrders.AsNoTracking().Include(o => o.Lines)
            .SingleOrDefaultAsync(o => o.Reference == request.Reference, cancellationToken)
            ?? throw new NotFoundException("order_not_found", "We can't find that order.");
        return new MerchOrderDto(
            order.Number,
            order.Status.ToString().ToLowerInvariant(),
            order.Delivery.ToString().ToLowerInvariant(),
            [.. order.OrderedLines.Select(l => new MerchOrderLineDto(MerchFits.Of(l.Fit).Name, l.Size, l.Quantity))],
            order.TotalCents);
    }
}

/// <summary>Expires the pending orders whose session ended more than 5 minutes ago, if the provider's event never came (L2-270 AC6).</summary>
public sealed record ExpireMerchOrdersCommand : IRequest<int>;

public sealed class ExpireMerchOrdersCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ExpireMerchOrdersCommand, int>
{
    public static readonly TimeSpan Grace = TimeSpan.FromMinutes(5);

    public async Task<int> Handle(ExpireMerchOrdersCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var cutoff = now - Grace;
        var due = await db.MerchOrders.Where(o => o.Status == MerchOrderStatus.Pending && o.ExpiresAt < cutoff).ToListAsync(cancellationToken);
        foreach (var order in due)
        {
            order.Expire(now);
        }

        await db.SaveChangesAsync(cancellationToken);
        return due.Count;
    }
}

public sealed record MerchPurgeResult(int Deleted, int Erased);

/// <summary>
/// Retention (L2-270 AC5, L2-148 AC7): an order never paid is deleted 30 days after it expired; a paid
/// order's e-mail, name and address are erased 6 years after payment, and the rest is kept.
/// </summary>
public sealed record PurgeMerchOrdersCommand : IRequest<MerchPurgeResult>;

public sealed class PurgeMerchOrdersCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<PurgeMerchOrdersCommand, MerchPurgeResult>
{
    public async Task<MerchPurgeResult> Handle(PurgeMerchOrdersCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var unpaidBefore = now - MerchOrder.UnpaidRetention;
        var paidBefore = now - MerchOrder.PaidRetention;
        var unpaid = await db.MerchOrders.Include(o => o.Lines)
            .Where(o => o.Status != MerchOrderStatus.Paid && o.ExpiresAt < unpaidBefore)
            .ToListAsync(cancellationToken);
        db.MerchOrderLines.RemoveRange(unpaid.SelectMany(o => o.Lines));
        db.MerchOrders.RemoveRange(unpaid);
        var old = await db.MerchOrders
            .Where(o => o.Status == MerchOrderStatus.Paid && o.PaidAt < paidBefore && o.PersonalDataErasedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var order in old)
        {
            order.ErasePersonalData(now);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new MerchPurgeResult(unpaid.Count, old.Count);
    }
}
