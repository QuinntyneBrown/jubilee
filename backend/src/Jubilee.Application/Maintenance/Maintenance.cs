using Jubilee.Application.Abstractions;
using Jubilee.Application.Accounts;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Maintenance;

/// <summary>The maintenance switch (L2-117 AC3): configuration an operator changes without a deployment.</summary>
public sealed class MaintenanceOptions
{
    public bool Enabled { get; set; }

    /// <summary>When Jubilee is back; part of the switch.</summary>
    public DateTimeOffset? BackBy { get; set; }
}

/// <summary>The current value of the switch. A change in the configuration shows here without a restart.</summary>
public interface IMaintenanceState
{
    bool Enabled { get; }

    DateTimeOffset? BackBy { get; }
}

/// <summary>
/// Keeps the record of maintenance windows true to the switch and extends the e-mailed links the window ate into
/// (L2-117 AC2). A pass is safe to repeat: a window opens once and is applied once.
/// </summary>
public sealed class MaintenanceWindowService(IAppDbContext db, IMaintenanceState state, TimeProvider clock)
{
    /// <summary>Opens a window when the switch is on and none is open; closes it and extends links when it is off.</summary>
    public async Task ObserveAsync(CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var open = await db.MaintenanceWindows.SingleOrDefaultAsync(w => w.EndedAt == null, cancellationToken);
        if (state.Enabled)
        {
            if (open is null)
            {
                db.MaintenanceWindows.Add(MaintenanceWindow.Open(now, state.BackBy));
                await db.SaveChangesAsync(cancellationToken);
            }

            return;
        }

        if (open is null)
        {
            return;
        }

        var length = open.Close(now);
        var started = open.StartedAt;
        var tokens = await db.LinkTokens
            .Where(t => (t.Purpose == LinkTokenPurpose.EmailConfirmation || t.Purpose == LinkTokenPurpose.ChangeEmail)
                && t.UsedAt == null && t.SupersededAt == null && t.ExpiresAt > started)
            .ToListAsync(cancellationToken);
        foreach (var token in tokens)
        {
            token.Extend(length);
        }

        var links = await db.ReferenceLinks.Where(l => l.ClosedAt == null && l.ExpiresAt > started).ToListAsync(cancellationToken);
        foreach (var link in links)
        {
            link.Extend(length);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>"Ask for access" on the forbidden page (L2-114 AC2): records the address and the account, grants nothing.</summary>
public sealed record CreateAccessRequestCommand(string Subject, string? Url, string? IdempotencyKey) : IRequest<AccessRequestedDto>;

public sealed record AccessRequestedDto(Guid Id);

public sealed class CreateAccessRequestCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<CreateAccessRequestCommand, AccessRequestedDto>
{
    /// <summary>Requests one member may send in an hour; more are slowed down (L2-127).</summary>
    public const int PerHour = 5;

    public async Task<AccessRequestedDto> Handle(CreateAccessRequestCommand request, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? Guid.NewGuid().ToString() : request.IdempotencyKey.Trim();
        var earlier = await db.AccessRequests.AsNoTracking()
            .SingleOrDefaultAsync(a => a.MemberSubject == request.Subject && a.IdempotencyKey == key, cancellationToken);
        if (earlier is not null)
        {
            return new AccessRequestedDto(earlier.Id);
        }

        var url = request.Url?.Trim() ?? string.Empty;
        if (url.Length == 0 || url.Length > AccessRequest.MaxUrlLength || !url.StartsWith('/') || url.StartsWith("//", StringComparison.Ordinal)
            || url.Contains('\\') || url.Any(char.IsControl))
        {
            throw new ValidationFailedException(new Dictionary<string, string> { ["url"] = "URL_INVALID" });
        }

        var now = clock.GetUtcNow();
        var since = now.AddHours(-1);
        var recent = await db.AccessRequests.CountAsync(a => a.MemberSubject == request.Subject && a.CreatedAt > since, cancellationToken);
        if (recent >= PerHour)
        {
            throw new RateLimitedException("RATE_LIMITED", TimeSpan.FromMinutes(10));
        }

        var created = AccessRequest.Create(request.Subject, url, key, now);
        db.AccessRequests.Add(created);
        await db.SaveChangesAsync(cancellationToken);
        return new AccessRequestedDto(created.Id);
    }
}
