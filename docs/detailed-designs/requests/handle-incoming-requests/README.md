# Handle incoming requests

## Overview

Jubilee is Toronto's Christian marketplace. A member finds a verified business and asks it for something without
paying through the platform; the owner of the business answers. A *request* is that ask. It has one of three
types (booking, quote, order) and follows one lifecycle shared by the member and the owner. This feature covers
the owner's list of those requests and the badge that rewards a fast answer.

"Incoming requests" at `/my-business/requests` lists the requests customers send the owner's business. A summary
line such as "3 new · reply within a day to keep your “replies fast” badge" sits above the tabs "New",
"Confirmed", "Declined" and "All", each with its count. Each new request row shows the customer's initials, the
title, "{Type} · {customer name} · {time}", the customer's note or delivery choice, and the actions "Decline"
and "Confirm". A request that arrives while the page is open appears at the top within 5 seconds.

Only the owner or a co-owner of the listing may open the page or call its API. Each other member receives HTTP
403 and the forbidden page.

*first response* — owner's first answer to a customer: the confirm or decline of a request, or the first reply
to a message. *"Replies fast" badge* — mark on a listing whose median first response over the last 30 days is
under 24 hours, with at least 3 responses. The badge is recomputed at least hourly and removed when the median
reaches 24 hours or more.

## Description

The feature is a vertical slice from the incoming requests page in `Jubilee Web` to `Jubilee database`, with the
badge computed in `Jubilee Worker`.

- **`IncomingRequestsPage`** — Angular page at `/my-business/requests`, behind `OwnerGuard`. It shows the
  summary line, the tabs with counts and the request rows. With no requests at all it shows "No requests yet.
  When a member orders a product, books a service or asks for a quote, it lands here for you to confirm or
  decline." with "Share your listing". An empty Declined tab shows "You haven't declined any requests. Declined
  requests are kept here for 90 days." with "Show new requests". "Confirm" and "Decline" open
  `ConfirmRequestDialog` and `DeclineRequestDialog`.
- **`IncomingRequestsStore`** — signal store that holds the rows per tab and the counts. On a `request.created`
  event from `RealtimeClient` it inserts the row at the top of "New" and increases the "Requests" tab count.
- **`RequestsApi`** — typed Angular HTTP client. `listIncoming` calls `GET
  /api/my-business/requests?tab=&cursor=`.
- **`RealtimeClient`** and **`ToastService`** — the client receives events from `EventsHub`; the toast reads
  "New {type} request. {Customer} asked for {summary}."
- **`IncomingRequestsController`** — ASP.NET Core controller in `Jubilee.Api` for `/api/my-business/requests`.
  It authenticates the session cookie and applies `ListingOwnerPolicy` before it sends the query through
  MediatR.
- **`ListingOwnerPolicy`** — authorization policy that passes for the owner or a co-owner of the listing and
  returns HTTP 403 for each other caller (`L2-133`). The check runs on the server and does not rely on
  `OwnerGuard`.
- **`ListIncomingRequestsQuery`** and **`ListIncomingRequestsQueryHandler`** — return the listing's requests for
  a tab, newest first, with the count per tab. The Declined tab returns requests declined in the last 90 days.
  The page size is `<TO SUPPLY>`.
- **`IncomingRequestRowDto`** — row projection with customer initials and name, title, `RequestType`, sent time,
  note or delivery choice, and `RequestStatus`.
- **`Request`** — domain entity in `Jubilee.Domain` that owns the request lifecycle (`L2-043`). `RequestStatus`
  holds `New`, `Confirmed`, `Declined`, `Cancelled` and `Completed`. The allowed transitions are `New` →
  `Confirmed` (the owner confirms), `New` → `Declined` (the owner declines), `New` or `Confirmed` → `Cancelled`
  (the member cancels) and `Confirmed` → `Completed` (a booking's meeting end time passes, or the owner marks an
  order fulfilled). `UndoLastTransition` returns a request to its previous status within 8 seconds of a cancel
  or a confirm. Each other transition throws `InvalidTransitionException`; the API maps it to HTTP 409 with code
  `INVALID_TRANSITION` and leaves the request unchanged.
- **`RequestTransition`** — child entity of `Request` that records each transition with actor, time and previous
  status. The progress timeline reads these records.
- **`RequestCreatedEvent`** — outbox payload written by the three create handlers. `OutboxDispatcherJob` pushes
  it through `EventsHub` to the listing's owner and co-owners only, so the row and the toast appear within 5
  seconds (`L2-070`).
- **`ResponseTimeBadgeJob`** — hosted job in `Jubilee Worker` that runs at least hourly. For each live listing
  it asks `ResponseTimeCalculator` for the median first response over the last 30 days and stores a
  `ResponseTimeStat`. The job is idempotent and records its last success (`L2-182`).
- **`ResponseTimeCalculator`** — domain service. For a request, the response time runs from `CreatedAt` to the
  owner's first `RequestTransition`. For a message, it runs from the customer's message to the owner's first
  reply; the exact pairing rule for messages is `<TO SUPPLY>`. `RepliesFast` is true when the median is under 24
  hours and the count is at least 3.
- **`ResponseTimeStat`** — entity per listing with `MedianFirstResponse`, `ResponseCount`, `RepliesFast` and
  `ComputedAt`. Listing pages and `BusinessCard` read `RepliesFast` to show or remove the "Replies fast" badge.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1)
requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-051` | `L1-008` | `/my-business/requests` shall list the requests customers send the owner's business. |
| `L2-054` | `L1-008` | A listing shall carry the "Replies fast" badge when its median first response to requests and messages over the last 30 days is under 24 hours with at least 3 responses. The badge shall be recomputed at least hourly and removed when the median rises to 24 hours or more. |
| `L2-043` | `L1-007` | Each booking, quote and order request shall follow one lifecycle shared by the member's and the owner's views. |
| `L2-133` | `L1-019` | The server shall return HTTP 403 when an owner API is called for a listing the caller does not own. |
| `L2-070` | `L1-010` | A notification, message or request event shall reach an open signed-in page within 2 seconds at the 95th percentile over a persistent connection. |
| `L2-182` | `L1-025` | Each scheduled job shall be idempotent, shall run at most once per schedule across instances, and shall record its last success. |

## Diagrams

### System context

An owner handles incoming requests through Jubilee. Members send those requests and later see the "Replies fast"
badge on the listing. Jubilee also tells the owner of a new request through the external e-mail provider.

![C4 system context for handling incoming requests](diagrams/c4-context.png)

### Containers

`Jubilee Web` reads the list from `Jubilee API` and receives new requests over the real-time connection.
`Jubilee Worker` dispatches the outbox and recomputes the badge in `Jubilee database`.

![C4 container view for handling incoming requests](diagrams/c4-container.png)

### Components

`IncomingRequestsPage` reads through `IncomingRequestsStore`, which loads through `RequestsApi` and applies
events from `RealtimeClient`. In the worker, `ResponseTimeBadgeJob` uses `ResponseTimeCalculator`.

![C4 component view for handling incoming requests](diagrams/c4-component.png)

### Class structure

`ListIncomingRequestsQueryHandler` projects `Request` to `IncomingRequestRowDto`. `ResponseTimeCalculator` reads
`RequestTransition` records and produces the `ResponseTimeStat` of a listing.

![Class diagram for handling incoming requests](diagrams/class-structure.png)

### Behaviour — load incoming requests

The API applies `ListingOwnerPolicy` before any read; a caller who is not the owner or a co-owner receives HTTP
403 and the forbidden page (`L2-051`, `L2-133`).

![Sequence diagram for loading incoming requests](diagrams/sequence-load-incoming-requests.png)

### Behaviour — a new request arrives

A request created by a member reaches the open page through the outbox and `EventsHub` within 5 seconds, with a
toast (`L2-051`, `L2-070`).

![Sequence diagram for a new request arriving](diagrams/sequence-new-request-arrives.png)

### Behaviour — recompute the badge

`ResponseTimeBadgeJob` recomputes the median at least hourly and sets or clears `RepliesFast` (`L2-054`).

![Sequence diagram for recomputing the badge](diagrams/sequence-recompute-badge.png)
