# 0068. Finish use Jubilee offline

## Status

Accepted, 13 November 2026. Amends ADR 0032, whose deferrals of the service worker, Background
Sync, the realtime reconnect and clearing the device on sign-out this record settles. Keeps
ADR 0051 (a message with a photo is not queued) and ADR 0056 (a page load gets its status from
the server).

## Context

Journey 24 keeps Jubilee useful on a poor connection. ADR 0032 built the connection banner, the
saved directory and conversations in IndexedDB and the outgoing queue, and deferred the rest. An
audit of 12 November 2026 listed what was left: no service worker, so a reload with no
connection could not open the app (`L2-119` AC3); no Background Sync; nothing cleared on
sign-out, although the app has had a sign-out since journey 5; the realtime stream not reopened
when the connection returns; the 24-hour expiry of a queued message, the slow-connection banner
and the slow toast without tests; and "Check status" pointing at a placeholder.

Checked against the code, two of these were already done: journey 18 (ADR 0053) reopens the
event stream at once when the browser says it is online again, with a test (`L2-070` AC4), and
the 24-hour expiry is tested with a controlled clock (`offline.spec.ts`, `L2-120` AC3). Neither
is built again.

## Decision

- **The Angular service worker caches the app shell (`@angular/service-worker`).** It is the
  platform's practice. It runs in production builds only (`provideServiceWorker` with
  `enabled: !isDevMode()`, registered once the app is stable or after 30 seconds), so
  `ng serve` and the behaviour specs that run against it are unchanged. `ngsw-config.json`
  prefetches the group `app` (`index.html`, the scripts, the styles and the icon) and keeps the
  group `assets` (`/static/**`, the images) as they are used. It has no data groups.
- **The service worker never caches an `/api` answer.** The registered script is
  `jubilee-sw.js`: its first `fetch` listener leaves every `/api/` request to the network
  (`stopImmediatePropagation`, no answer of its own), then it loads `ngsw-worker.js`. What a
  member saw stays in IndexedDB as ADR 0032 decided (the browse home and the last 20
  conversations), where sign-out can clear it, and the event stream never passes through the
  worker.
- **A page load goes to the network first** (`navigationRequestStrategy: "freshness"`), so the
  server's answers of ADR 0056 (404, 403, a 301 for an old slug, the 503 maintenance page) still
  reach the browser; the cached `index.html` answers only when the network fails. That is what
  lets Jubilee open with no connection.
- **A new version is offered by being used the next time Jubilee is opened.** The worker checks
  `ngsw.json` when the app opens and fetches a new version in the background; a tab that is open
  keeps the version it started with. There is no "new version" prompt, so no new screen state.
  `eng/azure/server.js` serves `ngsw-worker.js`, `jubilee-sw.js`, `safety-worker.js` and
  `ngsw.json` with `Cache-Control: no-cache`, so a deploy is seen at once.
- **Background Sync sends the queue while Jubilee is closed (`L2-120` AC5).** Writing a message
  to the queue asks for a sync with the tag `jubilee-outbox` where the browser has `SyncManager`.
  The worker's `sync` handler does what `QueueDrainer` does, under the same Web Lock
  (`jubilee-outbox-drain`): it sends the waiting messages oldest first with their idempotency
  keys, removes each one sent, marks one the server refuses (a 4xx other than 408 and 429), or one
  older than 24 hours, "Not sent", and stops at the first one that cannot be delivered, failing
  the sync so the browser tries again later. It tells open pages how many it sent, and they
  announce it as the drainer would. Where the browser has no Background Sync, the in-page drainer
  (when the app starts and when the connection returns) is the fallback; it reads the queue
  again inside the lock, so a message the worker sent is never sent twice.
- **Signing out clears the device (`L2-119` AC3).** Once the server has ended the session,
  `SessionService.signOut` clears the saved pages (`jubilee-offline`) and the outgoing queue
  (`jubilee-outbox`). A message still "Not sent" is dropped with it: it belongs to the member
  who signed out. Drafts stay, keyed by member (ADR 0046, `L2-011` AC3). The worker's caches
  hold only the public app shell and are kept.
- **A member who opens Jubilee with no connection is still signed in (`L2-119` AC4).** The
  session is resolved by `GET /api/session`, which gets no answer offline; the app then made the
  user a visitor, and every page saved for the member sent them to sign in. `SessionService` now
  keeps the last answer that named a member in `jubilee-offline` (key `session`) and, when the
  session read gets no answer at all, uses it until Jubilee answers. Any other failure still makes
  the user a visitor. The server decides every request; this only lets the saved pages open. The
  saved session goes on sign-out, on expiry and when Jubilee says no one is signed in.
- **The status page's address is set at build time** (`environment.statusUrl`). It stays the
  placeholder `https://status.jubilee.example` until the repository owner hosts a status page
  apart from the API and supplies its address (an owner step, in `eng/azure/README.md`).
- **The tests.** The behaviour specs answer the API by Playwright mocking (ADR 0009), which a
  service worker would hide. The service worker spec runs against the production build, served
  on port 4203 by `eng/azure/server.js` itself; the worker passes `/api` requests by, so the page
  is answered as in every other spec, and the worker's own requests are answered at the browser
  context. A sync is fired through the DevTools protocol (`ServiceWorker.dispatchSyncEvent`).

## Consequences

- Jubilee opens with no connection on a device that has opened it before, shows the directory
  and the conversations last seen, and sends what was written when the connection returns, even
  if the app was closed (where the browser allows it).
- Nothing a member saw or wrote stays on a shared device after they sign out.
- The behaviour suite builds the app once more, for the service worker spec.
- A message with a photo is still not queued (ADR 0051).
- The hosted status page remains an owner step.
