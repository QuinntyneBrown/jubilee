using Jubilee.Application.Admin.Tables;

namespace Jubilee.Application.Admin;

/// <summary>
/// Every table of the admin application, in the order of the sidebar (L2-272 AC2, L2-276 AC1, ADR 0074). It is built
/// once; the handlers find a table by its key.
/// </summary>
public static class AdminCatalog
{
    /// <summary>The groups of the sidebar, in order.</summary>
    public static readonly IReadOnlyList<string> Groups =
    [
        AccountsTables.Group, ListingsTables.Group, ActivityTables.Requests, ActivityTables.Reviews, ActivityTables.Moderation,
        ActivityTables.MemberActivity, ActivityTables.FeedbackGroup, SiteTables.Merch, SiteTables.Launch, SiteTables.Content, AdminRights.System,
    ];

    public static readonly IReadOnlyList<AdminTable> Tables =
        [.. AccountsTables.All(), .. ListingsTables.All(), .. ActivityTables.All(), .. SiteTables.All()];

    private static readonly Dictionary<string, AdminTable> ByKey = Tables.ToDictionary(t => t.Key, StringComparer.Ordinal);

    public static AdminTable? Find(string? key) => key is not null && ByKey.TryGetValue(key, out var table) ? table : null;
}
