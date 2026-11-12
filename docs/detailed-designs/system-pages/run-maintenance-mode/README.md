# Run maintenance mode

## Overview

Some updates to Jubilee cannot run while the product serves traffic.
*Maintenance mode* — state in which every page request is answered with HTTP 503
and a page that says when Jubilee is back. An operator turns the mode on and off
with a configuration switch, without a deployment, and the switch carries the
*back-by time*, the time at which service is expected to resume.

The page reads "Jubilee is being updated. We're back by {time} Eastern on {day}.
Nothing you've sent is lost." with the button "Check again". The 503 response
carries a `Retry-After` header so that browsers, crawlers and monitoring tools
know when to return.

Maintenance also affects links that were sent earlier. E-mail confirmation
links have a limited validity; a member who opens one during maintenance cannot
confirm. The design therefore extends
the remaining validity of those links by the length of the *maintenance window*,
the interval between the switch turning on and turning off.

## Description

The slice is operational: one middleware, one configuration object, the app's
host, one page with its static copy and one background job.

- **`MaintenanceOptions`** — configuration object with `Enabled` and `BackBy`.
  It is bound to the `Configuration store` with reload on change, so a new value
  takes effect in running processes. The store is the application configuration (`Maintenance:Enabled`,
  `Maintenance:BackBy`), which reloads on change; the propagation delay is the
  reload interval of the host (ADR 0031).
- **`MaintenanceState`** — application service behind `IMaintenanceState`. It
  exposes the current options and notifies listeners when they change.
- **`MaintenanceMiddleware`** — placed in `Jubilee API` ahead of routing. While
  `Enabled` is true it answers every request with HTTP 503, a `Retry-After`
  header computed from `BackBy` and `ProblemDetails` with the code
  `MAINTENANCE` and the `backBy` value. The only path exempt from the switch is
  the health probe `/api/health` (ADR 0031).
- **App host (`eng/azure/server.js`)** — answers a page load. It asks the API
  `GET /api/documents/status`, which the middleware answers 503 `MAINTENANCE`
  while the switch is on; the host then answers 503 with the API's
  `Retry-After` and the static maintenance page, with the back-by time written
  in (ADR 0056).
- **Static maintenance page** — `frontend/projects/jubilee/public/static/maintenance.html`,
  built from the mock by `tools/static-pages/build.mjs`: no script, the tokens
  and components inlined, Archivo from `/static/Archivo.woff2`. The host writes
  `BackBy` in Toronto time as "We’re back by {time} Eastern on {day}." (for
  example "6:00 a.m. Eastern on Wednesday 11 November") between the markers
  `<!--back-by-->` and `<!--/back-by-->`; without a back-by time the page keeps
  "We’ll be back shortly." "Check again" is `href=""`, the same address again.
- **`errorInterceptor`** — Angular HTTP interceptor. When an open application's
  `GET` receives a 503 with the code `MAINTENANCE`, it navigates to
  `MaintenancePage` with the back-by time and the address the member left. A
  failed save is not redirected: the dialog keeps what was typed (ADR 0031).
- **`MaintenancePage`** — Angular page with the same copy as the static page.
  "Check again" reloads the page the member left; the server answers 503 again
  or serves the page once the switch is off.
- **`MaintenanceWatcherJob`** — hosted job in `Jubilee Worker`. It observes
  `IMaintenanceState`. When the switch turns on it inserts a
  `MaintenanceWindow` with `StartedAt` and `BackBy`; when the switch turns off
  it closes the window; both through `MaintenanceWindowService`, every 15 seconds.
- **`MaintenanceWindow`** — entity that records one period of maintenance.
  `Close(now)` sets `EndedAt` and returns the window length.
- **`MaintenanceWindowService`** — selects each unused, not superseded
  `LinkToken` with the purpose `EmailConfirmation` or `ChangeEmail` that was valid at
  `StartedAt`, and adds the window length to its `ExpiresAt`. Tokens and the
  closed window are saved in one unit of work, so a window is applied once.
- **`LinkToken.Extend`** — domain method that moves `ExpiresAt` forward. Other
  purposes, such as password reset, are not extended.
- **Operator procedure** — the `On-call engineer` sets `Enabled` and `BackBy` in
  the `Configuration store`. The switch is changed where the host's configuration is
  managed, and access to it is the access to that configuration (ADR 0031).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-117` | `L1-016` | While maintenance mode is on, the server shall respond 503 with `Retry-After` to any page request and show the maintenance page with the back-by time and "Check again". E-mail confirmation links shall keep their remaining validity extended by the length of the maintenance window. An operator shall turn the mode on or off with a configuration switch, without a deployment, and the back-by time shall be part of the switch. |

## Diagrams

### System context

The on-call engineer sets the switch in the configuration store, Jubilee reads
it, and members receive the maintenance page. A member who holds an
e-mail confirmation link benefits from the extended link validity.

![C4 system context for running maintenance mode](diagrams/c4-context.png)

### Containers

`Jubilee API` reads the switch and answers 503. `Jubilee Worker` watches the
same switch, records the window in the `Jubilee database` and extends link
tokens.

![C4 container view for running maintenance mode](diagrams/c4-container.png)

### Components

`MaintenanceMiddleware` reads `MaintenanceState` and answers 503. The app's host
turns it into the static page for a page load; `errorInterceptor` turns it into
`MaintenancePage` for an open application. `MaintenanceWatcherJob` calls
`MaintenanceWindowService`, which extends the links when a window closes.

![C4 component view for running maintenance mode](diagrams/c4-component.png)

### Class structure

`MaintenanceMiddleware` and `MaintenanceWatcherJob` both depend on
`IMaintenanceState`. Through `MaintenanceWindowService` the job opens and
closes `MaintenanceWindow` and extends `LinkToken` records by the window length.

![Class diagram for running maintenance mode](diagrams/class-structure.png)

### Behaviour — answer requests during maintenance

The middleware answers 503 with `Retry-After` while the switch is on; the app's
host serves a page load the static page. An application that is already open
reaches `MaintenancePage` through the interceptor.

![Sequence diagram for answering requests during maintenance](diagrams/sequence-serve-maintenance-response.png)

### Behaviour — switch maintenance mode and extend links

The switch takes effect without a deployment. When it turns off, the job closes
the window and the service extends e-mail confirmation and change-of-e-mail links by the window
length.

![Sequence diagram for switching maintenance mode and extending links](diagrams/sequence-switch-and-extend-links.png)
