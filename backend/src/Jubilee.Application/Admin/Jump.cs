using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using MediatR;

namespace Jubilee.Application.Admin;

/// <summary>A record the jump palette lists: its table, the table's names, its ID and its name (L2-273 AC3).</summary>
public sealed record AdminJumpDto(string Table, string TableLabel, string Singular, string Id, string Name);

public sealed record GetAdminJumpQuery(StaffViewer Staff, string? Text) : IRequest<IReadOnlyList<AdminJumpDto>>;

/// <summary>
/// Finds the records whose ID or name contains the text, ignoring case, across every table the staff member may read,
/// in the catalog's order, six at most (L2-273 AC3). A private table is never searched: a message opens only from its
/// report (L2-284 AC3). It reads the database with the staff session; nothing is cached (L2-273 AC6).
/// </summary>
public sealed class GetAdminJumpQueryHandler(IAppDbContext db) : IRequestHandler<GetAdminJumpQuery, IReadOnlyList<AdminJumpDto>>
{
    public const int Most = 6;

    public async Task<IReadOnlyList<AdminJumpDto>> Handle(GetAdminJumpQuery request, CancellationToken cancellationToken)
    {
        var text = request.Text?.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return [];
        }

        try
        {
            var found = new List<AdminJumpDto>();
            foreach (var table in AdminCatalog.Tables.Where(t => !t.Private && AdminRights.CanRead(request.Staff, t)))
            {
                // One query at a time: a DbContext runs one query at a time.
                var rows = await table.MatchAsync(db, text, Most - found.Count, cancellationToken);
                found.AddRange(rows.Select(r => new AdminJumpDto(table.Key, table.Label, table.Singular, r.Id, r.Name)));
                if (found.Count >= Most)
                {
                    break;
                }
            }

            return found;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new UnavailableException("JB-ADM-503", "We couldn't search the tables.", exception);
        }
    }
}
