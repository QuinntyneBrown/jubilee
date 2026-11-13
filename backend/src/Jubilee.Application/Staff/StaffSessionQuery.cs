using Jubilee.Application.Abstractions;
using Jubilee.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Staff;

/// <summary>What the admin application shows of the signed-in staff member (L2-190 AC7).</summary>
public sealed record StaffSessionView(
    string DisplayName,
    string Initials,
    string Email,
    IReadOnlyList<string> Roles);

public sealed record GetStaffSessionQuery(string DisplayName, string Email, IReadOnlyList<string> Roles) : IRequest<StaffSessionView>;

public sealed class GetStaffSessionQueryHandler : IRequestHandler<GetStaffSessionQuery, StaffSessionView>
{
    public Task<StaffSessionView> Handle(GetStaffSessionQuery request, CancellationToken cancellationToken) =>
        Task.FromResult(new StaffSessionView(request.DisplayName, IncomingRules.Initials(request.DisplayName), request.Email, request.Roles));
}
