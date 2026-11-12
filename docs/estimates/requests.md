# Estimates: requests

| Design | Effort | Complete |
|---|---|---|
| book-meeting | 4 days | 100% |
| cancel-request | 4 days | 95% |
| confirm-request | 4 days | 100% |
| decline-request | 4 days | 100% |
| handle-incoming-requests | 5 days | 100% |
| request-item | 4 days | 100% |
| request-quote | 4 days | 100% |
| request-space | 5 days | 100% |
| track-requests | 5 days | 85% |

book-meeting (ADR 0015, ADR 0048): requests, availability, idempotent booking, the calendar file, the booking dialog, the calendar link on the request page and the meeting reminders are done with tests. Meeting hours the owner sets (`L2-220`: days, one window a day in Toronto time and a slot length, from My services) are built with tests, and a member is offered only the times inside them (`BookingTests`, `MeetingHoursTests`, `book-meeting.spec.ts`, `meeting-hours.spec.ts`). Nothing is left. Out of scope (ADR 0048): different hours per day, breaks, calendars and double booking.

request-quote (ADR 0016): the quote request (validation, idempotency, owner e-mail, refusal for unconfirmed members), its dialog and the shop "Ask" entry point were done with tests. Journey 8 is now finished: the dialog starts with the phone of the member's profile, which comes with the dialog's options, can be changed or cleared, goes with that request only and is never written back to the profile, and a restored draft wins over it (`L2-045` AC7; `QuoteTests`, `request-quote.spec.ts`); the owner's in-app notification, the request under "New" in Incoming requests, the member's notification when the owner confirms or declines, and the quote card in the conversation are asserted for a quote sent through the API (`L2-045` AC8; `QuoteTests`); the "(required)" and "(optional)" marks and the tie of each message to its field are asserted (`L2-126` AC2, AC6). Nothing is left. Out of scope: quotes with prices or payment, never (Jubilee takes no payment).

handle-incoming-requests, confirm-request, decline-request (ADR 0021, ADR 0050): the owner's list with tabs, confirm with stock reduction and an 8-second undo, decline with a reason and note, the confirmation card, the in-app notifications and the Requests counts were done with tests. Journey 13 is now finished: the page listens to the event stream and asks on a timer only while the stream cannot connect (`incoming-requests.spec.ts`); a business that replies fast carries the "Replies fast" badge on its listing page and its business card (`IncomingRequestTests`, `business.spec.ts`, the parity specs of `badge` and `business-card`); the response-time job runs once per hour across instances and records its success through `JobRun` (`ResponseTimeJobTests`); a confirmation that answers after its dialog was closed is reported in a toast, with "Try again" on a failure; a decline of a request that is no longer new closes the dialog and says why; the customer's in-app notification on confirm and on decline is asserted. Nothing is left. Out of scope here: the retries and the dead-letter queue of `L2-182` AC2 (operations, run-background-jobs), and the badge on a space, a directory row or a search result (ADR 0050).

track-requests, cancel-request (ADR 0022): the member's list and detail with the timeline, cancel with an 8-second undo, the booking completion and unanswered-request jobs, and polling for status changes are done with tests. The cancellation card, the owner notification and "Your requests" in the account menu have landed since. Deferred: the real-time channel in place of polling (L2-070), the owner's "Mark fulfilled" control (L2-043 AC5).

request-item (ADR 0017): the order request (delivery methods, free shipping, server-computed amounts, stock check at send, owner e-mail, idempotency) and its dialog on the product page are done with tests. The owner's in-app notification, its real-time event on the open page, the request under "New" in Incoming requests, the order card in the conversation, and the customer's notification and the stock reduction on confirm are now asserted for an order sent through the API (`OrderRequestTests`, `EventStreamTests`), and the dialog is proved by keyboard, with the focus on "View request" after sending (`request-item.spec.ts`). Nothing is left. Out of scope (ADR 0017): tax, shown as "+ tax" and never calculated; carts, checkout and payment, never.

request-space (ADR 0042): the request dialog by term with its checks, the owner's confirm and decline, and the exact address released only to the accepted member are done with tests. Excludes deferred work (see ADR 0042): payment, leases, calendars and double booking.
