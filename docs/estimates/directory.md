# Estimates: directory

| Design | Effort | Complete |
|---|---|---|
| browse-category | 4 days | 100% |
| browse-home | 5 days | 100% |
| browse-platforms | 3 days | 0% |
| browse-spaces | 5 days | 100% |
| search-directory | 4 days | 100% |
| view-welcome-page | 4 days | 100% |

browse-spaces (ADR 0042): the rooms shelf on Browse and the Rooms & rentals category with the term filter, the space card, and spaces in search are done with tests. Excludes deferred work (see ADR 0042): hourly rent and the sign-up intents.

browse-home, view-welcome-page (ADR 0003): the directory read cache is removed by `DirectoryCacheInvalidationInterceptor`, which is the designed path; a pause, a publish (ADR 0057), a takedown and a featured week reach the cached pages on the next request and within 60 seconds otherwise, with tests. Nothing is left.

search-directory (ADR 0011): the index over the database is the final design, so there is no indexing job to build; a publish (ADR 0057), an edit, a pause, a resume, a deletion, a moderation hold and a change to a service or a product each reach the next search, with tests (`SearchCurrencyTests`, `e2e/tests/search.spec.ts`). Nothing is left. Search latency under load is measured in performance.

ADR 0057 is done in every design above: the cards, rows and search results carry no "Verified" mark and the API no `verified` field, counts read "{n} businesses", and "Newest" orders by `PublishedAt`.

browse-platforms (ADR 0071): designed, not built. The "Software platforms" category, its chip and group on Browse, its category page without filters, platforms on the business card and in search. The percent is set when journey 33 is implemented.
