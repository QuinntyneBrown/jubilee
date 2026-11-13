using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using MediatR;

namespace Jubilee.Application.Listings;

/// <summary>
/// Where the address <c>https://{Label}.{domain}{Path}</c> leads (L2-243, ADR 0067). The app's host asks, and
/// redirects to the answer on the app's own origin.
/// </summary>
public sealed record ResolveAddressQuery(string Label, string? Path) : IRequest<AddressDto>;

/// <summary>A path of the app, always under <c>/b/{slug}</c>.</summary>
public sealed record AddressDto(string Location);

public sealed class ResolveAddressQueryHandler(IAppDbContext db, AddressSettings settings) : IRequestHandler<ResolveAddressQuery, AddressDto>
{
    public async Task<AddressDto> Handle(ResolveAddressQuery request, CancellationToken cancellationToken)
    {
        // A label that cannot be a slug, a reserved word and an unsafe path never reach the database (L2-243 AC8).
        var label = request.Label.ToLowerInvariant();
        if (!AddressRules.IsWellFormed(label) || settings.IsReserved(label) || Rest(request.Path) is not { } rest)
        {
            throw new NotFoundException("ADDRESS_NOT_FOUND", "We can't find that page.");
        }

        // An old address of a public listing leads to its current slug in one step (L2-245 AC2). Whether the label's
        // own listing exists or is public is not looked at: the app's host decides that for /b/{slug}, where the
        // owner's session is, so every address is answered alike (L2-243 AC4, AC5).
        var current = await ListingSlugs.CurrentPublicOfAsync(db, label, cancellationToken);
        return new AddressDto($"/b/{current ?? label}{rest}");
    }

    /// <summary>
    /// The path after the listing's page, each segment decoded and encoded again; null when it could leave
    /// <c>/b/{slug}</c>: an empty, <c>.</c> or <c>..</c> segment, a slash or a backslash inside one, a control
    /// character or a broken escape (L2-246 AC6).
    /// </summary>
    private static string? Rest(string? path)
    {
        if (string.IsNullOrEmpty(path) || path == "/")
        {
            return string.Empty;
        }

        if (path.Length > 2000 || !path.StartsWith('/'))
        {
            return null;
        }

        var segments = path.TrimEnd('/')[1..].Split('/');
        var encoded = new List<string>(segments.Length);
        foreach (var segment in segments)
        {
            string decoded;
            try
            {
                decoded = Uri.UnescapeDataString(segment);
            }
            catch (UriFormatException)
            {
                return null;
            }

            // An escape that does not decode ("%ZZ") is left as it was; it is refused like any other "%" left over.
            if (decoded.Length == 0 || decoded is "." or ".." || decoded.Contains('/') || decoded.Contains('\\')
                || decoded.Any(char.IsControl) || (decoded.Contains('%') && decoded == segment))
            {
                return null;
            }

            encoded.Add(Uri.EscapeDataString(decoded));
        }

        return "/" + string.Join('/', encoded);
    }
}
