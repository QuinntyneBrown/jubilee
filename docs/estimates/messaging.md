# Estimates: messaging

| Design | Effort | Complete |
|---|---|---|
| exchange-messages | 5 days | 97% |
| read-inbox | 4 days | 100% |
| report-conversation | 4 days | 97% |
| start-conversation | 4 days | 100% |

Scored on 12 November 2026 from the code and its tests, after journey 6 was finished (ADR 0051).

## Built

- Conversations, messages, read marks, mute, report and block, photos without their metadata behind
  signed five-minute links, message limits, idempotent sends, the inbox with search, the unread
  count in the navigation summary (ADR 0014).
- The conversation menu with mute and "Undo", the report dialog with the member's block, photos in
  the composer and in bubbles, a reply arriving over the event stream, request cards, the owner's
  away period on My business (ADR 0039).
- Journey 6 finished (ADR 0051): the away notice as a toast and a line that name the day; the inbox
  paged by 50 with "Show more conversations"; message photos scanned before they are stored and
  kept by the media store; the message dialog's limit and counter; an owner's rows named with the
  business; an empty conversation that greets by first name; earlier messages that keep the
  reader's place; conversation reports limited to 10 a day; an attempt on someone else's
  conversation logged; every limit said in the words of L2-137.
- Tests: `backend/tests/Jubilee.Api.Tests/MessagingTests.cs` (71), `AttachmentLinkTests.cs` (3),
  `EmailNotificationTests.cs` (mute and unmute), `backend/tests/Jubilee.Infrastructure.Tests/MalwareScannerTests.cs`
  (11); `e2e/tests/messages.spec.ts` (88), `offline.spec.ts` (the queue, with a photo and after
  24 hours), `my-business.spec.ts` (the away period); parity specs for `jb-menu`,
  `jb-message-bubble`, `jb-attach-photo` and `jb-request-card`.

## What is left

| Criterion | Design | Open because |
|---|---|---|
| L2-060 AC9, L2-138 AC4: a photo is scanned | exchange-messages | Owner step. The scan is built and tested against a stand-in for `clamd`; production has no `clamd` yet, so it refuses message photos (`SCAN_UNAVAILABLE`) until the owner runs one and sets `Malware__Scanner=clamav` (`eng/azure/README.md`, "Message photos and the malware scanner"). |
| L2-138 AC2: a separate cookieless domain, object storage | exchange-messages | Owner step. A message photo is a file under `Media__Root`, delivered by the API on the application's origin behind its signed link. |
| L2-138 AC1: "re-encodes" | exchange-messages | A message photo is stripped of everything that is not picture data but is not decoded and encoded again (ADR 0014, ADR 0051). |
| L2-137 AC2: a bot challenge on the report form | report-conversation | The `security/limit-abuse` design; no journey has built the challenge for the report forms. |
| L2-137 AC3: three spam reports suspend new conversations | report-conversation | The `security/limit-abuse` design; a report has no "spam" kind yet. |

## Deferred, with the reason

| Criterion | Deferred because |
|---|---|
| Photos in the offline queue | Not asked for: L2-120 AC4 says a message with a photo is not queued and offers "Try again" (ADR 0051). |
| The service worker and Background Sync for the offline queue | Journey 24 (ADR 0032). |
| Removing photos that were uploaded and never sent | Retention work (L2-148). |
| The inbox on the local SQLite stack | The preview of the last message needs `OUTER APPLY`, which SQLite lacks; SQL Server has it and the e2e suite answers the inbox from its stand-in (ADR 0051). |
