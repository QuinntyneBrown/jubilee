using Jubilee.Domain;
using CF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.ConsentRecord>;
using DF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.DataExport>;
using FF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.SignInFailure>;
using LF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.LinkToken>;
using MF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.Member>;
using PF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.PasswordResetRequest>;
using SAF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.StatementAgreement>;
using SEF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.MemberSession>;
using SF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.StaffMember>;
using XF = Jubilee.Application.Admin.AdminFields<Jubilee.Domain.SecurityAlert>;

namespace Jubilee.Application.Admin.Tables;

/// <summary>The Accounts group (L2-276 AC1). A member's home church and every secret (hashes, tickets) are never fields.</summary>
internal static class AccountsTables
{
    public const string Group = "Accounts";

    public static IEnumerable<AdminTable> All() =>
    [
        new AdminTable<Member>(
            "members", "Members", "Member", Group,
            "Everyone with a Jubilee account: shoppers, renters and the people behind each listing.",
            db => db.Members, m => m.Id,
            [
                MF.Id(m => m.Id),
                MF.Text("name", "Name", m => m.FirstName + " " + m.LastName),
                MF.Text("email", "Email", m => m.Email, AdminFieldType.Email),
                MF.Status(
                    "status", "Status",
                    ("deleted", m => m.DeletedAt != null),
                    ("active", m => m.EmailStatus == EmailStatus.Confirmed),
                    ("unconfirmed", m => true)),
                MF.Text("phone", "Phone", m => m.Phone),
                MF.Text("postalCode", "Postal code", m => m.PostalCode, AdminFieldType.Mono),
                MF.When("createdAt", "Created", m => m.CreatedAt, system: true),
                MF.Text("pronouns", "Pronouns", m => m.Pronouns, searchable: false),
                MF.Bool("google", "Google sign-in", m => m.GoogleSubject != null),
                MF.Bool("emailBounced", "Email bounced", m => m.EmailBounced),
                MF.Number("termsVersion", "Terms version", m => m.TermsVersionNumber),
                MF.When("agreementAcceptedAt", "Agreed to terms", m => m.AgreementAcceptedAt),
                MF.When("passwordChangedAt", "Password changed", m => m.PasswordChangedAt),
                MF.When("deletedAt", "Deleted", m => m.DeletedAt),
            ],
            columns: 7, nameFields: ["name", "email"]),

        new AdminTable<StaffMember>(
            "staff", "Staff", "Staff member", Group,
            "People who can sign in to this admin, and the role each holds. Staff accounts change only through the Jubilee CLI.",
            db => db.StaffMembers, s => s.Id,
            [
                SF.Id(s => s.Id),
                SF.Text("email", "Email", s => s.Email, AdminFieldType.Email),
                SF.Status(
                    "role", "Role",
                    ("admin and moderator", s => s.Roles == (StaffRoles.Admin | StaffRoles.Moderator)),
                    ("admin", s => s.Roles == StaffRoles.Admin),
                    ("moderator", s => s.Roles == StaffRoles.Moderator),
                    ("no role", s => true)),
                SF.Bool("signedIn", "Has signed in", s => s.ObjectId != null),
                SF.When("createdAt", "Created", s => s.CreatedAt, system: true),
            ],
            nameFields: ["email"]),

        new AdminTable<MemberSession>(
            "sessions", "Sessions", "Session", Group,
            "Signed-in devices of members and staff. An ended session signs nobody in.",
            db => db.Sessions, s => s.Id,
            [
                SEF.Id(s => s.Id),
                SEF.Ref("memberId", "Member", "members", s => s.MemberId),
                SEF.Status("kind", "Kind", s => s.Kind, (SessionKind.Member, "member"), (SessionKind.Staff, "staff")),
                SEF.Status("status", "Status", ("ended", s => s.EndedAt != null), ("active", s => true)),
                SEF.Text("device", "Device", s => s.Device),
                SEF.When("lastActivityAt", "Last active", s => s.LastActivityAt),
                SEF.Text("network", "Network", s => s.Network, AdminFieldType.Mono),
                SEF.Bool("persistent", "Kept signed in", s => s.Persistent),
                SEF.When("endedAt", "Ended", s => s.EndedAt),
                SEF.When("createdAt", "Created", s => s.CreatedAt, system: true),
            ]),

        new AdminTable<SignInFailure>(
            "sign-in-failures", "Sign-in failures", "Sign-in failure", Group,
            "Failed sign-in attempts, by account and address.",
            db => db.SignInFailures, f => f.Id,
            [
                FF.Id(f => f.Id),
                FF.Text("account", "Account", f => f.AccountKey, AdminFieldType.Email),
                FF.Text("address", "Address", f => f.Address, AdminFieldType.Mono),
                FF.When("occurredAt", "Occurred", f => f.At, system: true),
            ],
            nameFields: ["account"]),

        new AdminTable<LinkToken>(
            "link-tokens", "Link tokens", "Link token", Group,
            "One-time links sent by e-mail to confirm an address, change it or reset a password. Each works once.",
            db => db.LinkTokens, t => t.Id,
            [
                LF.Id(t => t.Id),
                LF.Ref("memberId", "Member", "members", t => t.MemberId),
                LF.Status(
                    "purpose", "Purpose", t => t.Purpose,
                    (LinkTokenPurpose.EmailConfirmation, "confirm email"),
                    (LinkTokenPurpose.PasswordReset, "reset password"),
                    (LinkTokenPurpose.ChangeEmail, "change email")),
                LF.Status(
                    "status", "Status",
                    ("used", t => t.UsedAt != null),
                    ("superseded", t => t.SupersededAt != null),
                    ("expired", t => t.ExpiresAt < DateTimeOffset.UtcNow),
                    ("pending", t => true)),
                LF.Text("targetEmail", "Sent to", t => t.TargetEmail, AdminFieldType.Email),
                LF.When("expiresAt", "Expires", t => t.ExpiresAt),
                LF.When("usedAt", "Used", t => t.UsedAt),
            ],
            nameFields: ["targetEmail"]),

        new AdminTable<PasswordResetRequest>(
            "password-resets", "Password reset requests", "Password reset request", Group,
            "Requests to reset a password, and whether the worker has handled them.",
            db => db.PasswordResetRequests, r => r.Id,
            [
                PF.Id(r => r.Id),
                PF.Text("email", "Email", r => r.EmailKey, AdminFieldType.Email),
                PF.Status("status", "Status", ("completed", r => r.ProcessedAt != null), ("pending", r => true)),
                PF.When("processedAt", "Handled", r => r.ProcessedAt),
                PF.When("createdAt", "Requested", r => r.RequestedAt, system: true),
            ],
            nameFields: ["email"]),

        new AdminTable<SecurityAlert>(
            "security-alerts", "Security alerts", "Security alert", Group,
            "Things that look wrong, such as many failed sign-ins, raised for the Jubilee team.",
            db => db.SecurityAlerts, a => a.Id,
            [
                XF.Id(a => a.Id),
                XF.Text("kind", "Kind", a => a.Kind),
                XF.Number("count", "Count", a => a.Count),
                XF.When("createdAt", "Raised", a => a.RaisedAt, system: true),
            ],
            nameFields: ["kind"]),

        new AdminTable<ConsentRecord>(
            "consent-records", "Consent records", "Consent record", Group,
            "What each member agreed to, and when. Kept for CASL and PIPEDA; never edited or deleted.",
            db => db.ConsentRecords, c => c.Id,
            [
                CF.Id(c => c.Id),
                CF.Ref("memberId", "Member", "members", c => c.MemberId),
                CF.Text("purpose", "Purpose", c => c.Category),
                CF.Bool("granted", "Granted", c => c.Given),
                CF.Status(
                    "source", "Source", c => c.Method,
                    (ConsentMethod.SettingsSwitch, "settings"),
                    (ConsentMethod.UnsubscribeLink, "unsubscribe link"),
                    (ConsentMethod.OneClickUnsubscribe, "one-click unsubscribe"),
                    (ConsentMethod.MarketingSiteForm, "marketing site")),
                CF.When("createdAt", "Occurred", c => c.OccurredAt, system: true),
            ])
        { Private = true },

        new AdminTable<StatementAgreement>(
            "statement-agreements", "Statement agreements", "Statement agreement", Group,
            "Owners who agreed to the Jubilee statement of faith, and which version.",
            db => db.StatementAgreements, s => s.Id,
            [
                SAF.Id(s => s.Id),
                SAF.RefText("memberId", "Member", "members", s => s.OwnerSubject),
                SAF.Text("version", "Version", s => s.Version, AdminFieldType.Mono),
                SAF.When("createdAt", "Agreed", s => s.AgreedAt, system: true),
            ]),

        new AdminTable<DataExport>(
            "data-exports", "Data exports", "Data export", Group,
            "Member requests for a copy of their data. PIPEDA gives Jubilee 30 days.",
            db => db.DataExports, d => d.Id,
            [
                DF.Id(d => d.Id),
                DF.Ref("memberId", "Member", "members", d => d.MemberId),
                DF.Status(
                    "status", "Status", d => d.Status,
                    (DataExportStatus.Requested, "processing"),
                    (DataExportStatus.Ready, "ready"),
                    (DataExportStatus.Expired, "expired"),
                    (DataExportStatus.Failed, "failed")),
                DF.Number("attempts", "Attempts", d => d.Attempts),
                DF.When("readyAt", "Ready", d => d.ReadyAt),
                DF.When("expiresAt", "Expires", d => d.ExpiresAt),
                DF.When("createdAt", "Requested", d => d.RequestedAt, system: true),
            ]),
    ];
}
