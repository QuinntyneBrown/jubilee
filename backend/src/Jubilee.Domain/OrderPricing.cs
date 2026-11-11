namespace Jubilee.Domain;

/// <summary>What an order request costs, before tax; Jubilee takes no payment (L2-046).</summary>
public sealed record OrderAmounts(int UnitCents, int ItemCents, int ShippingCents)
{
    public int TotalCents => ItemCents + ShippingCents;
}

/// <summary>Computes an order's amounts from stored data only; nothing the client sends is trusted (L2-046 AC6).</summary>
public static class OrderPricing
{
    public static OrderAmounts For(Product product, int quantity, DeliveryMethod method, int? freeShippingOverCents)
    {
        var item = product.PriceCents * quantity;
        var free = method.Kind == DeliveryKind.Ship && freeShippingOverCents is { } threshold && item >= threshold;
        return new OrderAmounts(product.PriceCents, item, free ? 0 : method.FeeCents);
    }
}
