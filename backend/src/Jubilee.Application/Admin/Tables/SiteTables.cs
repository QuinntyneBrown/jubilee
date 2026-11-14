using System.Globalization;
using System.Linq.Expressions;
using Jubilee.Domain;
using ARF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.AuditRecord>;
using AXF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.AccessRequest>;
using BPF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.BusinessPreRegistration>;
using CVF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ContentVersion>;
using JRF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.JobRun>;
using LSF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.LaunchSubscriber>;
using MLF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.MerchOrderLine>;
using MOF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.MerchOrder>;
using MPF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.MerchProduct>;
using MVF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.MerchVariant>;
using MWF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.MaintenanceWindow>;
using OF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.OutboxMessage>;

namespace Jubilee.Application.Admin.Tables;

/// <summary>
/// The groups Merch, Launch, Site &amp; content and System (L2-276 AC1). System is written by Jubilee itself and is
/// read-only to everyone (L2-284 AC2). An outbox message's body holds links and tokens and is never a field.
/// </summary>
internal static class SiteTables
{
    public const string Merch = "Merch";
    public const string Launch = "Launch";
    public const string Content = "Site & content";

    /// <summary>A job run that has not succeeded an hour after it was claimed did not finish (L2-275 AC1).</summary>
    public static readonly TimeSpan JobGivesUpAfter = TimeSpan.FromHours(1);

    private static readonly (MerchFit, string)[] Fits = [(MerchFit.Youth, "youth"), (MerchFit.Womens, "women's"), (MerchFit.Mens, "men's")];

    public static IEnumerable<AdminTable> All() =>
    [
        new AdminTable<MerchProduct>(
            "merch-products", "Merch products", "Merch product", Merch,
            "Jubilee's own merchandise, the Purpose Tee, sold in the app.",
            db => db.MerchProducts, p => p.Id,
            [
                MPF.Id(p => p.Id),
                MPF.Text("name", "Name", p => p.Name),
                MPF.Text("slug", "Slug", p => p.Slug, AdminFieldType.Mono),
                MPF.Text("colour", "Colour", p => p.Colour),
                MPF.Money("price", "Price", p => p.UnitPriceCents),
                MPF.Money("shipping", "Shipping", p => p.ShippingCents),
                MPF.When("createdAt", "Created", p => p.CreatedAt, system: true),
            ],
            nameFields: ["name"]),

        new AdminTable<MerchVariant>(
            "merch-variants", "Merch variants", "Merch variant", Merch,
            "Each fit and size, with its own stock.",
            db => db.MerchVariants, v => v.Id,
            [
                MVF.Id(v => v.Id),
                MVF.Ref("productId", "Product", "merch-products", v => v.ProductId),
                MVF.Text("sku", "SKU", v => v.Sku, AdminFieldType.Mono),
                MVF.Status("fit", "Fit", v => v.Fit, Fits),
                MVF.Text("size", "Size", v => v.Size),
                MVF.Number("stock", "Stock", v => v.Stock),
            ],
            nameFields: ["sku"]),

        new AdminTable<MerchOrder>(
            "merch-orders", "Merch orders", "Merch order", Merch,
            "Orders of the Purpose Tee, paid on Stripe's hosted checkout.",
            db => db.MerchOrders, o => o.Id,
            [
                MOF.Id(o => o.Id),
                MOF.Text("number", "Number", o => o.Number, AdminFieldType.Mono),
                MOF.Text("customerEmail", "Customer email", o => o.BuyerEmail, AdminFieldType.Email),
                MOF.Status("status", "Status", o => o.Status, (MerchOrderStatus.Pending, "pending"), (MerchOrderStatus.Paid, "paid"), (MerchOrderStatus.Expired, "expired")),
                MOF.Money("total", "Total", o => o.TotalCents),
                MOF.Status("delivery", "Delivery", o => o.Delivery, (MerchDelivery.Ship, "shipping"), (MerchDelivery.Pickup, "pickup")),
                MOF.When("createdAt", "Created", o => o.CreatedAt, system: true),
                MOF.Text("name", "Customer", o => o.BuyerName),
                MOF.When("paidAt", "Paid", o => o.PaidAt),
                MOF.Text("shipTo", "Ship to", o => o.ShippingAddress, AdminFieldType.Long, searchable: false),
            ],
            nameFields: ["name", "customerEmail", "number"]),

        new AdminTable<MerchOrderLine>(
            "merch-order-lines", "Merch order lines", "Merch order line", Merch,
            "Each variant and quantity on a merch order.",
            db => db.MerchOrderLines, l => l.Id,
            [
                MLF.Id(l => l.Id),
                MLF.Ref("orderId", "Order", "merch-orders", l => l.OrderId),
                MLF.Ref("variantId", "Variant", "merch-variants", l => l.VariantId),
                MLF.Number("quantity", "Quantity", l => l.Quantity),
                MLF.Money("unitPrice", "Unit price", l => l.UnitPriceCents),
                MLF.Money("lineTotal", "Line total", l => l.UnitPriceCents * l.Quantity),
            ]),

        new AdminTable<LaunchSubscriber>(
            "launch-subscribers", "Launch subscribers", "Launch subscriber", Launch,
            "People who left an e-mail address on the launching-soon page to hear when Jubilee opens.",
            db => db.LaunchSubscribers, s => s.Id,
            [
                LSF.Id(s => s.Id),
                LSF.Text("email", "Email", s => s.Email, AdminFieldType.Email),
                LSF.Text("name", "First name", s => s.FirstName),
                LSF.When("consentedAt", "Consented", s => s.ConsentedAt),
                LSF.When("createdAt", "Created", s => s.CreatedAt, system: true),
            ],
            nameFields: ["name", "email"])
        { Deletable = true },

        new AdminTable<BusinessPreRegistration>(
            "business-pre-registrations", "Business pre-registrations", "Business pre-registration", Launch,
            "Businesses that sent their details before launch to be listed on launch day.",
            db => db.BusinessPreRegistrations, b => b.Id,
            [
                BPF.Id(b => b.Id),
                BPF.Text("businessName", "Business", b => b.BusinessName),
                BPF.Text("contactName", "Contact", b => b.ContactName),
                BPF.Text("email", "Email", b => b.Email, AdminFieldType.Email),
                BPF.Text("category", "Category", b => b.CategorySlug, AdminFieldType.Mono),
                BPF.Text("area", "Area", b => b.Area),
                BPF.When("createdAt", "Sent", b => b.CreatedAt, system: true),
                BPF.Text("phone", "Phone", b => b.Phone),
                BPF.Text("website", "Website", b => b.Website, AdminFieldType.Url),
                BPF.Text("description", "Description", b => b.Description, AdminFieldType.Long, searchable: false),
            ],
            nameFields: ["businessName"])
        { Deletable = true },

        new AdminTable<AccessRequest>(
            "access-requests", "Access requests", "Access request", Launch,
            "Members asking for a screen they may not open. Each was e-mailed to the Jubilee team.",
            db => db.AccessRequests, a => a.Id,
            [
                AXF.Id(a => a.Id),
                AXF.RefText("memberId", "Member", "members", a => a.MemberSubject),
                AXF.Text("url", "Address", a => a.Url, AdminFieldType.Mono),
                AXF.When("createdAt", "Asked", a => a.CreatedAt, system: true),
            ]),

        new AdminTable<ContentVersion>(
            "content-versions", "Content versions", "Content version", Content,
            "Published versions of the statement of faith, terms, privacy notice and help. A new version is published from its record.",
            db => db.ContentVersions, v => v.Id,
            [
                CVF.Id(v => v.Id),
                CVF.Text("page", "Page", v => v.Slug, AdminFieldType.Mono),
                CVF.Number("version", "Version", v => v.Number),
                CVF.Text("title", "Title", v => v.Title),
                CVF.Text("publishedBy", "Published by", v => v.PublishedBy),
                CVF.When("publishedAt", "Published", v => v.PublishedAt, system: true),
                CVF.Text("lead", "Lead", v => v.Lead, AdminFieldType.Long, searchable: false),
                CVF.Text("body", "Sections", v => v.SectionsJson, AdminFieldType.Json, searchable: false),
            ],
            nameFields: ["title"]),

        new AdminTable<MaintenanceWindow>(
            "maintenance-windows", "Maintenance windows", "Maintenance window", Content,
            "Times Jubilee was in maintenance. Members see the maintenance page while one is live.",
            db => db.MaintenanceWindows, w => w.Id,
            [
                MWF.Id(w => w.Id),
                MWF.Status("status", "Status", ("completed", w => w.EndedAt != null), ("live", w => true)),
                MWF.When("startsAt", "Started", w => w.StartedAt),
                MWF.When("backBy", "Back by", w => w.BackBy),
                MWF.When("endsAt", "Ended", w => w.EndedAt),
            ],
            defaultSort: "startsAt")
        { Deletable = true },

        new AdminTable<AuditRecord>(
            "audit-records", "Audit records", "Audit record", AdminRights.System,
            "Every sensitive change and every staff read of private data. Jubilee writes these itself; they are never changed.",
            db => db.AuditRecords, a => a.Id,
            [
                ARF.Id(a => a.Id),
                ARF.Text("actor", "Actor", a => a.ActorName),
                ARF.Text("action", "Action", a => a.Action, AdminFieldType.Mono),
                ARF.Text("entity", "Table", a => a.TargetType),
                ARF.Text("recordId", "Record", a => a.TargetId, AdminFieldType.Mono),
                ARF.When("occurredAt", "Occurred", a => a.At, system: true),
                ARF.Text("actorId", "Actor ID", a => a.Actor, AdminFieldType.Mono),
                ARF.Text("before", "Before", a => a.Before, AdminFieldType.Json, searchable: false),
                ARF.Text("after", "After", a => a.After, AdminFieldType.Json, searchable: false),
                ARF.Text("reason", "Reason", a => a.Reason, AdminFieldType.Long),
            ],
            nameFields: ["action"]),

        new AdminTable<OutboxMessage>(
            "outbox-messages", "Outbox messages", "Outbox message", AdminRights.System,
            "E-mails waiting to be sent, retried with back-off for 24 hours. Their text is never shown.",
            db => db.OutboxMessages, m => m.Id,
            [
                OF.Id(m => m.Id),
                OF.Text("topic", "Subject", m => m.Subject),
                OF.Status(
                    "status", "Status",
                    ("sent", m => m.SentAt != null),
                    ("gave up", m => m.FailedAt != null),
                    ("held", m => m.HeldForSummary),
                    ("retrying", m => m.Attempts > 0),
                    ("queued", m => true)),
                OF.Number("attempts", "Attempts", m => m.Attempts),
                OF.Text("to", "To", m => m.ToAddress, AdminFieldType.Email),
                OF.When("nextAttemptAt", "Next attempt", m => m.NextAttemptAt),
                OF.When("createdAt", "Created", m => m.CreatedAt, system: true),
                OF.Text("category", "Category", m => m.Category, AdminFieldType.Mono),
            ],
            nameFields: ["topic"]),

        new AdminTable<JobRun>(
            "job-runs", "Job runs", "Job run", AdminRights.System,
            "Scheduled jobs: each run that was claimed, and whether it succeeded.",
            db => db.JobRuns,
            JobRunId,
            MatchJobRun,
            [
                JRF.Text("job", "Job", r => r.Job, AdminFieldType.Mono),
                JRF.Status(
                    "status", "Status",
                    ("succeeded", r => r.SucceededAt != null),
                    ("failed", r => r.ClaimedAt < DateTimeOffset.UtcNow - JobGivesUpAfter),
                    ("running", r => true)),
                JRF.When("occurrence", "Due", r => r.Occurrence),
                JRF.When("succeededAt", "Succeeded", r => r.SucceededAt),
                JRF.When("startedAt", "Started", r => r.ClaimedAt, system: true),
            ],
            nameFields: ["job"]),
    ];

    /// <summary>A job run's ID: its job and occurrence, which are its key.</summary>
    public static string JobRunId(JobRun run) =>
        $"{run.Job}@{run.Occurrence.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)}";

    private static Expression<Func<JobRun, bool>>? MatchJobRun(string id)
    {
        var at = id.LastIndexOf('@');
        if (at <= 0 || !DateTimeOffset.TryParse(id[(at + 1)..], CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var occurrence))
        {
            return null;
        }

        var job = id[..at];
        return r => r.Job == job && r.Occurrence == occurrence;
    }
}
