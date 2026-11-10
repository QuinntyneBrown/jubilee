# Show toasts and banners

## Overview

Jubilee is Toronto's Christian marketplace, in which members message verified
businesses and send them requests. The notifications subsystem tells members
and owners about events that concern them. This feature covers the two transient
surfaces inside the page: toasts and banners. Both are shared components of
`Jubilee Web` that every other feature uses.

The terms below are local to this feature.

- **toast** — short message that confirms an action or surfaces an event without blocking the page
- **tone** — one of `Info`, `Success`, `Warning` or `Danger`, which sets a toast's or banner's colour, timing and announcement
- **banner** — message across the top of a page that describes a condition lasting until it clears
- **persistent banner** — banner with no dismiss button, shown while a condition calls for the user's action
- **live region** — page area whose changes assistive technology announces without moving focus

A toast is short-lived. Info, success and warning toasts leave after
`8 seconds`; an error toast stays until dismissed. At most three toasts show at
once. A banner follows a condition: it appears when the condition starts to
hold, stays on the relevant pages, and is replaced once by a dismissible success
banner when the condition resolves.

The feature is almost entirely client-side. The server takes part only as the
source of the state and events that raise toasts and change banners: the session
state, the listing state and the real-time connection described in
`deliver-real-time-events`. The connection banners and their exact copy are
specified with connectivity resilience (L2-121).

## Description

The building blocks live in `Jubilee Web`. Sizes, colours and durations come
from design-system tokens.

- **`ToastService`** — Angular service and the single entry point for raising a
  toast. `show` appends a `ToastModel`; when three toasts are already visible it
  first removes the oldest toast whose tone is not `Danger`. `dismiss`, `pause`
  and `resume` act on one toast by ID.
- **`ToastModel`** — title, text, `ToastTone` and at most one `ToastAction`. A
  success toast for a reversible action carries "Undo". An event toast may carry
  one action, for example "Open conversation", "View in shop" or "Add to
  calendar".
- **`ToastTimer`** — one timer per auto-dismissing toast, started at `8 s`. The
  timer pauses while the pointer hovers the toast or focus is inside it, and
  resumes with the remaining time.
- **`ToastHost`** — Angular component rendered once in the application shell. It
  holds two regions: a polite live region for `Info`, `Success` and `Warning`
  toasts, and a region with `role="alert"` for `Danger` toasts, which are
  announced assertively. It orders toasts with the newest at the bottom and
  keeps Tab order equal to visual order.
- **Toast placement** — on a phone layout with the tab bar, the toast region
  sits above the tab bar. From `640 px` it is anchored at the bottom right and is
  `24rem` wide.
- **`Toast`** — Angular component for one toast. Each toast has a dismiss button
  with an accessible name; the name text is `<TO SUPPLY>`.
- **`BannerService`** — Angular service that maps conditions to banners.
  `setCondition(condition, holds)` adds a persistent banner when a condition
  starts to hold. When the condition clears it replaces that banner with a
  success banner that is shown one time and can be dismissed. `forRoute` limits
  each banner to its relevant pages.
- **`BannerCondition`** — the conditions that call for the user's action:
  `EmailUnconfirmed` ("Confirm your e-mail to message businesses." with "Send it
  again" and "Change e-mail", on every signed-in page, L2-005), `ListingPaused`
  ("Your listing is paused." with "Resume listing", on My business) and `Offline`
  (L2-121). Their success counterparts are "E-mail confirmed.", "Luzandre.com is
  verified and live." and "You're back online."
- **`BannerHost`** and **`Banner`** — the banner region in the application shell
  and the component for one banner. The region is a polite live region: a banner
  that appears or changes is announced and focus does not move. A persistent
  banner renders no dismiss button.
- **`SessionService`** — source of the e-mail confirmation state, read from
  `GET /api/session` at start and when the tab regains focus.
- **`ConnectionService`** — source of the online, offline and slow-connection
  state.
- **`RealtimeClient`** — source of event toasts and of listing and account
  events that change banners.
- **Other banner tones** — informational, warning and error banners in the mocks
  (for example "Your reference hasn’t answered in 7 days.") use the same `Banner`
  component; the features that own those conditions decide whether each one can
  be dismissed.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-066` | `L1-010` | Toasts shall confirm actions and surface events without blocking the page. |
| `L2-067` | `L1-010` | Banners shall describe a condition that lasts until it clears. Persistent banners shall have no dismiss button. |
| `L2-005` | `L1-001` | Until the e-mail is confirmed, a member may browse, search and save but shall not message, book, request or list a business. |

## Diagrams

### System context

Members and owners receive toasts and banners from Jubilee. The feature involves
no external system.

![C4 system context for toasts and banners](diagrams/c4-context.png)

### Containers

`Jubilee Web` renders the toast and banner regions. `Jubilee API` supplies
session and listing state and pushes events; `Jubilee service worker` reports
queued messages that were sent after a reconnect.

![C4 container view for toasts and banners](diagrams/c4-container.png)

### Components

`ToastService` publishes to `ToastHost`, which renders up to three `Toast`
components. `BannerService` publishes to `BannerHost`. `SessionService`,
`ConnectionService` and `RealtimeClient` report the conditions and events, and
`RealtimeClient` is fed by `EventsHub`.

![C4 component view for toasts and banners](diagrams/c4-component.png)

### Class structure

`ToastService` shows up to three `ToastModel` items, each with a `ToastTone`,
an optional `ToastAction` and a `ToastTimer`. `BannerService` holds
`BannerModel` items, each describing a `BannerCondition`.

![Class diagram for toasts and banners](diagrams/class-structure.png)

### Behaviour — show and dismiss a toast

`ToastService` evicts the oldest non-error toast when a fourth arrives. A
`Danger` toast is announced assertively and stays; other tones start an `8 s`
timer that pauses on hover and focus. The action and the dismiss button both
remove the toast.

![Sequence diagram for showing and dismissing a toast](diagrams/sequence-show-and-dismiss-toast.png)

### Behaviour — show and resolve a persistent banner

`SessionService` reports that the e-mail is unconfirmed and `BannerService`
publishes a persistent banner. When the member confirms in another tab, the
service replaces it with a dismissible success banner, announced politely.

![Sequence diagram for showing and resolving a persistent banner](diagrams/sequence-resolve-persistent-banner.png)
