# 0050. Finish messaging: the away toast with its day, a paged inbox, and photos scanned and kept by the media store

## Status

Accepted, 12 November 2026. Completes ADR 0014 and ADR 0039: it reverses three deferrals they
made (paging the inbox, the malware scan, photos out of the database) and settles the criteria of
journey 6 that an audit of the code against `docs/specs/L2.md` found without an implementation or
a test.

## Context

Journey 6 (message a business) stood at 94%. Five things were open: the away notice had no toast
and no return day (L2-062 AC1); the inbox stopped at 200 conversations (L2-056); a message with a
photo was not queued offline; message photos lived in the database and were never scanned
(L2-138 AC2); and `start-conversation` was recorded at 90% with no named gap.

The audit read every criterion of L2-055 to L2-063 and L2-120 against the tests. It found that the
new-message dialog had no limit while typing and no counter (L2-055 AC5) and named the business
where the criterion names the owner (AC1); that an owner's inbox rows did not say which business
they were for (L2-056 AC6); that an empty conversation greeted the owner by full name
(L2-057 AC3); that loading earlier messages threw the member to the bottom of the conversation
(L2-057 AC7); that a conversation report had no daily limit (L2-137 AC1); and that several
criteria had a test of only part of what they say.

`IMediaStore` already exists: journey 15 built it for listing photos, with `FileMediaStore` in a
folder outside the web root (`Media:Root`) and `InMemoryMediaStore` for the tests. ADR 0009 forbids
a real scanner in a test.

## Decision

- **The away notice is a toast and a line, both with the day.** When a member opens a conversation
  with an owner who is away, and when they send a message in it, an info toast says
  "{Owner first name} is away until {day}" with "They’ll see your message when they’re back." The
  line above the messages stays and gains the day. {day} is the weekday when the owner is back
  within the next six days and the short date after that, in Toronto time (`awayDay` in the `api`
  library). One away toast shows at a time: sending again while it is up shows no second one. The
  API does not change; `awayUntil` already says the day, and the page compares it with the clock
  each time, so nothing is shown once the day has come. Jubilee does not know whether an owner is
  a man or a woman; the requirement's "He’ll" became "They’ll", as the line already said.
- **A first message opens the conversation; there is no toast for it.** L2-055 AC3 asked for a
  toast that links to the conversation. ADR 0014 made the dialog close into `/messages/:id`, which
  is where the toast would lead. The criterion now says what is built. It also means a first
  message to an owner who is away shows the away toast, because the conversation opens.
- **The inbox is paged by 50, with a button.** `GET /api/conversations` answers the 50
  conversations with the most recent activity and `hasMore`; `?before={conversationId}` answers
  the 50 after that conversation in the same order (last activity, then id, so two conversations
  touched in the same instant keep a fixed order). `totalCount` and `unreadCount` count the whole
  inbox, or the whole search result, not the page. "Show more conversations" follows the list:
  a button, not endless scrolling, so the keyboard and a screen reader reach it; what was added
  is announced. A new message refreshes the first page and keeps the rows already loaded below it.
  An unknown `before` answers the first page.
- **"Show earlier messages" keeps the member's place.** L2-057 AC7 asked for loading on scroll;
  the button built by ADR 0014 stays because it works without a pointer, and the criterion now
  says so. After the older messages are added, the message that was at the top is brought back to
  the top of the log, so the member reads upwards from where they were.
- **Message photos are kept by `IMediaStore`.** `MessageAttachment` holds a `Key` (128 random
  bits, hex) and the content type; the bytes go to the media store under that key, as the one
  rendition of width `0` in its own format (`jpeg` or `png`; `FileMediaStore` now writes `.png`
  for PNG). They are still reached only through the signed five-minute link, and still delivered
  by the API so that the signature and expiry are checked. A row stored before this change keeps
  its bytes in the `Content` column, which is now nullable and is read only when a row has no key;
  no new row writes it.
- **A photo is scanned before it is stored (`IMalwareScanner`).** The upload runs the checks of
  L2-138 AC1 (`ImageSanitizer`), then the scan, then the store, and stops at the first failure.
  Scanning before storing, in the request, is the simplest order that makes the rule true: the
  other participant can only ever receive a stored photo, and nothing is stored unscanned. There
  is no quarantine area, no `MediaStatus` and no background job, because nothing is ever stored
  that still needs a verdict. An infected photo is refused with `422 FAILED_SCAN`.
- **The scanner is ClamAV, spoken to over its own protocol.** `ClamAvMalwareScanner`
  (Infrastructure) sends the bytes to a `clamd` daemon with `INSTREAM` over TCP
  (`Malware:ClamAv:Host`, `Port` 3310, `TimeoutSeconds` 10). ClamAV is free, self-hosted, keeps
  members' photos inside Jubilee's own network and needs no package: the protocol is a length
  prefix and one line of answer. `Malware:Scanner` chooses: `clamav`, or `none`.
- **No scanner means no photo (fail closed).** When `Malware:Scanner` is not set, or the daemon
  does not answer in time, the upload is refused with `503 SCAN_UNAVAILABLE` and nothing is
  stored; the member's bubble says the photo could not be checked and offers "Try again". Text
  messages are not affected. `none` passes every photo and is for a development machine and the
  e2e API only: `Program.cs` sets it by default in the Development environment and logs a warning
  when the API starts with it. A production deployment without `clamd` therefore sends no message
  photos until the owner provides one (see "Owner steps").
- **A message with a photo is still not queued offline, and L2-120 now says so (AC4).** The queue
  is an IndexedDB store of text that survives a closed tab; a photo is up to 5 MB, and keeping it
  would mean storing the blob on the device and uploading it, then sending, from the drainer, with
  two answers to get wrong. Offline, the bubble keeps the photo and the text, says "Not sent.
  Check your connection." and "Try again" sends it once. The requirement asks for no more.
- **Conversation reports are limited to 10 per member in 24 hours (L2-137 AC1),** counted from the
  stored reports as the message limits are, answered with `429` and `Retry-After`; the dialog says
  "You’re doing that a lot. Try again in {n} minutes." A repeat while a report is open files
  nothing (L2-063 AC8) and is not refused, so a block can still be applied. A report carries no
  idempotency key for the same reason (L2-132 AC1 now says so).
- **An unconfirmed member cannot upload a photo either.** `POST …/attachments` carries
  `[RequiresConfirmedEmail]` like the two sends (L2-005 AC2).
- **An attempt on someone else's conversation is logged (L2-133 AC2).** The exception middleware
  logs a `404` whose code is `conversation_not_found` at `Warning`, with the caller's subject and
  the path through `LoggedPath` (ADR 0049), as it already logs a `403`.
- **Small corrections to what is said.** The dialog's hint names the owner's first name
  ("Be specific and Trevor can answer in one reply."); the dialog stops input at 4,000 characters
  and counts down the last 200; an empty conversation says "Say hello to Trevor" and "tell them
  what you need" (the requirement's "him" became "them"); a search with no result quotes the term
  in double quotation marks as the mock and the requirement do; an owner's row for a member's
  conversation is named "{member} · {business}".
- **No new component.** The toast, the button, the field counter and the thread row exist. The
  new mocks are `pages/messages/more.html`, `pages/messages/owner.html`,
  `dialogs/new-message/counter.html` and `pages/conversation/photo-not-sent.html`;
  `notifications/message-toast/info.html` and `pages/conversation/away.html` changed.

## Consequences

- In production, message photos stop until `clamd` is reachable. This is deliberate: L2-138 AC2
  says a photo is scanned, and a photo that cannot be scanned is not accepted.
- The scan is in the upload request, so an upload takes as long as the scan (ClamAV scans a 5 MB
  image in well under a second); the 10-second limit bounds it.
- A photo that is uploaded and never put in a message stays in the media store. Removing such
  orphans is retention work (L2-148) and is not built here.
- Listing photos (`AddPhotoCommandHandler`) are not given to the scanner by this change: they
  belong to journeys 15 and 16, whose prompt names the secure-uploads design. The seam is there
  for them.
- An inbox row loaded by "Show more conversations" is not refreshed by a new message until the
  member loads the inbox again; the conversation that received the message moves to the first
  page, which is refreshed.

## Owner steps

These need the repository owner; `eng/azure/README.md` ("Message photos and the malware scanner")
has the commands.

1. Run a `clamd` daemon the API can reach (the `clamav/clamav` container image, port 3310, on the
   private network) and set `Malware__Scanner=clamav` and `Malware__ClamAv__Host` on the API.
   Until then production refuses message photos with `SCAN_UNAVAILABLE`.
2. Decide whether photos move from the App Service's persistent folder (`Media__Root`) to Azure
   Blob Storage, and register the separate cookieless media domain of L2-138 AC2. Until then a
   message photo is delivered by the API on the application's own origin, behind its signed link,
   with `nosniff` and `private, no-store`. This part of L2-138 AC2 stays open.

## Still open, and outside this journey

- L2-137 AC2 (a bot challenge on the report forms) and AC3 (three spam reports suspend new
  conversations): the `security/limit-abuse` design, which no journey has built yet.
- The service worker and Background Sync for the queue (journey 24, ADR 0032).
