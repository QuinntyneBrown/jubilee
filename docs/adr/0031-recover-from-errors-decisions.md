# ADR 0031: Recover from errors

Status: accepted

## Context

Journey 23 (L2-113 to L2-118, L2-175) gives every failure a clear page, a reference tied to the server log, and a way forward, and adds maintenance mode. The designs left the reference code derivation, the maintenance switch's store and exemptions, and who receives an access request as `<TO SUPPLY>`.

## Decisions

- **`JB-500-{code}` is four characters of a SHA-256 of the correlation ID** (alphabet without look-alikes), so one request quotes one code. Every unhandled failure is logged with the reference and the correlation ID in one line; support searches the log for the reference and the time. A read that declares `[ErrorReference]` still answers 503 with its area reference (L2-118 AC2).
- **`X-Request-Id` is sent with `X-Correlation-ID`**, both with the correlation ID (L2-175 AC1).
- **The maintenance switch is configuration**: `Maintenance:Enabled` and `Maintenance:BackBy`, read through `IOptionsMonitor`, so a change takes effect without a deployment or restart. While on, every request but `/api/health` is answered 503 with `Retry-After` (seconds to the back-by time, five minutes without one) and `ProblemDetails` with the code `MAINTENANCE` and `backBy`.
- **A window is recorded and links extended once.** `MaintenanceWatcherJob` in the worker calls `MaintenanceWindowService` every 15 seconds. When the switch turns on a `MaintenanceWindow` opens; when it turns off the window closes and the unused, not superseded e-mail confirmation and change-of-e-mail links, and the open reference links, that were valid when it began get their expiry moved by its length, in one save. Password reset links are not extended. The reference links are `ReferenceLink` rows (not `LinkToken`s), so the service extends both.
- **The app opens the pages from an HTTP interceptor, for reads only.** A failed `GET` with an unhandled error and a `JB-500-` reference opens `/error`; a `GET` answered with `MAINTENANCE` opens `/maintenance`. Both carry the address the member left so "Try again" and "Check again" return to it. A failed save is never redirected: the dialog or page that made it shows its own failure with what was typed still in place, which keeps the member's work (the design's "route state is kept" cannot hold when the page is replaced).
- **The forbidden page asks through a button.** "Ask for access" posts the address that was asked for (remembered by `NavigationTrail` from the navigation that ended on `/forbidden`) to `POST /api/help/access-requests`, with an idempotency key kept across retries. The server accepts only a path of this app (`URL_INVALID` otherwise), limits a member to 5 an hour and stores the request without changing any role or permission. A toast says it was sent.
- **Nobody is e-mailed yet.** The team reads the stored requests; the recipient and an inbox are not configured.

## Deferred

- Static copies of the server error and maintenance pages for a failure of the page load itself: the host serves the app shell, so there is nothing yet to serve them from.
- L2-113 AC2 (301 for a renamed listing slug) and the 404 and 403 statuses of document requests: nothing renames a slug, and the app shell is static.
- Distributed tracing and metrics alerting (L2-175 AC4, L2-176) belong to the observability work.
