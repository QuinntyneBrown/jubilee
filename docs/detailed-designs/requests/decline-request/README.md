# Decline a request

## Overview

Jubilee is Toronto's Christian marketplace. A member finds a business and asks it for something without
paying through the platform; the owner of the business answers. A *request* is that ask. It has one of four
types (booking, quote, order, space) and follows one lifecycle shared by the member and the owner. This feature
covers one of the owner's two answers: declining.

Declining tells the customer that the business will not do what was asked, and why. "Decline" on a new request
opens a dialog "Decline {customer}’s {type}?" with the guidance "A kind, clear reason keeps the door open.
{Customer} can reply in Messages." The owner picks a reason and writes a message to the customer. The message is
required, because the customer reads it on the request and in the conversation.

*decline reason* — one of four fixed choices: "Can’t meet the date", "Out of stock", "Outside what I offer" or
"Something else". *decline message* — owner's note of at most 1,000 characters shown to the customer with the
decline.

A successful decline moves the request from `new` to `declined` and notifies the customer. The lifecycle offers
no transition out of `declined`, and a decline has no undo.

## Description

The feature is a vertical slice from the decline dialog in `Jubilee Web` to `Jubilee database`, with the
customer's e-mail sent by `Jubilee Worker`. The names below are the names in the code; the parts decided in
ADR 0050 are marked with it.

- **`DeclineRequestDialog`** — Angular CDK dialog (`frontend/projects/jubilee/src/app/dialogs/decline-request`)
  composed of `jb-*` components in a `jb-dialog` frame (`DialogFrame`), opened from a row of
  `IncomingRequestsPage` with `DeclineRequestData`. It shows "Reason" with the four choices (`DECLINE_REASONS`)
  and "Message to {customer}" (required, hint "Shown to the customer with your decline.", input stops at 1,000
  characters), with "Keep request" (default focus, `L2-129`) and "Decline request". An empty message shows "Write a short note so
  {customer} knows why and what to do next." and takes the focus. On failure it shows "We couldn’t send your
  decline. The request is still new and your note is kept. Try again." and keeps the reason and the message
  (`L2-128`). Its form carries the `jbDraft` directive (ADR 0046).
- **No longer new** — on HTTP 409 the dialog closes with the server's sentence (a `DeclineConflict`, read by
  `requestConflict`). `IncomingRequestsPage` reloads
  the list and shows the danger toast "Request not declined" with that sentence, for example "{Customer}
  cancelled this request." The note that was typed is not kept: the request it answered is gone (ADR 0050,
  `L2-053` AC6).
- **`IncomingRequestsApi`** — service contract behind the `INCOMING_REQUESTS_API` injection token. `decline`
  calls `POST /api/my-business/requests/{id}/decline` with `reason` and `message` and answers `RequestDecision`.
- **`IncomingRequestsController`** — ASP.NET Core controller in `Jubilee.Api`. It reads the subject of the
  session cookie and sends `DeclineRequestCommand` through MediatR.
- **`DeclineRequestBody`** — body of the endpoint: `Reason` and `Message`. It is marked
  `JsonUnmappedMemberHandling.Disallow`: a body with any other field, such as `status` or a price, returns HTTP
  400 and nothing is changed (`L2-133` AC4).
- **`DeclineRequestCommand`** — request object carrying `Subject`, `RequestId`, `Reason` and `Message`.
- **`DeclineRequestCommandHandler`** — MediatR handler in `Jubilee.Application` (`Requests/Incoming.cs`). It
  loads the request through `IncomingRules.OwnedRequest`: an unknown request is HTTP 404, and a request of a
  listing the caller does not own is HTTP 403 with code `FORBIDDEN` (`L2-133`). It checks the body itself; there
  is no separate validator. A `Message` that is empty or whitespace is `message: REQUIRED`, one above 1,000
  characters (`Request.MaxNoteLength`) is `message: TOO_LONG`, and a `Reason` outside `Request.DeclineReasons`
  is `reason: INVALID`; a failure throws `ValidationFailedException`, HTTP 422 with one code per field. It then
  calls `Request.Decline`, writes the message into the member–business conversation with
  `IncomingRules.TellCustomer` (keyed `request:{id}:declined`), and writes the customer's `Notification` and
  e-mail `OutboxMessage` with `IncomingRules.QueueEmail` in one `SaveChangesAsync`. The e-mail has no delay. It
  returns `RequestDecisionDto`.
- **Decline reasons** — `Request.DeclineReasons` holds the four values as strings: `cant-meet-the-date`,
  `out-of-stock`, `outside-what-i-offer` and `something-else`. There is no enumeration.
- **`Request`** — domain entity in `Jubilee.Domain` that owns the request lifecycle (`L2-043`). `RequestKind`
  holds `Booking`, `Quote`, `Order` and `Space`; `RequestStatus` holds `New`, `Confirmed`, `Declined`,
  `Cancelled` and `Completed`. `Confirm`, `Decline`, `Cancel` and `Complete` make the allowed transitions and
  `UndoConfirm` and `UndoCancel` reverse one within 8 seconds (`Request.UndoWindow`); any other transition
  throws `InvalidTransitionException`. The handlers answer it with HTTP 409 and code `INVALID_TRANSITION`
  (`IncomingRules.Invalid`) and leave the request unchanged.
- **`RequestTransition`** — child entity of `Request` that records each transition with `From`, `To`, `Actor`,
  `At` and `UndoableUntil`. The progress timeline reads these records.
- **Decline data** — `Request.Decline` stores `DeclineReason` and `DeclineMessage` on the request.
  `RequestDetailPage` shows the message to the customer under "{Business} can’t take this {job}".
- **`IncomingRules.Invalid`** — raised when the request is no longer `New`, for example when the customer
  cancelled it first. It is a `ConflictException`, which `ExceptionHandlingMiddleware` writes as HTTP 409 with
  code `INVALID_TRANSITION`, the sentence and the current status in `requestStatus`.
- **Telling the customer** — the customer's `Notification` (kind `request`, target `/requests/{id}`) is stored
  with `NotificationRules.Tell` in the same save as the decline, and `EventsController` streams it to the
  customer's open page (`L2-070`). The conversation shows the request as a card (`RequestCardDto`) read from
  the request itself, beside the owner's message.
- **`OutboxDispatcherJob`** — hosted job in `Jubilee Worker`. It sends the due `OutboxMessage` e-mail through
  `OutboxDispatcher` and `IEmailSender`. The outbox sends e-mail only; it stores no notification and pushes no
  real-time event.
- **After success** — `IncomingRequestsPage` reads the list again, so the row leaves "New" for "Declined" and the
  tab counts follow, and shows the toast "{Type} declined. {Customer} has been told and can reply in Messages."
  The response-time badge (`L2-054`) counts the decline as the owner's first response.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1)
requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-053` | `L1-008` | An owner shall be able to decline a new request with a reason and a required message of at most 1,000 characters. The request shall become `declined`, the message shall be shown to the customer on the request and in the conversation, and the customer shall be notified. A decline of a request that is no longer new shall answer HTTP 409, close the dialog and say why in a toast. |
| `L2-043` | `L1-007` | Each booking, quote and order request shall follow one lifecycle shared by the member's and the owner's views. |
| `L2-129` | `L1-018` | An action that notifies another person shall open a confirmation dialog that states the consequence and focuses the safe choice by default. A reversible action shall carry "Undo" on its success toast. |
| `L2-128` | `L1-018` | A failed dialog submission shall show an error alert at the top of the dialog that says what did not happen, and shall keep everything typed. |
| `L2-133` | `L1-019` | The server shall return HTTP 403 when an owner API is called for a listing the caller does not own. |
| `L2-070` | `L1-010` | A signed-in member's open page shall receive their own events over a persistent connection. |

## Diagrams

### System context

An owner declines a request through Jubilee. Jubilee tells the member in the application and through the
external e-mail provider.

![C4 system context for declining a request](diagrams/c4-context.png)

### Containers

The decline travels from `Jubilee Web` to `Jubilee API`, which changes the request and stores the member's
notification and e-mail in `Jubilee database`. `Jubilee Worker` sends the e-mail. The member's open page reads
the notification from the event stream of `Jubilee API`.

![C4 container view for declining a request](diagrams/c4-container.png)

### Components

`DeclineRequestDialog` calls `IncomingRequestsController` through `IncomingRequestsApi`. The handler finds the
request with `IncomingRules`, checks the reason and the message, and calls `Decline` on `Request`.

![C4 component view for declining a request](diagrams/c4-component.png)

### Class structure

`DeclineRequestCommandHandler` handles `DeclineRequestCommand` and calls `Decline` on `Request`, which stores
the reason and the message and records a `RequestTransition`.

![Class diagram for declining a request](diagrams/class-structure.png)

### Behaviour — decline a request

The dialog requires a message (`L2-053`) and states the consequence (`L2-129`). The handler applies the decline
through the `L2-043` lifecycle and the customer is told.

![Sequence diagram for declining a request](diagrams/sequence-decline-request.png)

### Behaviour — a decline fails

A failed submission keeps the dialog open with the reason and the note intact (`L2-128`). A request that is no
longer `new` returns HTTP 409 and is not changed (`L2-043`); the dialog closes and the page says why in the
toast "Request not declined" (`L2-053` AC6).

![Sequence diagram for a failed decline](diagrams/sequence-decline-fails.png)
