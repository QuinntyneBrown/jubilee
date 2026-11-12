# Estimates: requests

| Design | Effort | Complete |
|---|---|---|
| book-meeting | 4 days | 100% |
| cancel-request | 4 days | 95% |
| confirm-request | 4 days | 90% |
| decline-request | 4 days | 95% |
| handle-incoming-requests | 5 days | 85% |
| request-item | 4 days | 100% |
| request-quote | 4 days | 95% |
| request-space | 5 days | 100% |
| track-requests | 5 days | 85% |

book-meeting (ADR 0015, ADR 0048): requests, availability, idempotent booking, the calendar file, the booking dialog, the calendar link on the request page and the meeting reminders are done with tests. Meeting hours the owner sets (`L2-220`: days, one window a day in Toronto time and a slot length, from My services) are built with tests, and a member is offered only the times inside them (`BookingTests`, `MeetingHoursTests`, `book-meeting.spec.ts`, `meeting-hours.spec.ts`). Nothing is left. Out of scope (ADR 0048): different hours per day, breaks, calendars and double booking.

request-quote: the quote request (validation, idempotency, owner e-mail, refusal for unconfirmed members) and its dialog are done with tests. The quote card in the conversation, the in-app notification and the shop "Ask" entry point have landed since. Deferred: the phone prefill from the profile (L2-045 AC1).

handle-incoming-requests, confirm-request, decline-request (ADR 0021): the owner's list with tabs, polling and the new-request toast, confirm with stock reduction and an 8-second undo, decline with a reason and note, the response-time badge job, and the toast service are done with tests. The confirmation card, the in-app notifications and the Requests count on My business and the top bar have landed since. Deferred: the "Replies fast" badge on public listings (L2-054 AC1), the danger toast when the dialog was closed (L2-052 AC5), the real-time channel in place of polling (L2-070).

track-requests, cancel-request (ADR 0022): the member's list and detail with the timeline, cancel with an 8-second undo, the booking completion and unanswered-request jobs, and polling for status changes are done with tests. The cancellation card, the owner notification and "Your requests" in the account menu have landed since. Deferred: the real-time channel in place of polling (L2-070), the owner's "Mark fulfilled" control (L2-043 AC5).

request-item (ADR 0017): the order request (delivery methods, free shipping, server-computed amounts, stock check at send, owner e-mail, idempotency) and its dialog on the product page are done with tests. The owner's in-app notification, its real-time event on the open page, the request under "New" in Incoming requests, the order card in the conversation, and the customer's notification and the stock reduction on confirm are now asserted for an order sent through the API (`OrderRequestTests`, `EventStreamTests`), and the dialog is proved by keyboard, with the focus on "View request" after sending (`request-item.spec.ts`). Nothing is left. Out of scope (ADR 0017): tax, shown as "+ tax" and never calculated; carts, checkout and payment, never.

request-space (ADR 0042): the request dialog by term with its checks, the owner's confirm and decline, and the exact address released only to the accepted member are done with tests. Excludes deferred work (see ADR 0042): payment, leases, calendars and double booking.
