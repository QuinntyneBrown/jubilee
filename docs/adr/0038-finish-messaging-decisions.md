# 0038. Finish messaging: menu, photos, real-time arrival, request cards and the away period

## Status

Accepted, 11 November 2026. Completes ADR 0014; applies ADR 0025 (the event stream), ADR 0035
(presentation in the components library) and ADR 0036 (component parity).

## Context

ADR 0014 left the messaging screens that had no mock: the conversation menu with mute and report,
the photo control and the photo in a bubble, the report and block dialog, request cards, and the
owner's away period. It also left real-time arrival to journey 17, which has since built the
event stream (`GET /api/events`, ADR 0025). The mocks now show these screens
(`docs/mocks/pages/conversation/`, `dialogs/report-conversation/`, `dialogs/away-period/`,
`pages/my-business/away.html`), so they can be built.

## Decision

- **The conversation menu is a CDK Menu.** "More" in the conversation header opens `jb-menu`
  (`@angular/cdk/menu`: roving focus, arrow keys, Escape returns focus to the trigger). Its items
  are "Mute" or "Unmute" and "Report conversation". Mute is saved at once
  (`PUT /api/conversations/{id}/mute`); the toast's "Undo" sends the opposite. A muted conversation
  says "Muted" in its header.
- **Report and block are one CDK dialog** (`dialogs/report-conversation`), opened from the menu. It
  asks what happened (1 to 1,000 characters) and, for a member only (`canBlock`), offers "Block
  {business}". A participant has at most one unresolved report per conversation: a repeat files
  nothing new and still applies a block, which makes the endpoint safe to retry.
- **Photos are shrunk in the page, on a canvas.** `PhotoAttachmentService` (app) reads the first
  bytes of the chosen file and accepts JPEG and PNG only, whatever its name. A file over 5 MB is drawn to a canvas no larger than 4,096 pixels on its long
  side and encoded as JPEG, lowering the quality (0.85 to 0.5) and then the size until it is 5 MB or
  less; a file that cannot be decoded or brought under 5 MB is refused with the error toast. No
  library is added and nothing leaves the device before the member sends. The server still decides
  (ADR 0014): the device check is for feedback only.
- **One photo per message, uploaded when the message is sent.** The composer's `jb-attach-photo`
  shows the chosen photo until it is sent. Sending uploads the photo
  (`POST /api/conversations/{id}/attachments`), then posts the message with its `attachmentId`
  and the idempotency key. A retry reuses the attachment id it already has and the same key, so
  neither is stored twice. A message with a photo needs no text; its inbox preview is "Photo". A
  message with a photo is not put in the offline queue (ADR 0032 queues text): offline it fails with
  "Try again". Uploads are limited to 30 in 10 minutes per member, like messages (`429`).
- **A signed link is renewed on demand.** `GET /api/conversations/{id}/attachments/{attachmentId}`
  answers `{ url }`, a new five-minute link, to a participant (and to nobody else: `404`, also for a
  photo hidden from a member who blocked the business). The bubble asks for it once when its image
  fails to load, and "View photo" asks for it before opening the photo in a new tab. If the renewal
  fails the bubble says "Photo unavailable".
- **The conversation listens to the events that already exist.** No event type is added to the
  stream. `RealtimeService` publishes each `notification` event it receives; the open conversation
  reads its messages again when one of kind `message` targets `/messages/{id}`, or when one of kind
  `request` arrives (a request's status may have changed its card). Reading again marks the
  conversation read, so the `counts` event corrects the unread badge. The new message is announced
  in a polite live region ("New message from Trevor"), and no toast is shown for a conversation that
  is open. The inbox list reads again on every `message` notification. The stream polls each
  second (ADR 0025), which keeps arrival inside 2 seconds.
- **A request reaches its conversation by who it is between.** There is one conversation per member
  and business (ADR 0014), so the requests of that member with that listing are the conversation's
  requests; nothing is stored to link them and no message row is written. `GET /api/conversations/{id}`
  answers `requests`: kind, title, detail, status, the time the request was sent and where "View
  request" goes (`/requests/{id}` for the member, `/my-business/requests` for the owner). A card is
  placed in the timeline at the time the request was sent and shows the present status. With older
  messages still to load, only the cards newer than the oldest loaded message are sent.
- **The away period is set on My business.** "Your listing" has "Set away period", which opens the
  CDK dialog `dialogs/away-period` with one date, "Back on". `PUT /api/my-business/away` takes
  `{ until: "yyyy-mm-dd" | null }`; the date must be from tomorrow to one year ahead in Toronto
  (`422`, `until`: `REQUIRED`, `IN_PAST`, `TOO_FAR`), and the period ends at the start of that day.
  `null` clears it. The overview answers `awayUntil`. The member's notice in the conversation is
  unchanged.
- **New presentation is in the components library** (ADR 0035): `jb-menu`, `jb-message-bubble`
  (which takes the `bubble` rules out of `ui.css`), `jb-request-card` and `jb-attach-photo`, each
  with a parity spec (ADR 0036). The Magic Patterns reference shows none of them, so they are
  compared with the mocks only. The dialog frame is still the global `dialog` block until its own
  component lands; the two new dialogs use it as their neighbours do. The global
  `menu__item` rules stay in `ui.css` for the account menu, which is not a `jb-menu` yet; the menu
  panel's rule left with `jb-menu`.

## Consequences

- A request made without a conversation shows no card until one of the two writes; confirming or
  declining a request already writes the owner's line into the conversation (ADR 0022).
- A block hides the business's messages from the member; it does not hide cards, which are about
  the member's own requests.
- The device needs `createImageBitmap` and a canvas to shrink a photo; where they are missing a
  large photo is refused with the error toast, and a small one is still sent.
- Photos are still stored in the database behind `IMediaStore`'s future place; the malware scanner
  stays deferred (ADR 0014).

## Deferred

- Paging an inbox of more than 200 conversations, the malware scanner and object storage, the
  service worker for the offline queue, mail templates: as in ADR 0014, 0025 and 0032.
- Photos in the offline queue.
