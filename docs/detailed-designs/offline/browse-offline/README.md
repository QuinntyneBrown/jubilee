# Browse offline

## Overview

Jubilee is Toronto's Christian marketplace: a directory of
Christian-owned businesses that members browse, message and send requests to.
Members open it on phones and mobile networks, where the connection drops
without warning. This feature keeps Jubilee opening, and the directory and the
conversations a member has opened readable, when there is no connection at all.

The feature rests on two stores on the device. The `Jubilee service worker`, a
script the browser installs beside `Jubilee Web`, keeps the files that start the
application. The `jubilee-offline` IndexedDB database keeps the data of the
pages that can be read offline. The service worker never stores an answer of
`Jubilee API` (ADR 0032, ADR 0068). Four terms are used throughout:

- **app shell** — static files (`index.html`, scripts, styles, the icon) that start `Jubilee Web` without a network request
- **saved page** — the last answer of the browse home, or of one opened conversation, kept in `jubilee-offline` with the time it was saved
- **offline page** — full-page state shown in place of a page whose data is not on the device
- **background read** — a request the application makes for itself (the session, `/api/me/`, health), which never replaces a page with the offline page

When a member opens Jubilee with no connection, the service worker answers the
page load with the cached `index.html`, so the application starts. When a
member who has opened the browse home before opens it offline, `BrowsePage`
renders the saved directory under the persistent banner that names the time it
was saved (L2-119). Controls that depend on the server (search, save, book,
quote, message and review actions) are disabled with an explanation. Sending a
message in a conversation is the one exception: the message is queued on the
device (L2-120, see the queue messages offline design).

When the member opens a page that has no saved copy, the offline page appears at
the same address. It opens the original page when the connection returns
(L2-122). When the member signs out, the saved pages and the outgoing queue are
cleared from the device; the service worker's caches hold only the public app
shell and stay.

## Description

The slice runs from the browser's caches and IndexedDB to the two read endpoints
whose answers are saved.

- **`provideServiceWorker`** — registration in `app.config.ts`:
  `provideServiceWorker('jubilee-sw.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`.
  The service worker runs in production builds only; a development server and
  the Playwright suite run without it (ADR 0068).
- **`jubilee-sw.js`** — the registered script, in
  `frontend/projects/jubilee/public/`. It first adds a `fetch` listener that
  leaves every `/api/` request to the network (`event.stopImmediatePropagation()`
  and no `respondWith`), then loads the Angular service worker with
  `importScripts('./ngsw-worker.js')`, then adds the `sync` listener for the tag
  `jubilee-outbox` that the queue messages offline design describes.
- **`ngsw-config.json`** — build-time configuration of the Angular service
  worker. The asset group `app` (install mode `prefetch`) holds `/index.html`,
  `/*.css`, `/*.js` and `/jubilee-icon.svg`; the asset group `assets` (install
  mode `lazy`, update mode `prefetch`) holds `/static/**` and `/*.png`. There
  are no data groups, so no `/api/**` answer is cached by the service worker.
  `navigationRequestStrategy` is `freshness`: a page load goes to the network
  first, so the server's status answers (404, 301 and the 503 maintenance page,
  ADR 0056) still arrive, and the cached `index.html` answers only when the
  network fails. A new version is fetched in the background and used the next
  time Jubilee is opened, without a prompt.
- **`eng/azure/server.js`** — serves `ngsw-worker.js`, `jubilee-sw.js`,
  `safety-worker.js` and `ngsw.json` with `Cache-Control: no-cache`, so a new
  deployment reaches devices that have the service worker installed.
- **`ConnectionService`** — Angular service that holds the connection state as
  a signal. This feature reads `isOffline()` (no network), `returned` (a count
  that rises each time the connection comes back) and `detail` (the sentence
  the offline banner adds). The detection rules belong to the show connection
  state design (L2-121).
- **`OfflineSnapshotStore`** — IndexedDB database `jubilee-offline`, object
  store `snapshots` keyed by `key`. Each `Snapshot` holds `key`, `savedAt` (ISO
  time in UTC), `touchedAt` and `data`. `save(key, data)` writes a snapshot;
  `read(key)` returns it or `null`; `clear()` empties the store. A key that
  starts with `conversation:` is a conversation, and `save` keeps only the
  `KEPT_CONVERSATIONS` (`20`) most recently saved ones, deleting the rest. A
  failure to read or write is swallowed: the page then has nothing saved.
- **`DirectoryStore`** — store behind `BrowsePage`, provided by the page. `load()`
  reads the browse home through `DIRECTORY_API.getHome()`, which marks the
  request `OWN_OFFLINE_FALLBACK` so the page decides about the offline page
  itself. A fresh answer is shown and saved under the key `browse-home`, and
  `savedAt` becomes `null`. A request with no answer (status `0`), or any
  failure while offline, reads the `browse-home` snapshot: when there is one,
  the directory is shown from it and `savedAt` is set to its time; when there is
  none and the device is offline, `OfflineNavigation.show()` opens the offline
  page.
- **`BrowsePage`** — page at `/browse`. An effect writes `ConnectionService.detail`
  as "Showing the directory saved at {time}. Search and messages will work again
  when you're connected." while `savedAt` is set, with the time formatted by
  `clockTime` in `America/Toronto` (L2-131). Each rise of `returned` loads the
  directory again. Offline, the search box of the hero is disabled and carries
  the explanation `REQUIRES_CONNECTION`.
- **`ConversationPage`** — page at `/messages/:conversationId`. Each conversation
  that arrives from the network is saved under `conversation:{conversationId}`.
  A read with no answer, or while offline, shows the saved copy; with none saved
  and the device offline, it opens the offline page.
- **`ConnectionBanner`** — `div[jb-connection-banner]` from the `components`
  library, mounted once by the application shell `App` (mock
  `notifications/offline-banner`). The `offline` kind reads "You're offline."
  followed by `detail`, has no dismiss button, and offers "Try again", which
  calls `ConnectionService.check()`.
- **`RequiresConnection`** — attribute directive `jbRequiresConnection` on the
  save, book, quote and message actions of a listing, the review actions of a
  listing and "Post review". While offline it sets `disabled`,
  `aria-disabled="true"`, `title` and `aria-description` to
  `REQUIRES_CONNECTION`, "Needs a connection. It works again when you're back
  online." (ADR 0032), and stops the click of a link. The message composer does
  not carry it.
- **`connectionInterceptor`** — HTTP interceptor of every request. A `GET` that
  gets no answer while the device is offline opens the offline page through
  `OfflineNavigation`, unless the request is marked `OWN_OFFLINE_FALLBACK` or is
  a background read (`isBackgroundRead`).
- **`OfflineNavigation`** — `show(returnUrl)` navigates to `/offline` with
  `skipLocationChange`, so the address bar keeps the original URL, and passes
  `returnUrl` in the navigation state. It does nothing when the offline page is
  already shown.
- **`OfflinePage`** — page at `/offline` from the mock `pages/offline`. It shows
  "You're offline. Jubilee needs a connection to load this page. Messages you
  already opened are still readable, and anything you send is kept and
  delivered when you're back." with "Try again" and "Open messages"
  (`/messages`). "Try again" calls `ConnectionService.check()` and opens
  `returnUrl` unless the state is still `offline`; an effect on `returned` opens
  `returnUrl` when the connection returns by itself. The inbox at `/messages`
  has no saved copy; a saved conversation opens at its own address.
- **`SessionService`** — `signOut()` calls `DELETE /api/session`. Once the server
  has ended the session it clears `OfflineSnapshotStore` and
  `OutgoingMessageQueue`, so nothing personal stays on the device (L2-119). The
  service worker's caches hold only the public app shell and are kept. Drafts
  (`DraftRegistry`, ADR 0046, L2-011 AC3) are kept, keyed by member.
- **`DirectoryController`** and **`GetBrowseHomeQueryHandler`** — `Jubilee API`
  endpoint `GET /api/directory/home` and its MediatR handler, which returns a
  `BrowseHomeDto` (`LiveBusinessCount`, `Categories`, `Featured`, `Products`,
  `Groups`, `Rooms`).
- **`ConversationsController`** and **`GetConversationQueryHandler`** — endpoint
  `GET /api/conversations/{conversationId}`, which returns a `ConversationDto`
  to a participant of the conversation.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-119` | `L1-017` | AC1. Given the member has opened the browse home before, when they open it offline, then the last cached directory is shown with the persistent banner "You're offline. Showing the directory saved at {time}. Search and messages will work again when you're connected." and "Try again". AC2. Given offline, when the member uses search, save, request or send actions, then those controls are disabled with an explanation, except sending messages, which are queued (L2-120). AC3. Given a service worker, when the app is installed, then it caches the app shell, so Jubilee opens with no connection; the browse home and the last 20 opened conversations are kept on the device (IndexedDB), and the service worker caches no `/api` answer. When the member signs out, the saved pages and the outgoing queue are cleared from the device. |
| `L2-122` | `L1-017` | AC1. Given the member opens a page that is not cached while offline, when it fails, then the offline page shows "You're offline. Jubilee needs a connection to load this page. Messages you already opened are still readable, and anything you send is kept and delivered when you're back." with "Try again" and "Open messages". AC2. Given the connection returns while the offline page is shown, when detected, then the original page loads automatically. |
| `L2-131` | `L1-018` | AC3. Given all stored times, when saved, then they are stored in UTC and displayed in America/Toronto, handling daylight saving changes correctly. |

## Diagrams

### System context

A `Member` or `Visitor` browses Jubilee on a device that has lost its
connection. The feature involves no external system.

![C4 system context for browsing offline](diagrams/c4-context.png)

### Containers

The `Jubilee service worker` answers page loads with the cached app shell when
the network fails and leaves every `/api/` request to the network. `Jubilee Web`
saves the browse home and opened conversations in the `jubilee-offline`
database on the device and reads them back when `Jubilee API` gives no answer.

![C4 container view for browsing offline](diagrams/c4-container.png)

### Components

`DirectoryStore` and `ConversationPage` save each fresh answer in
`OfflineSnapshotStore` and read it back offline. `connectionInterceptor` and the
two stores open `OfflinePage` through `OfflineNavigation` when nothing is saved;
`SessionService` clears the device at sign-out.

![C4 component view for browsing offline](diagrams/c4-component.png)

### Class structure

`OfflineSnapshotStore` holds `Snapshot` records. `DirectoryStore`,
`ConversationPage`, `OfflinePage` and `RequiresConnection` depend on
`ConnectionService`, and `SessionService` clears both stores on the device.

![Class diagram for browsing offline](diagrams/class-structure.png)

### Behaviour — open the saved directory

Online, `DirectoryStore` saves the browse home as it arrives. Offline, the
service worker starts Jubilee from the cached app shell, the request for the
browse home gets no answer, and `BrowsePage` shows the saved directory under the
persistent banner with its time.

![Sequence diagram for opening the saved directory](diagrams/sequence-open-cached-directory.png)

### Behaviour — open a page with no saved copy offline

A read with no answer while offline makes `connectionInterceptor` show
`OfflinePage` at the original address. When `ConnectionService` reports the
connection again, `OfflinePage` opens the original page.

![Sequence diagram for opening a page with no saved copy offline](diagrams/sequence-open-uncached-page.png)

### Behaviour — clear the device on sign-out

`SessionService` ends the session on the server and then clears
`OfflineSnapshotStore` and `OutgoingMessageQueue`. Drafts and the app shell stay.

![Sequence diagram for clearing the device on sign-out](diagrams/sequence-clear-on-sign-out.png)
