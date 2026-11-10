# Request a quote

## Overview

Jubilee is Toronto's Christian marketplace. A member finds a verified business and asks it for something without
paying through the platform. A *request* is that ask. It has one of three types (booking, quote, order) and
follows one lifecycle shared by the member and the owner. This feature covers the quote type.

A *quote request* is a request in which a member describes a piece of work and asks the business to price it. It
opens from a service whose action is "Ask for a quote", or from "Ask" on a shop's custom work. The dialog "Ask
{business} for a quote" tells the member "Tell {owner} what you have in mind. There's no obligation to buy." The
owner's quote arrives later in the member's messages.

The member gives a description and may add a date the work is needed by, a budget and a phone number. The phone
number is shared with that business for that request only. The request starts in status `New` and appears in
"Your requests" and in the owner's incoming requests.

## Description

The feature is a vertical slice from the quote dialog in `Jubilee Web` to `Jubilee database`, with side effects
dispatched by `Jubilee Worker`.

- **`RequestQuoteDialog`** — Angular dialog built on `DialogShell`. It shows "What do you need?" (required,
  input stops at 2,000 characters), "Needed by" (optional date), "Budget" (optional text, input stops at 60
  characters) and "Phone" (optional, prefilled from the profile, hint "Shared with {business} for this request
  only."). After success it shows "Quote request sent to {business}." with "Close" and "View request".
- **`QuoteFormValidators`** — Angular validator functions for the dialog. An empty description shows "Describe
  what you need in a sentence or two so {owner} can price it." A phone that is not 10 digits shows "Enter a
  10-digit phone number, like 416-555-0142, or leave it empty." A past "Needed by" date shows "Choose a date
  from today on."
- **`SessionService`** — supplies the signed-in member's profile phone for the prefill and the e-mail
  confirmation state that blocks the action in the UI (`L2-005`).
- **`RequestsApi`** — typed Angular HTTP client. `requestQuote` calls `POST /api/requests/quotes` with an
  `Idempotency-Key` header from `IdempotencyKeyFactory`.
- **`RequestsController`** — ASP.NET Core controller in `Jubilee.Api`. It authenticates the session cookie,
  applies the `ConfirmedMember` policy (HTTP 403 with code `EMAIL_UNCONFIRMED`) and sends `RequestQuoteCommand`
  through MediatR. `IdempotencyMiddleware` returns the original result for a repeated key within 24 hours
  (`L2-132`).
- **`RequestQuoteCommand`** — request object carrying `ListingId`, optional `ServiceId`, `Description`,
  `NeededBy`, `Budget` and `Phone`.
- **`RequestQuoteCommandValidator`** — FluentValidation validator that repeats the dialog rules on the server:
  `Description` required and at most 2,000 characters, `Budget` at most 60 characters, `Phone` empty or 10
  digits, `NeededBy` empty or not before today in `America/Toronto` (from `IClock`). A failure returns HTTP 422
  with a per-field code.
- **`RequestQuoteCommandHandler`** — MediatR handler. It loads the listing, creates the `Request` with its
  `QuoteDetails`, appends a quote card to the member–business `Conversation`, and writes the owner's
  notification, e-mail and real-time event to the outbox in one unit of work.
- **`Request`** — domain entity in `Jubilee.Domain` that owns the request lifecycle (`L2-043`). `RequestStatus`
  holds `New`, `Confirmed`, `Declined`, `Cancelled` and `Completed`. The allowed transitions are `New` →
  `Confirmed` (the owner confirms), `New` → `Declined` (the owner declines), `New` or `Confirmed` → `Cancelled`
  (the member cancels) and `Confirmed` → `Completed` (a booking's meeting end time passes, or the owner marks an
  order fulfilled). `UndoLastTransition` returns a request to its previous status within 8 seconds of a cancel
  or a confirm. Each other transition throws `InvalidTransitionException`; the API maps it to HTTP 409 with code
  `INVALID_TRANSITION` and leaves the request unchanged.
- **`RequestTransition`** — child entity of `Request` that records each transition with actor, time and previous
  status. The progress timeline reads these records.
- **`QuoteDetails`** — value object owned by a `Request` of type `Quote`. It holds `ServiceId`, `Description`,
  `NeededBy`, `Budget` and `Phone`.
- **`PhoneNumber`** — value object that stores 10 digits and formats them as `416-555-0142`. The owner's views
  read the phone from `QuoteDetails` only, so the number is visible for that request alone.
- **`OutboxDispatcherJob`** — hosted job in `Jubilee Worker`. It reads the `OutboxMessage` rows written in the
  same transaction, stores the in-app `Notification`, sends the e-mail through `IEmailSender` and pushes the
  real-time event through `EventsHub`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1)
requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-045` | `L1-007` | From a service whose action is "Ask for a quote", or from "Ask" on a shop's custom work, a member shall be able to ask for a quote. |
| `L2-043` | `L1-007` | Each booking, quote and order request shall follow one lifecycle shared by the member's and the owner's views. |
| `L2-005` | `L1-001` | Until the e-mail is confirmed, a member may browse, search and save but shall not message, book, request or list a business. |
| `L2-126` | `L1-018` | A dialog form with errors shall show each message under its field, shall move focus to the first invalid field and shall keep the typed values. The server shall enforce each rule that the browser enforces and return the same message code. |
| `L2-132` | `L1-018` | Each create request shall carry a client-generated idempotency key, and the server shall return the original result for a repeated key within 24 hours without creating a duplicate. |

## Diagrams

### System context

A member asks a business for a quote through Jubilee. Jubilee tells the owner in the application and through the
external e-mail provider.

![C4 system context for requesting a quote](diagrams/c4-context.png)

### Containers

The quote request travels from `Jubilee Web` to `Jubilee API`, which stores it in `Jubilee database` and keeps
the idempotency key in `Cache`. `Jubilee Worker` dispatches the outbox.

![C4 container view for requesting a quote](diagrams/c4-container.png)

### Components

`RequestQuoteDialog` validates with `QuoteFormValidators` and calls `RequestsController` through `RequestsApi`.
The handler creates the `Request` after `RequestQuoteCommandValidator` passes.

![C4 component view for requesting a quote](diagrams/c4-component.png)

### Class structure

`RequestQuoteCommandHandler` handles `RequestQuoteCommand` and creates a `Request` that owns one `QuoteDetails`
with an optional `PhoneNumber`.

![Class diagram for requesting a quote](diagrams/class-structure.png)

### Behaviour — send a quote request

The dialog validates the fields and sends the request with an idempotency key. The API enforces `L2-005` and
`L2-132`, the server validator repeats the `L2-045` rules, and the handler creates the request with status `New`
(`L2-043`).

![Sequence diagram for sending a quote request](diagrams/sequence-request-quote.png)

### Behaviour — repeat a quote request with the same key

A double-click or a network retry reaches the API with the same idempotency key. `IdempotencyMiddleware` returns
the stored result and no second request is created (`L2-132`).

![Sequence diagram for a repeated quote request](diagrams/sequence-repeat-request.png)
