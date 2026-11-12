# 0040. The admin application: a third Angular application, staff sessions through Entra ID with a proved second factor, and a network allow-list at the API

## Status

Accepted, 11 November 2026. Supersedes the parts of 0020 that say who is on the verification team
("Who is on the team": roles from identity claims, `isVerifier` on the session and the navigation
summary, `verifierGuard`) and that defer L2-098 criterion 2 (the second factor). The rest of 0020
stands.

## Context

L1-027 and L2-188 to L2-195 move the five verification and moderation screens out of the app into
an application of their own at `https://admin.jubilee.to`, reached only by staff signed in through
single sign-on with a second factor, from an allowed network. Until now a verifier was a member
whose session carried a `role` claim (0020), no production session ever carried one, and the second
factor was deferred. The app and the API share an origin behind `eng/azure/server.js` on
`jubilee-to-app` (`eng/azure/README.md`); sessions are server-side (0013, server-side sessions);
Google sign-in (0037) cannot say whether a second factor was used.

## Decision

- **A third Angular application.** The admin application is `frontend/projects/admin`, the
  application `admin` of the workspace, built like the app: pages and dialogs are containers that
  compose `jb-*` components from `components` and depend on API tokens from `api` (0035). The
  five pages, their four dialogs and the helpers they share with the app (`ClockService`,
  `LoadState`, the message times and the toasts) move to the libraries so that both applications
  import them. Its routes drop the `/admin` prefix: `/verifications`, `/verifications/:id`,
  `/reports`, `/reports/:id`, `/featured`, `/sign-in`, `/signed-out`, `/session-expired`. The app
  keeps one route, `admin/**`, which shows the moved page (L2-194) with a link built from one
  `ADMIN_URL` token per environment, as the marketing site builds `APP_URL` (0013, marketing
  site).
- **The identity provider is Microsoft Entra ID over OpenID Connect, and the API proves the
  second factor itself.** Hosting is on Azure, and Entra states how a sign-in was authenticated in
  the `amr` claim. The API runs the authorization code flow with state, nonce and PKCE, as it does
  for Google (`IOidcTransactionStore` is reused), against a single-tenant app registration, and
  validates the ID token's signature, issuer (the configured tenant), audience, lifetime and nonce.
  `CompleteStaffSignInCommandHandler` admits the sign-in only when `amr` contains `mfa`; the
  provider's settings (Conditional Access requiring MFA) make the second factor happen, but the
  API does not trust them in place of the claim. The client uses Entra's v1.0 endpoints
  (`https://login.microsoftonline.com/{tenant}/oauth2/authorize` and `/token`, issuer
  `https://sts.windows.net/{tenant}/`) because their ID tokens carry `amr`; each endpoint is a
  setting, so a later move to v2.0 with an `amr`-bearing token is configuration. The request sends
  `prompt=login`, so each staff sign-in authenticates afresh. Google stays the members' provider.
- **Staff accounts and roles.** A `StaffMember` row holds the normalised e-mail address, the roles
  (`verifier`, `admin`) and, once bound, the Entra tenant and object ID. The first sign-in whose
  `email` (or `preferred_username`) matches an unbound account binds it; afterwards only that tenant
  and object ID sign in to it. A staff account with no role cannot sign in. Accounts are managed
  only with the CLI: `jubilee staff grant --email {address} --role verifier|admin`,
  `jubilee staff revoke …` (which ends the account's staff sessions) and `jubilee staff list`. The
  first administrator is created with `grant`, by whoever holds the database connection, as for
  `migrate`. The rules live in Application handlers that the CLI sends through MediatR. A staff
  session's subject is the id of the member whose confirmed e-mail matches the staff account, when
  there is one, so that the rule against deciding on one's own listing (L2-098 criterion 5) still
  applies; otherwise it is `staff|{id}`.
- **A staff session is a second cookie scheme.** `Staff` is a cookie authentication scheme beside
  the members' default scheme. Its cookie is `__Host-jubilee.staff`: HttpOnly, Secure,
  SameSite=Strict, path `/`, no domain, no expiry (it ends with the browser). The ticket is kept in
  the sessions table, as a member's is, in a row whose new `Kind` is `staff` and whose
  `StaffMemberId` is set; a key is only ever looked up within its kind. A staff session ends 30
  minutes after the last request or 8 hours after sign-in, whichever comes first. The default
  scheme stays the member cookie, so a staff session is never a member session (L2-191 criterion
  4). The anti-CSRF token of L2-135 also guards state-changing requests that carry the staff
  cookie.
- **Admin-only endpoints authenticate only the staff scheme.** `RequiresVerifier` and
  `RequiresAdmin` become authorization policies (`[Authorize(Policy = …)]`) whose only
  authentication scheme is `Staff` and which require the role claim. A caller without a staff
  session is challenged by the `Staff` scheme, which answers 403 `STAFF_SESSION_REQUIRED` when the
  request carries a member session and 401 `sign_in_required` (or `SESSION_EXPIRED` when an ended
  staff cookie came with it) otherwise; a staff session without the role is forbidden with 403
  `FORBIDDEN`. Whatever claims a member session carries, it is not read on these endpoints.
- **The admin application reaches the API through a proxy on its own host.** The admin
  application is served by its own App Service, `jubilee-to-admin`, so that App Service access
  restrictions can hold it to the allow-list. Its `server.js` (the same file the other two sites
  use) serves the built application and sends `/api` to `https://app.jubilee.to`, so the browser
  sees one origin, `admin.jubilee.to`, and the staff cookie is a host-only cookie of that host:
  the app's pages can never send it. The proxy states the caller's address in
  `X-Jubilee-Client-Address`, taken from the last `X-Forwarded-For` entry App Service wrote for the
  admin host, and proves itself with the shared secret `X-Jubilee-Proxy-Key`. A cross-origin call
  with CORS was rejected: it would put a third-party-style cookie and a CORS policy on the API for
  no gain.
- **The network restriction is enforced at the API and at the admin host.** `StaffNetworkMiddleware`
  runs before authentication and refuses every request to `/api/admin/*` and `/api/staff/*` whose
  caller is outside `StaffAccess:AllowedNetworks` (addresses and CIDR ranges, IPv4 and IPv6) with
  403 `NETWORK_NOT_ALLOWED`; an empty list refuses everyone. It holds on every host the API
  answers, because it is in the API. The caller's address is decided in two steps, both before the
  middleware: `UseForwardedHeaders` trusts `X-Forwarded-For` only from the loopback proxy
  (`server.js` beside the API) and only its last entry, which App Service's front end wrote
  (`ASPNETCORE_FORWARDEDHEADERS_ENABLED` is no longer set, because it trusts every proxy); then
  `StaffProxyMiddleware` replaces that address with `X-Jubilee-Client-Address` only when
  `X-Jubilee-Proxy-Key` matches `StaffAccess:ProxyKey` (compared in fixed time), and removes both
  headers from every request. A caller cannot raise their own address by sending these headers:
  without the key they are dropped, and App Service appends the true peer to `X-Forwarded-For`.
  The admin host itself is limited to the same list by App Service access restrictions. A shared
  outbound address of App Service is therefore never an allowed caller.
- **Local development and the e2e suite.** `npm run start:admin` serves the admin application on
  port 4202 with `/api` sent to the local API. Without Entra, the API's `StaffSignIn:Provider`
  may be `Development`: the start endpoint sends the browser straight back to the callback, which
  signs in the staff account `StaffSignIn:DevelopmentEmail` with `amr` `["pwd","mfa"]`. The API
  refuses to start with that provider outside the Development environment. The e2e suite starts
  the admin application as a third web server and answers its `/api` requests from the recording
  and stubs (0009); staff sign-in is stubbed at `/api/staff/session` and
  `/api/staff/sign-in/start`. The local API allows the loopback addresses
  (`StaffAccess:AllowedNetworks` in `appsettings.Development.json`).

## Consequences

- A member session can no longer reach any admin endpoint; the e2e and API tests for the
  verification team sign in as staff. Backend tests create real staff sessions through the faked
  identity provider over `https://localhost`, so the `__Host-` cookie is kept.
- The audit behaviour is unchanged: the CLI's role changes write no audit record, so L2-098
  criterion 4's audit clause stays unmet, as it was under 0020. Adding it is out of this decision.
- Staff need a Jubilee Entra tenant account with a second factor, and an allowed address. Moving
  house or working away means an allow-list change, which is configuration.
- `amr` on the v1.0 ID token is Microsoft's behaviour, not a standard guarantee. If a staff
  sign-in that used a second factor is refused with "Sign-in needs a second factor", the owner
  checks the token (README of `eng/azure`) before changing anything.
- The admin application costs a third App Service on the existing plan, and the `ProxyKey`
  secret must be rotated in both `jubilee-to-admin` and `jubilee-to-app` together.
