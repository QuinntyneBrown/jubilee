# Estimates: requests

| Design | Effort | Complete |
|---|---|---|
| book-meeting | 4 days | 90% |
| cancel-request | 4 days | 85% |
| confirm-request | 4 days | 85% |
| decline-request | 4 days | 90% |
| handle-incoming-requests | 5 days | 80% |
| request-item | 4 days | 90% |
| request-quote | 4 days | 90% |
| request-space | 5 days | 100% |
| track-requests | 5 days | 75% |

book-meeting: backend (requests, availability, idempotent booking, calendar file) and the booking dialog are done with tests. Deferred: owner-set hours and slot length UI, the calendar download link on the request page (arrives with track-requests), reminders.

request-quote: the quote request (validation, idempotency, owner e-mail, refusal for unconfirmed members) and its dialog are done with tests. Deferred: the phone prefill from the profile (arrives with manage-profile-and-settings, journey 20), the quote card in the conversation and the in-app notification (arrive with stay-notified and respond-to-customer-requests), and the shop "Ask" entry point (the same /b/{slug}/quote route serves it).

handle-incoming-requests, confirm-request, decline-request (ADR 0021): the owner's list with tabs, polling and the new-request toast, confirm with stock reduction and an 8-second undo, decline with a reason and note, the response-time badge job, and the toast service are done with tests. Deferred: the confirmation card and in-app notification (journey 17), the Requests tab count on My business and the badge on public listings (journey 15), the danger toast when the dialog was closed.

track-requests, cancel-request (ADR 0022): the member's list and detail with the timeline, cancel with an 8-second undo, the booking completion and unanswered-request jobs, and polling for status changes are done with tests. Deferred: the real-time channel (L2-070), the cancellation card and owner notification (journey 17), the owner's "Mark fulfilled" control (journey 23), a chrome entry to the page (journey 20).

request-item: the order request (delivery methods, free shipping, server-computed amounts, stock check at send, owner e-mail, idempotency) and its dialog on the product page are done with tests. Deferred: the order card in the conversation and the in-app notification (stay-notified, journey 17), stock reduction on confirm (L2-052, journey 13), tax (shown as "+ tax", never calculated; ADR 0017).

request-space (ADR 0041): the request dialog by term with its checks, the owner's confirm and decline, and the exact address released only to the accepted member are done with tests. Excludes deferred work (see ADR 0041): payment, leases, calendars and double booking.
