# Cancel a request

## Overview

Jubilee is Toronto's Christian marketplace. A member finds a verified business and asks it for something without
paying through the platform. A *request* is that ask. It has one of three types (booking, quote, order) and
follows one lifecycle shared by the member and the owner. This feature covers the one transition the member
makes after sending: cancelling.

A member may cancel an *open request* — request whose status is `new` or `confirmed`. "Cancel request" on the
request detail page opens a dialog that asks "Cancel your {type} request to {business}?" and states the
consequence: "{Business} is told straight away. You can ask again later." The safe choice "Keep request" has the
default focus.

Cancelling is reversible for a short time. The success toast "Request cancelled. {Business} has been told."
carries "Undo". *undo window* — the 8 seconds after a cancel during which "Undo" returns the request to its
previous status. After an undo the business is told that the cancellation was withdrawn.

A confirmed booking that starts within 24 hours gets an extra line in the dialog: "It's less than a day away;
consider messaging {owner} too."

## Description

The feature is a vertical slice from the cancel dialog in `Jubilee Web` to `Jubilee database`, with side effects
dispatched by `Jubilee Worker`.

- **`RequestDetailPage`** — Angular page at `/requests/:id`. It offers "Cancel request" while the request is
  open and reflects the new status after a cancel or an undo.
- **`CancelRequestDialog`** — Angular dialog built on `DialogShell`, with "Keep request" (default focus) and
  "Cancel request". It adds the short-notice line when the request is a `Confirmed` booking whose `StartsAt` is
  less than 24 hours away. On failure it keeps the dialog open and shows "We couldn't cancel it. The request is
  still open. Check your connection and try again." with "Try again" (`L2-128`).
- **`ToastService`** — shows "Request cancelled. {Business} has been told." with "Undo" for 8 seconds. Pressing
  "Undo" calls `RequestsApi.undoCancel`.
- **`RequestsApi`** — typed Angular HTTP client. `cancel` calls `POST /api/requests/{id}/cancel`; `undoCancel`
  calls `POST /api/requests/{id}/cancel/undo`.
- **`RequestsController`** — ASP.NET Core controller in `Jubilee.Api`. It authenticates the session cookie,
  applies the endpoint policy and sends the command through MediatR. Neither endpoint accepts a body, so the
  client cannot set `status` (`L2-133`).
- **`CancelRequestCommand`** and **`CancelRequestCommandHandler`** — the handler loads the request where
  `MemberId` is the caller (HTTP 404 otherwise), calls `Request.Cancel`, appends a cancellation card to the
  `Conversation`, and writes the business's notification and real-time event to the outbox in one unit of work.
  The notification is dispatched straight away; it does not wait for the undo window.
- **`UndoCancelRequestCommand`** and **`UndoCancelRequestCommandHandler`** — the handler calls
  `Request.UndoLastTransition`, which restores the status held before the cancel (`New` or `Confirmed`), and
  writes a "cancellation withdrawn" notification for the business to the outbox.
- **`Request`** — domain entity in `Jubilee.Domain` that owns the request lifecycle (`L2-043`). `RequestStatus`
  holds `New`, `Confirmed`, `Declined`, `Cancelled` and `Completed`. The allowed transitions are `New` →
  `Confirmed` (the owner confirms), `New` → `Declined` (the owner declines), `New` or `Confirmed` → `Cancelled`
  (the member cancels) and `Confirmed` → `Completed` (a booking's meeting end time passes, or the owner marks an
  order fulfilled). `UndoLastTransition` returns a request to its previous status within 8 seconds of a cancel
  or a confirm. Each other transition throws `InvalidTransitionException`; the API maps it to HTTP 409 with code
  `INVALID_TRANSITION` and leaves the request unchanged.
- **`RequestTransition`** — child entity of `Request` that records each transition with actor, time and previous
  status. The progress timeline reads these records.
- **Undo rule** — `Request.Cancel` sets `UndoableUntil` on its `RequestTransition` to 8 seconds after
  `OccurredAt`. `UndoLastTransition` succeeds only for the actor of that transition and only before
  `UndoableUntil`; later calls return HTTP 409 with code `INVALID_TRANSITION`. An allowance for network delay is
  `<TO SUPPLY>`.
- **`InvalidTransitionException`** — raised when the request is already `Declined`, `Cancelled` or `Completed`.
  `ProblemDetailsMiddleware` returns HTTP 409 with code `INVALID_TRANSITION` and the current status, and the
  page reloads the request.
- **`RequestCancelledEvent`** and **`RequestCancellationWithdrawnEvent`** — outbox payloads. Downstream slices
  read the request status when they act: the calendar link returns `STATUS:CANCELLED` (`L2-050`) and no meeting
  reminder is sent for a cancelled booking.
- **`OutboxDispatcherJob`** — hosted job in `Jubilee Worker`. It reads the `OutboxMessage` rows written in the
  same transaction, stores the in-app `Notification`, sends the e-mail through `IEmailSender` and pushes the
  real-time event through `EventsHub`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1)
requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-049` | `L1-007` | A member shall be able to cancel an open request after a confirmation dialog. The business shall be notified, and "Undo" within 8 seconds shall return the request to its previous status and tell the business the cancellation was withdrawn. |
| `L2-043` | `L1-007` | Each booking, quote and order request shall follow one lifecycle shared by the member's and the owner's views. |
| `L2-129` | `L1-018` | An action that notifies another person shall open a confirmation dialog that states the consequence and focuses the safe choice by default. A reversible action shall carry "Undo" on its success toast. |
| `L2-128` | `L1-018` | A failed dialog submission shall show an error alert at the top of the dialog that says what did not happen, and shall keep everything typed. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on each API endpoint before doing anything. |

## Diagrams

### System context

A member cancels a request through Jubilee. Jubilee tells the owner in the application and through the external
e-mail provider.

![C4 system context for cancelling a request](diagrams/c4-context.png)

### Containers

The cancel travels from `Jubilee Web` to `Jubilee API`, which changes the request in `Jubilee database`.
`Jubilee Worker` dispatches the outbox to the owner.

![C4 container view for cancelling a request](diagrams/c4-container.png)

### Components

`CancelRequestDialog` and the "Undo" action of `ToastService` call `RequestsController` through `RequestsApi`.
The two handlers call `Cancel` and `UndoLastTransition` on `Request`.

![C4 component view for cancelling a request](diagrams/c4-component.png)

### Class structure

`CancelRequestCommandHandler` and `UndoCancelRequestCommandHandler` mutate `Request`, which records a
`RequestTransition` with an `UndoableUntil` time and throws `InvalidTransitionException` for a transition the
lifecycle does not allow.

![Class diagram for cancelling a request](diagrams/class-structure.png)

### Behaviour — cancel a request

The dialog confirms the consequence (`L2-129`), the handler applies the `L2-049` cancel rule through the
`L2-043` lifecycle, and the business is told. A failure keeps the dialog open with "Try again" (`L2-128`).

![Sequence diagram for cancelling a request](diagrams/sequence-cancel-request.png)

### Behaviour — undo a cancel

"Undo" within 8 seconds returns the request to its previous status and tells the business the cancellation was
withdrawn (`L2-049`).

![Sequence diagram for undoing a cancel](diagrams/sequence-undo-cancel.png)
