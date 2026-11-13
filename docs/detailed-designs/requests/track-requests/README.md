# Track requests

## Overview

Jubilee is Toronto's Christian marketplace. A member finds a business and asks it for something without
paying through the platform. A *request* is that ask. It has one of three types (booking, quote, order) and
follows one lifecycle shared by the member and the owner. This feature defines that lifecycle and the two member
pages that follow a request through it.

*request status* — position of a request in its lifecycle: `new`, `confirmed`, `declined`, `cancelled` or
`completed`. A request is created as `new`, which the member sees as "Awaiting reply" and the owner sees as
"New". The other statuses read "Confirmed", "Declined", "Cancelled" and "Completed" on both sides. *open
request* — request whose status is `new` or `confirmed`. *progress timeline* — ordered list of the transitions a
request has made, each with actor and time.

"Your requests" at `/requests` lists the member's bookings, quotes and orders with a summary line such as "3
open · 1 awaiting reply" and the tabs "All", "Bookings", "Quotes", "Orders" and "Declined". The request detail
page at `/requests/:id` shows one request, a callout for its status, its details, the progress timeline and the
next steps.

Two transitions happen without a person pressing a button in these pages. A confirmed booking completes when its
meeting end time passes. A `new` request with no owner response after 7 days offers the member "Cancel or ask
again" and reminds the owner once.

## Description

The feature is a vertical slice from the two request pages in `Jubilee Web` to `Jubilee database`, with
scheduled lifecycle work in `Jubilee Worker`.

- **`Request`** — domain entity in `Jubilee.Domain` that owns the request lifecycle (`L2-043`). `RequestStatus`
  holds `New`, `Confirmed`, `Declined`, `Cancelled` and `Completed`; `RequestKind` holds `Booking`, `Quote`,
  `Order` and `Space`. The allowed transitions are `Confirm` (`New` → `Confirmed`), `Decline` (`New` →
  `Declined`), `Cancel` (`New` or `Confirmed` → `Cancelled`) and `Complete` (`Confirmed` → `Completed`: a
  booking's meeting end time passes, or the owner marks an order fulfilled, `L2-225`). `UndoCancel` and
  `UndoConfirm` return a request to its previous status within `UndoWindow` (8 seconds) for the actor of that
  transition. Each other transition throws `InvalidTransitionException`; the handlers turn it into a
  `ConflictException`, which the API answers with HTTP 409 and code `INVALID_TRANSITION`, and the request is
  unchanged. `IsUnanswered` holds for a `New` request at least 7 days old; `Nudge` stamps `NudgedAt` once.
- **`RequestTransition`** — child entity of `Request` that records each transition with `From`, `To`,
  `Actor`, `At` and, for an undoable one, `UndoableUntil`. The progress timeline reads these records.
- **`RequestLabels`** — mapping from `RequestStatus` to the wire name and the display label: `New` reads
  "Awaiting reply" for the member (`ForMember`) and "New" for the owner; the other statuses read the same on
  both sides.
- **`RequestsPage`** — Angular page at `/requests`, behind the sign-in guard. It shows the summary line, the
  tabs with counts, and rows of title (service, quote summary or "{product} × {qty}"), "{Type} · {business}",
  a detail line and a status badge. An empty tab shows its own message with "Show all requests"; no requests
  at all shows "Book, ask or order to get started" with "Browse businesses". The list loads 20 rows at a time
  with "Show more".
- **`RequestDetailPage`** — Angular page at `/requests/:id`. It shows the title, "{Type} · {business} ·
  {status}", the status callout, "Details", "Message", the actions the status allows and the "Progress"
  timeline. A confirmed booking offers "Add to calendar". A declined request shows the business's message in
  quotes and "See other {category word}". A cancelled request offers no action except "Message" and "Ask
  again". An unanswered request offers "Cancel request" and "Ask again". A load failure shows "We couldn't
  load this request" with `JB-REQ-502` and "Back to your requests" (`L2-118`).
- **`RealtimeService`** — the application's one event stream (`EVENTS_API`, `GET /api/events`, ADR 0053). Both
  pages read again, without a loading state, when a `request` notification for them arrives on `received`
  (the list for any target under `/requests/`, the detail for its own), when the stream connects again, and
  when the unread notification count falls (an owner took back a confirmation). While `connected` is false
  they ask every 5 seconds (`L2-070` AC6, ADR 0060). The page announces a change of status in its own words
  (`statusChangeToast`), so the service shows no toast of its own for a request notification on the page it
  concerns.
- **`REQUESTS_API`** — the injection token of `RequestsApi`, the typed Angular HTTP client. `list` calls
  `GET /api/requests?tab=&cursor=`; `get` calls `GET /api/requests/{id}`.
- **`RequestsController`** — ASP.NET Core controller in `Jubilee.Api`. It authenticates the session cookie and
  sends `ListRequestsQuery` or `GetRequestQuery` through MediatR.
- **`ListRequestsQuery`** and **`ListRequestsQueryHandler`** — return the caller's requests for a tab, 20 per
  page, with the counts per tab (`MemberRequestsDto`). Open requests come first by soonest upcoming date;
  closed requests follow, newest first.
- **`GetRequestQuery`** and **`GetRequestQueryHandler`** — return one request with its callout, details and
  timeline (`MemberRequestDetailDto`). A request that belongs to another member returns HTTP 404 and the
  attempt is logged (`L2-133`).
- **`FulfilRequestCommand`** and **`FulfilRequestCommandHandler`** — apply `Confirmed` → `Completed` when the
  owner marks an order fulfilled, through `POST /api/my-business/requests/{id}/fulfil` (403 for another
  business, 409 unless a confirmed order), and tell the customer in the app and by e-mail. The owner's control
  is "Mark fulfilled" in Incoming requests (`L2-225`, ADR 0060); see
  [Handle incoming requests](../handle-incoming-requests/README.md).
- **`BookingCompletionJob`** — hosted job in `Jubilee Worker`. Every minute it sends
  `RunBookingCompletionJobCommand`, which runs `CompleteFinishedBookingsCommand` once per 5-minute occurrence
  across instances through `ScheduledJobs` and records its success in `JobRun` (`L2-182` AC1). The command
  completes each `Confirmed` booking whose meeting end time has passed, with the actor `system`.
- **`UnansweredRequestJob`** — hosted job in `Jubilee Worker`. Every 10 minutes it sends
  `RunUnansweredRequestJobCommand`, which runs `RemindUnansweredRequestsCommand` once per hour across
  instances. For each `New` request with no owner response after 7 days the command sets `NudgedAt` and
  writes one owner reminder (in the app and by e-mail); the detail page offers the member "Cancel or ask
  again". `NudgedAt` makes the reminder single (`L2-182`).

### Space requests

A space request is listed under "All" (and "Declined" once declined) with
the type "Space", the title "{call to action} · {the space}", and Details
"When" and, for a Short stay, "Total". Its Details also hold an "Address"
line: the exact address when `SpaceAddressRelease.IsReleased(request)` holds
(kind `Space`, status `Confirmed` or `Completed`; the query loads only the
member's own request), with the callout "{owner} accepted" and "The address is
{exact address}."; otherwise "Shared once {owner first name} accepts." A space request completes only when the owner marks
it fulfilled. See [Request a space](../request-space/README.md) (ADR 0042).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1)
requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-043` | `L1-007` | Each booking, quote and order request shall follow one lifecycle shared by the member's and the owner's views. |
| `L2-047` | `L1-007` | `/requests` shall list the member's bookings, quotes and orders. |
| `L2-048` | `L1-007` | `/requests/:id` shall show one request, its progress and next steps. |
| `L2-133` | `L1-019` | The server shall return HTTP 404 and log the attempt when a member requests another member's request by ID. |
| `L2-118` | `L1-016` | Each load-error state shall show a reference the user can quote to support. |
| `L2-070` | `L1-010` | A notification, message or request event shall reach an open signed-in page within 2 seconds at the 95th percentile over a persistent connection. |
| `L2-225` | `L1-007` | The owner shall be able to mark a confirmed order fulfilled after a confirmation dialog, and the customer shall be told. |
| `L2-182` | `L1-025` | Each scheduled job shall be idempotent, shall run at most once per schedule across instances, and shall record its last success. |
| `L2-207` | `L1-028` | A space request shall be listed in Incoming requests with the call to action and the space, "Space · {customer} · {time}" and its dates or move-in, confirmed through a dialog that warns the address is shared, declined as any request, and shown to the member with the type "Space". |
| `L2-208` | `L1-028` | The exact address shall reach only the member whose space request is `confirmed` or `completed`, and the owner shall see and change it on Edit listing. |

## Diagrams

### System context

A member follows requests through Jubilee, and the owner's decisions change what the member sees. Jubilee
reminds the owner of an unanswered request through the external e-mail provider.

![C4 system context for tracking requests](diagrams/c4-context.png)

### Containers

`Jubilee Web` reads requests from `Jubilee API` and receives request notifications over the event stream.
`Jubilee Worker` runs the lifecycle jobs against `Jubilee database`.

![C4 container view for tracking requests](diagrams/c4-container.png)

### Components

`RequestsPage` and `RequestDetailPage` read through `RequestsApi` and read again when `RealtimeService` brings a request notification. In the API the two query
handlers read `Request`; in the worker the two jobs apply the automatic parts of the lifecycle.

![C4 component view for tracking requests](diagrams/c4-component.png)

### Class structure

`Request` owns its `RequestTransition` records and exposes one method per transition. The query handlers project
it to `MemberRequestRowDto` and `MemberRequestDetailDto`.

![Class diagram for tracking requests](diagrams/class-structure.png)

### Behaviour — list requests

The handler returns the caller's requests ordered open first by soonest upcoming date, then closed newest first,
20 per page (`L2-047`).

![Sequence diagram for listing requests](diagrams/sequence-list-requests.png)

### Behaviour — view a request

The handler returns HTTP 404 for a request of another member (`L2-048`, `L2-133`). A load failure shows
`JB-REQ-502`. A later status change reaches the open page as a notification over the event stream (`L2-070`).

![Sequence diagram for viewing a request](diagrams/sequence-view-request.png)

### Behaviour — automatic lifecycle steps

`BookingCompletionJob` completes a confirmed booking after its meeting end time, and `UnansweredRequestJob`
handles a `new` request with no owner response after 7 days (`L2-043`). Each runs once per occurrence across
instances through `ScheduledJobs` (`L2-182`).

![Sequence diagram for the automatic lifecycle steps](diagrams/sequence-lifecycle-jobs.png)
