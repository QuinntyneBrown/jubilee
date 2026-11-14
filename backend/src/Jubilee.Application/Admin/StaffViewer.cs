namespace Jubilee.Application.Admin;

/// <summary>The staff member behind a request of the admin application: the session's subject, name and roles (L2-193).</summary>
public sealed record StaffViewer(string Subject, string Name, IReadOnlyList<string> Roles)
{
    public const string AdminRole = "admin";

    /// <summary>The address of the staff account, where the weekly export is sent (L2-279 AC3).</summary>
    public string? Email { get; init; }

    /// <summary>The staff account behind the session, when it signed in through the staff directory.</summary>
    public Guid? StaffMemberId { get; init; }

    public bool IsAdmin => Roles.Contains(AdminRole);

    public bool IsModerator => Roles.Contains(Abstractions.Viewer.ModeratorRole);

    /// <summary>The first name, as the overview greets and Recent changes names a staff member.</summary>
    public string FirstName => Name.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? Name;
}
