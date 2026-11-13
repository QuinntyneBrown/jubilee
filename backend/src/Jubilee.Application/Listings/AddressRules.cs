using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Jubilee.Domain;

namespace Jubilee.Application.Listings;

/// <summary>
/// The shape of a listing's slug, which is the first label of its address <c>https://{slug}.jubilee.to</c>
/// (L2-241, L2-242, ADR 0067): the letters a to z, the digits and single hyphens, 3 to 40 characters.
/// </summary>
public static partial class AddressRules
{
    public const int MinLength = 3;

    public const int MaxLength = 40;

    /// <summary>
    /// The slug of <paramref name="name"/>: lower case, accents removed, every other run of characters one hyphen,
    /// cut to 40. A name that gives fewer than 3 characters gives "business" (a space, "space"), which always
    /// takes a number (<c>Numbered</c>).
    /// </summary>
    public static (string Slug, bool Numbered) SlugOf(string name, ListingKind kind)
    {
        var builder = new StringBuilder();
        foreach (var character in name.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(char.IsAsciiLetterOrDigit(character) ? char.ToLowerInvariant(character) : '-');
        }

        // Runs of hyphens become one, so a slug never holds "--" and never begins "xn--" (L2-242 AC5).
        var slug = Cut(Hyphens().Replace(builder.ToString(), "-").Trim('-'), MaxLength);
        return slug.Length < MinLength ? (kind == ListingKind.Space ? "space" : "business", true) : (slug, false);
    }

    /// <summary><paramref name="slug"/> with the suffix <c>-{n}</c>, cut so the whole stays within 40 (L2-241 AC4).</summary>
    public static string WithNumber(string slug, int n)
    {
        var suffix = "-" + n.ToString(CultureInfo.InvariantCulture);
        return Cut(slug, MaxLength - suffix.Length) + suffix;
    }

    /// <summary>Whether <paramref name="label"/> could be a slug: what an address may have as its first label.</summary>
    public static bool IsWellFormed(string label) =>
        label.Length is >= MinLength and <= MaxLength && Label().IsMatch(label);

    private static string Cut(string slug, int length) => slug.Length > length ? slug[..length].Trim('-') : slug;

    [GeneratedRegex("-{2,}")]
    private static partial Regex Hyphens();

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex Label();
}

/// <summary>
/// The settings of listing addresses (<c>Addresses</c>, ADR 0067). <see cref="Domain"/> is the domain the addresses
/// sit under (<c>jubilee.to</c>), or empty where addresses are off and the app's own links are shared (L2-244 AC6).
/// </summary>
public sealed class AddressSettings
{
    /// <summary>Words that are never a slug: Jubilee's own hosts and what could be taken for them (L2-242 AC4).</summary>
    private static readonly string[] BuiltIn =
    [
        "www", "app", "admin", "api", "mail", "email", "status", "help", "support", "security", "account", "login",
        "signin", "signup", "join", "list", "assets", "static", "cdn", "media", "uploads", "blog", "docs", "about",
        "legal", "privacy", "terms", "faith", "jubilee", "official", "staff", "team",
    ];

    private readonly HashSet<string> _reserved;

    public AddressSettings(string? domain = null, IEnumerable<string>? reserved = null)
    {
        Domain = (domain ?? string.Empty).Trim().Trim('.').ToLowerInvariant();
        _reserved = BuiltIn
            .Concat((reserved ?? []).SelectMany(entry => entry.Split(',')))
            .Select(word => word.Trim().ToLowerInvariant())
            .Where(word => word.Length > 0)
            .ToHashSet(StringComparer.Ordinal);
    }

    public string Domain { get; }

    public bool IsReserved(string label) => _reserved.Contains(label.ToLowerInvariant());

    /// <summary>The address of the listing with <paramref name="slug"/>, or null where no domain is set.</summary>
    public string? AddressOf(string slug) => Domain.Length == 0 ? null : $"https://{slug}.{Domain}";
}

/// <summary>An answer about one listing that states its address (L2-244): the listing page, a publish, My business, the editor.</summary>
public interface IAddressed
{
    string? Slug { get; }

    /// <summary><c>https://{slug}.{domain}</c>, or null where no address domain is set or the answer has no listing.</summary>
    string? Address { get; set; }
}

/// <summary>Writes the address on every answer that states one, so each handler need not (ADR 0067).</summary>
public sealed class AddressBehavior<TRequest, TResponse>(AddressSettings settings) : MediatR.IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, MediatR.RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var response = await next(cancellationToken);
        if (response is IAddressed { Slug: { } slug } addressed)
        {
            addressed.Address = settings.AddressOf(slug);
        }

        return response;
    }
}
