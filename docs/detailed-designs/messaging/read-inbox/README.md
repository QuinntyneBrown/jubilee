# Read the inbox

## Overview

Jubilee is Toronto's Christian marketplace, in which members message verified
Christian-owned businesses. Each exchange between one member and one business is
a conversation. This feature covers the inbox: the page at `/messages` that
lists a member's conversations, lets the member search them, and shows which
ones are unread or muted. It also covers the mute flag the list shows.

The terms below are local to this feature.

- **inbox** — list of every conversation in which the signed-in member participates
- **participant** — one of the two sides of a conversation: the member who started it, or the business, represented by the owner of the listing
- **unread conversation** — conversation in which the other side wrote after the participant's read mark
- **muted conversation** — conversation for which one participant has turned off e-mail about new replies

An owner sees two kinds of conversation in one list: personal conversations the
owner started as a member, and conversations addressed to a business the owner
owns. Every row is labelled with the business name. Rows are ordered by most
recent activity.

Muting affects e-mail only. A muted conversation still counts toward in-app
unread counts and still updates in real time. The e-mail decision itself is made
in `send-email-notifications`, which reads the mute flag this feature stores.
The member mutes from the menu of an open conversation, described in
`report-conversation`. Opening a conversation from the list is described in
`exchange-messages`.

## Description

The feature is a vertical slice from the Messages page to the database.

- **`MessagesPage`** — Angular page at `/messages`, guarded by `AuthGuard`. It
  shows the summary line (for example "4 conversations · 2 unread"), the search
  field and the conversation list. At a viewport of `1024 px` or wider it adds a
  reading pane on the right; with no conversation open the pane shows "Pick a
  conversation. Choose one on the left to read and reply."
- **`ConversationRow`** — one row of the list: initials, business name, time of
  the last message, and a one-line preview prefixed "You:" or "{sender first
  name}:", cut at 120 characters. A message that is a photo with no text previews
  as "Photo". An unread row is visually marked and carries the text "Unread." for
  assistive technology. A muted row carries the text "Muted." in the same way.
- **Empty state** — with no conversations the page shows "Start a conversation.
  Open a business and tap Message to ask a question, get a quote or book a time.
  Replies land here." with the action "Browse businesses".
- **`InboxSearchBox`** — Angular component labelled "Search messages". It
  debounces input so the filtered list appears within `300 ms` of the last
  keystroke. With no match it shows "No messages match “roofing”. Check the
  spelling, or search by business name." with "Clear search".
- **`MessagesStore`** — signal store holding the rows, the totals and the search
  term. It reads the list again on each `notification` event of kind `message`
  that `RealtimeService` publishes from the event stream (`GET /api/events`,
  ADR 0025, ADR 0038), so rows reorder and unread marks change without a reload.
  No event type is added to the stream for messaging.
- **Unread count** — the navigation badge follows the `counts` event of the same
  stream, which `RealtimeService` applies to `NavigationStore`. Reading an open
  conversation marks it read on the server, and the next `counts` event corrects
  the badge.
- **`MessagesApi`** — service contract with the injection token `MESSAGES_API`
  for `GET /api/conversations`, `GET /api/conversations?q={term}` and
  `PUT /api/conversations/{id}/mute`.
- **`ConversationsController`** — ASP.NET Core controller. It authenticates the
  session cookie, applies the endpoint policy and dispatches the query or
  command through MediatR.
- **`GetInboxQueryHandler`** — MediatR handler. It selects conversations in
  which the caller is the member or owns the listing, orders them by
  `LastMessageAt` descending, and builds an `InboxRowDto` per row. With a search
  term it keeps only conversations whose business name, participant name or
  message text matches, and it applies the participant filter before the match
  so search never reaches another member's conversations. The match is a
  case-insensitive contains match over the business name, the owner's name, the
  member's name and the text of messages the person may see. The list holds at
  most 200 conversations and is not paged yet (ADR 0014).
- **`InboxDto`** and **`InboxRowDto`** — response types carrying `TotalCount`,
  `UnreadCount` and one row per conversation with `Unread` and `Muted`.
- **`SetConversationMutedCommandHandler`** — MediatR handler behind the mute
  route. `PUT /api/conversations/{id}/mute` takes `{ muted: true | false }`. The
  handler loads the conversation for a participant, calls `Conversation.Mute`
  for the caller's side, and saves. A caller who is not a participant receives
  HTTP `404` (L2-133). The route is idempotent and returns `204 No Content`.
- **`Conversation`** — domain entity. It holds one read mark per side,
  `MemberReadAt` and `OwnerReadAt`, from which `Unread` is derived, and one mute
  flag per side, `MemberMuted` and `OwnerMuted` (ADR 0014). A message hidden by
  the member's block is neither shown to the member nor counted as unread.
- **Mute toast** — after a successful mute, `ToastService` shows "Conversation
  muted. You won't be e-mailed about new replies here." with "Undo". "Undo" sends
  the opposite value to the same route. When the mute cannot be saved, the
  conversation stays as it was and an error toast says "We couldn't mute this
  conversation. Try again."
- **Load error** — when the list fails to load, the page shows the standard
  load-error state with the reference `JB-MSG-503`, or `JB-MSG-502` when an
  upstream dependency failed (L2-118).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-056` | `L1-009` | The page `/messages` shall list the member's conversations. |
| `L2-059` | `L1-009` | The inbox search shall show, within 300 ms of the last keystroke, only conversations whose business name, participant name or message text matches. The search shall cover only conversations in which the member participates. |
| `L2-061` | `L1-009` | A member may mute a conversation so that no e-mail is sent about new replies in it while in-app unread counts still update. Unmuting shall resume the e-mails. A muted conversation shall say "Muted" in words. |
| `L2-070` | `L1-010` | A notification, message or request event for a user shall reach that user's open signed-in page within 2 seconds at the 95th percentile over a persistent connection (WebSocket or server-sent events). After a reconnect, the events missed since the last received event ID shall be delivered and nothing shall be shown twice. A client shall receive only events addressed to its authenticated user. |
| `L2-118` | `L1-016` | Every load-error state shall show a reference the user can quote to support. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on every API call, and shall return 404 for another member's conversation. |

## Diagrams

### System context

Members and owners read and search their conversations through Jubilee.
The feature involves no external system.

![C4 system context for reading the inbox](diagrams/c4-context.png)

### Containers

`Jubilee Web` calls the conversation endpoints of `Jubilee API`, which reads and
writes `Jubilee database`. The API sends `notification` and `counts` events to
the open page on the event stream.

![C4 container view for reading the inbox](diagrams/c4-container.png)

### Components

`MessagesPage` renders `InboxSearchBox` and one `ConversationRow` per
conversation from `MessagesStore`. The store calls `MessagesApi`, and
`ConversationsController` dispatches to `GetInboxQueryHandler` or
`SetConversationMutedCommandHandler`. `EventsController` feeds
`RealtimeService`; each `message` notification makes the store read the list
again.

![C4 component view for reading the inbox](diagrams/c4-component.png)

### Class structure

`GetInboxQueryHandler` returns an `InboxDto` of `InboxRowDto` rows.
`SetConversationMutedCommandHandler` loads a `Conversation`, which holds a read
mark and a mute flag for each of its two sides.

![Class diagram for reading the inbox](diagrams/class-structure.png)

### Behaviour — load the inbox

The handler selects the conversations the caller takes part in, including those
addressed to an owned business, and orders them by latest activity. The page
shows the list, the empty state, or the reading-pane prompt on wide viewports.
A `message` notification on the event stream makes the store read the list
again.

![Sequence diagram for loading the inbox](diagrams/sequence-load-inbox.png)

### Behaviour — search the inbox

`InboxSearchBox` debounces typing and the store repeats the list query with a
search term. The handler matches only inside the caller's conversations and the
page shows either the matches or the no-results message.

![Sequence diagram for searching the inbox](diagrams/sequence-search-inbox.png)

### Behaviour — mute a conversation

"Mute" in the conversation menu sends `{ muted: true }` to the mute route, which
sets the mute flag of the caller's side, and the toast offers "Undo". "Undo" and
the later "Unmute" action both send `{ muted: false }` to the same route, after
which e-mails resume.

![Sequence diagram for muting a conversation](diagrams/sequence-mute-conversation.png)
