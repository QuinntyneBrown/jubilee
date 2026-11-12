# Estimates: directory

| Design | Effort | Complete |
|---|---|---|
| browse-category | 4 days | 100% |
| browse-home | 5 days | 100% |
| browse-spaces | 5 days | 100% |
| search-directory | 4 days | 100% |
| view-welcome-page | 4 days | 100% |

browse-spaces (ADR 0042): the rooms shelf on Browse and the Rooms & rentals category with the term filter, the space card, and spaces in search are done with tests. Excludes deferred work (see ADR 0042): hourly rent and the sign-up intents.

browse-home, view-welcome-page (ADR 0003): the directory read cache is removed by `DirectoryCacheInvalidationInterceptor`, which is the designed path; a pause, an approval and a featured week reach the cached pages on the next request and within 60 seconds otherwise, with tests. Nothing is left.

search-directory (ADR 0011): the index over the database is the final design, so there is no indexing job to build; an approval, an edit, a pause, a resume, a deletion, a moderation hold and a change to a service or a product each reach the next search, with tests (`SearchCurrencyTests`, `e2e/tests/search.spec.ts`). Nothing is left. Search latency under load is measured in performance.
