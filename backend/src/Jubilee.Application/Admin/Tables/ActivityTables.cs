using Jubilee.Domain;
using CF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.Conversation>;
using CRF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ConversationReport>;
using FF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.Feedback>;
using FSF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.FeedbackScreenshot>;
using LRE = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ListingReportEntry>;
using LRF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ListingReport>;
using MAF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.MessageAttachment>;
using MF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.Message>;
using NF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.Notification>;
using RAF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ReportAction>;
using RF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.Request>;
using RRF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ReviewReport>;
using RSF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.RecentSearch>;
using RTF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.RequestTransition>;
using RVF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.Review>;
using SIF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.SavedItem>;

namespace Jubilee.Application.Admin.Tables;

/// <summary>
/// The groups Requests &amp; messaging, Reviews, Moderation, Member activity and Feedback (L2-276 AC1). Messages and
/// their attachments are private: their rows say who wrote and when, never the text (L2-284 AC3).
/// </summary>
internal static class ActivityTables
{
    public const string Requests = "Requests & messaging";
    public const string Reviews = "Reviews";
    public const string Moderation = "Moderation";
    public const string MemberActivity = "Member activity";
    public const string FeedbackGroup = "Feedback";

    private static readonly (RequestStatus, string)[] RequestStatuses =
    [
        (RequestStatus.New, "new"), (RequestStatus.Confirmed, "confirmed"), (RequestStatus.Declined, "declined"),
        (RequestStatus.Cancelled, "cancelled"), (RequestStatus.Completed, "completed"),
    ];

    private static readonly (ReportStatus, string)[] ReportStatuses =
        [(ReportStatus.Open, "open"), (ReportStatus.InReview, "in review"), (ReportStatus.Resolved, "resolved")];

    public static IEnumerable<AdminTable> All() =>
    [
        new AdminTable<Request>(
            "requests", "Requests", "Request", Requests,
            "Bookings, quotes, orders and space enquiries from members to listings.",
            db => db.Requests, r => r.Id,
            [
                RF.Id(r => r.Id),
                RF.Status(
                    "kind", "Kind", r => r.Kind,
                    (RequestKind.Booking, "booking"), (RequestKind.Quote, "quote"), (RequestKind.Order, "order"), (RequestKind.Space, "space")),
                RF.Ref("listingId", "Listing", "listings", r => r.ListingId),
                RF.RefText("memberId", "Member", "members", r => r.MemberSubject),
                RF.Status("status", "Status", r => r.Status, RequestStatuses),
                RF.Money("total", "Total", r => r.TotalCents),
                RF.When("createdAt", "Sent", r => r.CreatedAt, system: true),
                RF.Text("memberName", "Member name", r => r.MemberName),
                RF.Text("service", "Service", r => r.ServiceName),
                RF.Day("neededBy", "Needed by", r => r.NeededBy),
                RF.Text("declineReason", "Decline reason", r => r.DeclineReason, AdminFieldType.Long, searchable: false),
            ],
            nameFields: ["memberName"]),

        new AdminTable<RequestTransition>(
            "request-transitions", "Request transitions", "Request transition", Requests,
            "Each change of a request's status and who made it.",
            db => db.RequestTransitions, t => t.Id,
            [
                RTF.Id(t => t.Id),
                RTF.Ref("requestId", "Request", "requests", t => t.RequestId),
                RTF.Status("from", "From", t => t.From, RequestStatuses),
                RTF.Status("to", "To", t => t.To, RequestStatuses),
                RTF.RefText("actorId", "By", "members", t => t.Actor),
                RTF.When("occurredAt", "Occurred", t => t.At, system: true),
            ]),

        new AdminTable<Conversation>(
            "conversations", "Conversations", "Conversation", Requests,
            "Message threads between a member and a listing.",
            db => db.Conversations, c => c.Id,
            [
                CF.Id(c => c.Id),
                CF.Ref("listingId", "Listing", "listings", c => c.ListingId),
                CF.RefText("memberId", "Member", "members", c => c.MemberSubject),
                CF.Text("memberName", "Member name", c => c.MemberName),
                CF.Bool("blocked", "Blocked by the member", c => c.BlockedByMember),
                CF.When("lastMessageAt", "Last message", c => c.LastMessageAt),
                CF.When("createdAt", "Started", c => c.CreatedAt, system: true),
            ],
            nameFields: ["memberName"]),

        new AdminTable<Message>(
            "messages", "Messages", "Message", Requests,
            "Individual messages. One opens only while its conversation has an open report, and the read is written to Audit records.",
            db => db.Messages, m => m.Id,
            [
                MF.Id(m => m.Id),
                MF.Ref("conversationId", "Conversation", "conversations", m => m.ConversationId),
                MF.RefText("senderId", "Sender", "members", m => m.SenderSubject),
                MF.Text("senderName", "Sender name", m => m.SenderName),
                MF.Bool("fromOwner", "From the owner", m => m.FromOwner),
                MF.Bool("hidden", "Hidden from the member", m => m.HiddenFromMember),
                MF.When("createdAt", "Sent", m => m.CreatedAt, system: true),
                MF.Text("body", "Message", m => m.Body, AdminFieldType.Long, searchable: false).RecordOnly(),
            ],
            nameFields: ["senderName"])
        { Private = true },

        new AdminTable<MessageAttachment>(
            "message-attachments", "Message attachments", "Message attachment", Requests,
            "Files sent in messages. One opens only while its conversation has an open report.",
            db => db.MessageAttachments, a => a.Id,
            [
                MAF.Id(a => a.Id),
                MAF.Ref("conversationId", "Conversation", "conversations", a => a.ConversationId),
                MAF.RefText("uploaderId", "Uploaded by", "members", a => a.UploaderSubject),
                MAF.Text("mimeType", "Type", a => a.ContentType, AdminFieldType.Mono),
                MAF.When("createdAt", "Sent", a => a.CreatedAt, system: true),
            ])
        { Private = true },

        new AdminTable<Review>(
            "reviews", "Reviews", "Review", Reviews,
            "Star ratings and written reviews of listings. A review taken down leaves the rating too.",
            db => db.Reviews, r => r.Id,
            [
                RVF.Id(r => r.Id),
                RVF.Ref("listingId", "Listing", "listings", r => r.ListingId),
                RVF.Text("author", "Author", r => r.AuthorName),
                RVF.Number("rating", "Rating", r => r.Rating),
                RVF.Status("status", "Status", ("taken down", r => r.TakenDownAt != null), ("published", r => true)),
                RVF.Text("item", "Item", r => r.ItemName),
                RVF.When("createdAt", "Written", r => r.CreatedAt, system: true),
                RVF.RefText("authorId", "Author account", "members", r => r.AuthorSubject),
                RVF.Text("body", "Review", r => r.Text, AdminFieldType.Long),
                RVF.Text("ownerReply", "Owner reply", r => r.ReplyText, AdminFieldType.Long, searchable: false),
                RVF.Text("takeDownReason", "Takedown reason", r => r.TakeDownReason, AdminFieldType.Long, searchable: false),
            ],
            nameFields: ["author"]),

        new AdminTable<ListingReport>(
            "listing-reports", "Listing reports", "Listing report", Moderation,
            "Listings that members reported. One report groups every entry about the same listing.",
            db => db.ListingReports, r => r.Id,
            [
                LRF.Id(r => r.Id),
                LRF.Ref("listingId", "Listing", "listings", r => r.ListingId),
                LRF.Text("reporter", "First reported by", r => r.ReporterName),
                LRF.Status("status", "Status", r => r.Status, ReportStatuses),
                LRF.When("resolvedAt", "Resolved", r => r.ResolvedAt),
                LRF.Text("resolution", "Resolution", r => r.ResolutionNote, AdminFieldType.Long, searchable: false),
                LRF.When("createdAt", "First reported", r => r.CreatedAt, system: true),
            ]),

        new AdminTable<ListingReportEntry>(
            "listing-report-entries", "Listing report entries", "Listing report entry", Moderation,
            "Each member's report of a listing, in their words.",
            db => db.ListingReportEntries, e => e.Id,
            [
                LRE.Id(e => e.Id),
                LRE.Ref("reportId", "Report", "listing-reports", e => e.ReportId),
                LRE.RefText("reporterId", "Reporter", "members", e => e.ReporterSubject),
                LRE.Status(
                    "reason", "Reason", e => e.Reason,
                    (ReportReason.NotRealBusiness, "not a real business"), (ReportReason.Misleading, "misleading"),
                    (ReportReason.BadExperience, "bad experience"), (ReportReason.Other, "other")),
                LRE.Text("details", "Details", e => e.Description, AdminFieldType.Long),
                LRE.When("createdAt", "Reported", e => e.CreatedAt, system: true),
            ]),

        new AdminTable<ReviewReport>(
            "review-reports", "Review reports", "Review report", Moderation,
            "Reviews reported as not a real dealing, abusive, private or advertising.",
            db => db.ReviewReports, r => r.Id,
            [
                RRF.Id(r => r.Id),
                RRF.Ref("reviewId", "Review", "reviews", r => r.ReviewId),
                RRF.Text("reporter", "Reporter", r => r.ReporterName),
                RRF.Status(
                    "reason", "Reason", r => r.Reason,
                    (ReviewReportReason.NotARealDealing, "not a real dealing"), (ReviewReportReason.Abusive, "abusive"),
                    (ReviewReportReason.PrivateDetails, "private details"), (ReviewReportReason.Advertising, "advertising"),
                    (ReviewReportReason.Other, "other")),
                RRF.Status("status", "Status", r => r.Status, ReportStatuses),
                RRF.Text("details", "Details", r => r.Note, AdminFieldType.Long),
                RRF.When("createdAt", "Reported", r => r.CreatedAt, system: true),
                RRF.Ref("listingId", "Listing", "listings", r => r.ListingId),
            ]),

        new AdminTable<ConversationReport>(
            "conversation-reports", "Conversation reports", "Conversation report", Moderation,
            "Members reporting a conversation for harassment, spam or a request to pay off Jubilee.",
            db => db.ConversationReports, r => r.Id,
            [
                CRF.Id(r => r.Id),
                CRF.Ref("conversationId", "Conversation", "conversations", r => r.ConversationId),
                CRF.RefText("reporterId", "Reporter", "members", r => r.ReporterSubject),
                CRF.Text("reason", "Reason", r => r.Reason),
                CRF.Status("status", "Status", r => r.Status, ReportStatuses),
                CRF.Text("resolution", "Resolution", r => r.ResolutionNote, AdminFieldType.Long, searchable: false),
                CRF.When("createdAt", "Reported", r => r.CreatedAt, system: true),
            ]),

        new AdminTable<ReportAction>(
            "report-actions", "Report actions", "Report action", Moderation,
            "What the Jubilee team did about a report, and the note it left.",
            db => db.ReportActions, a => a.Id,
            [
                RAF.Id(a => a.Id),
                RAF.Text("reportId", "Report", a => a.ReportId.ToString(), AdminFieldType.Mono, searchable: false),
                RAF.Status(
                    "action", "Action", a => a.Kind,
                    (ReportActionKind.Dismiss, "dismissed"), (ReportActionKind.MessageReporter, "messaged the reporter"),
                    (ReportActionKind.MessageOwner, "messaged the owner"), (ReportActionKind.PlaceOnHold, "placed on hold"),
                    (ReportActionKind.RemoveListing, "removed the listing"), (ReportActionKind.LiftHold, "lifted the hold"),
                    (ReportActionKind.TakeDownReview, "took the review down")),
                RAF.Text("staff", "By", a => a.ActorName),
                RAF.Text("note", "Note", a => a.ResolutionNote, AdminFieldType.Long),
                RAF.When("createdAt", "Acted", a => a.At, system: true),
            ]),

        new AdminTable<SavedItem>(
            "saved-items", "Saved items", "Saved item", MemberActivity,
            "Businesses and products members saved for later.",
            db => db.SavedItems, s => s.Id,
            [
                SIF.Id(s => s.Id),
                SIF.RefText("memberId", "Member", "members", s => s.MemberSubject),
                SIF.Status("kind", "Kind", s => s.Kind, (SavedItemKind.Business, "business"), (SavedItemKind.Product, "product")),
                SIF.Text("targetId", "Saved", s => s.TargetId.ToString(), AdminFieldType.Mono, searchable: false),
                SIF.When("createdAt", "Saved", s => s.SavedAt, system: true),
            ])
        { Deletable = true },

        new AdminTable<RecentSearch>(
            "recent-searches", "Recent searches", "Recent search", MemberActivity,
            "What members typed into search, kept to suggest it again.",
            db => db.RecentSearches, s => s.Id,
            [
                RSF.Id(s => s.Id),
                RSF.RefText("memberId", "Member", "members", s => s.MemberSubject),
                RSF.Text("query", "Query", s => s.Query),
                RSF.When("createdAt", "Searched", s => s.SearchedAt, system: true),
            ],
            nameFields: ["query"])
        { Deletable = true },

        new AdminTable<Notification>(
            "notifications", "Notifications", "Notification", MemberActivity,
            "Notifications shown to members in the app.",
            db => db.Notifications, n => n.Id,
            [
                NF.Id(n => n.Id),
                NF.RefText("memberId", "Member", "members", n => n.MemberSubject),
                NF.Text("kind", "Kind", n => n.Kind, AdminFieldType.Mono),
                NF.Text("title", "Title", n => n.Title),
                NF.Status("status", "Status", ("read", n => n.ReadAt != null), ("unread", n => true)),
                NF.When("createdAt", "Created", n => n.CreatedAt, system: true),
                NF.Text("detail", "Detail", n => n.Detail, AdminFieldType.Long, searchable: false),
                NF.Text("target", "Opens", n => n.Target, AdminFieldType.Mono, searchable: false),
                NF.When("readAt", "Read", n => n.ReadAt),
            ],
            nameFields: ["title"])
        { Deletable = true },

        new AdminTable<Feedback>(
            "feedback", "Feedback", "Feedback", FeedbackGroup,
            "Ratings, bug reports, kudos and check-ins sent from the app's feedback button.",
            db => db.Feedback, f => f.Id,
            [
                FF.Id(f => f.Id),
                FF.Status(
                    "kind", "Kind", f => f.Kind,
                    (FeedbackKind.Rating, "rating"), (FeedbackKind.BugReport, "bug"), (FeedbackKind.Kudos, "kudos"), (FeedbackKind.CheckIn, "check-in")),
                FF.RefText("memberId", "Member", "members", f => f.MemberSubject),
                FF.Number("rating", "Rating", f => f.Rating),
                FF.Status(
                    "status", "Status", f => f.Status,
                    (FeedbackStatus.Received, "new"), (FeedbackStatus.Read, "read"), (FeedbackStatus.InProgress, "in progress"), (FeedbackStatus.Fixed, "fixed"))
                    .EditWith(FeedbackEdits.Status),
                FF.Text("body", "Note", f => f.Note, AdminFieldType.Long),
                FF.When("createdAt", "Sent", f => f.CreatedAt, system: true),
                FF.Text("memberName", "Member name", f => f.MemberName),
                FF.Text("reference", "Reference", f => f.Reference, AdminFieldType.Mono),
                FF.Text("place", "Where", f => f.Place),
                FF.Text("reply", "Reply", f => f.Reply, AdminFieldType.Long, searchable: false).EditWith(FeedbackEdits.Reply),
            ],
            nameFields: ["memberName"])
        { Deletable = true },

        new AdminTable<FeedbackScreenshot>(
            "feedback-screenshots", "Feedback screenshots", "Feedback screenshot", FeedbackGroup,
            "Screenshots attached to bug reports.",
            db => db.FeedbackScreenshots, s => s.Id,
            [
                FSF.Id(s => s.Id),
                FSF.Ref("feedbackId", "Feedback", "feedback", s => s.FeedbackId),
                FSF.RefText("uploaderId", "Uploaded by", "members", s => s.UploaderSubject),
                FSF.Text("mimeType", "Type", s => s.ContentType, AdminFieldType.Mono),
                FSF.When("createdAt", "Uploaded", s => s.CreatedAt, system: true),
            ])
        { Deletable = true },
    ];
}

/// <summary>The rules of the feedback feature a staff member's change goes through (L2-283 AC1, ADR 0075).</summary>
internal static class FeedbackEdits
{
    /// <summary>Feedback is read, worked on and fixed; it never becomes new again.</summary>
    public static string? Status(Feedback feedback, string? word, AdminChange change)
    {
        switch (word)
        {
            case "read":
                feedback.MarkRead();
                return null;
            case "in progress":
                feedback.StartWork();
                return null;
            case "fixed":
                feedback.MarkFixed();
                return null;
            case "new":
                return "NOT_ALLOWED";
            default:
                return "REQUIRED";
        }
    }

    public static string? Reply(Feedback feedback, string? text, AdminChange change)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return "REQUIRED";
        }

        if (text.Trim().Length > Feedback.MaxAnswerLength)
        {
            return "TOO_LONG";
        }

        feedback.ReplyWith(text.Trim());
        return null;
    }
}
