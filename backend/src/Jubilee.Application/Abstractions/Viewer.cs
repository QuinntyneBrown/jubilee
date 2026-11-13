namespace Jubilee.Application.Abstractions;

/// <summary>
/// Who is calling, as the API's session says: a visitor, or a signed-in member with their subject
/// and whether they belong to the Jubilee team. Built by the API from the session's claims;
/// never from anything the client sends in the request (L2-133).
/// </summary>
public sealed record Viewer(string? Subject, bool IsModerator)
{
    public const string ModeratorRole = "moderator";

    public static readonly Viewer Visitor = new(null, false);

    public bool SignedIn => Subject is not null;
}
