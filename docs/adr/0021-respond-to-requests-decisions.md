# 0021. Respond to requests decisions

Status: accepted

## Context

An owner confirms or declines the requests members send (L2-051 to L2-053), and the listing earns a "replies fast" badge for answering quickly (L2-054). The designs left open the page size, how a message reply is paired with a message, what happens to an e-mail that is already sent when a confirmation is undone, and how the page learns of a new request.

## Decision

- **Endpoints.** `GET /api/my-business/requests?tab=&listing=` (503 with `JB-REQ-503`), `POST .../{id}/confirm`, `POST .../{id}/confirm/undo` and `POST .../{id}/decline`. The decline body refuses unknown fields (400), so a caller cannot set a status or a price. A caller who owns no listing, or not the named one, gets 403 `FORBIDDEN`; a request of another business is 403; an unknown request is 404.
- **Page size.** The list returns at most 50 rows, newest first. Declined requests stay for 90 days.
- **Tabs and counts.** `new`, `confirmed`, `declined` and `all`. The counts cover the whole listing, not the tab. The navigation summary's `newRequestCount` is the owner's New requests.
- **Confirm.** Needs New (409 `INVALID_TRANSITION` otherwise). When the customer cancelled a moment earlier the message is "{Customer} cancelled this request." and the problem carries `requestStatus`. An order reduces stock by the quantity; a quantity above the stock is 409 `INSUFFICIENT_STOCK` with the available count, and nothing is confirmed. The customer is told in the conversation (a message keyed `request:{id}:confirmed`) and by e-mail.
- **Undo.** The actor of the last confirmation can undo it for 8 seconds (`Request.UndoWindow`). The e-mail to the customer is queued with a delay of the same 8 seconds, so within the window it is never sent: undo restores the stock, deletes the conversation message and removes the unsent outbox rows. After the window it is 409 `INVALID_TRANSITION`. The case the design left open, an e-mail already sent, cannot happen.
- **Decline.** Needs New, a reason (`cant-meet-the-date`, `out-of-stock`, `outside-what-i-offer`, `something-else`; 422 `reason: INVALID`) and a message of 1 to 1000 characters (422 `message: REQUIRED|TOO_LONG`). The message is shown on the request and in the conversation, and the customer is e-mailed at once.
- **Replies fast.** A first response is the owner's confirm or decline of a request, or the owner's first message in a conversation after a customer message that had no owner message since. The window is 30 days; the badge needs at least 3 responses and a median under 24 hours. `ResponseTimeStat` is stored per listing and recomputed by the hourly `ResponseTimeBadgeJob`.
- **New requests reach the page by polling.** The page asks again every 5 seconds, without the loading state, and announces a New request it had not seen with the toast "New {type} request. {Customer} asked for {summary}." There is no real-time channel yet.
- **Toasts.** A `ToastService` and `jb-toast-region` in the app shell show short messages. The timer pauses on hover and focus. The confirmation toast lasts 8 seconds and carries "Undo".
- **Dialog copy.** The confirm dialog says "Only confirm if you can fulfil “{title}”." in place of the mock's sentence, which assumed a delivery date every request does not have; the well lists Customer, the request, When or Needed by where there is one, and Total for an order. "Not yet" has the first focus. The customer is called "them" in the toasts and dialogs because the app does not know their pronouns.

## Deferred

- L2-051 AC5: the "Requests" tab count on My business (journey 15); the top bar's count is refreshed instead.
- L2-052 AC2: the confirmation card in the conversation is a plain owner message until cards arrive with stay-notified (journey 17); the in-app notification likewise.
- L2-052 AC5: the danger toast "Couldn't confirm the order" when the dialog was closed; the dialog stays open on failure and offers "Try again".
- Showing the "replies fast" badge on the public listing and cards (journey 15 reads `RepliesFast`).
- The `declined` tab's mock (no-results) has no route of its own; the tab is reached by choosing it.

## Consequences

Journey 14 (track and cancel requests) reuses `IncomingRules.Invalid` for a customer who cancels a request the owner just confirmed, and the toast service for its own messages. Journey 17 replaces the plain conversation message with a card and adds the notification.
