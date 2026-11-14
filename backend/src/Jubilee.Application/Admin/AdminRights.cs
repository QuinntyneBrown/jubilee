namespace Jubilee.Application.Admin;

/// <summary>
/// What each staff role may read and change in the admin application (L2-284 AC1, ADR 0075): an administrator reads
/// every table and changes every table but System and Staff; the Jubilee team reads every table but Staff and changes
/// Listings, Reviews, Moderation and Feedback. System and Staff are read-only to everyone.
/// </summary>
public static class AdminRights
{
    public const string System = "System";

    public const string StaffTable = "staff";

    private static readonly HashSet<string> ModeratorGroups = ["Listings", "Reviews", "Moderation", "Feedback"];

    public static bool IsReadOnly(AdminTable table) => table.Group == System || table.Key == StaffTable;

    public static bool CanRead(StaffViewer staff, AdminTable table) =>
        staff.IsAdmin || (staff.IsModerator && table.Key != StaffTable);

    public static bool CanChange(StaffViewer staff, AdminTable table) =>
        !IsReadOnly(table) && (staff.IsAdmin || (staff.IsModerator && ModeratorGroups.Contains(table.Group)));

    public static bool CanDelete(StaffViewer staff, AdminTable table) => table.Deletable && CanChange(staff, table);
}
