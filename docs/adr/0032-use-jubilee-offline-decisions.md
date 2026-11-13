# ADR 0032: Use Jubilee offline

Status: accepted; its deferrals are settled by ADR 0068

## Context

Journey 24 (L2-119 to L2-122) keeps Jubilee useful with no connection: the last directory and the last twenty conversations stay readable, a message written offline waits on the device and is sent when the connection returns, a banner says what is wrong, and a page that cannot load says so. The designs left the probe timeout, the status page, the explanation copy and the ping limit as `<TO SUPPLY>`.

## Decisions

- **The state is one service.** `ConnectionService` holds `online`, `offline`, `unreachable` and `slow`. The browser `offline` event sets `offline` at once; `online`, or a request with no answer while the network is up, probes `GET /api/health/ping` (204, anonymous, exempt from maintenance). A probe fails after 5 seconds, or on 502, 503 or 504, and the state becomes `unreachable`, retried after 5, 10, 20, 40 and then 60 seconds with the seconds left shown. An answer to any request, or to a probe, ends it. A mean request time above 3 seconds over the last 30 seconds makes the state `slow`. The waits are in one `Timings` object a test can shorten.
- **A 503 that is not maintenance counts as no answer**; maintenance (`code: MAINTENANCE`) proves Jubilee is reachable.
- **The ping has no rate limit of its own.** One probe runs at a time per tab and the back-off reaches a minute.
- **The status page is a constant, `https://status.jubilee.example`,** until a page is hosted apart from the API (so it survives an outage). “Check status” opens it in a new tab.
- **Saved pages use IndexedDB, not a service worker cache.** The browse home and the last 20 conversations are written to the `jubilee-offline` database each time they arrive, and read when a request gets no answer. A page with a saved copy shows it, and the banner says “Showing the directory saved at 8:42 a.m. …”; a page without one shows `/offline` (the address is kept in router state so the connection returning opens the page that was asked for).
- **The queue is IndexedDB too** (`jubilee-outbox`). A message written when the connection is down is stored with its idempotency key and shown as “Waiting to send”. `QueueDrainer` sends in order, one tab at a time (Web Lock), when the app starts and when the connection returns. A 4xx answer (other than 408 and 429) makes the message “Not sent” with Try again and Delete; a message waiting more than 24 hours also becomes “Not sent”. The count of messages sent is announced in the “back online” notice.
- **Writes are retried for a minute** (every 2 seconds) when they get no answer, with a “Still sending your request” warning at 5 seconds. Messages opt out (`OWN_RETRY`): the queue is their retry. A send that fails while the app has no reason to think it is offline is still shown as “Not sent. Check your connection.” (L2-058).
- **What needs a connection is disabled and says why,** with `jbRequiresConnection` (title and `aria-description`: “Needs a connection. It works again when you’re back online.”): the search boxes, save, book, quote and message actions of a listing. The composer in a conversation does not carry it.
- **Failed page reads show the offline page only when the page has no fallback of its own** (`OWN_OFFLINE_FALLBACK`); background reads (session, `/api/me/`, health) never do.

## Deferred

- **Service worker and a cached app shell.** Without it a reload with no network cannot open the app; the pages above are reachable only while the app is open. `@angular/service-worker` and `ngsw-config.json` are not yet added.
- **Background Sync** to send queued messages with the app closed; the queue drains when the app is next open.
- **Realtime reconnect** after the connection returns (the SSE client reconnects on its own schedule).
- **Clearing the device on sign-out.** `OfflineSnapshotStore.clear` and `OutgoingMessageQueue.clear` exist but are not called, because the app has no sign-out yet (journey 05).
- **A browse offline route entry and a visual state for “Waiting to send”** in the sweeps: the queue lives in IndexedDB and has no network stub.

## Amended by ADR 0068

The deferrals above are settled. The Angular service worker (`@angular/service-worker`, production builds only) caches the app shell so Jubilee opens with no connection; it never caches an `/api` answer, which stays in IndexedDB as decided here; a page load goes to the network first and the cached `index.html` answers only when the network fails; a new version is used the next time Jubilee is opened. Background Sync sends the queue while the app is closed, with the in-page drainer as the fallback. Signing out clears the saved pages and the queue. The realtime reconnect was built by journey 18 (ADR 0053). The status page address is set at build time and remains an owner step.
