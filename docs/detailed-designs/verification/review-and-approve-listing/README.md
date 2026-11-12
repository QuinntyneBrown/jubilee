# Review and approve a listing

## Overview

A submitted listing becomes public only after a member of the verification team
approves it. This feature covers the review page at `/verifications/:id` in the admin application
(`admin/run-admin-application`)
and the "Approve and publish" decision. The other two decisions, requesting
changes and declining, belong to the `request-changes` feature.

The review page gathers what a verifier reads before deciding: the listing's
name and stage, the Owner panel, any flags raised at submission, a three-item
checklist, and the preview "How members see you". The page names no third
party: the verification team decides from the listing and the Owner panel
alone. A *flag* is a mark placed on a listing at submission; the only flag is
contact details in the text, for example a tagline that contains a phone number
(`L2-072`).

Approval moves the listing to live and verified, publishes it in public lists
within 60 seconds, e-mails and notifies the owner, and writes the decision to
the audit log. A listing accepts one decision at a time: when two verifiers open
the same listing, the second decision is refused with HTTP 409.

## Description

The feature is a vertical slice from the review page to the database, with
`Jubilee Worker` carrying the side effects of approval.

- **`VerificationReviewPage`** — Angular page of the admin application at `/verifications/:id`. It
  shows the name, the line "{category} · submitted {when} · {stage}", the
  actions "Request changes" and "Approve and publish", the Owner panel (name,
  e-mail with confirmation status, member since, other listings), the flags,
  the checklist and the preview "How members see you". A failed load shows "We couldn't load
  this listing" with `JB-ADM-502` and "Back to the queue".
- **`ReviewChecklist`** — component listing the three items "Tagline and
  description are honest and clear", "At least one photo of the products or work" and
  "Category fits what they offer". It saves each tick as it changes and shows
  flags above the items.
- **`ApproveListingDialog`** — dialog titled "Approve and publish {business}?"
  with the text "It goes live in {category} straight away with the Verified
  mark, and {owner} is e-mailed." and the buttons "Not yet" and "Approve and
  publish". When a checklist item is unticked, the dialog lists the unticked
  items and requires a note. On failure it shows "We couldn't publish it. The
  listing is still in the queue. Try again."
- **`AdminVerificationsController`** — exposes
  `GET /api/admin/verifications/{id}`,
  `PUT /api/admin/verifications/{id}/checklist/{item}` and
  `POST /api/admin/verifications/{id}/approve` under `RequiresVerifier`, the staff policy (`security/authorize-staff-requests`). It
  refuses the approve command with HTTP 403 when the caller owns the listing.
- **`GetListingReviewQueryHandler`** — assembles `ListingReviewDto` from the
  listing, owner, flags and ticks. It appends an `AuditEntry`
  for the access to personal data with the listing ID as the reason.
- **`VerificationReview`** and **`ChecklistTick`** — store the checklist state
  of a listing. Each tick records the `ChecklistItem`, the reviewer and the
  time.
- **`ApproveListingCommand`** and **`ApproveListingCommandValidator`** — carry
  `ListingId`, `Note` and `ExpectedVersion`. The validator requires `Note` when
  `VerificationReview.UntickedItems()` is not empty. The note is not limited yet
  (ADR 0020).
- **`ApproveListingCommandHandler`** — loads the listing, calls
  `Listing.Approve`, appends the `AuditEntry` with verifier, time and checklist
  state, and writes a `ListingApproved` `OutboxMessage`, all in one unit of
  work.
- **`Listing.Approve`** — domain method. It accepts the stage "Ready to review",
  sets `Stage` to `Live`, `Verified` to true and `VerifiedOn` to the date, and
  records a `VerificationDecision`. A listing in "Changes requested" or one
  that already carries a decision for the current submission is refused; the
  handler maps the refusal and a stale `RowVersion` to HTTP 409.
- **`OutboxDispatcherJob`** — hosted job in `Jubilee Worker`. For
  `ListingApproved` it updates the `Search index`, invalidates the cached
  public lists, sends the approval e-mail through `IEmailSender`, and creates
  the owner's `Notification`. Indexing and invalidation complete within
  60 seconds of the decision.
- **`EventsHub`** — pushes `verification.decided` to verifiers who have the same
  listing open. `VerificationReviewPage` then shows the decision and disables
  both actions.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-100` | `L1-014` | The system shall show one listing to review at `/verifications/:id` in the admin application with the Owner panel, submission flags, a three-item checklist whose ticks are saved with the reviewer and time, and the preview "How members see you". The page shall name no third party. The system shall not offer a decision while the listing is in "Changes requested" and shall refuse a second decision on the same listing with HTTP 409. |
| `L2-101` | `L1-014` | The system shall confirm approval in a dialog, shall require a note when a checklist item is unticked, and on confirmation shall make the listing live and verified, show it in public lists within 60 seconds, and e-mail and notify the owner. The decision shall be written to the audit log with the verifier, time and checklist state. |
| `L2-098` | `L1-014` | A verifier who owns a listing shall not approve or request changes on it, and every admin API shall return HTTP 403 to a member without the `verifier` role. |
| `L2-150` | `L1-020` | The system shall record in the audit log each staff view of a member's personal data, with the reason (report ID or listing ID). |
| `L2-180` | `L1-025` | The system shall store an append-only audit record with actor, action, target, time, before and after values, and reason for each verification decision. |

## Diagrams

### System context

The verification team member reviews and approves in Jubilee. Jubilee notifies
the owner in the product and through the e-mail provider, and members then find
the listing in public lists.

![C4 system context for reviewing and approving a listing](diagrams/c4-context.png)

### Containers

`Jubilee API` commits the decision to the `Jubilee database`. `Jubilee Worker`
reads the outbox and updates the `Search index`, the `Cache` and the e-mail
provider.

![C4 container view for reviewing and approving a listing](diagrams/c4-container.png)

### Components

`VerificationReviewPage` hosts `ReviewChecklist` and opens
`ApproveListingDialog`. The controller sends one query and two commands; the
approval handler mutates `Listing`, and `OutboxDispatcherJob` publishes the
decision through `EventsHub`.

![C4 component view for reviewing and approving a listing](diagrams/c4-component.png)

### Class structure

`Listing` composes its `VerificationReview`, `ListingFlag` and
`VerificationDecision` records. `ApproveListingCommandHandler` loads the
listing and reads the ticks to snapshot the checklist.

![Class diagram for reviewing and approving a listing](diagrams/class-structure.png)

### Behaviour — review a listing

The query handler audits the access before the page shows the panels. Each tick
is saved with its reviewer and time.

![Sequence diagram for reviewing a listing](diagrams/sequence-review-listing.png)

### Behaviour — approve and publish

The handler refuses a second decision with HTTP 409, otherwise commits the
approval, audit entry and outbox message together. `OutboxDispatcherJob` then
publishes the listing and tells the owner.

![Sequence diagram for approving and publishing a listing](diagrams/sequence-approve-and-publish.png)
