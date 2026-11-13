# 0026. Recover password decisions

Status: accepted. Amended by ADR 0064, which ends the deferral of the 429 for reset requests, of the timing test and of an alert on a burst of reset requests, and by ADR 0046, whose server-side sessions end every session on a reset.

## Context

A visitor who forgot their password asks for a reset link, opens it from an e-mail and chooses a new password (L2-008, L2-009, L2-134 AC3, L2-137, L2-140, L2-141, L2-143). The design (`accounts/reset-password`) left open how a session ends when the password changes, where the limit of 3 an hour is counted, and what stands in for sign-in, which journey 5 has not built.

## Decision

- **Endpoints, all anonymous, under `/api/account`.** `POST password-reset-requests` (always 202; 422 with `errors.email` of `REQUIRED` or `EMAIL_INVALID` for an empty or malformed address), `POST password-resets/inspect` (200 with `state` of `valid` and the account `email`, or `expired` with none; an unknown, used, replaced or old link looks the same) and `POST password-resets` (204; 410 `LINK_EXPIRED`; 422 with `newPassword` of `REQUIRED`, `TOO_LONG`, `PASSWORD_TOO_SHORT` or `PASSWORD_BREACHED`, or `repeatPassword` of `PASSWORDS_DIFFER`). The token travels in the body, the responses carry `Referrer-Policy: no-referrer` and `Cache-Control: no-store`, and the page removes the token from the address bar when it reads it. Bodies are closed records. Failures carry `JB-AUTH-503`, `-504` and `-505`.
- **The request only queues.** The handler records a `PasswordResetRequest` row (the lower-cased address and the time) and reads no account, so it takes the same time for any address (L2-141). `PasswordResetLinks`, run every 5 seconds by `PasswordResetJob` in the Worker, is the only reader of the account: it issues the link and queues the e-mail. The outbox (not a cache counter) holds the work, so it survives a restart.
- **The limit is counted from the request rows.** A request is dropped, without an e-mail, when 3 requests for the same address were already processed in the hour before it (L2-137). The page shows the same success message either way (L2-008 AC4). There is no separate per-IP limit for this endpoint: the answer never differs, so there is nothing to probe, and the flood is bounded by the per-address count.
- **Links.** A `LinkToken` of purpose `PasswordReset`, 256 random bits, stored as SHA-256, valid for 60 minutes, single-use. A new request supersedes the earlier unused links; a successful reset supersedes every other outstanding one (L2-134 AC3).
- **Sessions end by a time stamp, not by a session table.** The sessions are cookies without server state. `Member.PasswordChangedAt` is set when the password changes; the session cookie carries `jb_iat`, the UTC ticks at which the session began; the cookie middleware rejects and signs out a session whose `jb_iat` is before `PasswordChangedAt`. A sign-in after the change starts a session at or after it, so it stays. The check reads one column by key on a request that has a session. A listing of sessions (L2-143 AC3) needs a table and belongs to journey 20.
- **The security e-mail** ("Your Jubilee password was changed") is queued in the same unit of work as the change. The event is logged as `Security event: PasswordReset` with the member id, never with the token or the password (L2-143 AC1, L2-140 AC3: the token never appears in a URL, so request logging cannot capture it).
- **The smallest sign-in.** `POST /api/account/sign-in` checks the e-mail and password and starts a session; a wrong password and an unknown address get the same 401, and an unknown address still costs one Argon2id check. It exists so that the new password can be proven to work. The sign-in page, the throttling and lockout (L2-007), "return to where you were" and sign-out stay in journey 5.
- **Accounts without a password** (joined with Google) can ask for a link too: the owner of the address may choose a password.
- **Test harness.** The API tests authenticate by a header. A client that also sends `X-Test-Cookie-Session` is read by its real session cookie, so a test can prove that a session ended.

## Deferred

- The sign-in page and the Sign-in link's target (`/sign-in` shows the not-found page until journey 5); lockout and its e-mail (L2-007).
- A 429 with `Retry-After` for reset requests from one address (L2-137 AC1): the specification asks the same message and no e-mail instead (L2-008 AC4), which this journey follows. The page still shows the 429 notice if the API ever sends one.
- Median timing of 100 requests each (L2-008 AC5): the request does no account lookup, which a test proves by the rows it leaves, and a timing test would be flaky in CI.
- The security alert to the on-call contact (L2-143 AC2) and the sessions list (L2-143 AC3).
- Changing the password while signed in (journey 20, `change-credentials`).
