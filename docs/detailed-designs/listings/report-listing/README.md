# Report a listing

## Overview

Jubilee is Toronto's Christian marketplace, and its value rests on listings
that members can trust. A member who believes a listing is false, misleading or
tied to a bad experience can report it. This feature covers the "Report this
listing" action on a listing page and the dialog that sends the report.

A report is private. The dialog states "Reports are private. The business is
not told who sent them." The report goes to the Jubilee team, which
reviews it within one business day and may e-mail the reporter with a question.
The owner of the listing never sees who sent a report. Reviewing and resolving
reports is the reports-handling feature of the Jubilee team (`L2-105`);
this feature ends when the report is stored and the team is e-mailed.

The feature uses the following local terms.

- **report** — private statement from one member that something is wrong with one listing
- **reason** — one of four fixed choices that routes the report to the right reviewer
- **report entry** — one submission of reason and description; a report holds one or more entries
- **moderation queue** — list of reports that the Jubilee team works through
- **idempotency key** — client-generated identifier that lets the server recognise a repeated submission
- **team's address** — the e-mail address of the Jubilee team, `Moderation:TeamEmail` or else `Launch:TeamEmail`

A visitor cannot report. Pressing "Report this listing" without a session opens
the sign-in prompt. An owner viewing their own listing does not see the action.

## Description

The feature is a vertical slice from the dialog to the database and the outbox
(ADR 0029, ADR 0055).

- **`ReportListingDialog`** — Angular dialog that `BusinessPage` opens at
  `/b/{slug}/report`, titled "Report {business}". It shows the privacy
  statement, the radio group "What's wrong?" with the options "It isn't a real
  business", "The listing is misleading or out of date", "I had a bad
  experience" and "Something else", the text area "Tell us what happened" and
  the button "Send report". The text area stops input at 2,000 characters and a
  counter shows the characters remaining.
- **Dialog validation** — on "Send report" with no reason the dialog shows
  "Choose a reason so the right person looks at it."; with an empty description
  it shows "Add a sentence or two so we know what to check." Messages appear
  under the fields, and focus moves to the first invalid field. Typed values
  are kept. A 422 from the server maps its codes to the same messages.
- **Dialog states** — while the request is in flight the radios are disabled,
  the text area is read-only, "Send report" shows a spinner with
  `aria-busy="true"` and keeps its label, "Cancel" is disabled, Escape does not
  close the dialog, and a second press sends nothing (`L2-127` AC1). A
  submission not answered within 10 seconds (`SUBMIT_TIMEOUT_MS`) fails with
  "We couldn't send that" and "It took too long, so we stopped." (`L2-127` AC2).
  A lost connection says "Your connection dropped before it reached us. Nothing
  was sent and what you typed is still here. Try again." and a 429 says "Slow
  down a little" (`L2-128`). The failed state keeps the input. The success state
  reads "Thanks for telling us" and "Your report is private. Our team reviews
  it within one business day and may e-mail you with a question."
- **`SignInRequiredDialog`** — sign-in prompt "Join to report {business}"
  opened in place of the report dialog without a session; it returns to
  `/b/{slug}/report`.
- **Idempotency key** — the dialog takes one key (`newKey()`) when it opens;
  every retry from the same dialog reuses it.
- **`ReportsApi`** (`REPORTS_API`) — Angular HTTP client for
  `POST /api/listings/{slug}/reports`. It sends the key in the
  `Idempotency-Key` header.
- **`ListingReportsController`** — ASP.NET Core controller. The endpoint
  requires a session (the fallback policy) and answers 201 with the report's
  id. An unauthenticated call receives 401. A call from the listing's owner
  receives 403 `OWN_LISTING`. A slug that names no public listing receives 404.
- **`ReportListingCommand`** and **`ReportListingCommandHandler`** — MediatR
  command and handler. A key the reporter used before returns the first
  report's id and changes nothing (`L2-132`). The handler requires a reason and
  a non-blank description of at most 2,000 characters; a failure is 422 with the
  per-field codes `REASON_REQUIRED`, `DESCRIPTION_REQUIRED` and
  `DESCRIPTION_TOO_LONG`. An eleventh entry in an hour is 429. When the
  reporter's latest report of the listing was created less than 24 hours
  earlier, the submission joins it as a new `ListingReportEntry`; otherwise a
  new `ListingReport` is opened. The report, its entry and the team's e-mail are
  saved in one `SaveChangesAsync`.
- **`ListingReport`** — domain entity with `ListingId`, `ReporterSubject`,
  `ReporterName`, `ReportStatus` (`Open`, `InReview`, `Resolved`) and its
  entries. `AcceptsAdditionAt` expresses the 24-hour rule. The reporter is
  returned only by the moderator endpoints of the admin application.
- **`ReportSubmitted`** — the notice of a report of a listing. `Tell` writes,
  through `JubileeTeam.Tell`, the e-mail "New report: {business}", or "More
  on a report: {business}" when the entry joined an earlier report, with the
  reason in the dialog's words, the description and the link
  `{AdminBaseUrl}/reports/{id}`. It never names the reporter. The outbox
  message's correlation id is the report's id.
- **`JubileeTeam`** — the one place that decides who on the Jubilee team
  is told: an `OutboxMessage` e-mail to `TeamSettings.TeamEmail`
  (`Moderation:TeamEmail`, else `Launch:TeamEmail`), or nothing when neither
  is set. `OutboxDispatcherJob` in `Jubilee.Worker` sends it. The report then
  appears in the reports list of `L2-105` at `/reports`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-039` | `L1-005` | Members shall be able to report a listing privately to the Jubilee team. |
| `L2-126` | `L1-018` | A dialog form with errors shall show each message under its field, shall move focus to the first invalid field, and shall keep the values that the user typed. |
| `L2-105` | `L1-014` | A new report shall appear in the reports list of the admin application, and the moderators shall be notified: an e-mail to the team's address that never names the reporter. |
| `L2-127` | `L1-018` | A submitting dialog shall make its fields read-only, show a busy primary button that keeps its label, send nothing on a second press, and fail after 10 seconds rather than spin. |
| `L2-128` | `L1-018` | A failed dialog submission shall show an error alert at the top of the dialog that says what did not happen, and shall keep everything typed. |
| `L2-132` | `L1-018` | Every create request shall carry a client-generated idempotency key, and the server shall return the original result for a repeated key within 24 hours without creating a duplicate. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on every API endpoint; no check shall rely on the client hiding a control. |

## Diagrams

### System context

A member sends a private report, and Jubilee notifies the Jubilee team. A
visitor is asked to sign in first.

![C4 system context for reporting a listing](diagrams/c4-context.png)

### Containers

`Jubilee Web` posts the report to `Jubilee API`, which stores the report and
the team's e-mail in `Jubilee database`. `Jubilee Worker` sends the e-mail from
the outbox, and the team opens the report in `Jubilee Admin`.

![C4 container view for reporting a listing](diagrams/c4-container.png)

### Components

The dialog takes one idempotency key and submits through `ReportsApi`.
`ListingReportsController` dispatches the command; the handler screens repeats,
stores the report and tells the team through `ReportSubmitted` and
`JubileeTeam`.

![C4 component view for reporting a listing](diagrams/c4-component.png)

### Class structure

A `ListingReport` owns one or more `ListingReportEntry` values, each with a
`ReportReason`. The handler either opens a report or extends one, and
`JubileeTeam` writes the `OutboxMessage`.

![Class diagram for reporting a listing](diagrams/class-structure.png)

### Behaviour — send a report

The dialog validates the form, the handler applies the `L2-132` idempotency
rule and the 24-hour addition rule of `L2-039` and saves the report and the
team's e-mail in one transaction; the worker sends the e-mail.

![Sequence diagram for sending a report](diagrams/sequence-send-report.png)
