# 0011. Search index over the database

## Status

Accepted, 10 November 2026. Amended 12 November 2026: the index over the database is the designed
search index, not a stand-in for a search engine. `SearchIndexingJob` is not deferred; it is not
part of the design.

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
  changes, and only public listings are searchable (`L2-028`, `L2-029` AC7). There is nothing to
  bring up to date, so there is no `SearchIndexingJob` in `Jubilee.Worker`, no index document and
  no outbox message for search, and the job guarantees of `L2-182` (once across instances,
  retries, last success) have nothing to apply to here.
- This is the final design (amendment of 12 November 2026). The search design named an index
  product `<TO SUPPLY>`; the product is the Jubilee database itself. A hosted search engine would
  add a service to run, a second copy of every listing that can fall behind the first, and a job
  whose failure hides or shows the wrong listings; no acceptance criterion of `L2-029` to
  `L2-032`, `L2-181` or `L2-204` needs one. `SearchCurrencyTests` proves that an approval, an
  edit, a pause, a resume, a deletion, a moderation hold and a change to a service or a product
  each reach the next search.
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
  `meet-api-latency-and-scale` while the directory is one city's; search latency under load is
  measured there, not here. `ISearchIndex` stays the seam: if those measurements ever call for
  another index, a new ADR supersedes this one and replaces `DatabaseSearchIndex`, with no change
  to the handler, the endpoints or the page.
- `ISearchIndex` can still fail (the database call throws); the fallback of `L2-181` AC3 stays.
- Search answers are never cached (`Cache-Control: private, no-store`), because they record a
  member's recent searches.
- The rate limit is held per API instance until the shared `Cache` counter is built.
