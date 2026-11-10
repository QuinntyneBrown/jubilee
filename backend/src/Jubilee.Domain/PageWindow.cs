using System.Globalization;

namespace Jubilee.Domain;

/// <summary>A page of a category: 16 businesses at a time (L2-026).</summary>
public readonly record struct PageWindow(int Page, int PageCount, int TotalCount)
{
    public const int PageSize = 16;

    public int Skip => (Page - 1) * PageSize;

    /// <summary>
    /// Maps a page below 1 to page 1 and a page beyond the last to the last page. A result with
    /// nothing in it still has one (empty) page.
    /// </summary>
    public static PageWindow Clamp(int requestedPage, int totalCount)
    {
        var pageCount = Math.Max(1, (int)Math.Ceiling(totalCount / (double)PageSize));
        return new PageWindow(Math.Clamp(requestedPage, 1, pageCount), pageCount, totalCount);
    }

    /// <summary>
    /// Reads the untrusted <c>page</c> query value. Anything that is not a whole number means the
    /// first page; a whole number too large to hold means "beyond the last page".
    /// </summary>
    public static int ParseRequestedPage(string? raw)
    {
        raw = raw?.Trim();
        if (string.IsNullOrEmpty(raw))
        {
            return 1;
        }

        if (int.TryParse(raw, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var page))
        {
            return page;
        }

        return raw.All(char.IsAsciiDigit) ? int.MaxValue : 1;
    }
}
