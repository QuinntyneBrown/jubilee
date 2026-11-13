# 0064. Finish recover a forgotten password

## Status

Accepted, 13 November 2026. Amends ADR 0026, whose deferrals of a 429 for reset requests, of
the timing test and of an alert it ends. Applies ADR 0049 (`LoggedPath`, the log redactor of
journey 4) and ADR 0046 (server-side sessions, which journey 5 built after ADR 0026). ADR 0057
(no verification) changes nothing here.

## Context

Journey 18 lets a visitor ask for a reset link at `/forgot-password` and choose a new password
from the link. ADR 0026 built it with the request only queued and the limit of 3 an hour counted
by the worker: a fourth request in the hour got the same "Check your e-mail" answer and no
e-mail, because `L2-008` AC4 asked for exactly that. `L2-137` AC1 asks for a 429 with
`Retry-After` for the same limit, so the two requirements contradicted each other, and ADR 0026
followed `L2-008`. It also left the timing of `L2-008` AC5 argued rather than tested, and it had
no alert for a flood of reset requests. Nothing tested that a reset token stays out of the
worker's log and the e-mail sender's log.

## Decision

### The fourth request in an hour answers 429 (L2-008 AC4, L2-137 AC1)

- `L2-008` AC4 now agrees with `L2-137` AC1: a fourth request for one address within an hour is
  refused with 429, `Retry-After` and the code `rate_limited`, and the page shows "You’re doing
  that a lot. Try again in {n} minutes." in place of the form's success. No row is recorded, so
  no e-mail is sent.
- `RequestPasswordResetCommandHandler` counts the `PasswordResetRequest` rows of the address in
  the hour before. The count reads the request rows only, never the account, so the answer and
  the work are the same whether or not the address has an account (`L2-141` AC1): the limit
  tells a caller only how often that address was asked for, which the caller already knows.
  `Retry-After` is the moment the oldest of those three leaves the hour.
- The refusal is a security event (`L2-143` AC1): `Security event: RateLimitTrip PasswordReset
  refused from {Address}`, with the caller's IP address and never the e-mail address.
- The worker keeps its own count of 3 processed requests an hour, so two requests that race past
  the API's count still send at most 3 links.
- There is still no per-IP limit on this endpoint (ADR 0026): it answers the same for every
  address, so a flood across many addresses reveals nothing, and the alert below watches it.

### No reset token reaches a log (L2-140 AC3)

The token is only ever in the e-mail body and in a request body (ADR 0026), and `LoggedPath`
(ADR 0049) writes a token-shaped path segment as `[redacted]` if a link is ever opened against
the API. Two tests now prove it: one walks the whole reset through the API (request, issue,
inspect, reset, and the link's path opened against the API) and reads every line the API logged;
one runs the worker's `PasswordResetJob` and `OutboxDispatcherJob` with the `LoggingEmailSender`
and reads every line the worker logged. No production code changed for this criterion.

### The timing is tested (L2-008 AC5)

`PasswordResetTests` sends 100 requests for an address with an account and 100 for one without,
interleaved, with the clock moved past the hour between pairs so the limit never answers, and
asserts that the median times differ by less than 50 ms. It runs in-process on EF Core InMemory
(ADR 0009); the timing it proves is that of the handler, which is the part an account could
change.

### An alert on a burst of reset requests (L2-143 AC4)

- `L2-143` gains AC4: more than 100 reset requests across all addresses within 5 minutes alert
  the on-call security contact by e-mail, with the count and no address, at most once in any 5
  minutes while the burst lasts.
- `PasswordResetLinks` checks after each pass of the worker (every 5 seconds). It counts the
  requests recorded in the 5 minutes before, and when there are more than 100 and no
  `SecurityAlert` of kind `PasswordResetBurst` was raised in those 5 minutes, it records one,
  logs `Security alert: {Count} password reset requests in 5 minutes` as a warning, and queues
  the e-mail "Security alert: a burst of password reset requests" through the outbox.
- The contact is `Security:OnCallEmail`, else the Jubilee team's address (`TeamSettings`, ADR
  0055). With neither set the alert is logged and recorded only. Setting `Security__OnCallEmail`
  on `jubilee-to-app` is an owner step (`eng/azure/README.md`).
- The alerts for failed sign-ins and role changes (`L2-143` AC2) are not part of this journey.

## Consequences

- A visitor who asks a fourth time in an hour is told to wait instead of being told a link is on
  its way; the message is the same for every address.
- The on-call contact hears of a reset flood within seconds, by the same outbox every other
  e-mail uses, and the `SecurityAlerts` table keeps when each alert was raised.
- One migration, `AddSecurityAlerts`, adds the table.
