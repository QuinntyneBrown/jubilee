# Estimates: messaging

| Design | Effort | Complete |
|---|---|---|
| exchange-messages | 5 days | 95% |
| read-inbox | 4 days | 95% |
| report-conversation | 4 days | 95% |
| start-conversation | 4 days | 90% |

## Built (journey 6)

- Conversations, messages, read marks, mute, report and block, photo upload with metadata removed
  and signed five-minute links, message limits, idempotent sends, the inbox with search, the unread
  count in the navigation summary (`backend/tests/Jubilee.Api.Tests/MessagingTests.cs`, 35 tests).
- The Messages page, an open conversation (instant send, "Sending…", retry and delete, earlier
  messages, away notice) and the message dialog on `/b/:slug/message`
  (`e2e/tests/messages.spec.ts`, 28 tests).

- The rest of journey 6 (ADR 0037): the conversation menu with mute, unmute and the toast with "Undo";
  the report dialog with the member's block; photos in the composer and in bubbles, shrunk on the
  device, with a renewed signed link; a reply arriving in the open conversation and the inbox over
  the event stream; request cards in the timeline; the owner's away period on My business
  (`MessagingTests.cs`, 54 tests; `e2e/tests/messages.spec.ts`, 61 tests; `my-business.spec.ts`,
  8 away tests; parity specs for `jb-menu`, `jb-message-bubble`, `jb-attach-photo` and
  `jb-request-card`).

## Deferred, with the reason

| Criterion | Deferred because |
|---|---|
| L2-059 paging of a very long inbox | The list holds 200 conversations; paging when a member exceeds that. |
| Malware scan of photos and object storage | No scanner or store is chosen; photos are re-encoded to JPEG or PNG data only and kept behind a later `IMediaStore` (ADR 0014). |
| Photos in the offline queue | The queue holds text (ADR 0032); a message with a photo fails offline and offers "Try again" (ADR 0037). |
| L2-062 AC1 the away notice as a toast with the return day | The conversation shows the notice in place, without the day, as journey 6 first built it; the owner now sets the day. |
| The service worker and Background Sync for the offline queue | ADR 0032. |
| Mail templates and a real e-mail provider | No provider is chosen (ADR 0025). |
