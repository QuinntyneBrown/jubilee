# Report a conversation

## Overview

Jubilee is Toronto's Christian marketplace, in which a member and a verified
business talk in a private conversation. Conversations are private by default:
only the two participants read them. This feature covers the conversation menu
and the safety controls around that privacy: muting a conversation, reporting it
to the verification team, blocking the business, limiting staff access to
reported conversations, and rendering message text safely.

The terms below are local to this feature.

- **report** — record in which one participant asks the verification team to review a conversation
- **open report** — report whose status is `Open` or `InReview`
- **block** — instruction from the member that stops the business's later messages from reaching the member
- **conversation menu** — menu opened by "More" in the header of an open conversation
- **staff read** — access to conversation content by a verification team member

Either participant may report. The report attaches the conversation, and a
member may block the business in the same step. The business is not told about
the block: its next message is answered as if it were delivered, is stored, and
is never shown to the member or counted as unread (ADR 0014).

Staff access follows the statement on the help page: "Our team reads a
conversation only when one of you reports it." A verification team member can
read a conversation only while an open report exists on it, and each staff read
or refused attempt is recorded in the audit log. Review and resolution of
reports belong to the administration subsystem (L2-105).

## Description

The feature is a vertical slice from the conversation page to the database.

- **`jb-menu`** — component of the `components` library built on CDK Menu
  (`@angular/cdk/menu`). "More" in the conversation header opens it with the
  items "Mute", or "Unmute" when the conversation is muted, and "Report
  conversation". It works by touch and by keyboard: arrow keys move a roving
  focus, Enter chooses, and Escape closes the menu and returns focus to "More"
  (ADR 0037).
- **Mute** — "Mute" saves at once with `PUT /api/conversations/{id}/mute` and the
  body `{ muted: true }`. The toast "Conversation muted. You won't be e-mailed
  about new replies here." offers "Undo", which sends the opposite value. A muted
  conversation says "Muted" in its header. When the mute cannot be saved, the
  conversation stays as it was and an error toast says "We couldn't mute this
  conversation. Try again." The mute flag and its effect on the inbox are
  described in `read-inbox`.
- **`ReportConversationDialog`** — CDK dialog of the app
  (`frontend/projects/jubilee/src/app/dialogs/report-conversation/`), opened by
  "Report conversation" in the conversation menu. It is titled "Report this
  conversation" and says "Reports are private. Our verification team reads this
  conversation only while the report is open." It has one required field, "Tell
  us what happened", of at most 1,000 characters with a counter. A member also
  sees the checkbox "Block {business}" with "They won't be told. Their messages
  will stop reaching you."; an owner does not. The page passes `canBlock` from
  `GET /api/conversations/{id}` to decide. Its action is "Send report".
- **Dialog states** — an empty description shows "Add a sentence or two so we
  know what to check." under the field and nothing is sent. On success the dialog
  says "Thanks for telling us. Your report is private. Our verification team
  reviews it within one business day." and, when the member blocked the business,
  "{Business} is blocked." On failure the dialog keeps what was typed and "Send
  report" tries again.
- **`MessagesApi`** — service contract with the injection token `MESSAGES_API`.
  It calls `PUT /api/conversations/{id}/mute` and
  `POST /api/conversations/{id}/report` with the body `{ reason, block }`.
- **`ConversationsController`** — ASP.NET Core controller for those routes. It
  authenticates the session cookie and applies the endpoint policy. A caller who
  is not a participant receives HTTP `404` (L2-133). The report route answers
  `204 No Content`, and `422` with the code `REQUIRED` on `reason` for an empty
  reason.
- **`ReportConversationCommandHandler`** — MediatR handler. It files a
  `ConversationReport` with the reason, calls `Conversation.Block` when `block`
  is true and the caller is the member, and saves both in one unit of work. A
  participant has at most one unresolved report per conversation: a repeat files
  nothing new and still applies the block. That rule makes the route safe to
  retry, so it carries no idempotency key (ADR 0037).
- **`ConversationReport`** — domain entity. It holds the conversation, the
  reporter, the reason and a `ReportStatus` of `Open`, `InReview` or `Resolved`.
  The verification team sees it in the same list as listing reports (ADR 0033).
- **Block** — `Conversation.BlockedByMember`, a flag set by `Conversation.Block`.
  Only the member can block; an owner's `block` value is ignored.
- **`SendMessageCommandHandler`** — the send handler from `exchange-messages`.
  When the member has blocked the business, a message from the business is
  stored with `HiddenFromMember`, is never shown to the member and is not counted
  as unread. The business is answered `201` as if the message were delivered, and
  nobody is told (ADR 0014). A block does not hide request cards (ADR 0037).
- **`AdminReportsController`** — ASP.NET Core controller for
  `GET /api/admin/reports/{reportId}/conversation`, restricted to the `Verifier`
  and `Admin` roles.
- **`ReportedConversationAccessPolicy`** — authorization policy. It allows a
  staff read only when an open report exists on the conversation; otherwise the
  API returns HTTP `403`. No other route returns message content to staff.
- **`IAuditLog`** — application service. It appends an `AuditEntry` with actor,
  action, target, time and reason for each staff read and each refused staff
  read (L2-180). Entries are append-only.
- **`MessageTextComponent`** — Angular component used wherever message text is
  shown, including the staff view. It binds message text as text, never as
  HTML. It splits the text into text and link segments and renders each link as
  an anchor whose content is the link text and whose `rel` is
  `nofollow noopener noreferrer`. The server stores message text as plain text
  and returns it unchanged.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-061` | `L1-009` | "More" in the header of an open conversation shall open a menu with "Mute" (or "Unmute") and "Report conversation" that works by touch and by keyboard. Muting shall stop e-mail about new replies, show a toast with "Undo", and show "Muted" in the header. |
| `L2-063` | `L1-009` | Either participant may report a conversation to the verification team with the conversation attached, and may block the other side. A message from a blocked business shall be refused without telling the business it was blocked. Staff shall not read conversation content without an open report on that conversation. Links in message text shall be rendered as text with `rel="nofollow noopener noreferrer"` and never as raw HTML. A participant with a report on the conversation that is still open shall not file a second one; a block chosen with it shall still apply. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on every API call before doing anything else. |
| `L2-180` | `L1-025` | Each sensitive action, including staff access to personal data, shall produce an append-only audit record of actor, action, target, time, before and after values, and reason. |

## Diagrams

### System context

Members and owners mute and report through Jubilee, and a member may block a
business. Verification team members
read reported conversations through Jubilee. The feature involves no external
system.

![C4 system context for reporting a conversation](diagrams/c4-context.png)

### Containers

`Jubilee Web` calls the mute, report and admin endpoints of `Jubilee API`,
which persists reports, blocks and audit entries in `Jubilee database`.

![C4 container view for reporting a conversation](diagrams/c4-container.png)

### Components

`ConversationPage` opens `jb-menu`, which mutes or opens
`ReportConversationDialog`; both call `MessagesApi`. `ConversationsController`
dispatches the mute, report and send commands; `AdminReportsController`
evaluates `ReportedConversationAccessPolicy` and records each access through
`IAuditLog`.

![C4 component view for reporting a conversation](diagrams/c4-component.png)

### Class structure

`ReportConversationCommandHandler` files a `ConversationReport` on a
`Conversation` and sets `BlockedByMember` through it when the member chose to
block. A `Message` sent by a blocked business carries `HiddenFromMember`.
`ReportedConversationAccessPolicy` requires an open `ConversationReport` and
records an `AuditEntry`.

![Class diagram for reporting a conversation](diagrams/class-structure.png)

### Behaviour — report a conversation and block the business

The member or owner opens the dialog from the conversation menu. The handler
verifies the caller is a participant, files the report unless the caller already
has an unresolved one on the conversation, applies the block when a member chose
it, and commits both. The report then appears in the verification team's list
(ADR 0033).

![Sequence diagram for reporting and blocking](diagrams/sequence-report-and-block.png)

### Behaviour — refuse a message from a blocked business

`SendMessageCommandHandler` reads `Conversation.BlockedByMember` before adding
a message from the business. A blocked business receives `201` with no mention
of a block; the message is stored hidden and never reaches the member.

![Sequence diagram for refusing a blocked message](diagrams/sequence-refuse-blocked-message.png)

### Behaviour — staff read of a reported conversation

The policy looks for an open report on the conversation. Without one the API
returns `403`; with one it returns the conversation. Both outcomes append an
`AuditEntry`.

![Sequence diagram for a staff read of a reported conversation](diagrams/sequence-staff-read-reported-conversation.png)
