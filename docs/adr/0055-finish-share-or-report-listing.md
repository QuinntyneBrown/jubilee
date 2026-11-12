# 0055. Finish share or report a listing

Status: accepted

## Context

Journey 21 (anyone shares a listing's link; a member reports a problem with it) was recorded at
78%. ADR 0029 deferred three things: the `og-image.png` asset, a host that sends link-preview
fetchers of `/b/{slug}` to the social preview of the API (`GET /api/listings/{slug}/social-preview`,
built and tested), and the notice to the verification team of a new report, because no team address
was configured. `VerificationSettings` (ADR 0052) has since given the team an address. The detailed
design described a `ListingDocumentController` that would inject the Open Graph tags into the
application document for every requester; it was never built, and the app's document is served by
`eng/azure/server.js`, not by the API. "More…", the copied announcement, the return of focus and
the report dialog's in-flight and timeout states were built with no test.

## Decision

- **The app's host sends link-preview fetchers to the social preview.** `eng/azure/server.js`
  answers a `GET` or `HEAD` of `/b/{slug}` (one path segment, no extension) whose `User-Agent` names
  a link-preview fetcher with the API's `/api/listings/{slug}/social-preview`, through the same
  proxy as `/api`, and only where that path is one the host forwards (the app's host; never the
  marketing or admin host). The list (`previewAgents`) names the fetchers of Facebook (and iMessage,
  which borrows its name), X, LinkedIn, WhatsApp, Slack, Discord, Telegram, Pinterest, Reddit,
  Skype, Apple, Bluesky, Mastodon, Embedly and Iframely. Every other agent, a search engine's crawler
  among them, gets the app: a search engine runs the app and reads its own title, and serving it a
  different page would be cloaking. A preview fetcher runs no script, so the tags must be in the
  first answer; splicing them into `index.html` for every visitor would put an API call in front of
  every page load of a listing to serve a reader that is not there. The routing lives in the host
  and not in the API because the host is what answers `/b/{slug}`; no rule is needed outside the
  repository (App Service runs `server.js` as it is), so there is no owner step.
- **`og-image.png` is one image for every listing.** A 1200 × 630 PNG of the lockup (the icon of
  `docs/assets/jubilee-icon.svg` and the wordmark in Archivo bold at 110% width, −0.03em) with the
  line "Toronto's Christian marketplace", drawn in `docs/mocks/assets/og-image.html` from the tokens
  and saved in `frontend/projects/jubilee/public/`, so the app's host serves it at `/og-image.png`.
  A listing's own photo as its preview waits for the CDN work of `L2-155`; a fixed image never shows
  a photo the owner later removes.
- **The team is told of a report by one outbox e-mail, decided in one place.**
  `VerificationTeam.Tell` (Application, `Verification`) is the one place that decides who on the
  team is told: the address of `VerificationSettings.TeamEmail` (`Verification:TeamEmail`, else
  `Launch:TeamEmail`), or nobody when neither is set. `ReportSubmitted.Tell` writes the notice of a
  report of a listing through it: "New report: {business}", or "More on a report: {business}" when
  the entry joins the reporter's report of the last 24 hours, with the reason in the dialog's words,
  the description and the link to `/reports/{id}` in the admin application. The e-mail never names
  the reporter: an e-mail is forwarded and kept where the admin application's access rules do not
  reach, and the admin application shows the reporter to verifiers (`L2-105` AC1). The handler saves
  the e-mail with the report in one `SaveChangesAsync`, so the team is told once or the report is
  not stored, and a repeated idempotency key sends nothing. The outbox carries the e-mail with its
  correlation id set to the report. Journey 25 tells the team of a conversation report through the
  same `VerificationTeam.Tell`.
- **The missing tests are written against the dialogs as built.** `share-report.spec.ts` proves
  "More…" with a stand-in `navigator.share` installed before the page loads, and its absence by
  removing it; the polite "Link copied" status; focus back on "Share" after "Done" and Escape; and,
  with Playwright's clock, the report dialog's in-flight state (read-only fields, `aria-busy`,
  disabled "Cancel", one request for two presses) and its failure after 10 seconds.

## Consequences

- A shared `/b/{slug}` link shows the business's name, tagline and the Jubilee image in chat and
  social apps once the app is deployed; the preview is read through the directory's public filter,
  so a paused or removed listing previews as not found.
- A new link-preview fetcher that is not on the list gets the app and shows a bare preview until it
  is added to `previewAgents`.
- With neither team address set (as in development and the e2e API), nobody is e-mailed; the report
  is still stored and listed in the admin application.
