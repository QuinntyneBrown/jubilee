# Handle reports

## Overview

Members can report a listing (`L2-039`) or a conversation (`L2-063`) privately
to the Jubilee team. This feature is the moderation side: the admin
reports list, the page for one report, and the actions a moderator can take. The
Jubilee team reviews each report within one business day.

*Report* — private complaint from a member about a listing or a conversation,
with a reason and a description. A report holds one of three statuses: open, in
review, or resolved. A report is *overdue* when it has been open for more than
one business day. *Hold* — state in which a listing is hidden from the public
while a report about it is under review; the terms of use allow it.

Two confidentiality rules shape the slice. The reporter's identity is visible to
moderators only, and the owner of a reported listing never sees who reported it.
A moderator may read a reported conversation only because an open report attaches
it, and each such access is written to the audit log.

Reports are one way the Jubilee team learns that a listing misrepresents a
business: nobody verifies a listing before it goes live (ADR 0057). Taking a
listing down from its page in the admin application, outside a report, belongs
to `moderation/take-down-listing`.

## Description

The slice adds two admin pages, one controller, three handlers and the outbox
handling in `Jubilee Worker`. No mocks exist for the admin reports pages; their
routes are `/reports` and `/reports/:id` in the admin application (`admin/run-admin-application`); the mocks are `pages/admin-reports`, `pages/admin-report`
and `dialogs/report-action`, and the copy is in them (ADR 0033).

- **`AdminReportsPage`** — Angular page that lists reports with listing, reason,
  description, reporter, time and status, and marks overdue reports. It adds a
  row when `RealtimeClient` receives `report.created`.
- **`AdminReportPage`** — Angular page for one report. It shows the report, the
  attached conversation for a conversation report, the history of actions, and
  the five actions: dismiss, message the reporter, message the owner, place the
  listing on hold, remove the listing.
- **`ReportActionDialog`** — dialog that collects the required resolution note
  and, for the two message actions, the message text.
- **`AdminReportsController`** — exposes `GET /api/admin/reports`,
  `POST /api/admin/reports/{id}/open` and
  `POST /api/admin/reports/{id}/actions` under `RequiresModerator`, the staff policy (`security/authorize-staff-requests`). A member
  without the `moderator` role receives HTTP 403.
- **`GetReportsQueryHandler`** — returns `ReportListItem` rows. It sets
  `Overdue` when `BusinessDayCalendar` reports more than one business day since
  `CreatedAt` for a report with the status `Open`.
- **`OpenReportCommandHandler`** — calls `Report.StartReview`, which moves an
  open report to `InReview`. It appends an `AuditEntry` for the staff access to
  personal data or to the reported conversation, with the report ID as the
  reason.
- **`ApplyReportActionCommand`** and **`ApplyReportActionCommandValidator`** —
  carry `ReportId`, `Kind`, `ResolutionNote` and `MessageText`. The validator
  returns HTTP 422 for an empty `ResolutionNote`, and for an empty `MessageText`
  on `MessageReporter` or `MessageOwner`. The note is at most 1000 characters and the message at most 2000 (ADR 0033).
- **`ApplyReportActionCommandHandler`** — loads the report and its listing,
  applies the action, records a `ReportActionEntry`, appends the `AuditEntry`,
  and writes the matching `OutboxMessage` in one unit of work. `Dismiss` and
  `RemoveListing` set the report to `Resolved`; the other three actions leave
  it `InReview`. `LiftHold` lifts a hold and resolves the report (ADR 0033).
- **`Listing.PlaceOnHold`** and **`Listing.Remove`** — domain methods. A held
  listing keeps the stage `Live` and carries the flag `IsUnderModerationHold`,
  which excludes it from every public query; a removed listing is deleted
  (`DeletedAt`). Paused, on hold and deleted are flags, not stages; the stages
  are `Draft` and `Live` (ADR 0057).
- **`OutboxDispatcherJob`** — for `ReportCreated` it creates a `Notification`
  for each moderator and publishes `report.created` through `EventsHub`. For
  `ListingPlacedOnHold` and `ListingRemoved` it removes the listing from the
  `Search index` and invalidates the cached public lists, so the listing leaves
  public lists within 60 seconds. It tells the owner of a hold with the text
  "We've paused your listing while we look into a report".
  This outbox handling is deferred. Today `ApplyReportActionCommandHandler`
  tells the owner and the reporter itself through `NotificationRules.Tell`
  (kinds `staff-message`, `listing-paused`, `listing-removed`, `listing-live`)
  in the same save, `PublicListingFilter` excludes a held or deleted listing
  from every public read and from search, and
  `DirectoryCacheInvalidationInterceptor` drops the directory read cache after
  the save, as for a takedown (`moderation/take-down-listing`).
- **Reporter confidentiality** — `ReportListItem.ReporterName` and the reporter
  fields of `ReportDetailDto` exist only on admin endpoints. Owner-facing
  notifications, e-mail and listing responses carry no reporter field, and
  messages to the owner are sent in the name of the Jubilee team.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-105` | `L1-014` | The Jubilee team shall review reports from `L2-039` and `L2-063` within one business day. The system shall list each new report for moderators and notify them, shall let a moderator dismiss it, message the reporter, message the owner, place the listing on hold or remove the listing with a resolution note, shall remove a held listing from public lists within 60 seconds and tell the owner, shall mark a report overdue after more than one business day open, and shall never show the owner who reported the listing. |
| `L2-063` | `L1-009` | The system shall send a reported conversation to the Jubilee team with the conversation attached, and staff shall not read a conversation's content without an open report on it. |
| `L2-133` | `L1-019` | The system shall check the caller's role and ownership of the specific object on every API endpoint before doing anything. |
| `L2-150` | `L1-020` | The system shall record in the audit log each staff view of a member's personal data or a reported conversation, with the reason (report ID or listing ID). |
| `L2-180` | `L1-025` | The system shall store an append-only audit record with actor, action, target, time, before and after values, and reason for report resolutions, holds and removals. |

## Diagrams

### System context

A member reports privately, the Jubilee team member resolves the report,
and Jubilee tells the owner of a hold or removal. The e-mail provider carries
moderator messages to the reporter and the owner.

![C4 system context for handling reports](diagrams/c4-context.png)

### Containers

`Jubilee API` stores reports and decisions in the `Jubilee database`.
`Jubilee Worker` dispatches notifications and takes held or removed listings
out of the `Search index` and the `Cache`.

![C4 container view for handling reports](diagrams/c4-container.png)

### Components

`AdminReportsPage` and `AdminReportPage` call `AdminReportsController` through
`AdminApi`. `ApplyReportActionCommandHandler` records the action on `Report` and
calls the hold or remove transition on `Listing`.

![C4 component view for handling reports](diagrams/c4-component.png)

### Class structure

`Report` composes its `ReportActionEntry` history and refers to one `Listing`.
`ReportListItem` projects a report and derives `Overdue` from
`BusinessDayCalendar`.

![Class diagram for handling reports](diagrams/class-structure.png)

### Behaviour — receive and open a report

`OutboxDispatcherJob` notifies moderators of a new report. Opening the report
moves it to in review and audits the access.

![Sequence diagram for receiving and opening a report](diagrams/sequence-open-report.png)

### Behaviour — place a listing on hold

The handler requires the resolution note, holds the listing and commits the
audit entry. `OutboxDispatcherJob` removes the listing from public lists within
60 seconds and tells the owner without naming the reporter.

![Sequence diagram for placing a listing on hold](diagrams/sequence-place-listing-on-hold.png)
