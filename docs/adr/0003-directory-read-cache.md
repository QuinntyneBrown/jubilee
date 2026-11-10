# 0003. Directory read cache

## Status

Accepted, 10 November 2026.

## Context

`L2-156` asks that the public directory and category responses are cached for up to 60 seconds
and removed when a listing changes state. `L2-028` asks that a paused listing is gone from public
lists within 60 seconds. The designs place the cache in Redis and the removal in an outbox handler
of `Jubilee Worker`, but the outbox belongs to a later journey.

## Decision

- `IDirectoryReadCache` (in `Jubilee.Application`) caches the welcome response, the browse home
  response and each category result page for 60 seconds, measured with the injected
  `TimeProvider`.
- The implementation uses `IDistributedCache`: in memory by default, Redis when
  `ConnectionStrings:Redis` is set. Nothing else changes between the two.
- A SaveChanges interceptor of `AppDbContext` removes every cached directory entry when a
  `Listing`, `Product` or `FeaturedSlot` is added, changed or deleted. It stands in for the outbox
  handler until the outbox exists.
- The four public directory endpoints answer with `Cache-Control: public, max-age=60`, so a CDN
  or the browser may hold the response for the same time.
- The public directory endpoints share a rate limit of 120 requests per minute for each client IP
  address and answer `429` with `Retry-After` above it. Search keeps its own, lower limit
  (`L2-137`).

## Consequences

- With the in-memory cache, a change made by another process (the worker or the CLI) is seen
  after at most 60 seconds, which still meets `L2-028`. With Redis it is seen at once.
- A response held by a CDN or a browser cannot be removed early, so a paused listing can stay
  visible there for up to 60 seconds. That is the limit `L2-028` allows.
- The directory responses carry no personal data, so one cached response serves everyone. A
  member's saved state and counts must never be added to them.
