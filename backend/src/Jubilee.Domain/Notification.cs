namespace Jubilee.Domain;

/// <summary>
/// One event told to one member in the notification centre (L2-064). It is kept for 90 days in the list;
/// the member's other devices learn of it through the event stream (L2-070).
/// </summary>
public sealed class Notification
{
    public const int MaxTitleLength = 200;

    public const int MaxDetailLength = 300;

    private Notification()
    {
    }

    public Guid Id { get; private set; }

    public string MemberSubject { get; private set; } = string.Empty;

    /// <summary>What it is about: request, message, listing, account, reminder, business or product. The browser picks the icon from it.</summary>
    public string Kind { get; private set; } = string.Empty;

    public string Title { get; private set; } = string.Empty;

    public string Detail { get; private set; } = string.Empty;

    /// <summary>The path in the app that the notification opens.</summary>
    public string Target { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? ReadAt { get; private set; }

    /// <summary>What caused it (a request), so it can be withdrawn with it.</summary>
    public Guid? CorrelationId { get; private set; }

    public static Notification Create(
        string memberSubject, string kind, string title, string detail, string target, DateTimeOffset now, DateTimeOffset? readAt = null,
        Guid? correlationId = null) => new()
    {
        Id = Guid.NewGuid(),
        MemberSubject = memberSubject,
        Kind = kind,
        Title = Clip(title, MaxTitleLength),
        Detail = Clip(detail, MaxDetailLength),
        Target = target,
        CreatedAt = now,
        ReadAt = readAt,
        CorrelationId = correlationId,
    };

    public void MarkRead(DateTimeOffset now) => ReadAt ??= now;

    private static string Clip(string text, int max) => text.Length <= max ? text : text[..(max - 1)] + "…";
}
