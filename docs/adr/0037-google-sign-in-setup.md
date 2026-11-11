# 0037. Google sign-in setup: one OAuth client, configured per environment

## Status

Accepted, 11 November 2026. Completes ADR 0012 (account join decisions) for Google sign-in, which
was built but switched off everywhere because no OAuth client existed.

## Context

"Continue with Google" (L2-003) is the OpenID Connect authorization code flow with PKCE, `state`
and `nonce`, behind `IGoogleIdentityClient`. The code needs a client ID and a client secret. Until
now neither existed, so `GET /api/auth/google/start` sent every visitor to the sign-in error state
while the join and sign-in pages still showed the Google button. A visitor who cancelled at Google
got the same error as a forged callback, always on `/sign-in`, whichever page they started from.

## Decision

- **One Google Cloud project, `Jubilee` (`jubilee-514409`), with one OAuth client** of type *Web
  application*, named `Jubilee web`. The consent screen is External and published to production;
  its authorised domain is `jubilee.to`. It carries no logo: a logo would require Google's
  verification, which the three scopes below do not.
- **Scopes: `openid email profile`.** They are not sensitive, so Google asks for no verification.
- **Redirect URI: `{App:PublicBaseUrl}/api/auth/google/callback`**, built by
  `GoogleSignInController.RedirectUri()` from configuration and never from the request, so a
  forged `Host` header cannot change it. The registered URIs are:

  | Environment | `App:PublicBaseUrl` | Authorised redirect URI |
  |---|---|---|
  | Local development and the e2e API | `http://localhost:4200` | `http://localhost:4200/api/auth/google/callback` |
  | Azure | `https://app.jubilee.to` | `https://app.jubilee.to/api/auth/google/callback` |

  The authorised JavaScript origins are the same two origins. The flow is a server-side redirect,
  so they are not used today; they are registered so that the client need not change if the app
  later calls Google from the browser.
- **Configuration keys: `Google:ClientId` and `Google:ClientSecret`** (`Google__ClientId` and
  `Google__ClientSecret` as environment variables). Locally they live in `dotnet user-secrets` of
  `Jubilee.Api`; in Azure they are App Service settings of `jubilee-to-app`. They are never in the
  repository, a log or a deployment script's output.
- **Without both keys Google sign-in is off, and the app says so.** `GET /api/session` reports
  `googleSignIn: false`; the join and sign-in pages then show neither Google button nor the "or"
  above it, and no request leaves for Google (L2-003 criterion 5).
- **The callback tells a cancellation from a failure, and returns the visitor to where they
  started.** The pending sign-in remembers the page it started from (`/join` or `/sign-in`).
  `error=access_denied` from Google returns `?error=google-cancelled`; an unverified e-mail returns
  `?error=google-email`; anything else returns `?error=google` (L2-003 criteria 3, 4, 6 and 7). The
  return URL is carried through each of them.
- **No test calls Google.** API tests inject `FakeGoogle`; the Playwright suite never leaves the
  app (ADR 0009).

## Consequences

- Rotating the secret is an App Service setting change and a restart; nothing is redeployed.
- A second environment (a staging site) needs its redirect URI added to the same client, or a
  client of its own.
- The consent screen shows "Jubilee" without a logo until the owner chooses to go through Google's
  brand verification.
- The steps to repeat the setup are in [`eng/azure/README.md`](../../eng/azure/README.md) under
  "Google sign-in".
