using Jubilee.Application.Abstractions;
using Jubilee.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Staff;

/// <summary>
/// What the admin application shows of the signed-in staff member (L2-190 AC7), with the unresolved reports for the
/// admin bar (L2-105 AC1, L2-188 AC3, ADR 0058).
/// </summary>
public sealed record StaffSessionView(
    string DisplayName,
    string Initials,
    string Email,
    IReadOnlyList<string> Roles,
    int ReportCount);

public sealed record GetStaffSessionQuery(string DisplayName, string Email, IReadOnlyList<string> Roles) : IRequest<StaffSessionView>;

public sealed class GetStaffSessionQueryHandler(IAppDbContext db) : IRequestHandler<GetStaffSessionQuery, StaffSessionView>
{
    public async Task<StaffSessionView> Handle(GetStaffSessionQuery request, CancellationToken cancellationToken)
    {
        // Only a moderator sees how many reports wait (L2-188 AC3).
        var reports = request.Roles.Contains(Viewer.ModeratorRole)
            ? await db.ListingReports.CountAsync(r => r.Status != Domain.ReportStatus.Resolved, cancellationToken)
                + await db.ConversationReports.CountAsync(r => r.Status != Domain.ReportStatus.Resolved, cancellationToken)
            : 0;
        return new StaffSessionView(request.DisplayName, IncomingRules.Initials(request.DisplayName), request.Email, request.Roles, reports);
    }
}
