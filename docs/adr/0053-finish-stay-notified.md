# 0053. Finish stay notified

Status: accepted

## Context

Journey 17 (a member receives events through the notification centre, toasts, banners and e-mail)
was recorded at 89%. ADR 0025 and ADR 0028 deferred the daily summary (`L2-016` AC6), the "new
business" notification (`L2-064` AC6), the two promotional e-mails (`L2-149` AC1) and the page a
person sees when they open an unsubscribe link. ADR 0032 left the event stream to the browser's own
reconnect, which gives up when the server refuses a connection. The designs of the subsystem still
named classes that were never built (`PendingEmail`, `PresenceTracker`, a SignalR `EventsHub`, a
Redis backplane), and nothing measured the 2 seconds of `L2-070` AC1.

## Decision

- **The daily summary holds e-mail in the outbox.** `EmailPolicy.Queue` marks the row
  `OutboxMessage.HeldForSummary` when the member chose "One daily summary" and the category is
  "New messages" or "Request updates"; `OutboxDispatcher` does not send a held row. Meeting
  reminders, security and transactional e-mail and the two promotional e-mails are never held.
  `SendDailySummariesCommand` turns each member's held rows into one e-mail, "Your Jubilee summary
  for {day}", with one line per held row (its subject) and the button "See what happened" to
  `/notifications`, and deletes the rows in the same save. A row whose category the member has
  turned off since is dropped; a member who went back to "As it happens" gets what was held in one
  last summary. A held row is still withdrawn with its request, and a conversation still has one
  row however many messages arrive, so the rules of ADR 0025 hold unchanged.
- **The summary runs at 7:00 a.m. in Toronto, once, on `ScheduledJobs`.** `DailySummaryJob` ticks
  every five minutes. `ScheduledJobs.RunOnceAtAsync` takes the occurrence itself, here today's
  7:00 a.m. in America/Toronto (`TorontoClock.At`), so the hour is right on either side of a clock
  change and an instance that was down at 7:00 still sends that day's summary when it starts. The
  same seam runs the weekly note (Monday 7:00 a.m.) and the tips (the first day of the month,
  7:00 a.m.).
- **The unsubscribe of a summary turns off both held categories.** The signed link carries the
  category `summary`; `UnsubscribeCommand` turns off "New messages" and "Request updates" for it,
  because nothing less stops the e-mail the person asked to stop (`L2-016` AC8).
- **"Browsed" is read from the listing views that exist.** A category is browsed when the member,
  signed in, opened the page of a business in it in the last 90 days: `ListingView` already records
  that for the owner's statistics, with the member's subject as its visitor. No new record of what
  a member looks at is kept.
- **A new business is told in the app at once and by e-mail once a week.** `ApproveListingCommand`
  calls `NewBusinessNotifier` the first time a listing is approved: each member with "New
  businesses" on who browsed the category, except the owner, gets a notification of kind
  `business`, "New in {category}: {business}" with the business's tagline, as the mock of the
  notification centre words it. `SendNewBusinessNotesCommand` sends the weekly note
  the switch promises ("A weekly note about new listings in categories you’ve browsed"): the
  listings first approved in the last 7 days in the member's browsed categories.
- **Tips are a fixed series, one a month, each once.** `OwnerTips.Series` holds the tips in code;
  `Member.TipsSent` counts how many the member has had. `SendOwnerTipsCommand` sends the next one to
  each owner of a public listing with "Tips for business owners" on. Each tip names something the
  owner can do in Jubilee today; none promises custom, revenue or rank (`docs/scripture.md`, "What
  Jubilee never says").
- **Promotional e-mail needs a mailing address.** `Email:MailingAddress` (`EmailSettings`) is
  printed in the footer of the weekly note and the tips. While it is empty neither is sent
  (`L2-149` AC1): the jobs run, record their success and queue nothing.
- **The unsubscribe page posts the token.** The footer link of an e-mail is now
  `/unsubscribe/{token}` in the app; the `List-Unsubscribe` header stays the API address, for the
  one-click POST of RFC 8058. The page posts the same `POST /api/email/unsubscribe/{token}`, which
  now answers with the category, takes the token out of the address bar and says what stops. A
  mail scanner that fetches the link gets the application shell and changes nothing, because only
  the script posts.
- **The stream is opened again by the application when the browser gives up.** `SseEventsApi`
  watches `EventSource.readyState`: when it is `CLOSED` it opens a new connection after 5 seconds,
  doubling to at most 60, and at once when the browser says it is online again. It passes the last
  event id as `?lastEventId=`, which `EventsController` already reads, so the server sends what was
  missed and `RealtimeService` shows nothing twice (`L2-070` AC2 and AC4).
- **No backplane.** Each connection reads the member's notifications from the database once a
  second (ADR 0025), so an event reaches the page whichever instance holds the connection and
  whichever process created it. A backplane would only be needed for sub-second delivery, which no
  requirement asks for (`L2-070` AC5).
- **The 2 seconds are measured where they can be.** `EventStreamTests` times, at the production
  polling interval, how long each of twenty notifications takes from its save to its frame on an
  open stream and asserts the 95th percentile is under 2 seconds. That measures the API; the
  network between Azure and a phone is measured in production (an owner step).

## Consequences

- One migration: `OutboxMessages.HeldForSummary` and `Members.TipsSent`.
- A member on the daily summary gets a message e-mail up to a day late, by their choice; the
  notification centre, the toast and the badge are as fast as before.
- A member who never opens a business page while "New businesses" is on hears of no new business.
  The switch says "categories you’ve browsed", so that is what it does.
- Production must set `Email:MailingAddress` before any promotional e-mail goes out. Until then the
  two switches are saved and their consent recorded, and nothing is sent.
- ADR 0025's deferrals of the daily summary, the unsubscribe page and the "new businesses"
  notification, and ADR 0028's of the promotional e-mails, are closed by this record. Push while
  the app is closed (journey 24) and the retries and dead-letter queue of `L2-182` AC2 (the design
  "Run background jobs", ADR 0050) stay where they were.
