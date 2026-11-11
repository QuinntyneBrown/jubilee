namespace Jubilee.Domain;

public enum SavedItemKind
{
    Business = 0,
    Product = 1,
}

/// <summary>
/// One business or one product a member saved for later (L2-041). The list is private to the member and holds at
/// most <see cref="MaxItems"/> items.
/// </summary>
public sealed class SavedItem
{
    public const int MaxItems = 500;

    private SavedItem()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The member's session subject.</summary>
    public string MemberSubject { get; private set; } = string.Empty;

    public SavedItemKind Kind { get; private set; }

    /// <summary>The listing for a business, the product for a product.</summary>
    public Guid TargetId { get; private set; }

    public DateTimeOffset SavedAt { get; private set; }

    public static SavedItem Business(string memberSubject, Guid listingId, DateTimeOffset now) =>
        new() { Id = Guid.NewGuid(), MemberSubject = memberSubject, Kind = SavedItemKind.Business, TargetId = listingId, SavedAt = now };

    public static SavedItem Product(string memberSubject, Guid productId, DateTimeOffset now) =>
        new() { Id = Guid.NewGuid(), MemberSubject = memberSubject, Kind = SavedItemKind.Product, TargetId = productId, SavedAt = now };
}
