# 0013. Server-side sessions, sign-in throttling and drafts

## Status

Accepted, 11 November 2026.

## Context

`L2-010` and `L2-135` ask for server-side sessions: an opaque identifier in the cookie, a
30-day limit, a 12-hour idle limit for a session without "Keep me signed in", and a sign-out that
ends only the current session. The designs keep sessions and failure counters in a Redis `Cache`;
the repo has no Redis, and ADR 0009 forbids a real cache or database in a test.

## Decision

- Sessions are rows of the `Sessions` table, kept by `DatabaseTicketStore`, an ASP.NET Core
  `ITicketStore` behind the cookie scheme. The cookie holds an encrypted wrapper of a random 256-bit
  key; the table keeps the key's SHA-256 and the serialised ticket, so a copy of the table cannot
  be used to impersonate a member. Every sign-in issues a new key (no fixation).
- `SessionPolicy` decides expiry: more than 30 days since sign-in, or, without "Keep me signed in",
  more than 12 hours without activity. Activity is written at most once a minute. An ended session
  is not found, and a request that carried its cookie is answered 401 `SESSION_EXPIRED` and the
  cookie is removed; a request without a cookie is answered 401 `sign_in_required`.
- Sign-out ends the current row (`DELETE /api/session`). `DELETE /api/session/others` ends every
  other row of the member; `GET /api/session` reports `otherSessionCount`.
- Failed sign-ins are rows of `SignInFailures` (a hash of the normalised e-mail, the address and the
  time), counted over a 15-minute window against the clock: five for one e-mail lock it for 15
  minutes from the fifth failure, twenty from one address block the address with `Retry-After`.
  An unknown e-mail is counted and locked like a known one, and is checked against a dummy Argon2id
  hash so the timing matches. A successful sign-in clears the account's failures. This replaces the
  designs' cache counters; it survives a restart and needs no Redis.
- The anti-CSRF token is the `XSRF-TOKEN` cookie that `GET /api/session` sets for anyone, so the join
  and sign-in forms carry it too (ADR 0012). It is a double-submit token, not bound to the session row.
- Drafts (an unsent message or form) belong to the messaging journey; `DraftStore` will keep them in
  `localStorage` keyed by member and route for 30 days. Until a form holds drafts the session-expired
  page restores only the place.
- The sign-in prompt remembers one started action per tab in `sessionStorage` (`PendingActionService`);
  after sign-in the page takes it and carries it on. Return URLs are same-origin paths only.

## Consequences

- Every authenticated request reads one row; the cost is acceptable now and a cache can sit in front
  of `DatabaseTicketStore` later.
- Expired rows stay in the table; a clean-up job in `Jubilee.Worker` should remove rows ended or past
  30 days.
- The `__Host-` cookie prefix needs HTTPS and is left to the deployment work; the cookie is already
  `HttpOnly`, `SameSite=Lax` and `Path=/`.
