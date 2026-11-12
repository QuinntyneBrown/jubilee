# 0044. Launching soon: the marketing site sends two forms to the API on its own origin, and links nowhere else

## Status

Accepted, 12 November 2026. Amends ADR 0013 (marketing site): the site is no longer static, it has
an HTTP client, and it has no `APP_URL`. Applies ADR 0009 (tests without a database), ADR 0035
(presentation in the components library), ADR 0036 (component parity), ADR 0038 (e-mail through the
outbox) and ADR 0040 (a host's `server.js` forwards `/api`).

## Context

Jubilee is not open yet. L1-030 and L2-215 to L2-218 put the marketing site in a launching-soon
state: it says so, an owner sends their business's details so that the listing can be arranged for
launch day, anyone leaves an e-mail address for the launch notice, and no element of the page links
to the app.

ADR 0013 made the site static on purpose: no router, no session, no HTTP client and no call to the
Jubilee API, with every link to the app built from one `APP_URL`. Collecting two forms needs the
site to send data, so that decision is amended here, not worked around. Honesty is the reason the
page changes at all (`docs/scripture.md`, "accurate weights": Jubilee's own counts and claims are
accurate): a page that says "Start browsing" and "47 businesses" before anyone can browse says
something that is not so.

The Magic Patterns design has no launching-soon frame. The mocks are the source for these states
until one exists.

## Decision

- **The site reaches the API on its own origin.** The page calls `/api/launch` by relative address.
  In production `server.js` on `jubilee-to-www` forwards those calls to `https://app.jubilee.to`
  (`API_ORIGIN`), as the admin host does (0040), so the browser sees one origin: no CORS policy on
  the API and no third-party form service. Three things differ from the admin host:
  - `API_PATHS=/api/launch` holds the proxy to that prefix; any other `/api` path answers 404 on the
    marketing host. A public host therefore never forwards a staff path.
  - The proxy states the caller's address in `X-Jubilee-Client-Address` and proves itself with
    `X-Jubilee-Proxy-Key` (`PROXY_KEY`, the key of `StaffAccess:ProxyKey`), because the per-address
    rate limits of L2-218 would otherwise count every visitor as the marketing host. The key only
    lets a proxy state an address; with `API_PATHS` set, the marketing host cannot use it to reach
    `/api/admin` or `/api/staff`, and those stay behind the allow-list for every address it states.
  - Without `API_ORIGIN` the host serves files only, as before, and the forms show their error
    state.

  `ng serve marketing` gets a dev proxy (`projects/marketing/proxy.conf.json`) that sends `/api` to
  the local API on port 5080. `eng/azure/deploy.sh` is unchanged; the two settings are documented in
  `eng/azure/README.md` and are set by hand, like the admin host's. Nothing is deployed by this
  change.
- **The site has an HTTP client, behind a contract.** `LaunchApi` and the token `LAUNCH_API` live in
  the `api` library beside the other contracts, with `HttpLaunchApi` as the implementation. The
  marketing composition root (`app.config.ts`) provides `provideHttpClient()` and the token; the two
  form containers depend on the token. The app and the admin application import nothing new. The
  site still has no router and no session.
- **The forms are inline sections of the page.** A one-page site with no router has two choices: a
  section or a CDK dialog. AGENTS.md's "no inline forms in pages" is written for button-triggered
  editing in the app, where an inline editor would swap a page's content under the member. A sign-up
  page is the other case: the form is the page's purpose, an in-page link must be able to land on
  it, and a dialog would hide it from a visitor who scrolls. Each form is therefore its own section
  (`#pre-register`, `#notify`), in its own container (`jb-business-pre-registration`,
  `jb-launch-notification`), composed from the existing `jb-field`, `jb-input`, `jb-select`,
  `jb-textarea`, `jb-checkbox`, `jb-alert`, `jb-form-summary` and `jb-bot-challenge` and three new
  components: `jb-launch-badge`, `jb-launch-form` and `jb-launch-confirmation`.
  `jb-marketing-button` now also draws a `<button>` and has a busy state; `jb-marketing-heading`
  gains an eyebrow slot; `jb-photo-business-card` may be a `<div>` when it is not a link. Each of
  those keeps its look where it was already used.
- **`APP_URL` is removed.** The token, `environment.ts` and its development replacement go, with
  the `fileReplacements` entry. A token nothing injects is dead code, and "no link to the app" is
  easier to keep true when the page does not know the app's address. Reverting this change brings
  them back.
- **Validation errors are 422, as everywhere in the API.** The house answer for invalid fields is
  422 `validation_failed` with a code per field (0012), not 400. A failed bot challenge is 422 with
  `challenge: CHALLENGE_FAILED`, checked before anything else, and a limit is 429 `rate_limited`
  with `Retry-After`. A sign-up or a pre-registration answers 202 with no body: nothing is returned
  that could tell a new address from a known one (L2-217 AC5).
- **Three endpoints, open on purpose.** `GET /api/launch` answers the public site key of the bot
  challenge when one is configured, so the site need not call `/api/session`. `POST
  /api/launch/notifications` and `POST /api/launch/businesses` are `[AllowAnonymous]`; the rules are
  in their handlers. Each has its own fixed window of 5 an hour per address
  (`RateLimits:LaunchSignUpsPerHour`, `RateLimits:LaunchPreRegistrationsPerHour`). They carry no
  session cookie, so the anti-CSRF token does not apply to them (0013, server-side sessions).
- **Two entities, two tables, a migration each.** `LaunchSubscriber` (`LaunchSubscribers`: id, e-mail,
  its lower-cased key with a unique index, optional first name, the consent time and method, the
  time it was created) and `BusinessPreRegistration` (`BusinessPreRegistrations`: id, business name,
  contact name, e-mail and its key, optional phone, category slug, area, optional website,
  description, the consent time and method, the time it was created). Consent is stored on the row
  it belongs to: `ConsentRecord` is tied to a member, and these people have no account. The method
  is the new `ConsentMethod.MarketingSiteForm`. A repeat sign-up finds the key and changes nothing.
  A pre-registration is stored every time: one owner may have two businesses. The migrations are
  `AddLaunchSubscribers` and `AddBusinessPreRegistrations`, one with each slice; `jubilee migrate`
  applies them, never the API.
- **The team reads the submissions with the CLI, and hears of a business by e-mail.**
  `jubilee launch list --kind notifications|businesses` prints comma-separated values with a header
  row and writes an audit record (`launch.list`, the kind and the count). When `Launch:TeamEmail`
  is set, each pre-registration also queues an e-mail to that address through the outbox (0038), so
  the team can answer an owner without polling. The setting is optional: without it nothing is
  queued and the CLI is the only way. A screen in the admin application is deferred.
- **Retention is 12 months.** `LaunchRetentionJob` (Worker) runs once a day and deletes sign-ups
  and pre-registrations older than 12 months, logging counts only (L2-148). The launch is expected
  well inside that time; the rule exists so that a launch that slips does not keep the data for
  ever.
- **With a site key, the page loads Turnstile.** `jb-bot-challenge` loads Cloudflare's script only
  when `GET /api/launch` names a site key. That is the one thing the page may load from another
  host (0013 said none); without a key, which is the production state today, nothing is loaded. The
  Turnstile widget must list `jubilee.to` and `www.jubilee.to` before the key is set.
- **The way back is a revert.** This change ships only the launching-soon state. At launch the
  page returns to its launched state by reverting the marketing-site commits of this change (the
  page, `content.ts`, `APP_URL`, the mocks and L2-183's wording) and lifting the suspension of
  L2-185; the API endpoints, the tables and the CLI stay until the data has been used and deleted.
  No feature flag is built: a switch would keep two pages alive in one build for the sake of one
  day.

## Consequences

- The marketing page no longer renders without the API being asked: `GET /api/launch` is called
  once. When it fails the forms still show, without a challenge, and a refused submission says so.
  The e2e suite answers these calls from the recording like any other (0009).
- The marketing host needs `API_ORIGIN`, `API_PATHS` and `PROXY_KEY` before the forms work in
  production, and the API needs the migration. Until both are done the forms show their error
  state; nothing else on the page depends on them.
- The proxy key is now on two hosts. Rotating it means setting three App Services at once.
- The launch-day e-mail, turning a pre-registration into a listing draft, a staff screen for the
  submissions and a Magic Patterns frame are not part of this decision.
