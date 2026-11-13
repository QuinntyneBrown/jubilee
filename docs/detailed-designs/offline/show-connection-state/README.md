# Show connection state

## Overview

Jubilee is Toronto's Christian marketplace, used mostly on phones and mobile
networks. A page that stops responding without explanation leaves a member
unsure whether a message or a request went through. This feature tells the
member what state the connection is in, in one banner at the top of every page,
and recovers without any action from the member.

Four terms are used throughout:

- **connection state** — one of four conditions the application distinguishes: `online`, `offline`, `unreachable`, `slow`
- **reachability probe** — small request to `Jubilee API` whose only purpose is to learn whether the service answers
- **back-off** — waiting time between reconnection attempts that doubles after each failed attempt
- **no answer** — a request that ends with status `0`, `502`, `504`, or a `503` that is not the maintenance answer (`code: MAINTENANCE`)

The feature separates two failures that look alike to a member. When the
browser has no network, the banner says the device is offline. When the network
is up but `Jubilee API` does not answer, the banner says the fault is on
Jubilee's side and links to the status page. While the application waits to
retry, the same banner counts down the seconds to the next attempt. Attempts
start 5 seconds apart and back off to at most 60 seconds.

The feature also covers slow connections. An average request time above
3 seconds over a 30-second window raises a warning banner. A write still
sending after 5 seconds raises a warning toast, and a write that gets no answer
is retried for up to 60 seconds before it fails.

## Description

The slice lives almost entirely in `Jubilee Web`. `Jubilee API` contributes one
probe endpoint (ADR 0032, ADR 0068).

- **`ConnectionService`** — Angular service that owns the connection state
  machine. `state` is a signal of `ConnectionState`
  (`'online' | 'offline' | 'unreachable' | 'slow'`). It also exposes
  `isOffline`, `cannotDeliver` (offline or unreachable), `countdown` (seconds to
  the next attempt, or `null`), `detail` (the sentence a page adds to "You're
  offline."), `backOnline` (the count of saved messages just sent, or `null`)
  and `returned` (a count that rises each time the connection comes back).
  - The browser `offline` event sets `offline` at once, inside the 2 seconds of
    L2-121 AC1. The `online` event, "Try again" and a request with no answer
    while `navigator.onLine` is true call `check()`.
  - `check()` runs one probe at a time: `fetch('/api/health/ping')` with
    `cache: 'no-store'` and a 5-second timeout. An answer other than `502`,
    `503` or `504` means Jubilee is reached; a failure while
    `navigator.onLine` is false means `offline`; anything else means
    `unreachable`.
  - In `unreachable`, the next probe waits 5, 10, 20, 40 and then 60 seconds
    (`timings().backoff`), and `countdown` falls by one each second.
  - Reaching Jubilee resets the back-off and sets `online`. When the state was
    `offline` or `unreachable`, it sets `backOnline` to `0` and raises
    `returned`, which pages, `OfflinePage` and `QueueDrainer` react to.
  - `recordLatency(ms)` keeps the requests of the last 30 seconds; a mean above
    3 seconds turns `online` into `slow`, and a mean of 3 seconds or less turns
    it back.
- **`timings()`** — the waits of the offline behaviour, `DEFAULT_TIMINGS`, in
  milliseconds: `probeTimeout` 5,000; `backoff` 5,000 to 60,000;
  `latencyWindow` 30,000; `slowMean` 3,000; `slowRequest` 5,000; `retryWindow`
  60,000; `retryEvery` 2,000; `expiryEvery` 60,000; `queueLifetime` 24 hours. A
  test shortens them by setting `window.__jbTimings` before the app starts.
- **`connectionInterceptor`** — the first HTTP interceptor of `Jubilee Web`.
  Every response records its latency and reports success; an error response
  with an answer also reports success. A request with no answer calls
  `reportNetworkFailure()`. A write (any method but `GET` and `HEAD`) not
  marked `OWN_RETRY` is retried every 2 seconds while less than 60 seconds have
  passed, and after 5 seconds `ToastService` shows the warning toast "Still
  sending your request. Your connection is slow. We'll keep trying for a
  minute." Each retry repeats the same request, so it carries the same
  idempotency key and a retried create produces one resource (L2-132 AC2).
  Messages are marked `OWN_RETRY`: the outgoing queue is their retry.
- **`ConnectionBanner`** — `div[jb-connection-banner]` in the `components`
  library, built on the banner form of `jb-alert` (mock
  `notifications/offline-banner`). Its `kind` is a `ConnectionBannerKind`:
  - `offline` (warning): "You're offline." followed by `detail`, or "Messages
    you write are sent when you reconnect.", with "Try again".
  - `unreachable` (danger): "We can't reach Jubilee. This is on our side. Your
    messages are kept and will send when we're back." and, while a countdown
    runs, "Reconnecting… Trying again in {n} seconds.", with "Check status".
  - `slow` (warning): "Your connection is slow. Pages may take longer to load."
  - `back-online` (success): "You're back online." and, when messages were sent,
    "{n} saved message(s) was/were sent.", with a dismiss button.

  Only `back-online` can be dismissed. The banner is a polite live region, so
  each change is announced without moving focus (L2-067).
- **`App`** — the application shell mounts the banner once, above `<main>`. Its
  `banner` signal is the connection state when that is `offline`,
  `unreachable` or `slow`, otherwise `back-online` while `backOnline` is set,
  otherwise nothing. "Try again" calls `ConnectionService.check()`; dismiss calls
  `dismissBackOnline()`.
- **`STATUS_URL`** — the address "Check status" opens in a new tab
  (`rel="noopener noreferrer"`). It comes from `environment.statusUrl`. The
  placeholder `https://status.jubilee.example` stays until the repository owner
  supplies the hosted status page's address, an owner step listed in
  `eng/azure/README.md`. The status page is hosted apart from `Jubilee API`, so
  it stays available during an outage (ADR 0032).
- **`SseEventsApi`** — the client of the event stream `GET /api/events` behind
  `RealtimeService`. It does not feed `ConnectionService`. When the browser
  closes the `EventSource`, it opens a new one after 5 seconds, doubling to at
  most 60, and at once on the browser `online` event, naming the last event it
  received so that the server sends what was missed (ADR 0053).
- **`HealthController`** — `Jubilee API` controller. `GET /api/health/ping`
  returns `204 No Content`, is `[AllowAnonymous]` and reads no data. It has no
  rate limit of its own: one probe runs at a time per tab and the back-off
  reaches a minute (ADR 0032).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-121` | `L1-017` | AC1. Given the browser goes offline, when detected, then the persistent offline banner shows within 2 seconds. AC2. Given the API is unreachable while the network is up, when detected, then the banner reads "We can't reach Jubilee. This is on our side. Your messages are kept and will send when we're back." with "Check status" linking to the status page. AC3. Given a retry after a dropped connection, when waiting, then the banner reads "Reconnecting… Trying again in {n} seconds." with exponential back-off from 5 seconds to at most 60 seconds. AC4. Given requests take more than 3 seconds on average over 30 seconds, when detected, then a warning banner reads "Your connection is slow. Pages may take longer to load." AC5. Given a request still sending after 5 seconds, when that happens, then a warning toast reads "Still sending your request. Your connection is slow. We'll keep trying for a minute." and the request is retried for up to 60 seconds before failing. |
| `L2-067` | `L1-010` | AC1. Given a condition that needs the user's action (e-mail unconfirmed, listing paused, offline), when it holds, then a persistent banner with no dismiss button is shown on the relevant pages until it clears. AC2. Given a resolved condition (e-mail confirmed, listing resumed, back online), when it resolves, then a success banner is shown once and can be dismissed. AC3. Given a banner, when it appears or changes, then the change is announced in a polite live region without moving focus. |
| `L2-132` | `L1-018` | AC2. Given a double-click or network retry, when it happens, then exactly one resource is created. |

## Diagrams

### System context

Every person who uses Jubilee sees the connection banner. The `Status page` is
an external site that the banner links to when Jubilee is unreachable.

![C4 system context for showing connection state](diagrams/c4-context.png)

### Containers

`Jubilee Web` detects the state from browser events, from every request it
makes and from the probe endpoint of `Jubilee API`. The event stream reconnects
on its own.

![C4 container view for showing connection state](diagrams/c4-container.png)

### Components

`connectionInterceptor` reports every request to `ConnectionService` and raises
the slow-request toast through `ToastService`. `App` renders the state through
`ConnectionBanner`; `ConnectionService` probes `HealthController`.

![C4 component view for showing connection state](diagrams/c4-component.png)

### Class structure

`ConnectionService` holds one `ConnectionState` and reads its waits from
`Timings`. `App` maps the state to a `ConnectionBannerKind` for
`ConnectionBanner`.

![Class diagram for showing connection state](diagrams/class-structure.png)

### Behaviour — go offline and reconnect

The browser `offline` event produces the persistent banner at once. The
`online` event probes Jubilee; a probe that answers shows the success banner,
raises `returned` and drains the outgoing queue, and `SseEventsApi` reopens the
event stream.

![Sequence diagram for going offline and reconnecting](diagrams/sequence-offline-and-reconnect.png)

### Behaviour — detect an unreachable API

A request with no answer while the network is up triggers a probe. A failed
probe yields the "We can't reach Jubilee." banner with the countdown and
"Check status", and the probe runs again on the back-off schedule.

![Sequence diagram for detecting an unreachable API](diagrams/sequence-api-unreachable.png)

### Behaviour — handle a slow request

`connectionInterceptor` raises the warning toast after 5 seconds and retries a
write with no answer for up to 60 seconds. `ConnectionService` raises the
slow-connection banner from the rolling mean.

![Sequence diagram for handling a slow request](diagrams/sequence-slow-request.png)
