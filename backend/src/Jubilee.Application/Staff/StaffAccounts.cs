using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Staff;

/// <summary>Why a staff command changed nothing (L2-193 AC4).</summary>
public sealed class StaffCommandException(string message) : Exception(message);

internal static class StaffCommandRules
{
    public static EmailAddress Address(string? raw) =>
        EmailAddress.TryParse(raw) ?? throw new StaffCommandException("That is not an e-mail address.");

    public static StaffRoles Role(string? raw) => raw?.Trim().ToLowerInvariant() switch
    {
        "moderator" => StaffRoles.Moderator,
        "admin" => StaffRoles.Admin,
        _ => throw new StaffCommandException("Role must be moderator or admin."),
    };

    public static string Describe(StaffMember account) =>
        $"{account.Email}: {(account.Roles == StaffRoles.None ? "no roles" : string.Join(", ", account.RoleNames()))}";
}

/// <summary><c>jubilee staff grant</c>: the account exists and holds the role; running it again changes nothing (L2-193 AC1).</summary>
public sealed record GrantStaffRoleCommand(string? Email, string? Role) : IRequest<string>;

public sealed class GrantStaffRoleCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<GrantStaffRoleCommand, string>
{
    public async Task<string> Handle(GrantStaffRoleCommand request, CancellationToken cancellationToken)
    {
        var email = StaffCommandRules.Address(request.Email);
        var role = StaffCommandRules.Role(request.Role);
        var account = await db.StaffMembers.SingleOrDefaultAsync(s => s.Email == email.Key, cancellationToken);
        if (account is null)
        {
            account = StaffMember.Create(email, clock.GetUtcNow());
            db.StaffMembers.Add(account);
        }

        account.Grant(role);
        await db.SaveChangesAsync(cancellationToken);
        return StaffCommandRules.Describe(account);
    }
}

/// <summary><c>jubilee staff revoke</c>: the role goes and every staff session of the account ends (L2-193 AC2, L2-190 AC6).</summary>
public sealed record RevokeStaffRoleCommand(string? Email, string? Role) : IRequest<string>;

public sealed class RevokeStaffRoleCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<RevokeStaffRoleCommand, string>
{
    public async Task<string> Handle(RevokeStaffRoleCommand request, CancellationToken cancellationToken)
    {
        var email = StaffCommandRules.Address(request.Email);
        var role = StaffCommandRules.Role(request.Role);
        var account = await db.StaffMembers.SingleOrDefaultAsync(s => s.Email == email.Key, cancellationToken)
            ?? throw new StaffCommandException($"No staff account has the address {email.Key}.");

        account.Revoke(role);
        var now = clock.GetUtcNow();
        foreach (var session in await db.Sessions
            .Where(s => s.Kind == SessionKind.Staff && s.StaffMemberId == account.Id && s.EndedAt == null)
            .ToListAsync(cancellationToken))
        {
            session.End(now);
        }

        await db.SaveChangesAsync(cancellationToken);
        return StaffCommandRules.Describe(account);
    }
}

/// <summary><c>jubilee staff list</c>: each account's address and roles (L2-193 AC3).</summary>
public sealed record ListStaffQuery : IRequest<IReadOnlyList<string>>;

public sealed class ListStaffQueryHandler(IAppDbContext db) : IRequestHandler<ListStaffQuery, IReadOnlyList<string>>
{
    public async Task<IReadOnlyList<string>> Handle(ListStaffQuery request, CancellationToken cancellationToken) =>
        [.. (await db.StaffMembers.OrderBy(s => s.Email).ToListAsync(cancellationToken)).Select(StaffCommandRules.Describe)];
}
