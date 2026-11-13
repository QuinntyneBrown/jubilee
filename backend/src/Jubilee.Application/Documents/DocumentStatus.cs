using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Listings;
using Jubilee.Application.OwnerWorkspace;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Documents;

/// <summary>
/// What a page load of <paramref name="Path"/> answers (L2-113, L2-114 AC1, ADR 0056). The app's host asks before it
/// serves the app; <paramref name="Owner"/> says the address is one of the owner's workspace.
/// </summary>
public sealed record GetDocumentStatusQuery(string? Path, bool Owner, Viewer Viewer) : IRequest<DocumentStatusDto>;

/// <summary>The status of the page load, and the address to go to for a 301.</summary>
public sealed record DocumentStatusDto(int Status, string? Location = null);

public sealed class GetDocumentStatusQueryHandler(IAppDbContext db) : IRequestHandler<GetDocumentStatusQuery, DocumentStatusDto>
{
    private static readonly DocumentStatusDto Ok = new(200);
    private static readonly DocumentStatusDto NotFound = new(404);

    public async Task<DocumentStatusDto> Handle(GetDocumentStatusQuery request, CancellationToken cancellationToken)
    {
        var path = request.Path ?? string.Empty;
        if (path.Length is 0 or > 2000 || !path.StartsWith('/') || path.StartsWith("//", StringComparison.Ordinal)
            || path.Contains('\\') || path.Any(char.IsControl))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["path"] = "PATH_INVALID" });
        }

        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments is ["b", var slug, ..])
        {
            return await ListingAsync(Uri.UnescapeDataString(slug).ToLowerInvariant(), segments, request.Viewer, cancellationToken);
        }

        if (segments is ["c", var category, ..])
        {
            return Category.Find(Uri.UnescapeDataString(category)) is null ? NotFound : Ok;
        }

        // The owner's workspace: a member who owns no listing is refused; a visitor is sent to sign in by the app.
        if (request.Owner && request.Viewer.Subject is { } subject
            && await Workspace.Find(db, subject, false, cancellationToken) is null)
        {
            return new DocumentStatusDto(403);
        }

        return Ok;
    }

    private async Task<DocumentStatusDto> ListingAsync(string slug, string[] segments, Viewer viewer, CancellationToken cancellationToken)
    {
        if (await db.Listings.AsNoTracking().WherePublic().AnyAsync(l => l.Slug == slug, cancellationToken))
        {
            return Ok;
        }

        // The owner and the verification team may open a listing that is not public, as its preview (L2-219).
        if (viewer.Subject is { } subject && await db.Listings.AsNoTracking()
                .AnyAsync(l => l.Slug == slug && l.DeletedAt == null && (l.OwnerId == subject || viewer.IsVerifier), cancellationToken))
        {
            return Ok;
        }

        var current = await ListingSlugs.CurrentOfAsync(db, slug, cancellationToken);
        return current is null
            ? NotFound
            : new DocumentStatusDto(301, "/" + string.Join('/', new[] { "b", current }.Concat(segments.Skip(2))));
    }
}
