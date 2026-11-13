namespace Jubilee.Domain;

/// <summary>The roles a staff account holds in Jubilee (L2-193).</summary>
[Flags]
public enum StaffRoles
{
    None = 0,
    Moderator = 1,
    Admin = 2,
}

/// <summary>
/// A staff account: the link between an identity of the staff directory and the roles it holds
/// (L2-193, ADR 0040). The e-mail address is stored in its comparison form (lower case). The first
/// sign-in binds the account to the identity's tenant and object ID; afterwards only that identity
/// signs in to it. An account with no role cannot sign in.
/// </summary>
public sealed class StaffMember
{
    private StaffMember()
    {
    }

    public Guid Id { get; private set; }

    public string Email { get; private set; } = "";

    public StaffRoles Roles { get; private set; }

    public string? TenantId { get; private set; }

    public string? ObjectId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public bool IsBound => ObjectId is not null;

    public static StaffMember Create(EmailAddress email, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Email = email.Key,
        CreatedAt = now,
    };

    public void Grant(StaffRoles role) => Roles |= role;

    public void Revoke(StaffRoles role) => Roles &= ~role;

    /// <summary>Binds the account on first sign-in; a second, different identity is refused (L2-193 AC5).</summary>
    public bool TryBindTo(string tenantId, string objectId)
    {
        if (IsBound)
        {
            return TenantId == tenantId && ObjectId == objectId;
        }

        TenantId = tenantId;
        ObjectId = objectId;
        return true;
    }

    /// <summary>The role names, in the order the admin application shows them.</summary>
    public IReadOnlyList<string> RoleNames() =>
        [.. new[] { (StaffRoles.Moderator, "moderator"), (StaffRoles.Admin, "admin") }
            .Where(r => Roles.HasFlag(r.Item1))
            .Select(r => r.Item2)];
}
