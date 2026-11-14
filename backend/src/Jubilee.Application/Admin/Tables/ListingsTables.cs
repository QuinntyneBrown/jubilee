using Jubilee.Domain;
using DF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ListingDraft>;
using DMF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.DeliveryMethod>;
using FSF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.FeaturedSlot>;
using LF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.Listing>;
using LPF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ListingPhoto>;
using LSF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ListingSlug>;
using LVF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ListingView>;
using PF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.Product>;
using PPF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ProductPhoto>;
using RTF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ResponseTimeStat>;
using SAF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.StockAlert>;
using SF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.Service>;
using SUF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ListingSubmission>;

namespace Jubilee.Application.Admin.Tables;

/// <summary>The Listings group (L2-276 AC1). Listing statuses are Jubilee's own (ADR 0057): draft, live, paused, on hold, taken down.</summary>
internal static class ListingsTables
{
    public const string Group = "Listings";

    private static readonly (ListingKind, string)[] Kinds =
        [(ListingKind.Services, "services"), (ListingKind.Shop, "shop"), (ListingKind.Space, "space"), (ListingKind.Platform, "platform")];

    public static IEnumerable<AdminTable> All() =>
    [
        new AdminTable<Listing>(
            "listings", "Listings", "Listing", Group,
            "Every shop, service and space on Jubilee. Unpublishing hides it from Browse immediately.",
            db => db.Listings, l => l.Id,
            [
                LF.Id(l => l.Id),
                LF.Text("name", "Name", l => l.Name),
                LF.Status("kind", "Kind", l => l.Kind, Kinds),
                LF.Status(
                    "status", "Status",
                    ("deleted", l => l.DeletedAt != null),
                    ("taken down", l => l.TakenDownAt != null),
                    ("on hold", l => l.IsUnderModerationHold),
                    ("paused", l => l.IsPaused),
                    ("live", l => l.Stage == ListingStage.Live),
                    ("draft", l => true)),
                LF.RefText("ownerId", "Owner", "members", l => l.OwnerId),
                LF.Text("category", "Category", l => l.CategorySlug, AdminFieldType.Mono),
                // A space's neighbourhood, else where a business meets (L2-099 AC1).
                LF.Text("neighbourhood", "Neighbourhood", l => l.Space != null ? l.Space.Neighbourhood : l.MeetingArea),
                LF.When("publishedAt", "Published", l => l.PublishedAt),
                LF.Text("slug", "Slug", l => l.Slug, AdminFieldType.Mono),
                LF.Text("tagline", "Tagline", l => l.Tagline, AdminFieldType.Long),
                LF.Text("website", "Website", l => l.Website, AdminFieldType.Url),
                LF.When("takenDownAt", "Taken down", l => l.TakenDownAt),
                LF.Text("takedownReason", "Takedown reason", l => l.TakedownReason, AdminFieldType.Long, searchable: false),
                LF.When("createdAt", "Created", l => l.CreatedAt, system: true),
            ],
            columns: 7, nameFields: ["name"])
        {
            Empty = "A listing appears here as soon as its owner publishes it.",
        },

        new AdminTable<ListingDraft>(
            "listing-drafts", "Listing drafts", "Listing draft", Group,
            "Listings started but not yet published, saved as the owner types.",
            db => db.ListingDrafts, d => d.Id,
            [
                DF.Id(d => d.Id),
                DF.RefText("ownerId", "Owner", "members", d => d.OwnerSubject),
                DF.Text("name", "Name", d => d.Name),
                DF.Status("kind", "Kind", d => d.Kind, Kinds),
                DF.Text("category", "Category", d => d.CategorySlug, AdminFieldType.Mono),
                DF.Bool("agreed", "Agreed to the statement", d => d.Agreed),
                DF.When("updatedAt", "Updated", d => d.UpdatedAt, system: true),
                DF.When("createdAt", "Created", d => d.CreatedAt, system: true),
            ],
            nameFields: ["name"]),

        new AdminTable<ListingSubmission>(
            "listing-submissions", "Listing submissions", "Listing submission", Group,
            "Each time an owner published a listing, with the statement they agreed to. Nothing waits for review (ADR 0057).",
            db => db.ListingSubmissions, s => s.Id,
            [
                SUF.Id(s => s.Id),
                SUF.Ref("listingId", "Listing", "listings", s => s.ListingId),
                SUF.RefText("submittedBy", "Owner", "members", s => s.OwnerSubject),
                SUF.Text("statementVersion", "Statement version", s => s.StatementVersion, AdminFieldType.Mono),
                SUF.When("agreedAt", "Agreed", s => s.AgreedAt),
                SUF.When("submittedAt", "Published", s => s.SubmittedAt, system: true),
            ]),

        new AdminTable<ListingSlug>(
            "listing-slugs", "Listing slugs", "Listing slug", Group,
            "Earlier addresses of listings. Each still leads to the listing's current address.",
            db => db.ListingSlugs, s => s.Slug, Exact<ListingSlug>(s => s.Slug),
            [
                LSF.TextId(s => s.Slug),
                LSF.Ref("listingId", "Listing", "listings", s => s.ListingId),
                LSF.When("retiredAt", "Retired", s => s.RetiredAt, system: true),
            ]),

        new AdminTable<ListingPhoto>(
            "listing-photos", "Listing photos", "Listing photo", Group,
            "Photos on listings, in display order.",
            db => db.ListingPhotos, p => p.Id,
            [
                LPF.Id(p => p.Id),
                LPF.Ref("listingId", "Listing", "listings", p => p.ListingId),
                LPF.Number("position", "Position", p => p.Position),
                LPF.Text("altText", "Alt text", p => p.Alt),
                LPF.Number("width", "Width", p => p.Width),
                LPF.Number("height", "Height", p => p.Height),
                LPF.Text("key", "Storage key", p => p.Key, AdminFieldType.Mono),
                LPF.When("createdAt", "Added", p => p.AddedAt, system: true),
            ])
        { Deletable = true },

        new AdminTable<ListingView>(
            "listing-views", "Listing views", "Listing view", Group,
            "Visits to listing pages, one row per visit.",
            db => db.ListingViews, v => v.Id,
            [
                LVF.Id(v => v.Id),
                LVF.Ref("listingId", "Listing", "listings", v => v.ListingId),
                LVF.Text("visitor", "Visitor", v => v.VisitorKey, AdminFieldType.Mono),
                LVF.When("occurredAt", "Viewed", v => v.ViewedAt, system: true),
            ]),

        new AdminTable<Product>(
            "products", "Products", "Product", Group,
            "Things shops sell. Price and stock are what the listing page shows.",
            db => db.Products, p => p.Id,
            [
                PF.Id(p => p.Id),
                PF.Text("name", "Name", p => p.Name),
                PF.Ref("listingId", "Listing", "listings", p => p.ListingId),
                PF.Money("price", "Price", p => p.PriceCents),
                PF.Number("stock", "Stock", p => p.Stock),
                PF.Status("status", "Status", ("deleted", p => p.IsDeleted), ("out of stock", p => p.Stock == 0), ("active", p => true)),
                PF.Text("slug", "Slug", p => p.Slug, AdminFieldType.Mono),
                PF.Text("description", "Description", p => p.Description, AdminFieldType.Long, searchable: false),
                PF.When("createdAt", "Created", p => p.CreatedAt, system: true),
            ],
            nameFields: ["name"]),

        new AdminTable<ProductPhoto>(
            "product-photos", "Product photos", "Product photo", Group,
            "Photos uploaded for products.",
            db => db.ProductPhotos, p => p.Id,
            [
                PPF.Id(p => p.Id),
                PPF.Ref("listingId", "Listing", "listings", p => p.ListingId),
                PPF.Number("width", "Width", p => p.Width),
                PPF.Number("height", "Height", p => p.Height),
                PPF.Text("key", "Storage key", p => p.Key, AdminFieldType.Mono),
                PPF.When("createdAt", "Uploaded", p => p.UploadedAt, system: true),
            ])
        { Deletable = true },

        new AdminTable<Service>(
            "services", "Services", "Service", Group,
            "What service listings offer, with how each is priced.",
            db => db.Services, s => s.Id,
            [
                SF.Id(s => s.Id),
                SF.Text("name", "Name", s => s.Name),
                SF.Ref("listingId", "Listing", "listings", s => s.ListingId),
                SF.Status(
                    "price", "Price", s => s.PriceKind,
                    (ServicePriceKind.Free, "free"), (ServicePriceKind.Amount, "amount"), (ServicePriceKind.Ask, "ask")),
                SF.Money("amount", "Amount", s => s.PriceCents),
                SF.Number("durationMin", "Duration (min)", s => s.DurationMinutes),
                SF.Text("detail", "Detail", s => s.Detail, AdminFieldType.Long, searchable: false),
            ],
            nameFields: ["name"]),

        new AdminTable<DeliveryMethod>(
            "delivery-methods", "Delivery methods", "Delivery method", Group,
            "How a shop gets things to buyers: shipping or pickup.",
            db => db.DeliveryMethods, d => d.Id,
            [
                DMF.Id(d => d.Id),
                DMF.Ref("listingId", "Listing", "listings", d => d.ListingId),
                DMF.Status("method", "Method", d => d.Kind, (DeliveryKind.Ship, "shipping"), (DeliveryKind.Pickup, "pickup")),
                DMF.Text("label", "Label", d => d.Label),
                DMF.Money("fee", "Fee", d => d.FeeCents),
                DMF.Text("estimate", "Estimate", d => d.Estimate),
            ],
            nameFields: ["label"]),

        new AdminTable<StockAlert>(
            "stock-alerts", "Stock alerts", "Stock alert", Group,
            "Members waiting for a product to come back. Sent once when it is in stock again.",
            db => db.StockAlerts, a => a.Id,
            [
                SAF.Id(a => a.Id),
                SAF.Ref("productId", "Product", "products", a => a.ProductId),
                SAF.RefText("memberId", "Member", "members", a => a.MemberSubject),
                SAF.Status("status", "Status", ("sent", a => a.NotifiedAt != null), ("waiting", a => true)),
                SAF.When("notifiedAt", "Sent", a => a.NotifiedAt),
                SAF.When("createdAt", "Requested", a => a.RequestedAt, system: true),
            ])
        { Deletable = true },

        new AdminTable<FeaturedSlot>(
            "featured-slots", "Featured slots", "Featured slot", Group,
            "The businesses \"Featured this week\" on the home page, by week and position.",
            db => db.FeaturedSlots, s => s.Id,
            [
                FSF.Id(s => s.Id),
                FSF.Ref("listingId", "Listing", "listings", s => s.ListingId),
                FSF.Number("position", "Position", s => s.Position),
                FSF.Day("startsOn", "Week of", s => s.StartsOn),
            ],
            defaultSort: "startsOn")
        { Deletable = true },

        new AdminTable<ResponseTimeStat>(
            "response-time-stats", "Response time stats", "Response time stat", Group,
            "How fast each listing answers requests. Recomputed by the worker.",
            db => db.ResponseTimeStats, s => s.ListingId,
            [
                RTF.Id(s => s.ListingId),
                RTF.Ref("listingId", "Listing", "listings", s => s.ListingId),
                RTF.Number("responses", "Responses", s => s.ResponseCount),
                RTF.Bool("repliesFast", "Replies fast", s => s.RepliesFast),
                RTF.When("computedAt", "Computed", s => s.ComputedAt, system: true),
            ]),
    ];

    /// <summary>An ID that is the text of a column.</summary>
    internal static Func<string, System.Linq.Expressions.Expression<Func<T, bool>>?> Exact<T>(System.Linq.Expressions.Expression<Func<T, string>> key)
        where T : class =>
        text => System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(
            System.Linq.Expressions.Expression.Equal(key.Body, System.Linq.Expressions.Expression.Constant(text)), key.Parameters);
}
