# 0020. Verification decisions

Status: superseded by [0057](0057-ship-without-verification.md), 12 November 2026: Jubilee ships without verification. Before that: accepted; "Who is on the team" and the deferral of L2-098 AC2 superseded by [0040](0040-separate-admin-application.md). Amended by ADR 0041, 12 November 2026: the church reference is removed. The stages `waiting-on-reference` and `needs-a-decision` are gone, the checklist has three items, the change area `reference` is gone, a resubmitted listing always returns to Ready to review, a decline is made from Ready to review, and the reference privacy and retention rules (`reference.viewed`, `ReferenceRetentionJob`) have nothing left to act on. `Listing.ReferenceConfirmedOn` is dropped; `Listing.ApprovedAt` says when a listing was verified. The rest stands.

## Context

The verification team reviews submitted listings (L2-098 to L2-104), reads the church reference's private answer (L2-146), and every decision is audited (L2-180). The designs left several values open: the route and copy of the decline dialog, the length limits, the purge schedule, the holiday list for "overdue", and how the team is identified.

## Decision

- **Who is on the team.** Roles come from the identity claims, not from a table the application edits. A `role` claim of `verifier` opens the queue, the review and the three decisions; `admin` also reads the audit log. The session answers `isVerifier`, and the navigation summary answers `isVerifier` and `verificationCount` (listings Ready to review), which the top bar and the phone tab bar show. A signed-in member without the role gets 403 with code `FORBIDDEN` (`ForbiddenException`); the Angular `verifierGuard` sends them to `/forbidden`, and a visitor to sign in.
- **Failed authorization is a security event.** Each 403 logs a warning `Failed authorization` with the actor, address, method and path (L2-143 AC1).
- **A verifier never decides on their own listing** (L2-098 AC5): 403 `OWN_LISTING`; the review says so and offers no decision.
- **Endpoints.** `GET /api/admin/verifications?stage=&q=` (the queue, 503 with `JB-ADM-503`), `GET .../{id}` (the review, 503 with `JB-ADM-502`), `PUT .../{id}/checklist`, `POST .../{id}/approve|request-changes|decline`, `GET /api/admin/audit` (admin only), and for the owner `GET /api/listings/{id}/verification` and `POST .../resubmit`. Request records refuse unknown fields (400).
- **Stages.** `ListingStage.Declined` is new. The wire names are `waiting-on-reference`, `ready-to-review`, `needs-a-decision`, `changes-requested`, `live` and `declined`. A vouching answer moves a listing to Ready to review and stamps `ReadyAt`.
- **Overdue** means a listing has been Ready to review for more than 2 business days, counted from `ReadyAt`, in the Toronto week without Saturdays and Sundays. A holiday list is deferred; it only makes the flag later, never earlier.
- **Checklist.** Five items: owner name matches the reference, reference confirmed, tagline and description honest, at least one photo, category fits. Ticks are saved as they are made with the reviewer and the time. Approving with an unticked item needs a note (422 `note: NOTE_REQUIRED`); a complete checklist needs none. The dialog shows the note field only when items are unticked (mock `approve-listing/note-required`).
- **Decisions.** Approve needs Ready to review (409 `WAITING_ON_REFERENCE`, `WAITING_ON_OWNER`, `ALREADY_DECIDED`) and makes the listing Live and Verified. Request changes needs at least one area (`tagline`, `photos`, `category`, `reference`) and a message of at most 2000 characters (422 `areas: AREA_REQUIRED`, `message: MESSAGE_REQUIRED|MESSAGE_TOO_LONG`). Decline is only for Needs a decision (409 `NOT_NEEDS_DECISION`) and needs a reason (422 `REASON_REQUIRED`); the dialog has its own mock, `decline-listing`, with the copy "Decline {business}?". A second decision on the same listing is 409 `ALREADY_DECIDED`. Every decision e-mails the owner by the outbox.
- **Resubmit.** The owner resubmits a listing with changes requested, optionally editing name, tagline (90 characters), category and about. The listing returns to Ready to review keeping its original submission date, and the review lists what changed since the request. If "reference" was named, a new reference link is issued and the listing returns to Pending reference.
- **Privacy.** The owner's endpoints never carry the reference's answer, name, role or note (L2-146). Reading an answer writes an audit record `reference.viewed` whose reason is "Review of listing {id}" (L2-150 AC1).
- **Retention.** `ReferenceRetentionJob` runs daily and, 90 days after an approval or a decline, deletes the answers, scrubs the reference e-mail from the links and the submission, and stamps `ReferenceDeletedAt` on the decision. What remains is the month of confirmation (`Listing.ReferenceConfirmedOn`). A listing that was only sent back for changes keeps its answer.
- **Audit log.** `AuditRecord` rows are only ever added: actor, actor name, action, target, before, after, reason and time. The application has no update or delete route for them. Admins search by actor, target and date range (L2-180).
- **Limits.** The message is limited to 2000 characters. The approval note and the decline reason are not limited yet.

## Deferred

- L2-098 AC2: the second factor (TOTP or passkey) after sign-in, and the enrolment of the credential. The sign-in itself is journey 18's neighbour in accounts and is not built.
- L2-098 AC4: tooling to grant and change roles (`MemberRolesPage`). Roles come from claims; the audit log exists for the day the tool does.
- The in-app notification to the owner and the banners and editor on My business (journeys 15 and 17); the e-mail is sent now, and `resubmit` takes optional edits as the seam.
- L2-143 security events other than failed authorization.
- L2-150 AC2 and AC3, which are not application code.
- Reports and featured businesses (journey 25).
- The holiday list for "overdue".

## Consequences

Journey 15 builds My business on `GET /api/listings/{id}/verification`. Journey 25 reuses `ForbiddenException`, the verifier filter, the audit writer and the queue's tab pattern.
