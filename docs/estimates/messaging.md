# Estimates: messaging

| Design | Effort | Complete |
|---|---|---|
| exchange-messages | 5 days | 70% |
| read-inbox | 4 days | 85% |
| report-conversation | 4 days | 40% |
| start-conversation | 4 days | 90% |

## Built (journey 6)

- Conversations, messages, read marks, mute, report and block, photo upload with metadata removed
  and signed five-minute links, message limits, idempotent sends, the inbox with search, the unread
  count in the navigation summary (`backend/tests/Jubilee.Api.Tests/MessagingTests.cs`, 35 tests).
- The Messages page, an open conversation (instant send, "Sending…", retry and delete, earlier
  messages, away notice) and the message dialog on `/b/:slug/message`
  (`e2e/tests/messages.spec.ts`, 28 tests).

## Deferred, with the reason

| Criterion | Deferred because |
|---|---|
| L2-060 photo picker and thumbnails in the composer and bubbles | No mock shows the attach control or an image bubble; the upload API and its tests are done. |
| L2-061 mute control | No mock for the conversation menu; the API is done. |
| L2-063 report and block dialogs | No mock (design says so); the API is done. |
| L2-062 owner sets the away period | Belongs to the owner workspace journey; the page reads and shows it. |
| L2-057 real-time arrival of new messages | No push channel yet; a conversation refreshes when opened. Notifications arrive with journey 17. |
| L2-059 paging of a very long inbox | The list holds 200 conversations; paging when a member exceeds that. |
| Malware scan of photos | No scanner is chosen; photos are re-encoded to JPEG or PNG data only. |
| Request cards in a conversation | Requests arrive in journeys 7 to 9. |
