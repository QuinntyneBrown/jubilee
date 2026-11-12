# 0003. Directory read cache

## Status

Accepted, 10 November 2026. Amended 12 November 2026: the SaveChanges interceptor is the designed
way to remove the cached entries, not a stand-in for an outbox handler.

## Context

`L2-156` asks that the public directory and category responses are cached for up to 60 seconds
and removed when a listing changes state. `L2-028` asks that a paused listing is gone from public
lists within 60 seconds. The designs first placed the cache in Redis and the removal in an outbox
handler of `Jubilee Worker` (`DirectoryCacheInvalidator`), and this record first kept the
interceptor below only until the outbox existed.

The outbox exists now (`OutboxMessage`, `OutboxDispatcherJob`) and carries e-mails only. Moving
the removal there would add a message type, a handler and a delay of the dispatcher's interval to
a removal that today happens in the request that saves the change, and it would still need the
60-second expiry for a copy another process holds. Nothing would be gained for `L2-156` or
`L2-028`.

## Decision

- `IDirectoryReadCache` (in `Jubilee.Application`) caches the welcome response, the browse home
  response and each category result page for 60 seconds, measured with the injected
  `TimeProvider`.
- The implementation uses `IDistributedCache`: in memory by default, Redis when
  `ConnectionStrings:Redis` is set. Nothing else changes between the two.
- A SaveChanges interceptor of `AppDbContext`, `DirectoryCacheInvalidationInterceptor`, removes
  every cached directory entry after a save that added, changed or deleted a `Listing`, `Product`,
  `Service` or `FeaturedSlot`. This is the designed path. No outbox message is written for a
  directory change and `Jubilee Worker` has no `DirectoryCacheInvalidator`; the designs name the
  interceptor.
- The interceptor is registered wherever `AppDbContext` is: the API, the worker and the CLI.
- The four public directory endpoints answer with `Cache-Control: public, max-age=60`, so a CDN
  or the browser may hold the response for the same time.
- The public directory endpoints share a rate limit of 120 requests per minute for each client IP
  address and answer `429` with `Retry-After` above it. Search keeps its own, lower limit
  (`L2-137`).

## Consequences

- A change the API saves (an owner pausing or resuming, a verifier approving or setting the
  featured week) shows on the next response the API builds. `DirectoryCacheTests` proves this
  through those endpoints, and proves the 60-second bound for a change the API is not told about.
- With the in-memory cache, a change made by another process (the worker or the CLI) is seen
  after at most 60 seconds, which still meets `L2-028`. With Redis it is seen at once.
- A bulk update that bypasses `SaveChanges` (`ExecuteUpdate`, a direct database write) is not
  seen by the interceptor; it shows when the entries expire, at most 60 seconds later.
- A response held by a CDN or a browser cannot be removed early, so a paused listing can stay
  visible there for up to 60 seconds. That is the limit `L2-028` allows.
- The directory responses carry no personal data, so one cached response serves everyone. A
  member's saved state and counts must never be added to them.
