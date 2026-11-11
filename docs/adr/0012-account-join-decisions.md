# 0012. Joining: passwords, confirmation links, Google and the outbox

## Status

Accepted, 10 November 2026.

## Context

The join designs (`docs/detailed-designs/accounts/join-with-email`, `confirm-email`,
`continue-with-google`) left four decisions as `<TO SUPPLY>`: how the e-mail provider's bounce
webhook is authenticated, how long a pending Google transaction lives, what happens when Google
returns an address that matches an unconfirmed account, and how e-mail leaves the system. ADR 0009
forbids a real provider, Google, breach service or bot service in a test.

## Decision

- Passwords are hashed with Argon2id (19 MiB, 2 passes, 1 lane; stored as
  `argon2id$m=19456,t=2,p=1$salt$hash`). A password found by Have I Been Pwned's k-anonymity range
  API is refused with `PASSWORD_BREACHED`; if the service cannot be reached within two seconds the
  password is accepted.
- E-mail goes through the `OutboxMessages` table. The API only queues a message in the same
  transaction as the change; `OutboxDispatcherJob` in `Jubilee.Worker` sends due messages every
  10 seconds (`Worker:OutboxIntervalSeconds`), retries with back-off and gives up after 24 hours.
  A sent message loses its body. Provider, sender and templates are behind `IEmailSender`; the
  first implementation logs the message.
- Confirmation links carry a 32-byte random value; only its SHA-256 is stored. A link works for
  24 hours, once; a new one supersedes the earlier ones. The link opens `/verify-email/:token` in the
  app, which removes the token from the address bar and `POST`s it.
- The bounce webhook `POST /api/webhooks/email-events` authenticates with a shared secret in
  `X-Webhook-Secret` (`Email:WebhookSecret`); with no secret configured the endpoint is closed.
- A pending Google transaction (`state`, `nonce`, PKCE verifier, return URL) lives 10 minutes in the
  cache and is consumed once. Only same-origin relative return URLs are followed.
- A Google sign-in whose verified address matches an unconfirmed account links to it and removes
  that account's password, so nobody who typed the address without owning it keeps access.
  Matching a confirmed account links it; an unverified Google address is refused.
- A new Google member exists but is unusable until they accept the agreement; every other
  authenticated request is refused with `AGREEMENT_REQUIRED` meanwhile.
- Sessions are cookie sessions (`jubilee.session`) with a double-submit anti-CSRF token
  (`XSRF-TOKEN` cookie, `X-XSRF-TOKEN` header) that Angular's `HttpClient` sends by default.
- Joins (5 per hour per IP) and confirmation resends (5 per hour per member) use ASP.NET Core's
  rate limiter, after authentication so the resend limit can key on the member.

## Consequences

- E-mail is not delivered until a provider is chosen and an `IEmailSender` for it is written.
- A visitor who joins with an address someone else typed on a Google account loses that password;
  the owner of the address signs in with Google or resets the password.
- Limits of 5 per hour are per IP and can catch several people behind one address.
