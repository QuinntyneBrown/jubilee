# Queue messages offline

## Overview

Jubilee is Toronto's Christian marketplace, where a member and a business talk
in a private one-to-one conversation. A member often writes a reply on a phone
at a moment when the connection is gone. This feature keeps that reply on the
device and delivers it when the connection returns, so that no message is lost
and none is delivered twice.

Three terms are used throughout:

- **outgoing queue** — ordered list of messages stored on the device that the server has not yet accepted
- **drain** — pass over the outgoing queue that sends each waiting message in the order it was written
- **idempotency key** — client-generated identifier sent with a create request so that a repeated request returns the original result instead of creating a duplicate (L2-132)

A message sent while offline appears in the conversation at once, marked
"Waiting to send". When the connection returns, the queue drains automatically:
each message is posted in order with the idempotency key it was given when it
was written. After a successful drain the connection banner reads "You're back
online. {n} saved message(s) was/were sent." with the count and the verb in the
correct singular or plural form.

A message that is still unsent 24 hours after it was written stops waiting. It
is marked "Not sent" and offers "Try again" and "Delete".

## Description

The slice runs from the message composer through the outgoing queue on the
device to the message endpoint of `Jubilee API`.

- **`MessageComposer`** — component on `ConversationPage`
  (`/messages/:conversationId`). It stays enabled offline; the
  `jbRequiresConnection` directive that disables other controls is not applied
  to it (L2-119).
- **`ConversationStore`** — signal store behind `ConversationPage`. On send it
  asks `IdempotencyKeyFactory` for a key. Online, it posts through
  `MessagesApi`; offline, it hands the message to `OutgoingMessageQueue`. It
  merges queued messages into the thread so that they show in place.
- **`OutgoingMessageQueue`** — IndexedDB database `jubilee-outbox` with the
  object store `messages`, readable by both `Jubilee Web` and the `Jubilee
  service worker`. It offers `enqueue`, `nextWaiting`, `markSent`,
  `markNotSent`, `retry` and `remove`.
- **`QueuedMessage`** — queue record: `id`, `conversationId`, `body`,
  `idempotencyKey`, `sequence`, `queuedAt` (UTC) and `state`. `sequence` is a
  number that increases with each enqueue and fixes the sending order.
- **`QueuedMessageState`** — `WaitingToSend`, `Sending`, `Sent`, `NotSent`. The
  thread shows "Waiting to send" for the first two states and "Not sent" for the
  last.
- **`QueueDrainer`** — sends waiting messages in `sequence` order, one at a
  time, through `MessagesApi` with the header `Idempotency-Key`. It starts when
  `ConnectionService` reports `Online`. A network failure or a `5xx` response
  stops the pass and leaves the message `WaitingToSend`, which preserves order.
  A `4xx` response other than `408` and `429` marks the message `NotSent`. The
  drainer holds the Web Lock `jubilee-outbox`, so that one drain runs at a time
  across tabs and the service worker.
- **`OutboxSyncHandler`** — `sync` event listener in the `Jubilee service
  worker` for the tag `jubilee-outbox`. In browsers with Background Sync it runs
  the same drain when no page is open. In other browsers the queue drains the
  next time `Jubilee Web` is open and online.
- **`QueueExpiryMonitor`** — checks the queue on application start, on each
  drain and every 60 seconds while a page is open. A message whose `queuedAt` is
  more than 24 hours old becomes `NotSent`. "Try again" calls `retry`, which
  keeps the `idempotencyKey`, resets `queuedAt` and returns the message to
  `WaitingToSend`. "Delete" calls `remove`.
- **`ConnectionBanner`** — shared banner. After a drain that sent `n` messages
  it shows the dismissible success variant: "You're back online. 1 saved message
  was sent." for `n = 1`, and "You're back online. {n} saved messages were
  sent." otherwise.
- **`ConversationsController`** — `Jubilee API` controller. `POST
  /api/conversations/{conversationId}/messages` authenticates the session,
  applies the participant policy and sends `SendMessageCommand`.
- **`IdempotencyMiddleware`** — returns the stored response for a repeated
  `Idempotency-Key` within 24 hours without running the handler again (L2-132).
- **`SendMessageCommandHandler`** — loads the `Conversation`, calls
  `Conversation.AddMessage`, and saves the `Message` and an `OutboxMessage` in
  one unit of work. `Jubilee Worker` dispatches the outbox entry to the
  recipient over `EventsHub`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-120` | `L1-017` | The system shall store a message sent while offline on the device marked "Waiting to send" and shall send queued messages automatically when the connection returns, in order, each with its idempotency key. The banner shall then report the number of saved messages sent with correct pluralisation, and a queued message that cannot be sent after 24 hours shall be marked "Not sent" with "Try again" and "Delete". |
| `L2-132` | `L1-018` | Each create request shall carry a client-generated idempotency key, and the server shall return the original result for a repeated key within 24 hours without creating a duplicate. |
| `L2-119` | `L1-017` | While offline, search, save, request and send controls shall be disabled with an explanation, except sending messages, which are queued. |

## Diagrams

### System context

A `Member` or an `Owner` writes messages to the other party of a conversation
through Jubilee. No external system takes part.

![C4 system context for queueing messages offline](diagrams/c4-context.png)

### Containers

`Jubilee Web` and the `Jubilee service worker` share the outgoing queue on the
device. Either one posts queued messages to `Jubilee API`, which checks the
idempotency key in the `Cache` and stores the message in the `Jubilee
database`. `Jubilee Worker` delivers the message event to the recipient.

![C4 container view for queueing messages offline](diagrams/c4-container.png)

### Components

`ConversationStore` routes a send to `MessagesApi` or to `OutgoingMessageQueue`
according to `ConnectionService`. `QueueDrainer` and `OutboxSyncHandler` empty
the queue; `QueueExpiryMonitor` marks messages older than 24 hours.

![C4 component view for queueing messages offline](diagrams/c4-component.png)

### Class structure

`OutgoingMessageQueue` owns `QueuedMessage` records, each in one
`QueuedMessageState`. On the server, `SendMessageCommandHandler` adds a
`Message` to a `Conversation`, and `IdempotencyRecord` ties the key to the
stored response.

![Class diagram for queueing messages offline](diagrams/class-structure.png)

### Behaviour — queue a message while offline

`ConversationStore` assigns the idempotency key before it checks the connection.
Offline, the message goes to `OutgoingMessageQueue` and shows as "Waiting to
send".

![Sequence diagram for queueing a message while offline](diagrams/sequence-queue-while-offline.png)

### Behaviour — send queued messages on reconnect

`QueueDrainer` posts each waiting message in order. `IdempotencyMiddleware`
replays the stored response when a message already reached the server, and the
banner reports the count.

![Sequence diagram for sending queued messages on reconnect](diagrams/sequence-drain-on-reconnect.png)

### Behaviour — expire a message after 24 hours

`QueueExpiryMonitor` marks a message "Not sent" once it has waited 24 hours.
The member then retries or deletes it.

![Sequence diagram for expiring a message after 24 hours](diagrams/sequence-expire-after-24-hours.png)
