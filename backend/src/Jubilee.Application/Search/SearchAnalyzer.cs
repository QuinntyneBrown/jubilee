using System.Globalization;
using System.Text;

namespace Jubilee.Application.Search;

/// <summary>
/// Case folding, accent folding and light stemming, so "plumber", "plumbing" and "Plumbers" meet
/// and "café" meets "cafe" (L2-029 AC3, AC4).
/// </summary>
public static class SearchAnalyzer
{
    private static readonly string[] Suffixes = ["ing", "ers", "er", "es", "s"];

    public readonly record struct Word(string Text, string Stem, int Start);

    public static string Fold(string text)
    {
        var decomposed = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(char.ToLowerInvariant(c));
            }
        }

        return sb.ToString();
    }

    public static string Stem(string foldedWord)
    {
        var word = foldedWord;
        foreach (var suffix in Suffixes)
        {
            if (word.Length >= suffix.Length + 3 && word.EndsWith(suffix, StringComparison.Ordinal))
            {
                word = word[..^suffix.Length];
                break;
            }
        }

        return word.Length > 3 && word.EndsWith('e') ? word[..^1] : word;
    }

    /// <summary>The words of <paramref name="text"/> with their positions in the original text.</summary>
    public static List<Word> Words(string text)
    {
        var words = new List<Word>();
        var start = -1;
        for (var i = 0; i <= text.Length; i++)
        {
            var inWord = i < text.Length && char.IsLetterOrDigit(text[i]);
            if (inWord && start < 0)
            {
                start = i;
            }
            else if (!inWord && start >= 0)
            {
                var original = text[start..i];
                words.Add(new Word(original, Stem(Fold(original)), start));
                start = -1;
            }
        }

        return words;
    }

    public static List<string> QueryStems(string query) => [.. Words(query).Select(w => w.Stem).Distinct()];

    /// <summary>True when every query stem occurs among the stems of <paramref name="text"/>.</summary>
    public static bool Matches(string? text, IReadOnlyList<string> queryStems)
    {
        if (string.IsNullOrWhiteSpace(text) || queryStems.Count == 0)
        {
            return false;
        }

        var stems = Words(text).Select(w => w.Stem).ToHashSet();
        return queryStems.All(stems.Contains);
    }

    /// <summary>The word of <paramref name="text"/> whose stem is <paramref name="stem"/>, as written.</summary>
    public static string? WordFor(string? text, string stem) =>
        text is null ? null : Words(text).FirstOrDefault(w => w.Stem == stem).Text;

    /// <summary>Optimal string alignment distance: one swap of neighbours counts once.</summary>
    public static int Distance(string a, string b)
    {
        var d = new int[a.Length + 1, b.Length + 1];
        for (var i = 0; i <= a.Length; i++)
        {
            d[i, 0] = i;
        }

        for (var j = 0; j <= b.Length; j++)
        {
            d[0, j] = j;
        }

        for (var i = 1; i <= a.Length; i++)
        {
            for (var j = 1; j <= b.Length; j++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                d[i, j] = Math.Min(Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1), d[i - 1, j - 1] + cost);
                if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1])
                {
                    d[i, j] = Math.Min(d[i, j], d[i - 2, j - 2] + 1);
                }
            }
        }

        return d[a.Length, b.Length];
    }
}
