# Exchange messages

## Overview

Jubilee is Toronto's Christian marketplace, in which a member and a verified
business talk in a private conversation. This feature covers the conversation
page at `/messages/:id`: reading the timeline, sending text and photos, seeing
delivery status, retrying a failed send, seeing a reply arrive, seeing the
requests between the two sides, and seeing that an owner is away. It also covers
the dialog on My business in which an owner sets the away period.

The terms below are local to this feature.

- **timeline** — ordered list of the items in one conversation, grouped under day separators
- **request card** — timeline item that summarises a booking, quote or order request between the same member and business
- **pending message** — message shown in the timeline before the server confirms it
- **read mark** — time up to which one side of a conversation has read
- **away period** — interval, ending on a return date, during which an owner states they are not reading messages
- **signed link** — address, valid for 5 minutes, that grants read access to one stored photo

A sent message appears in the timeline at once, marked "Sending…". The server
confirmation replaces that mark with the time. A failed send keeps the text and
offers "Try again" and "Delete"; a retry reuses the idempotency key of the first
attempt, so one message is stored however many attempts are made. A message
carries text, one photo, or both. A reply from the other side reaches an open
page within `2 seconds` over the event stream (`GET /api/events`, ADR 0025).

Only the two participants can open a conversation, its messages and its photos.
Starting a conversation is described in `start-conversation`, the inbox in
`read-inbox`, and muting, blocking and reporting in `report-conversation`. Text
messages written while offline are queued on the device (L2-120, ADR 0032) and
enter this slice through the same send endpoint and idempotency key.

## Description

The feature is a vertical slice from the conversation page to the database. The
decisions behind it are recorded in ADR 0014 and ADR 0039.

- **`ConversationPage`** — Angular page at `/messages/:id`
  (`frontend/projects/jubilee/src/app/pages/conversation/`), guarded by
  `AuthGuard`. It is a container: it holds the header, the loaded messages, the
  request cards and the pending sends as signals and composes `jb-*` components
  (ADR 0035). The header shows the business and, for example, "Trevor Chew ·
  usually replies within a day". The composer, labelled "Message Legacy
  Financial", sits at the bottom.
- **Timeline** — the page groups items under day separators ("Today · Tue 10
  Nov") and shows sender and time per message. It loads the latest `50` messages
  and requests an older page with `GET /api/conversations/{id}?before={messageId}`
  as the member scrolls up, keeping the scroll position.
- **`jb-message-bubble`** — component of the `components` library for one
  message. It shows the text and at most one photo, the sender, and the time or
  the delivery status. Its rules leave the `bubble` block of `ui.css` when it
  lands. The photo is shown at its stored size, scaled to the bubble; no separate
  thumbnail is made (ADR 0014). "View photo" opens the photo in a new tab.
- **`jb-request-card`** — component of the `components` library for one request
  card, for example "Booking request · Discovery meeting · Thu 12 Nov,
  10:00–10:30 a.m. · Video · Confirmed · View request". A quote card reads "Quote
  request", what was asked for and "Needed by {day}" when a day was given. An
  order card reads "Order request", the product and quantity, and how it is
  delivered with the total. The status reads "Awaiting reply", "Confirmed",
  "Declined", "Cancelled" or "Completed", in words as well as colour.
- **Request cards are derived, not stored** — there is one conversation per
  member and business (ADR 0014), so the requests of that member with that
  listing are the conversation's requests. No message row is written for a
  request and nothing links the two tables. `GET /api/conversations/{id}` answers
  `requests`: kind, title, detail, status, the time the request was sent and the
  link of "View request" (`/requests/{id}` for the member,
  `/my-business/requests` for the owner). The page places each card in the
  timeline at the time the request was sent; the card shows the request's present
  status. With older messages still to load, the API sends only the cards newer
  than the oldest loaded message. A block does not hide cards (ADR 0039).
- **Empty conversation** — a conversation with no messages shows "Say hello to
  {first name}. Ask a question or tell him what you need." and up to three
  suggested openers that fill the composer when pressed. The opener texts are
  "Do you offer a first meeting?", "What does it cost?" and "Can we meet by
  video?" (ADR 0014).
- **Composer** — on a device with a physical keyboard, Enter sends and
  Shift+Enter adds a new line. Empty or whitespace-only text with no photo sends
  nothing. The composer clears as soon as a send starts.
- **`jb-attach-photo`** — component of the `components` library, placed before
  the message field. Its button is "Attach a photo". A chosen photo shows as a
  small preview with "Remove photo" until the message is sent. One message
  carries at most one photo.
- **`PhotoAttachmentService`** — Angular service of the app. It reads the first
  bytes of the chosen file and accepts JPEG and PNG only, whatever the file's
  name or declared type. A file over `5 MB`, or wider or taller than `4,096`
  pixels, is drawn to a canvas of at most `4,096` pixels on its long side and
  encoded as JPEG. The service lowers the quality from `0.85` to `0.5`, and then
  the size, until the result is `5 MB` or less, and shows the warning toast
  "Photo is large. Shrinking it to 5 MB before sending." A file of another type,
  one that cannot be decoded, or one that cannot be brought under `5 MB` raises
  the error toast "Photo couldn't be attached. Use a JPG or PNG under 5 MB." and
  nothing is sent. No library is added and nothing leaves the device before the
  member sends. The device check is for feedback only; the server decides. Where
  `createImageBitmap` or a canvas is missing, a large photo is refused with the
  error toast and a small one is still sent.
- **Pending sends** — the page keeps one pending item per send with its
  idempotency key and a status of sending, waiting to send, or failed. A failed
  item shows "Not sent. Check your connection." with "Try again" and "Delete".
  A message with a photo is uploaded when it is sent: the page calls
  `POST /api/conversations/{id}/attachments`, then
  `POST /api/conversations/{id}/messages` with the `attachmentId` and the
  idempotency key. While it is on its way the bubble shows the photo and
  "Sending…". A retry reuses the attachment id it already has and the same key,
  so neither the photo nor the message is stored twice. A photo needs no text;
  its inbox preview is "Photo". A message with a photo is not put in the offline
  queue (ADR 0032 queues text): offline it fails with "Try again".
- **`RealtimeService`** — Angular service of the app and the only reader of the
  event stream. No event type is added for messaging: the service publishes each
  `notification` event it receives. The open conversation reads
  `GET /api/conversations/{id}` again when a notification of kind `message`
  targets `/messages/{id}`, or when one of kind `request` arrives, because a
  request's status may have changed its card. The page announces the new message
  in a polite live region ("New message from {first name}"). No toast is shown
  for a conversation that is open. The stream polls each second (ADR 0025), which
  keeps arrival inside `2 seconds`.
- **`MessagesApi`** — service contract with the injection token `MESSAGES_API`,
  implemented by `HttpMessagesApi`. It calls `GET /api/conversations/{id}`,
  `POST /api/conversations/{id}/messages`,
  `POST /api/conversations/{id}/attachments` and
  `GET /api/conversations/{id}/attachments/{attachmentId}`.
- **`ConversationsController`** — ASP.NET Core controller for those routes. Each
  handler loads the conversation for a participant; any other caller receives
  HTTP `404` (L2-133). Sending by a member whose e-mail is unconfirmed returns
  `403` with code `EMAIL_UNCONFIRMED`.
- **`GetConversationQueryHandler`** — returns the header, `muted`, `canBlock`,
  `awayUntil` while that date is in the future, one page of `50` messages and the
  request cards. Opening the newest page marks the conversation read for the
  caller through `Conversation.MarkRead`; loading an older page does not. There
  is no separate read endpoint. Because every re-read of the newest page marks
  the conversation read, the `counts` event of the stream then corrects the
  unread badge (ADR 0039).
- **Read marks** — `Conversation.MemberReadAt` and `Conversation.OwnerReadAt`
  hold the time up to which each side has read. A conversation is unread for a
  side when the other side wrote after that time (ADR 0014).
- **`SendMessageCommandHandler`** — stamps the message never earlier than the
  conversation's last message, links the attachment named by `attachmentId`, and
  saves the message with the other side's `message` notification. A message is 1 to 4,000 characters after trimming, or has a photo.
  Idempotency is a unique index on `(SenderSubject, IdempotencyKey)` of
  `Messages`: a repeat answers the original message and writes nothing (L2-132,
  ADR 0014). No middleware takes part. The handler refuses more than 30 messages
  in 10 minutes per member with `429` and `Retry-After`.
- **`UploadAttachmentCommandHandler`** — decides the type from the bytes and
  accepts JPEG and PNG up to `5 MB` and `8,000` pixels wide. `ImageSanitizer`
  removes everything that is not picture data (EXIF, XMP, ICC and comment
  segments of a JPEG; text and time chunks of a PNG). The result is stored in
  `MessageAttachments`. A refused file answers `422` with code `TOO_LARGE` or
  `INVALID_IMAGE`. Uploads are limited to 30 in 10 minutes per member (`429`).
  The malware scanner and object storage stay behind a later `IMediaStore`
  (ADR 0014, ADR 0039).
- **Signed link** — a stored photo is served only from
  `/api/attachments/{id}?expires=…&sig=…`, where `sig` is an HMAC-SHA256 of the id
  and the expiry made by `IAttachmentLinks` with `Attachments:SigningKey`. The
  link is valid for `5 minutes` and is served with
  `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`
  (ADR 0014). Each message read carries a new link.
- **Signed link renewal** — `GET /api/conversations/{id}/attachments/{attachmentId}`
  answers `{ url }`, a new signed link, to a participant. Any other caller
  receives `404`, as does a member asking for a photo hidden by that member's
  block. `jb-message-bubble` reports an image that fails to load and the page
  asks for the link once; "View photo" asks for it before opening the photo. If
  the renewal fails the bubble says "Photo unavailable".
- **`Conversation`**, **`Message`**, **`MessageAttachment`** — domain entities.
  A `Message` has a body and at most one attachment. There is no message kind and
  no request-card message.
- **Away period** — `Listing.AwayUntil` holds the date the owner is back. While
  that date is in the future, opening the conversation or sending a message shows
  the member the info toast "{Owner} is away until {day}. He'll see your message
  when he's back." After the return date no notice is shown.
- **`AwayPeriodDialog`** — CDK dialog of the app (`dialogs/away-period`), opened
  by "Set away period" in "Your listing" on My business. It is titled "Set an
  away period", asks for one date, "Back on", and says "Members who message you
  see that you're away and when you're back. Your listing stays public." When a
  period is set, "Your listing" shows "Away until {day}" with "Change", and the
  dialog offers "Clear away period".
- **`PUT /api/my-business/away`** — route of `MyBusinessController` with the body
  `{ until: "yyyy-mm-dd" | null }`. The date shall be from tomorrow to one year
  ahead in Toronto; otherwise the API answers `422` with the code `REQUIRED`,
  `IN_PAST` or `TOO_FAR` on `until`, and the field shows "Choose a date from
  tomorrow on." or "Choose a date within a year." The period ends at the start of
  that day. `null` clears it at once. The route changes only the caller's own
  listing (L2-133), and the My business overview answers `awayUntil`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-057` | `L1-009` | The page `/messages/:id` shall show one conversation with a composer. Opening it shall mark its messages read for the viewer. A request between the same member and business shall appear as a card at the time it was sent, showing its present status. A reply that arrives while the conversation is open shall appear within 2 seconds without a reload and be announced politely, with no toast. |
| `L2-058` | `L1-009` | A sent message shall appear at once marked "Sending…" and show its time once the server confirms it. A failed message shall keep its text and offer "Try again" and "Delete", and a retry shall reuse the same idempotency key so the message is never duplicated. |
| `L2-060` | `L1-009` | A member may attach one JPG or PNG photo of up to 5 MB to a message, with or without text; a larger photo shall be shrunk on the device before sending. A stored attachment shall be retrievable only by the conversation's participants through signed URLs valid for 5 minutes, and an expired URL shall be renewed for a participant. A retry shall not store the photo or the message twice. |
| `L2-062` | `L1-009` | When an owner has set an away period with a return date, a member who opens the conversation or sends a message shall see an away notice. No notice shall be shown after the return date. The owner shall set, change and clear the period on My business, with a return date from tomorrow to one year ahead. |
| `L2-070` | `L1-010` | A notification, message or request event for a user shall reach that user's open signed-in page within 2 seconds at the 95th percentile over a persistent connection (WebSocket or server-sent events). After a reconnect, the events missed since the last received event ID shall be delivered and nothing shall be shown twice. A client shall receive only events addressed to its authenticated user. |
| `L2-132` | `L1-018` | Each create request shall carry a client-generated idempotency key, and the server shall return the original result for a repeated key within 24 hours without creating a duplicate. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on every API call, and shall return 404 for another member's conversation. |
| `L2-138` | `L1-019` | The server shall verify each upload by its magic bytes, accept only JPEG and PNG up to 5 MB and 8,000 × 8,000 pixels, re-encode the image, strip metadata, scan it for malware, and store it under a random name. |

## Diagrams

### System context

A member and an owner exchange messages and photos through Jubilee. The owner
also sets the away period. The feature involves no external system; the malware
scanner is deferred (ADR 0014).

![C4 system context for exchanging messages](diagrams/c4-context.png)

### Containers

`Jubilee Web` calls `Jubilee API` and holds one event stream to it. The API
persists conversations, messages, photos and notifications to
`Jubilee database`, serves a photo by signed link, and sends each notification
on the stream.

![C4 container view for exchanging messages](diagrams/c4-container.png)

### Components

`ConversationPage` composes `jb-message-bubble`, `jb-request-card` and
`jb-attach-photo`, prepares photos with `PhotoAttachmentService`, and re-reads
the conversation when `RealtimeService` publishes a notification for it.
`ConversationsController` dispatches to four handlers: get, send, upload and
renew link. `AwayPeriodDialog` saves through `MyBusinessController`.

![C4 component view for exchanging messages](diagrams/c4-component.png)

### Class structure

`ConversationPage` tracks `OutgoingMessage` items by `SendStatus`. A
`Conversation` holds one read mark per side and contains many `Message`
entities; a `Message` carries at most one `MessageAttachment`.
`ConversationDto` carries the messages and the `RequestCardDto` items derived
from the requests of the same member and listing. `Listing` holds `AwayUntil`.

![Class diagram for exchanging messages](diagrams/class-structure.png)

### Behaviour — open a conversation

A non-participant receives `404`. A participant receives the latest `50`
messages and the request cards, and that read marks the conversation read. Older
pages load on scroll. When a `message` or `request` notification arrives on the
event stream, the page reads the conversation again and announces the new
message politely.

![Sequence diagram for opening a conversation](diagrams/sequence-open-conversation.png)

### Behaviour — send a message and retry

The page shows the pending message before the request completes. On failure the
member retries with the same idempotency key, and the unique
`(SenderSubject, IdempotencyKey)` index guarantees one stored message.

![Sequence diagram for sending a message and retrying](diagrams/sequence-send-message.png)

### Behaviour — attach a photo

`PhotoAttachmentService` rejects or shrinks the file on the device and
`jb-attach-photo` shows the preview. On send the page uploads the photo, then
posts the message with the attachment id. An expired signed link is renewed
through the participant-only route.

![Sequence diagram for attaching a photo](diagrams/sequence-attach-photo.png)
