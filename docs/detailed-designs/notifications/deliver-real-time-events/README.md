# Deliver real-time events

## Overview

Jubilee is Toronto's Christian marketplace, in which members message verified
businesses and send them requests. Several pages change while they are open: a
reply arrives in a conversation, a request is confirmed, a badge count rises.
This feature covers the transport that carries those changes from the server to
an open, signed-in page without a reload.

The terms below are local to this feature.

- **real-time event** — small typed record, addressed to one member, that tells an open page that state changed
- **persistent connection** — long-lived connection from the page to the server, over WebSocket or server-sent events
- **event ID** — identifier that orders the events addressed to one member
- **event log** — per-member, ordered store of recent events used to replay what a page missed
- **replay** — delivery, after a reconnect, of the events that follow the last event ID the page received

The transport carries three families of event: notification, message and
request events, plus the badge changes derived from them. An event reaches the
page within `2 seconds` at the 95th percentile. A client receives only events
addressed to its authenticated member. After a dropped connection the page
receives what it missed, and no event is shown twice.

The feature is infrastructure for other slices. `exchange-messages`,
`read-inbox`, `view-notification-centre` and `show-toasts-and-banners` consume
its events; none of them opens a connection of its own. The conversation page
and the inbox consume the existing `notification` and `counts` events of the
stream `GET /api/events` and add no event type: a `message` or `request`
notification makes the open conversation and the inbox list read again, and the
`counts` event corrects the unread count (ADR 0025, ADR 0037).

## Description

The feature spans `Jubilee Web`, `Jubilee API`, `Jubilee Worker` and `Cache`.

- **`RealtimeClient`** — Angular service and the only holder of the connection.
  `SessionService` starts it after sign-in and stops it at sign-out. It exposes
  `on(type)` so feature stores subscribe by event type. It keeps the last event
  ID and a set of event IDs already seen, and drops an event whose ID is in the
  set.
- **`ConnectionState`** — `Connecting`, `Connected`, `Reconnecting` or
  `Disconnected`. `ConnectionService` reads the state for the connection banner.
  Reconnect attempts use exponential back-off from `5 seconds` to at most
  `60 seconds` (L2-121).
- **`EventsHub`** — SignalR hub in `Jubilee.Api` at `/api/events`. It uses
  WebSocket and falls back to server-sent events. `OnConnectedAsync` adds the
  connection to the group `member:{memberId}`, taken from the authenticated
  session. The hub offers no method to join another group, so a client cannot
  subscribe to another member's events.
- **`SessionAuthenticationMiddleware`** — authenticates the session cookie when
  the connection is opened. A request without a valid session receives HTTP
  `401`. The hub closes a connection when its session ends.
- **`RealtimeEvent`** — `EventId`, `Type`, `OccurredAt` and a JSON `Payload`
  that carries identifiers and display fields for the addressed member only.
- **`RealtimeEventType`** — `NotificationCreated` (`notification.created`),
  `MessageCreated` (`message.created`), `RequestUpdated` (`request.updated`) and
  `BadgeChanged` (`badge.changed`).
- **`IRealtimePublisher`** and **`RealtimePublisher`** — application interface
  and its infrastructure adapter, called by outbox handlers in `Jubilee Worker`.
  `PublishAsync` appends the event to the member's event log, takes the next
  event ID, and publishes the event to the hub backplane in `Cache`.
- **`OutboxDispatcherJob`** — hosted job that reads undispatched `OutboxMessage`
  rows. Because the state change and the outbox row commit together, an event is
  published only for a change that was saved. The job's polling interval is
  `<TO SUPPLY>` and shall fit inside the `2 seconds` delivery target.
- **`IEventLog`** — application service over a per-member ordered log in
  `Cache`. `ReadAfterAsync` returns the events after a given event ID. The
  retention period and maximum length of the log are `<TO SUPPLY>`.
- **`EventsHub.Resume`** — hub method the client calls after each reconnect with
  its last event ID. It returns the missed events in order. When the log no
  longer covers that ID it returns `Complete = false`, and the feature stores
  reload their state through the HTTP API.
- **Hub backplane** — Redis channel through which every `Jubilee API` instance
  receives published events, so delivery does not depend on which instance holds
  the connection.
- **Delivery latency metric** — `EventsHub` records the time from `OccurredAt`
  to the send on each connection and reports it to the `Observability platform`
  (vendor `<TO SUPPLY>`), where the 95th percentile is compared with `2 seconds`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-070` | `L1-010` | A notification, message or request event for a user shall reach that user's open signed-in page within 2 seconds at the 95th percentile over a persistent connection (WebSocket or server-sent events). After a reconnect, the events missed since the last received event ID shall be delivered and nothing shall be shown twice. A client shall receive only events addressed to its authenticated user. |
| `L2-121` | `L1-017` | The application shall tell the user about connection state through a banner, and shall retry a dropped connection with exponential back-off from 5 seconds to at most 60 seconds. |

## Diagrams

### System context

Jubilee pushes events to members and owners who keep a signed-in page open, and
reports delivery latency to the external observability platform.

![C4 system context for real-time delivery](diagrams/c4-context.png)

### Containers

`Jubilee Web` holds one persistent connection to `Jubilee API`.
`Jubilee Worker` reads the outbox in `Jubilee database`, appends events to the
event log in `Cache`, and publishes them to the backplane that the API
subscribes to.

![C4 container view for real-time delivery](diagrams/c4-container.png)

### Components

`SessionService` starts `RealtimeClient`, which dispatches events to the feature
stores. In the API, `SessionAuthenticationMiddleware` authenticates the
connection and `EventsHub` delivers and replays events using `IEventLog`. In the
worker, `OutboxDispatcherJob` publishes through `RealtimePublisher`.

![C4 component view for real-time delivery](diagrams/c4-component.png)

### Class structure

`RealtimeClient` has a `ConnectionState` and receives `RealtimeEvent` records
from `EventsHub`. `RealtimePublisher` implements `IRealtimePublisher` and
appends to `IEventLog`; `EventsHub` reads the same log to build a
`ResumeResult`.

![Class diagram for real-time delivery](diagrams/class-structure.png)

### Behaviour — deliver an event to an open page

A command handler commits a state change with an outbox row. The worker assigns
an event ID, appends to the log and publishes to the backplane; the hub sends
the event only to the addressed member's connections, and the client drops
duplicates before dispatching to a store.

![Sequence diagram for delivering an event](diagrams/sequence-deliver-event.png)

### Behaviour — reconnect and replay missed events

The client reconnects with back-off and calls `Resume` with its last event ID.
The hub returns the missed events from the log; the client discards IDs already
seen. When the log no longer covers the ID, the stores reload through the HTTP
API.

![Sequence diagram for reconnecting and replaying missed events](diagrams/sequence-reconnect-and-replay.png)
