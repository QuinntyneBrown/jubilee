# 0050. Finish responding to customer requests

Status: accepted

## Context

Journey 13 (an owner sees incoming requests and confirms or declines each one) was recorded at 90%.
ADR 0021 deferred four things that later journeys were to bring: the real-time channel in place of
polling, the "Replies fast" badge on public listings, the danger toast when a confirmation fails
after its dialog was closed, and the guarantees of `L2-182` for the response-time job. The event
stream (`GET /api/events`, ADR 0025) and the in-app notifications have landed since, so each of
them can now be finished. The design of the decline also described an answer of HTTP 409 that
closes the dialog and reloads the row; the dialog showed its general failure instead.

## Decision

- **The page listens to the event stream; it polls only while the stream cannot connect.** This
  reverses "New requests reach the page by polling" of ADR 0021. `IncomingRequestsPage` reads the
  list again when `RealtimeService` receives a notification of kind `request` whose target is
  `/my-business/requests` (a new request, a cancellation), and when the `counts` event changes the
  owner's `newRequestCount`. The stream carries no row data: the page reads the list from
  `GET /api/my-business/requests` and announces each New request it had not seen, so the wording of
  the toast stays "New {type} request. {Customer} asked for {summary}." (`L2-051` AC5).
- **One toast, not two.** `RealtimeService` shows a toast for every notification. On
  `/my-business/requests` it leaves a `request` notification that targets that page to the page,
  which says the same thing in the words of `L2-051`.
- **How the app knows the stream is down.** `EventsApi.stream()` also emits
  `{ type: 'connection', connected }`. `SseEventsApi` says `connected: true` when the `EventSource`
  opens and `connected: false` when an attempt to connect fails without having opened: a stream
  that ends and is opened again by the browser never counted as down. `RealtimeService.connected`
  holds the last value, `true` until an attempt fails. While it is `false` the page asks every 5
  seconds, as it did before; the moment it is `true` again the page reads once and stops asking.
- **"Replies fast" is a `jb-badge`, tone `success`, with its words as text.** `BusinessCardDto` and
  `ListingPageDto` gain `repliesFast`, read from `ResponseTimeStat` by `ResponseTimes.FastListings`.
  The listing page shows the badge beside the credentials in the head of the page; `jb-business-card`
  shows it in the card's meta line, after the highlight and the verified mark. No new component:
  the badge already says a state in text and colours it only as a second carrier. A space and a
  space card do not carry it (`L2-054` AC3): the rooms and rentals head has no line for it, and a
  host's answer there is the release of an address, not a reply time a renter compares. The compact
  directory rows and the search results carry no badge either; they show a name and a tagline only.
  The directory read cache (60 seconds) bounds how long a removed badge can still show.
- **The response-time job runs once per hour across instances and records its success.** A new
  entity `JobRun` has the key (`Job`, `Occurrence`): the name of the job and the start of the hour
  it ran for, in UTC. `ScheduledJobs.RunOnceAsync` inserts the row before the work, so of two
  instances that reach the same hour one inserts and the other finds the row, or is refused by the
  key, and does nothing. When the work ends the row's `SucceededAt` is set: the job's last success
  is its newest `SucceededAt` (`ScheduledJobs.LastSuccessAsync`). When the work throws, the row
  stays without a success, which is the record of the failure, and the job runs again at the next
  hour; the row is not removed, because removing it would save whatever the failed work left
  half-changed in the same unit of work. `RunResponseTimeBadgeJobCommand` is what `ResponseTimeBadgeJob`
  sends, every ten minutes, so an instance that started late in an hour still serves the next hour
  on time; the recompute itself (`RecomputeResponseTimesCommand`) was already idempotent. The primary
  key, not a unique index, is the guard, because the EF Core InMemory provider the tests use
  (ADR 0009) enforces keys only. The other jobs keep their own guards (each is idempotent per row);
  moving them onto `ScheduledJobs`, and the retries and dead-letter queue of `L2-182` AC2, belong
  to the design "Run background jobs".
- **A confirmation that answers after its dialog was closed is still reported.** The dialog can be
  closed with Escape while the request is on its way. `ConfirmRequestDialog` then hands the answer
  to its opener (`ConfirmRequestData.settled`): a success shows the usual toast with "Undo"
  (`L2-052` AC7), and a failure shows the danger toast "Couldn’t confirm the {noun}" with
  "{Customer}’s request is still new. Try again." and the action "Try again", which confirms the
  same request again from the page (`L2-052` AC5). A conflict (the customer cancelled) shows the
  server's sentence in a danger toast with no action, because there is nothing to try again.
- **A decline of a request that is no longer new closes the dialog.** On HTTP 409 the
  `DeclineRequestDialog` closes with the server's sentence, the page reloads the list and shows the
  danger toast "Request not declined" with that sentence (`L2-053` AC6). The note that was typed is
  not kept: the request it answered is gone.

## Consequences

- ADR 0021's deferrals for `L2-051` AC5, `L2-052` AC5 and `L2-054` are closed; its bullet "New
  requests reach the page by polling" is superseded by this record.
- `JobRun` and `ScheduledJobs` are the seam the remaining jobs can move to. The table needs the
  migration `AddJobRuns` (`jubilee migrate`).
- A page that needs to know whether the stream is up reads `RealtimeService.connected`. The
  member's requests page (journey 14) still polls; it can use the same signal.
- The recorded API answers gain `repliesFast` on every business card and listing page, so the
  recording was refreshed in the same change.
