namespace Jubilee.Domain;

/// <summary>
/// A member's standing request to be told once when a sold-out product is available again
/// (L2-036 AC2). One open alert exists per member and product; a notified alert is closed.
/// </summary>
public sealed class StockAlert
{
    private StockAlert()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The member's session subject.</summary>
    public string MemberSubject { get; private set; } = string.Empty;

    public Guid ProductId { get; private set; }

    public DateTimeOffset RequestedAt { get; private set; }

    /// <summary>When the member was told; null while the alert is open.</summary>
    public DateTimeOffset? NotifiedAt { get; private set; }

    public static StockAlert Request(string memberSubject, Guid productId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        MemberSubject = memberSubject,
        ProductId = productId,
        RequestedAt = now,
    };

    public void MarkNotified(DateTimeOffset now) => NotifiedAt ??= now;
}
