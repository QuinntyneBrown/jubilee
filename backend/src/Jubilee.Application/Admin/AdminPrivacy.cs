using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Admin;

/// <summary>
/// The records the admin application guards beyond the role's rights (L2-284 AC3, AC4): a message or a message
/// attachment opens only while its conversation has an open report, and the read is audited with the report as its
/// reason; nobody changes their own listing or acts on its reports (L2-098 AC5).
/// </summary>
public static class AdminPrivacy
{
    public const string ReadAction = "messages.read";

    public const string PrivateCode = "PRIVATE";

    public const string OwnListingCode = "OWN_LISTING";

    /// <summary>Whether the table holds what members wrote to each other: Messages and Message attachments.</summary>
    public static bool IsMessages(AdminTable table) => table.Key is "messages" or "message-attachments";

    /// <summary>
    /// Writes the read of a message to the audit log, with the open report of its conversation as the reason, and
    /// saves it; refuses with 403 <c>PRIVATE</c> while the conversation has no open report (L2-284 AC3, L2-150).
    /// </summary>
    public static async Task AuditReadAsync(
        IAppDbContext db, StaffViewer staff, AdminTable table, string id, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var conversation = await ConversationOf(db, table, id, cancellationToken);
        var report = conversation is { } conversationId
            ? await db.ConversationReports.AsNoTracking()
                .Where(r => r.ConversationId == conversationId && r.Status != ReportStatus.Resolved)
                .OrderBy(r => r.CreatedAt)
                .Select(r => (Guid?)r.Id)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        if (report is not { } reportId)
        {
            throw new ForbiddenException(
                PrivateCode, "Messages are private. One opens only while its conversation has an open report.");
        }

        db.AuditRecords.Add(AuditRecord.Make(
            staff.Subject, staff.Name, ReadAction, table.Key, id, null, null, reportId.ToString(), now));
        await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Whether the record is the staff member's own listing, or a report or report entry of it (L2-284 AC4).</summary>
    public static async Task<bool> IsOwnListingAsync(
        IAppDbContext db, StaffViewer staff, AdminTable table, string id, CancellationToken cancellationToken)
    {
        var listing = await ListingOf(db, table, id, cancellationToken);
        return listing is { } listingId
            && await db.Listings.AsNoTracking().AnyAsync(l => l.Id == listingId && l.OwnerId == staff.Subject, cancellationToken);
    }

    /// <summary>Refuses with 403 <c>OWN_LISTING</c> a change of the staff member's own listing or of its reports (L2-284 AC4).</summary>
    public static async Task EnsureNotOwnAsync(
        IAppDbContext db, StaffViewer staff, AdminTable table, string id, CancellationToken cancellationToken)
    {
        if (await IsOwnListingAsync(db, staff, table, id, cancellationToken))
        {
            throw new ForbiddenException(
                OwnListingCode, "This is your own listing. Another member of the Jubilee team handles it and its reports.");
        }
    }

    private static async Task<Guid?> ConversationOf(IAppDbContext db, AdminTable table, string id, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var guid))
        {
            return null;
        }

        return table.Key == "messages"
            ? await db.Messages.AsNoTracking().Where(m => m.Id == guid).Select(m => (Guid?)m.ConversationId).SingleOrDefaultAsync(cancellationToken)
            : await db.MessageAttachments.AsNoTracking().Where(a => a.Id == guid).Select(a => (Guid?)a.ConversationId).SingleOrDefaultAsync(cancellationToken);
    }

    private static async Task<Guid?> ListingOf(IAppDbContext db, AdminTable table, string id, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var guid))
        {
            return null;
        }

        return table.Key switch
        {
            "listings" => guid,
            "listing-reports" => await db.ListingReports.AsNoTracking()
                .Where(r => r.Id == guid).Select(r => (Guid?)r.ListingId).SingleOrDefaultAsync(cancellationToken),
            "listing-report-entries" => await db.ListingReportEntries.AsNoTracking()
                .Where(e => e.Id == guid)
                .Join(db.ListingReports, e => e.ReportId, r => r.Id, (e, r) => (Guid?)r.ListingId)
                .SingleOrDefaultAsync(cancellationToken),
            _ => null,
        };
    }
}
