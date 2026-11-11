# Start a conversation

## Overview

Jubilee is Toronto's Christian marketplace: a directory of verified
Christian-owned businesses that members find, message and send requests to.
Messaging is the private channel between one member and one business. This
feature covers the first step of that channel: a member presses "Message" on a
listing, writes a first message in a dialog, and the exchange continues on the
Messages pages.

The terms below are used throughout the messaging subsystem.

- **conversation** — private one-to-one thread between one member and one business listing
- **first message** — message text entered in the new-message dialog that opens or continues a conversation
- **idempotency key** — client-generated identifier that lets the server recognise a repeated create request

Exactly one conversation exists for each pair of member and listing. When the
member has written to the business before, the first message is added to the
existing conversation; otherwise the feature creates the conversation and adds
the message in the same transaction. On success the dialog closes and the
conversation opens at `/messages/:id` (ADR 0014).

The feature sits between the listing pages (`/b/:slug`) and the conversation
page described in `exchange-messages`. A visitor who presses "Message" is first
routed through the sign-in-required dialog, which belongs to the accounts
subsystem; this slice starts once a signed-in member opens the dialog.

## Description

The feature is a vertical slice from the listing page to the database. Nothing
is built yet; the names below are the names the design introduces.

- **`BusinessPage`** — Angular page at `/b/:slug`. Its "Message" action opens
  `NewMessageDialog` with the listing's name, the owner's name and the reply-time
  hint. The reply-time hint ("usually replies within a day") comes from the listing's
  stored median first-reply band, the same value the listing page shows as
  "Replies" (ADR 0014).
- **`NewMessageDialog`** — Angular dialog built on `DialogShell`. For Legacy
  Financial it is titled "Message Legacy Financial" and states "Trevor Chew
  usually replies within a day. The conversation continues in Messages." It holds
  one required field, "Your message", with the hint "Be specific and Trevor can
  answer in one reply." and the actions "Cancel" and "Send message". Its states
  are `Default`, `Invalid`, `Busy` and `Failed`.
- **Message length rule** — the field stops input at `4,000` characters and shows
  a counter of remaining characters during the last `200` characters. An empty
  message shows "Write a message before sending." under the field and focus moves
  to the field (L2-126).
- **`IdempotencyKeyFactory`** — Angular service. The dialog takes one key when it
  opens and reuses that key for every send attempt of the same text.
- **`MessagesApi`** — service contract with the injection token `MESSAGES_API`.
  `start` issues `POST /api/conversations` with the body
  `{ listingSlug, body, idempotencyKey }`.
- **Idempotency** — a unique index on `(SenderSubject, IdempotencyKey)` of
  `Messages`. A repeated key answers the original conversation and message and
  writes nothing (L2-132, ADR 0014). No middleware and no cache take part.
- **`ConversationsController`** — ASP.NET Core controller. It authenticates the
  session cookie, applies the endpoint policy, and sends
  `StartConversationCommand` through MediatR. The policy refuses a member whose
  e-mail is unconfirmed with HTTP `403` and code `EMAIL_UNCONFIRMED` (L2-005).
- **`StartConversationCommandValidator`** — FluentValidation validator. It
  enforces the same rules as the dialog: text is required after trimming and is
  at most `4,000` characters. A failure returns HTTP `422` with the per-field
  codes `REQUIRED` or `TOO_LONG` (ADR 0014).
- **`StartConversationCommandHandler`** — MediatR handler. It answers the
  original result for a repeated idempotency key. Otherwise it looks up the
  conversation for the member and the listing, creates one through
  `Conversation.Start` when none exists, adds the message, and saves the
  conversation, the message and the owner's notification in one unit of work. A
  unique index on `(ListingId, MemberSubject)` guarantees one conversation per
  pair under concurrent requests. An owner who messages their own listing
  receives `409` with code `OWN_LISTING`. The handler refuses more than 30
  messages in 10 minutes and more than 10 new conversations in 24 hours per
  member with `429` and `Retry-After` (L2-137, ADR 0014).
- **`Conversation`** and **`Message`** — domain entities. `Conversation` holds
  its `LastMessageAt` timestamp and one read mark per side; `Message` carries the
  sender, the body, the sent time and the idempotency key.
- **`StartedConversationDto`** — response body with `ConversationId` and
  `MessageId`. The controller returns `201 Created` whether the conversation is
  new or reused.
- **After success** — there is no toast: the dialog closes and `/messages/:id`
  opens with the sent message in it (ADR 0014).
- **Failed state** — when the request fails, the dialog stays open, keeps the
  typed text, and shows "We couldn't send that. Your connection dropped before it
  reached us. Nothing was sent and what you typed is still here. Try again." A
  further send reuses the same idempotency key.
- **Notifying the owner** — the handler writes the owner's `message`
  notification and queues the new-message e-mail. The event stream delivers the
  notification to the owner's open page (ADR 0025). The notification centre, the
  e-mail and the stream are designed in the notifications subsystem.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-055` | `L1-009` | The "Message" action on a listing shall open a dialog for a first message. The conversation shall continue in Messages. |
| `L2-005` | `L1-001` | Until the e-mail is confirmed, a member may browse, search and save but shall not message, book, request or list a business. |
| `L2-126` | `L1-018` | A dialog form with errors shall show each message under its field, move focus to the first invalid field, keep the typed values, and apply the same rule and message code on the server. |
| `L2-132` | `L1-018` | Each create request shall carry a client-generated idempotency key, and the server shall return the original result for a repeated key within 24 hours without creating a duplicate. |

## Diagrams

### System context

A member sends a first message through Jubilee. Jubilee notifies the owner of
the listing in the application and through the external e-mail provider.

![C4 system context for starting a conversation](diagrams/c4-context.png)

### Containers

The request travels from `Jubilee Web` to `Jubilee API`, which checks the
idempotency key and persists state in `Jubilee database`. `Jubilee Worker`
reads the outbox and sends the new-message e-mail.

![C4 container view for starting a conversation](diagrams/c4-container.png)

### Components

`BusinessPage` opens `NewMessageDialog`, which calls `MessagesApi`. In the API,
`ConversationsController` validates and dispatches `StartConversationCommand`
to its handler; the handler checks the idempotency key, mutates `Conversation`
and persists it with the owner's notification.

![C4 component view for starting a conversation](diagrams/c4-component.png)

### Class structure

`NewMessageDialog` holds a `DialogState` and calls `MessagesApi`.
`StartConversationCommandHandler` handles `StartConversationCommand`, finds or
creates a `Conversation` that contains one or more `Message` entities, and
returns `StartedConversationDto`.

![Class diagram for starting a conversation](diagrams/class-structure.png)

### Behaviour — send a first message

The dialog rejects an empty message locally. For a valid message the API checks
the idempotency key and the endpoint policy, reuses or creates the conversation,
and commits the message and the owner's notification together; the dialog then
closes and the conversation opens.

![Sequence diagram for sending a first message](diagrams/sequence-send-first-message.png)

### Behaviour — recover from a failed send

When the request or its response is lost, the dialog keeps the text and shows
the failure message. The next attempt carries the same idempotency key, so the
handler returns the original result when the first attempt arrived and creates
the message once when it did not.

![Sequence diagram for recovering from a failed send](diagrams/sequence-recover-from-failed-send.png)
