using Jubilee.Application.Abstractions;
using Jubilee.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Staff;

/// <summary>What the admin application shows of the signed-in staff member (L2-190 AC7, L2-098 AC3).</summary>
public sealed record StaffSessionView(
    string DisplayName,
    string Initials,
    string Email,
    IReadOnlyList<string> Roles,
    int VerificationCount);

public sealed record GetStaffSessionQuery(string DisplayName, string Email, IReadOnlyList<string> Roles) : IRequest<StaffSessionView>;

public sealed class GetStaffSessionQueryHandler(IAppDbContext db) : IRequestHandler<GetStaffSessionQuery, StaffSessionView>
{
    public async Task<StaffSessionView> Handle(GetStaffSessionQuery request, CancellationToken cancellationToken)
    {
        // Only the verification team sees how many listings wait for a review (L2-098 AC3).
        var waiting = request.Roles.Contains(Viewer.VerifierRole)
            ? await db.Listings.CountAsync(l => l.Stage == Domain.ListingStage.ReadyToReview && l.DeletedAt == null, cancellationToken)
            : 0;
        return new StaffSessionView(request.DisplayName, IncomingRules.Initials(request.DisplayName), request.Email, request.Roles, waiting);
    }
}
