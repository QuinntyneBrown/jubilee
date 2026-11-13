# 0061. Finish track and cancel requests

## Status

Accepted, 12 November 2026. Amends ADR 0022, whose deferrals of the event stream on the
member's request pages and of the owner's "Mark fulfilled" control it ends. Applies ADR 0050
(the event stream with a fallback timer) and ADR 0057 (no verification: nothing here names it).

## Context

Journey 14 lets a member follow each request and cancel an open one. ADR 0022 left the two
member pages asking the server every 5 seconds because there was no persistent connection, and
left the owner without a control for the fulfil endpoint it had built. Since then journey 13
gave the owner's Incoming requests the event stream (ADR 0050) and journey 17 made every request
notification reach the open page over it (ADR 0053). The booking-completion and unanswered-request
jobs still ran on every instance with no record of a success (`L2-182` AC1).

## Decision

### The member's request pages listen to the event stream (L2-070 AC6)

- `/requests` and `/requests/:id` read again, without a loading state, when a notification of
  kind `request` arrives for them over `RealtimeService.received`: the list for any target under
  `/requests/`, the detail for its own `/requests/{id}`. The owner's confirm, decline and
  fulfil each tell the customer such a notification, so the page changes within the stream's
  delivery time (about a second) instead of up to 5 seconds.
- They do not ask on a timer while the stream is connected. While it cannot connect they ask
  every 5 seconds (`RealtimeService.connected`, as Incoming requests does), and when it connects
  again they read once.
- An owner who takes back a confirmation within 8 seconds removes the customer's unread
  notification (ADR 0050); the stream then sends a lower unread count, and the pages read again
  when that count falls, so the request reads "Awaiting reply" again.
- The page says the change in its own words ("{Business} confirmed your meeting"), so
  `RealtimeService` shows no toast of its own for a request notification on the page it
  concerns: one change, one toast.
- A booking the system completes after its meeting tells nobody; the page shows "Completed" the
  next time it reads. The business did not act, so there is nothing to announce.

### The owner marks a confirmed order fulfilled (L2-225)

- A confirmed order in Incoming requests, under "Confirmed" or "All", carries "Mark fulfilled".
  A booking completes by itself when its meeting ends; a quote has nothing to deliver; a space
  request stays with journey 28 (ADR 0042), so none of them carries it, and the API refuses them
  with 409 `INVALID_TRANSITION` as before.
- The button opens `FulfilRequestDialog`, built like the confirm dialog: "Mark {first name}’s
  order fulfilled?", the customer, the order and the total, "Not yet" focused and "Mark
  fulfilled". A failure keeps the dialog open with "Try again" (`L2-128`); a conflict (the
  customer cancelled) shows the server's sentence and changes nothing.
- There is no Undo: `completed` is final in the lifecycle (`L2-043`), and the dialog states the
  consequence before anything happens (`L2-129`).
- `FulfilRequestCommandHandler` now tells the customer in the app and by e-mail ("{Business}
  marked your order fulfilled", category Requests) through `IncomingRules.QueueEmail`, the same
  path as a confirm or a decline. `POST /api/my-business/requests/{id}/fulfil` is unchanged.

### The two request jobs run once per schedule (L2-182 AC1)

- `RunBookingCompletionJobCommand` (`booking-completion`, every 5 minutes) and
  `RunUnansweredRequestJobCommand` (`unanswered-requests`, every hour) wrap the existing
  commands in `ScheduledJobs.RunOnceAsync`, so one instance runs each occurrence and its success
  is recorded in `JobRun`. The worker ticks every minute and every 10 minutes, so an instance
  that starts late in an occurrence still serves the next one on time.
- The work stays idempotent on its own: a completed booking is not confirmed any more, and a
  reminded request carries `NudgedAt`.

## Consequences

- A member watching a request sees the business's answer about a second after it is given, and
  the server is no longer asked every 5 seconds by every open request page.
- The owner closes an order from the same list where they confirmed it, and the customer's
  request reads "Completed".
- Still out of scope: the retries and the dead-letter queue of `L2-182` AC2 (operations), and a
  space request's fulfilment (journey 28).
