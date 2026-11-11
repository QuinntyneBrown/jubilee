# 0011. Search index over the database

## Status

Accepted, 10 November 2026.

## Context

The search design (`docs/detailed-designs/directory/search-directory/README.md`) leaves the product
of the `Search index` as `<TO SUPPLY>` and has `Jubilee Worker` keep it current from the outbox.
Neither a search engine nor the outbox exists yet, and ADR 0009 forbids a real service in a test.
`L2-029` to `L2-032` and `L2-181` still have to hold: stemming, case folding, accent folding,
match explanations, a close term for a query that matches nothing, and a fallback to a name search
when the index fails.

## Decision

- `ISearchIndex` (in `Jubilee.Application`) is the seam. Its first implementation,
  `DatabaseSearchIndex` in `Jubilee.Infrastructure`, analyses the public listings, their services
  and their products at query time with `SearchAnalyzer`: it folds case and accents and strips a
  few common endings, so "plumber", "plumbing" and "Plumbers" meet and "café" meets "cafe".
- Because it reads the database, the index is current the moment a listing, service or product
  changes, and only public listings are searchable (`L2-028`). `SearchIndexingJob` in
  `Jubilee.Worker` is therefore not built; it returns with a real search engine.
- `DatabaseNameSearch` (in `Jubilee.Application`, over `IAppDbContext`) is the fallback of
  `L2-181`. The handler uses it when `ISearchIndex` throws; its results carry no match
  explanation and `hasMatchExplanations` is `false`.
- The close term is the nearest word of the directory within two edits (one for a word of four
  letters or fewer), by optimal string alignment distance; the suggested category is the one that
  uses that word most.
- Popular categories on the empty search page are the five categories with the most public
  listings; a category without a public listing is left out.
- The limit of 60 searches a minute for each client IP address uses ASP.NET Core's rate limiter,
  as ADR 0003 does for the other public reads, with its own policy `searches`
  (`RateLimits:SearchesPerMinute`), not a counter in `Cache`.
- A signed-in member's recent searches are stored in `RecentSearches` (migration
  `AddRecentSearches`); searching the same words again moves the entry to the top.

## Consequences

- A search reads every public listing, service and product. That holds for the sizes in
  `meet-api-latency-and-scale` only while the directory is small; the move to a search engine
  replaces `DatabaseSearchIndex` and brings back the worker job, with no change to the handler,
  the endpoints or the page.
- Search answers are never cached (`Cache-Control: private, no-store`), because they record a
  member's recent searches.
- The rate limit is held per API instance until the shared `Cache` counter is built.
