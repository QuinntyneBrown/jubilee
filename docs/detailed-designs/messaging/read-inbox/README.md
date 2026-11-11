# Read the inbox

## Overview

Jubilee is Toronto's Christian marketplace, in which members message verified
Christian-owned businesses. Each exchange between one member and one business is
a conversation. This feature covers the inbox: the page at `/messages` that
lists a member's conversations, lets the member search them, and lets the member
mute one.

The terms below are local to this feature.

- **inbox** — list of every conversation in which the signed-in member participates
- **participant** — one of the two sides of a conversation: the member who started it, or the business, represented by the owner of the listing
- **unread conversation** — conversation holding one or more messages after the participant's read position
- **muted conversation** — conversation for which one participant has turned off e-mail about new replies

An owner sees two kinds of conversation in one list: personal conversations the
owner started as a member, and conversations addressed to a business the owner
owns. Every row is labelled with the business name. Rows are ordered by most
recent activity.

Muting affects e-mail only. A muted conversation still counts toward in-app
unread counts and still updates in real time. The e-mail decision itself is made
in `send-email-notifications`, which reads the mute flag this feature stores.
Opening a conversation from the list is described in `exchange-messages`.

## Description

The feature is a vertical slice from the Messages page to the database.

- **`MessagesPage`** — Angular page at `/messages`, guarded by `AuthGuard`. It
  shows the summary line (for example "4 conversations · 2 unread"), the search
  field and the conversation list. At a viewport of `1024 px` or wider it adds a
  reading pane on the right; with no conversation open the pane shows "Pick a
  conversation. Choose one on the left to read and reply."
- **`ConversationRow`** — Angular component for one row: initials, business
  name, time of the last message, and a one-line preview prefixed "You:" or
  "{sender first name}:". An unread row is visually marked and carries the text
  "Unread." for assistive technology. The row menu offers "Mute" or "Unmute".
- **Empty state** — with no conversations the page shows "Start a conversation.
  Open a business and tap Message to ask a question, get a quote or book a time.
  Replies land here." with the action "Browse businesses".
- **`InboxSearchBox`** — Angular component labelled "Search messages". It
  debounces input so the filtered list appears within `300 ms` of the last
  keystroke. With no match it shows "No messages match “roofing”. Check the
  spelling, or search by business name." with "Clear search".
- **`MessagesStore`** — signal store holding the rows, the totals and the search
  term. It applies `message.created` events from `RealtimeClient` so rows reorder
  and unread marks change without a reload.
- **`MessagesApi`** — typed HTTP client for `GET /api/conversations`,
  `GET /api/conversations?q={term}`, `PUT /api/conversations/{id}/mute` and
  `DELETE /api/conversations/{id}/mute`.
- **`ConversationsController`** — ASP.NET Core controller. It authenticates the
  session cookie, applies the endpoint policy and dispatches the query or
  command through MediatR.
- **`ListConversationsQueryHandler`** — MediatR handler. It selects
  conversations in which the caller is the member or owns the listing, orders
  them by `LastActivityAt` descending, and builds a `ConversationSummary` per
  row. With a `SearchTerm` it keeps only conversations whose business name,
  participant name or message text matches, and it applies the participant
  filter before the match so search never reaches another member's
  conversations. The text-matching mechanism in `Jubilee database` is
  a case-insensitive contains match over the business name, the owner's name, the
  member's name and the message text. The list holds at most 200 conversations
  and is not paged yet (ADR 0014).
- **`InboxResult`** and **`ConversationSummary`** — response types carrying
  `Total`, `Unread` and one summary per row with `IsUnread` and `IsMuted`.
- **`SetConversationMuteCommandHandler`** — MediatR handler behind both mute
  routes. It loads the conversation for a participant, calls
  `ConversationParticipant.Mute` or `Unmute`, and saves. A caller who is not a
  participant receives HTTP `404` (L2-133). Both routes are idempotent and return
  `204 No Content`.
- **`ConversationParticipant`** — domain entity for one side of a conversation.
  It holds `LastReadSequence`, from which `IsUnread` is derived, and `MutedAt`.
- **Mute toast** — after a successful mute, `ToastService` shows "Conversation
  muted. You won't be e-mailed about new replies here." with "Undo". "Undo" calls
  the unmute route.
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
| `L2-061` | `L1-009` | A member may mute a conversation so that no e-mail is sent about new replies in it while in-app unread counts still update. Unmuting shall resume the e-mails. |
| `L2-118` | `L1-016` | Every load-error state shall show a reference the user can quote to support. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on every API call, and shall return 404 for another member's conversation. |

## Diagrams

### System context

Members and owners read, search and mute their conversations through Jubilee.
The feature involves no external system.

![C4 system context for reading the inbox](diagrams/c4-context.png)

### Containers

`Jubilee Web` calls the conversation endpoints of `Jubilee API`, which reads and
writes `Jubilee database` and checks the session in `Cache`. The API pushes
message events back to the open page.

![C4 container view for reading the inbox](diagrams/c4-container.png)

### Components

`MessagesPage` renders `InboxSearchBox` and one `ConversationRow` per
conversation from `MessagesStore`. The store calls `MessagesApi`, and
`ConversationsController` dispatches to `ListConversationsQueryHandler` or
`SetConversationMuteCommandHandler`. `EventsHub` feeds `RealtimeClient`, which
updates the store.

![C4 component view for reading the inbox](diagrams/c4-component.png)

### Class structure

`ListConversationsQueryHandler` returns an `InboxResult` of
`ConversationSummary` rows. `SetConversationMuteCommandHandler` loads a
`Conversation`, which has two `ConversationParticipant` entities, each with a
`ParticipantSide`, a read position and a mute timestamp.

![Class diagram for reading the inbox](diagrams/class-structure.png)

### Behaviour — load the inbox

The handler selects the conversations the caller takes part in, including those
addressed to an owned business, and orders them by latest activity. The page
shows the list, the empty state, or the reading-pane prompt on wide viewports.

![Sequence diagram for loading the inbox](diagrams/sequence-load-inbox.png)

### Behaviour — search the inbox

`InboxSearchBox` debounces typing and the store repeats the list query with a
search term. The handler matches only inside the caller's conversations and the
page shows either the matches or the no-results message.

![Sequence diagram for searching the inbox](diagrams/sequence-search-inbox.png)

### Behaviour — mute a conversation

The mute route sets `MutedAt` on the caller's participant row and the toast
offers "Undo". "Undo" and the later "Unmute" action both call the unmute route,
after which e-mails resume.

![Sequence diagram for muting a conversation](diagrams/sequence-mute-conversation.png)
