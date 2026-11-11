namespace Jubilee.Domain;

public enum DeliveryKind
{
    Ship = 0,
    Pickup = 1,
}

/// <summary>A way a shop hands over a product: shipping or pickup, with its fee (L2-046).</summary>
public sealed class DeliveryMethod
{
    private DeliveryMethod()
    {
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    /// <summary>The shop's order of the methods, from 1.</summary>
    public int Position { get; private set; }

    public DeliveryKind Kind { get; private set; }

    /// <summary>For example "Ship to me" or "Pick up in Leslieville".</summary>
    public string Label { get; private set; } = string.Empty;

    public int FeeCents { get; private set; }

    /// <summary>For example "Canada Post, $9 flat · 3–6 business days".</summary>
    public string Estimate { get; private set; } = string.Empty;

    public static DeliveryMethod Create(Guid listingId, int position, DeliveryKind kind, string label, int feeCents, string estimate) => new()
    {
        Id = Guid.NewGuid(),
        ListingId = listingId,
        Position = position,
        Kind = kind,
        Label = label.Trim(),
        FeeCents = feeCents,
        Estimate = estimate.Trim(),
    };
}
