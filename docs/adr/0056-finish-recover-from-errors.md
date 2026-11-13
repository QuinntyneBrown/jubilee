# 0056. Finish recover from errors

Status: accepted

## Context

Journey 23 (anyone sees a clear page for a missing, forbidden, failed or maintenance state) was
recorded at 79%. ADR 0031 deferred four things: the 301 for a renamed listing slug (nothing renamed
a slug), the statuses of document requests (the app's host, `eng/azure/server.js`, answered every
address with the app shell and 200), static copies of the server error and maintenance pages for a
page load the app cannot answer, and an e-mail to the team for "Ask for access" (no team address was
configured). `VerificationSettings` (ADR 0052) has since given the team an address, and
`VerificationTeam.Tell` (ADR 0055) is the one place that decides who on the team is told.

The detailed design described a `PageShellEndpoint` in the API that would serve the app shell with
its status from a route manifest generated from the Angular routes. It was never built: the app's
document is served by the host, not by the API.

## Decision

- **A slug follows the business name; the old one is kept.** When an owner's save changes the
  business name of a listing (L2-087), `SaveListingCommandHandler` gives the listing a new slug from
  the name (the rule of a submitted listing, L2-072 AC5) and records the old one as a
  `ListingSlug` row (`Slug`, `ListingId`, `RetiredAt`). A slug that is current or kept is never
  given to another listing; a name changed back takes its old slug back. A renamed slug was the
  only way to make L2-113 AC2 reachable, and a slug that did not follow the name would leave the
  listing's address naming a business that no longer exists.
- **An old slug answers 301.** `GET /api/listings/{slug}` and `GET /api/listings/{slug}/products/{productSlug}`
  answer a kept slug with 301 to the same address under the current slug, so the browser follows
  it and the app, seeing a listing whose slug is not the one in its address, replaces the address
  with the current one (later calls such as a message or a booking use the current slug). Writes
  are not redirected: the app always writes to the slug it shows.
- **The host decides a page load's status; the API knows the records.** The app keeps its
  addresses in `frontend/projects/jubilee/public/routes.json` (patterns such as `/b/:slug`, with
  `owner: true` on the owner's workspace), beside `app.routes.ts` and changed with it. For a `GET`
  or `HEAD` of an address with no file extension, the host of a static root that has `routes.json`
  asks the API `GET /api/documents/status?path={path}` (anonymous, with the caller's cookie, three
  seconds at most) and then:
  - 503 `MAINTENANCE` (the maintenance middleware): the static maintenance page with 503, the
    API's `Retry-After` and the back-by time written in Toronto time;
  - 500 (an unhandled error): the static server error page with 500 and the API's `JB-500-`
    reference;
  - `{ "status": 301, "location" }`: a 301 to the current slug, the query kept;
  - `{ "status": 404 }`, or an address `routes.json` does not match: the app with 404;
  - `{ "status": 403 }`: the app with 403;
  - 200, another 5xx, or no answer in time: the app with 200, as before. A page load is never
    refused because the API is slow or a dependency failed; the app shows its own load-error
    states.

  The API answers 404 for `/b/{slug}` (and every address under it) whose listing is missing or not
  public to the caller, and for `/c/{category}` that is not one of the eleven; 301 for a kept slug;
  403 for an `owner` address asked by a signed-in member who owns no listing. A visitor is answered
  200 and the app's guard sends them to sign in with a return address (L2-114 AC3), so the rule
  lives once, in the guard. The manifest is kept by hand rather than generated: generating it would
  need the Angular compiler at deploy time or a server-rendering runtime on the host for one list
  of thirty patterns. A link-preview fetcher (ADR 0055) is given the social preview only after the
  status is 200, so a shared old link is redirected first.
- **Static copies of the server error and maintenance pages.** `tools/static-pages/build.mjs`
  builds `frontend/projects/jubilee/public/static/server-error.html` and `maintenance.html` from
  the mocks (`pages/server-error/default.html`, `pages/maintenance/default.html`): the page's
  `<main>`, the design-system tokens and components inlined, no script, and Archivo from
  `/static/Archivo.woff2`, which the app's build copies from the components library. The host
  writes the back-by time and the reference between comment markers. "Try again" and "Check
  again" load the same address again (`href=""`). When the app's own `index.html` cannot be read,
  the host answers the static server error page with 500 and a reference of its own, logged with
  the correlation ID it made, in the format of the API (`JB-500-` and four characters of a SHA-256
  of the correlation ID).
- **"Ask for access" e-mails the team.** `CreateAccessRequestCommandHandler` tells the team through
  `VerificationTeam.Tell`, saved with the request, so it is sent once or not at all: subject
  "Access request: {address}", the address as a link to the app, the member's name and e-mail
  address and the time in Toronto. A repeated key or a request refused by the hourly limit sends
  nothing.

## Consequences

- An address of the app added to `app.routes.ts` must be added to `routes.json` too, or its page
  load answers 404 (the app still shows the page). The host's tests (`eng/azure/server.test.js`)
  prove the statuses; the API's (`DocumentStatusTests`) prove the decisions.
- The owner must set nothing new on Azure: the host already runs beside the API with `API_ORIGIN`.
  `eng/azure/README.md` says how to check the statuses after a deployment.
- A renamed listing's old address keeps working for as long as Jubilee runs; nothing expires a kept
  slug.
- ADR 0031's deferrals of the slug redirect, the document statuses, the static pages and the e-mail
  are reversed.
