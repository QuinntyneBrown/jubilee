# View the notification centre

## Overview

Jubilee is Toronto's Christian marketplace, in which members message verified
businesses and send them booking, quote and order requests. The notifications
subsystem tells members and owners about events that concern them. This feature
covers the in-app part that a member reads on demand: the notification centre at
`/notifications` and the unread badges in the navigation.

The terms below are local to this feature.

- **notification** — stored record, addressed to one member, of one event with a title, a detail line, a time and a target
- **target** — request, conversation or listing that a notification opens when pressed
- **unread badge** — count shown on a navigation item, read aloud as "{n} unread"
- **new request** — request sent to an owner's business whose status is `new`

Notifications are created by the system, never by the member. Each state change
that matters writes an event to the transactional outbox; `Jubilee Worker` turns
that event into one notification per recipient. The centre lists the
notifications of the last `90 days`, newest first, and lets the member mark one
or all of them read.

Two badges are in scope. "Messages" carries the number of unread conversations
on every page that shows the top bar or tab bar. The "Requests" tab of the owner
workspace carries the number of new requests. Toasts for the same events are
described in `show-toasts-and-banners`, e-mail in `send-email-notifications`, and
the transport in `deliver-real-time-events`.

## Description

The feature is a vertical slice from the notifications page to the database,
with one background component.

- **`NotificationsPage`** — Angular page at `/notifications`, guarded by
  `AuthGuard`. With unread items it shows the count (for example "3 unread"),
  "Mark all as read" and "Settings", which links to `/account/notifications`.
  With none unread the heading shows no count.
- **`NotificationItem`** — Angular component for one row: title, detail line and
  time. An unread row is visually marked and carries the text "Unread." Pressing
  a row marks it read and navigates to its target.
- **Empty state** — with no notifications the page shows "No notifications yet.
  We'll tell you here when a business replies, confirms a booking or answers a
  quote." with the action "Browse businesses".
- **`NotificationsStore`** — signal store holding the list and the unread count.
  It prepends items from `notification.created` events received by
  `RealtimeClient`.
- **`UnreadBadge`** and **`BadgeStore`** — the badge component and the signal
  store behind it. `BadgeStore.label` returns the count, or "99+" for a count
  above `99`. The store loads counts once per page load, applies `badge.changed`
  events, and reloads after each reconnect so a badge follows a change made on
  another device within `5 seconds`.
- **`NotificationsApi`** — typed HTTP client for `GET /api/notifications`,
  `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all` and
  `GET /api/badges`.
- **`NotificationsController`** — ASP.NET Core controller. It authenticates the
  session cookie, applies the endpoint policy and dispatches through MediatR.
- **`ListNotificationsQueryHandler`** — returns the caller's notifications with
  `CreatedAt` within the last `90 days`, ordered newest first. Paging of the list
  is `<TO SUPPLY>`.
- **`MarkNotificationsReadCommandHandler`** — with a `NotificationId` it loads
  that notification for its recipient and calls `Notification.MarkRead`; another
  member's notification returns HTTP `404` (L2-133). Without an ID it sets
  `ReadAt` on every unread notification of the caller. Both routes return
  `204 No Content` and write a `badge.changed` outbox row.
- **`GetBadgeCountsQueryHandler`** — returns `BadgeCounts`: unread conversations
  of the caller, unread notifications, and, for an owner, requests with status
  `new` on owned listings.
- **`Notification`** — domain entity with `RecipientMemberId`, `Type`, `Title`,
  `Detail`, a `NotificationTarget` and `ReadAt`.
- **`NotificationType`** — enumeration of the events that create a
  notification, with the recipient of each: `RequestCreated` (owner);
  `RequestConfirmed`, `RequestDeclined`, `RequestCancelled` (other party);
  `NewMessage` (other participant); `ListingVerified`, `ChangesRequested`
  (owner); `EmailConfirmed` (member); `ProductBackInStock`
  (subscribed member); `NewBusinessInCategory` (opted-in member);
  `MeetingReminder` (member and owner, L2-069).
- **`NotificationProjector`** — outbox event handler in `Jubilee Worker`. It
  resolves the recipients for the event type, inserts one `Notification` per
  recipient, and publishes `notification.created` and `badge.changed` to each
  recipient through `INotificationPublisher`.
- **Load error** — when the list fails to load, the page shows the standard
  load-error state with the reference `JB-NTF-503` (L2-118).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-064` | `L1-010` | The page `/notifications` shall list events for the member, newest first. |
| `L2-065` | `L1-010` | "Messages" shall carry a badge with the number of unread conversations and the owner's "Requests" tab shall carry the number of new requests. A count above 99 shall read "99+", and a badge shall follow a change made on another device within 5 seconds while the page is open. |
| `L2-118` | `L1-016` | Every load-error state shall show a reference the user can quote to support. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on every API call, and shall return 404 for another member's notification. |

## Diagrams

### System context

Members and owners read notifications and see unread badges in Jubilee. The
feature involves no external system.

![C4 system context for the notification centre](diagrams/c4-context.png)

### Containers

`Jubilee Web` calls the notification and badge endpoints of `Jubilee API` and
receives pushed events from it. `Jubilee Worker` reads the outbox, writes
notifications to `Jubilee database`, and publishes real-time events through
`Cache`.

![C4 container view for the notification centre](diagrams/c4-container.png)

### Components

`NotificationsPage` and `UnreadBadge` read from `NotificationsStore` and
`BadgeStore`, which load through `NotificationsApi` and are updated by
`RealtimeClient`. `NotificationsController` dispatches to the list, mark-read and
badge-count handlers. `NotificationProjector` in the worker inserts
notifications.

![C4 component view for the notification centre](diagrams/c4-component.png)

### Class structure

`Notification` has a `NotificationType` and a `NotificationTarget` with a
`TargetKind`. `NotificationProjector` creates notifications;
`ListNotificationsQueryHandler` reads them; `NotificationsController` returns
`BadgeCounts` to `BadgeStore`.

![Class diagram for the notification centre](diagrams/class-structure.png)

### Behaviour — load and read notifications

The list query returns the caller's notifications from the last `90 days`.
Pressing an item marks it read and opens its target; "Mark all as read" clears
every unread mark and the count in the heading.

![Sequence diagram for loading and reading notifications](diagrams/sequence-load-and-read-notifications.png)

### Behaviour — create a notification from an event

A command handler commits its state change and an outbox row together.
`OutboxDispatcherJob` passes the row to `NotificationProjector`, which inserts a
notification per recipient and publishes the real-time events that reach the
open page.

![Sequence diagram for creating a notification from an event](diagrams/sequence-create-notification.png)

### Behaviour — update unread badges

`BadgeStore` loads the counts on page load, caps the label at "99+", and
applies `badge.changed` events. After a reconnect it reloads the counts.

![Sequence diagram for updating unread badges](diagrams/sequence-update-unread-badges.png)
