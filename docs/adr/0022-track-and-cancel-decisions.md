# 0022. Track and cancel requests decisions

Status: accepted, amended by ADR 0061 (the event stream on the member's request pages, the owner's "Mark fulfilled" control, and the two jobs run once per schedule)

## Context

A member follows the requests they sent and cancels an open one (L2-043, L2-047 to L2-049). The designs left open the owner's control to mark an order fulfilled, how often the lifecycle jobs run, how much network delay the 8-second undo tolerates, and how a status change reaches the open page (L2-070).

## Decision

- **Endpoints.** `GET /api/requests?tab=&cursor=` (503 with `JB-REQ-501`), `GET /api/requests/{id}` (503 with `JB-REQ-502`), `POST /api/requests/{id}/cancel` and `POST /api/requests/{id}/cancel/undo`. Neither action takes a body, so a caller cannot set a status. Another member's request is 404, as is an unknown one, and the attempt is logged as a warning (L2-133 AC2).
- **List.** Tabs `all`, `bookings`, `quotes`, `orders` and `declined`; counts cover every request. Open requests come first by their soonest date (the meeting, the day a quote is needed by, or when the order was sent), then closed requests, newest change first. 20 rows a time; the cursor is the number of rows already seen.
- **Detail.** The title of a quote with no service is the first sentence of what was asked, cut at 70 characters. The callout names the business in full ("Waiting for WaterWorks Plumbing & Drains to reply") because a listing has no short name; the booking callout names the owner by first name. "See other {category word}" uses the lowercase category name. The timeline leaves out a cancel the member took back.
- **Cancel and undo.** `Request.Cancel` marks its transition undoable for 8 seconds. `UndoCancel` restores the status the request had before, for the actor of that cancel only, inside the window; otherwise 409 `INVALID_TRANSITION`. No allowance is made for network delay: the server honours exactly the 8 seconds the toast shows, and a late Undo says so in a danger toast. The owner is e-mailed at once of the cancel and again of the withdrawal.
- **Unanswered requests.** A `new` request older than 7 days is `unanswered`: the detail offers "Ask again" beside "Cancel request". `UnansweredRequestJob` (hourly) e-mails the owner once and stamps `NudgedAt`.
- **Completion.** `BookingCompletionJob` (every 5 minutes) completes each confirmed booking whose meeting has ended, with the actor `system`. The owner marks a confirmed order fulfilled with `POST /api/my-business/requests/{id}/fulfil` (403 for another business, 409 unless a confirmed order). The control for it is deferred to the owner's workspace (journey 23).
- **Live updates (L2-070).** There is no persistent connection yet. Both pages ask again every 5 seconds without a loading state and announce a change of status with a toast ("{Business} confirmed your meeting", "declined", "complete"). The 2-second target and event replay are deferred with the connection.
- **Where it is reached from.** The booking, quote and order dialogs already link to `/requests/{id}`. A chrome entry waits for the account menu (journey 20).

## Deferred

- L2-070 AC1 to AC3: the WebSocket or server-sent events channel, its event ids and replay.
- L2-049 AC2: the cancellation card in the conversation and the owner's in-app notification (journey 17); the owner is e-mailed.
- The owner control for "Mark fulfilled" (journey 23).
- L2-043 AC2 to AC3 customer notifications are journey 13's.

## Consequences

Journey 17 replaces the polling toast with notifications from the outbox and adds the cards. Journey 23 adds the owner control for fulfilling an order.
