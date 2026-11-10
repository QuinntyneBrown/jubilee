using System.Globalization;
using System.Text;

namespace Jubilee.Domain;

/// <summary>
/// The stored form of a business name that "Name A–Z" orders by: case-folded, accents stripped
/// and a leading "The" removed (L2-025 AC1).
/// </summary>
public static class SortName
{
    public static string From(string name)
    {
        var builder = new StringBuilder(name.Length);
        foreach (var c in name.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(c);
            }
        }

        var words = builder.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (words.Length > 1 && words[0] == "the")
        {
            words = words[1..];
        }

        return string.Join(' ', words);
    }
}
