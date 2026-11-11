# Estimates: requests

| Design | Effort | Complete |
|---|---|---|
| book-meeting | 4 days | 90% |
| cancel-request | 4 days | 0% |
| confirm-request | 4 days | 0% |
| decline-request | 4 days | 0% |
| handle-incoming-requests | 5 days | 0% |
| request-item | 4 days | 0% |
| request-quote | 4 days | 90% |
| track-requests | 5 days | 0% |

book-meeting: backend (requests, availability, idempotent booking, calendar file) and the booking dialog are done with tests. Deferred: owner-set hours and slot length UI, the calendar download link on the request page (arrives with track-requests), reminders.

request-quote: the quote request (validation, idempotency, owner e-mail, refusal for unconfirmed members) and its dialog are done with tests. Deferred: the phone prefill from the profile (arrives with manage-profile-and-settings, journey 20), the quote card in the conversation and the in-app notification (arrive with stay-notified and respond-to-customer-requests), and the shop "Ask" entry point (the same /b/{slug}/quote route serves it).
