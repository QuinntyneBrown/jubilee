# Confirm a request

## Overview

Jubilee is Toronto's Christian marketplace. A member finds a verified business and asks it for something without
paying through the platform; the owner of the business answers. A *request* is that ask. It has one of four
types (booking, quote, order, space) and follows one lifecycle shared by the member and the owner. This feature
covers one of the owner's two answers: confirming.

Confirming tells the customer that the business will do what was asked. "Confirm" on a new request opens a
dialog such as "Confirm Samuel’s order?" that states the commitment ("Only confirm if you can fulfil
“{title}”.", ADR 0021), lists Customer, the request, When or Needed by where there is one and Total ("$528.00 +
tax") for an order, and offers "Not yet" and "Confirm order". The safe choice "Not yet" has the default focus.

A successful confirm moves the request from `new` to `confirmed`, notifies the customer in the application and
by e-mail, shows the request as confirmed on its card in the conversation, and, for an order, reduces the
product's stock by the quantity. The toast "Order confirmed. {Customer} has been told. Message them about
payment and pickup." carries "Undo". *undo window* — the 8 seconds after a confirm during which "Undo" returns
the request to `new`; the customer's e-mail is held for the same 8 seconds, so an undo withdraws it before it is
sent.

A customer may cancel a moment before the owner confirms. In that case nothing is confirmed and the owner sees
"{Customer} cancelled this request."

## Description

The feature is a vertical slice from the confirm dialog in `Jubilee Web` to `Jubilee database`, with the
customer's e-mail sent by `Jubilee Worker`. The names below are the names in the code; the parts decided in
ADR 0050 are marked with it.

- **`ConfirmRequestDialog`** — Angular CDK dialog (`frontend/projects/jubilee/src/app/dialogs/confirm-request`)
  composed of `jb-*` components in a `jb-dialog` frame (`DialogFrame`), opened from a row of
  `IncomingRequestsPage` with `ConfirmRequestData`. It shows the commitment line and the request summary with
  "Not yet" (default focus) and the confirm button. On failure it shows "We couldn’t confirm it. The request is
  still new. Check your connection and try again." and the primary button reads "Try again" (`L2-128`). On HTTP
  409 it shows the server's sentence with "Nothing was confirmed." and disables the confirm button.
- **Closed before the answer** — the dialog can be closed with Escape while the request is on its way.
  `ConfirmRequestDialog` then hands the answer to the page through `ConfirmRequestData.settled` (a
  `LateConfirmation`: confirmed with the decision, or not confirmed with the server's sentence when there is
  one, read by `requestConflict`). A success
  reloads the list and shows the usual toast with "Undo" (`L2-052` AC7). A failure shows the danger toast
  "Couldn’t confirm the {noun}" with "{Customer}’s request is still new. Try again." and the action "Try again",
  which confirms the same request again from the page (`L2-052` AC5). A conflict shows the server's sentence in
  a danger toast with no action (ADR 0050).
- **`ToastService`** — shows the success toast "{Type} confirmed" with "Undo" for 8 seconds; `IncomingRequestsPage`
  gives it the action, which calls `undoConfirm`. After an undo it shows "Confirmation undone. {Customer} was
  not told. The request is new again."; an undo that fails shows the danger toast "Couldn’t undo the
  confirmation".
- **`IncomingRequestsApi`** — service contract behind the `INCOMING_REQUESTS_API` injection token. `confirm`
  calls `POST /api/my-business/requests/{id}/confirm`; `undoConfirm` calls `POST
  /api/my-business/requests/{id}/confirm/undo`. Both answer `RequestDecision` (`id`, `status`, `statusLabel`,
  `kind`, `customerFirstName`, `undoUntil`).
- **`IncomingRequestsController`** — ASP.NET Core controller in `Jubilee.Api`. It reads the subject of the
  session cookie and sends the command through MediatR. Neither endpoint accepts a body.
- **`IncomingRules`** — static rules in `Jubilee.Application` (`Requests/Incoming.cs`). `OwnedRequest` loads the
  request with its transitions and its listing: an unknown request is HTTP 404, and a request of a listing the
  caller does not own is HTTP 403 with code `FORBIDDEN` (`L2-133`). `Invalid` builds the HTTP 409 with code
  `INVALID_TRANSITION`, the sentence "{Customer} cancelled this request." for a cancelled request and the fact
  `requestStatus`. `TellCustomer` writes the owner's line in the conversation and `QueueEmail` writes the
  customer's `Notification` and e-mail.
- **`ConfirmRequestCommand`** and **`ConfirmRequestCommandHandler`** — the handler loads the request through
  `IncomingRules.OwnedRequest`, refuses a request that is not `New`, calls `Product.ReduceStock` for an order,
  calls `Request.Confirm`, asks `MeetingReminders.RemindIfSoonAsync` for a booking that starts within the hour,
  writes the conversation message keyed `request:{id}:confirmed`, and writes the customer's `Notification` and
  e-mail `OutboxMessage` in one `SaveChangesAsync`. It returns `RequestDecisionDto` with `UndoUntil`.
- **`UndoConfirmRequestCommand`** and **`UndoConfirmRequestCommandHandler`** — the handler calls
  `Request.UndoConfirm`, restores the stock through `Product.RestoreStock`, deletes the conversation message,
  and removes the unsent `OutboxMessage` rows and the customer's unread `Notification` of the request (matched
  by `CorrelationId`). The e-mail is queued with the same 8-second delay as the undo window, so it is never
  already sent (ADR 0021). When the restored stock brings a sold-out product back, `StockAlertNotifier` tells
  the members who asked.
- **`Request`** — domain entity in `Jubilee.Domain` that owns the request lifecycle (`L2-043`). `RequestKind`
  holds `Booking`, `Quote`, `Order` and `Space`; `RequestStatus` holds `New`, `Confirmed`, `Declined`,
  `Cancelled` and `Completed`. `Confirm`, `Decline`, `Cancel` and `Complete` make the allowed transitions and
  `UndoConfirm` and `UndoCancel` reverse one within 8 seconds (`Request.UndoWindow`); any other transition
  throws `InvalidTransitionException`. The handlers answer it with HTTP 409 and code `INVALID_TRANSITION`
  (`IncomingRules.Invalid`) and leave the request unchanged.
- **`RequestTransition`** — child entity of `Request` that records each transition with `From`, `To`, `Actor`,
  `At` and `UndoableUntil`. The progress timeline reads these records.
- **Undo rule** — `Request.Confirm` sets `UndoableUntil` on its `RequestTransition` to 8 seconds after `At`.
  `UndoConfirm` succeeds only for the actor of that transition and only before `UndoableUntil`; later calls
  return HTTP 409 with code `INVALID_TRANSITION`.
- **`Product`** — domain entity. `ReduceStock(optionLabel, quantity)` lowers the stock of the chosen option, or
  of the product, by the confirmed quantity; `RestoreStock` reverses it on undo. Untracked stock is left alone.
  Stock below the quantity throws `InsufficientStockException`: the API answers HTTP 409 with code
  `INSUFFICIENT_STOCK` and the available count, and nothing is confirmed (ADR 0021).
- **Concurrent cancel** — when the customer's cancel commits first, the handler finds status `Cancelled` and
  throws `IncomingRules.Invalid`. The API returns HTTP 409 with code `INVALID_TRANSITION` and the current status
  in `requestStatus`, and the dialog shows "{Customer} cancelled this request." There is no row version on
  `Request`.
- **Telling the customer** — `IncomingRules.QueueEmail` stores the customer's `Notification` (kind `request`,
  target `/requests/{id}`) with `NotificationRules.Tell` and queues the e-mail with `EmailPolicy.Queue`. The
  `OutboxMessage` carries `NextAttemptAt` equal to the end of the undo window and `CorrelationId` equal to the
  request, so an undo inside the window removes it before it is sent. `EventsController` streams the
  notification to the customer's open page (`L2-070`). The conversation shows the request as a card
  (`RequestCardDto`) read from the request itself, so the card reads "Confirmed" without being stored.
- **`OutboxDispatcherJob`** — hosted job in `Jubilee Worker`. It sends the due `OutboxMessage` e-mail through
  `OutboxDispatcher` and `IEmailSender`. The outbox sends e-mail only; it stores no notification and pushes no
  real-time event.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1)
requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-052` | `L1-008` | An owner shall be able to confirm a new request after a confirmation dialog. The request shall become `confirmed`, the customer shall be notified in-app and by e-mail, an order's product stock shall be reduced by the quantity, and "Undo" within 8 seconds shall return the request to `new`. An answer that comes after the dialog was closed shall still be reported, with "Undo" on success and "Try again" on failure. |
| `L2-043` | `L1-007` | Each booking, quote and order request shall follow one lifecycle shared by the member's and the owner's views. |
| `L2-129` | `L1-018` | An action that notifies another person shall open a confirmation dialog that states the consequence and focuses the safe choice by default. A reversible action shall carry "Undo" on its success toast. |
| `L2-128` | `L1-018` | A failed dialog submission shall show an error alert at the top of the dialog that says what did not happen, and shall keep everything typed. |
| `L2-133` | `L1-019` | The server shall return HTTP 403 when an owner API is called for a listing the caller does not own. |
| `L2-070` | `L1-010` | A signed-in member's open page shall receive their own events over a persistent connection. |

## Diagrams

### System context

An owner confirms a request through Jubilee. Jubilee tells the member in the application and through the
external e-mail provider.

![C4 system context for confirming a request](diagrams/c4-context.png)

### Containers

The confirm travels from `Jubilee Web` to `Jubilee API`, which changes the request and the stock and stores the
member's notification and e-mail in `Jubilee database`. `Jubilee Worker` sends the e-mail after the undo window.
The member's open page reads the notification from the event stream of `Jubilee API`.

![C4 container view for confirming a request](diagrams/c4-container.png)

### Components

`ConfirmRequestDialog` and the "Undo" action that `IncomingRequestsPage` gives `ToastService` call
`IncomingRequestsController` through `IncomingRequestsApi`. The two handlers find the request with
`IncomingRules` and mutate `Request` and `Product`.

![C4 component view for confirming a request](diagrams/c4-component.png)

### Class structure

`ConfirmRequestCommandHandler` calls `Confirm` on `Request` and `ReduceStock` on `Product`.
`UndoConfirmRequestCommandHandler` reverses both and removes the unsent e-mail `OutboxMessage` and the
customer's `Notification`.

![Class diagram for confirming a request](diagrams/class-structure.png)

### Behaviour — confirm a request

The dialog states the commitment (`L2-129`). The handler applies the `L2-052` confirm through the `L2-043`
lifecycle and reduces stock. A request the customer cancelled a moment earlier, or an order above the stock,
returns HTTP 409, and a failure keeps the dialog open (`L2-128`). When the dialog was closed before the answer
came, the page reports the answer in a toast (`L2-052` AC5 and AC7).

![Sequence diagram for confirming a request](diagrams/sequence-confirm-request.png)

### Behaviour — undo a confirm

"Undo" within 8 seconds returns the request to `new`, restores the stock and withdraws the customer's
notification and the e-mail that is not yet sent (`L2-052`).

![Sequence diagram for undoing a confirm](diagrams/sequence-undo-confirm.png)
