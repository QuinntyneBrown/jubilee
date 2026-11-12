# Search the directory

## Overview

Jubilee is Toronto's Christian marketplace. Besides browsing by category, a
visitor or member can search the whole directory by keyword. This feature covers
the search box in the top bar and the browse hero, and the search page at
`/search`.

A search matches business names, taglines, descriptions, services and products.
The results page groups the matches under three tabs, "Businesses", "Services"
and "Products", each with a count, and explains why each result matched, for
example "Matches plumbing in name and 4 services". Only live listings and their
services and products are searchable.

The feature uses the following local terms.

- **query** — text that the person submits, trimmed and cut to at most 100 characters
- **match explanation** — sentence under a result that names where the query matched, with the matched term highlighted
- **close term** — indexed term that differs slightly from a query that matched nothing, offered as "Did you mean plumber?"
- **recent search** — query that a signed-in member submitted, stored on the server and shown on the empty search page
- **empty search page** — state of `/search` when the query is absent or contains only whitespace

Full-text search runs against the `Search index`, which is a query-time
analysis of the public listings in `Jubilee database` (ADR 0011). It is the
final design, not a stand-in: the index has no store of its own, so a search
always shows the listings as they are at that moment (`L2-029` AC7) and no job
keeps it current. When the index fails, the feature falls back to a name
search in `Jubilee database` and omits match explanations (`L2-181`).

## Description

The feature is a vertical slice from the search box to the search index.

- **`SearchField`** — Angular component (`jb-search-field`) used in the top bar,
  the browse hero and the search page. Its input stops at 100 characters. On
  submit the page that holds it navigates to `/search?q={query}`. On the search
  page it keeps the submitted query in the input.
- **`SearchPage`** — Angular page for `/search`. With a query it renders the
  heading "Results for “plumber”", the line "{n} businesses · {n} services ·
  {n} products" and the three tabs. With no match it renders "Nothing matches
  “plumbre”", the suggestion and its "Search “plumber”" button, and a link to
  the most relevant category; with no close term it omits the suggestion line
  and links to all categories. With an empty query it renders the empty search
  page without calling the search endpoint. On failure it renders "We couldn't
  load your results" with the reference `JB-SRCH-503`.
- **`MatchExplanation`** — Angular component that renders the explanation text.
  The API returns plain text plus highlight ranges; the component builds the
  `<mark>` elements itself. The query and all result text pass through Angular
  text binding, so HTML or script in a query is displayed as text and is never
  executed.
- **`SearchStore`** — Angular service provided by `SearchPage`. It holds the
  state of the page (loading, results, no results, empty, error), calls
  `SearchApi` through the `SEARCH_API` token, and removes and clears recent
  searches.
- **`SearchApi`** — contract with the token `SEARCH_API`, implemented by
  `HttpSearchApi`: the typed Angular HTTP client for `GET /api/search`,
  `GET /api/search/start`, `DELETE /api/search/recent/{id}` and
  `DELETE /api/search/recent`.
- **`SearchRateLimit`** — the `searches` policy of ASP.NET Core's rate limiter
  in `Jubilee.Api`. It counts requests to `GET /api/search` per IP address and
  returns HTTP 429 once one IP address has sent more than 60 searches in a
  minute (ADR 0011).
- **`SearchController`** — ASP.NET Core controller. `GET /api/search` and
  `GET /api/search/start` are anonymous; the two `DELETE` endpoints require a
  session. A failed search returns 503 `ProblemDetails` with `JB-SRCH-503`.
- **`SearchQueryText`** — value object that owns the input rules. `From` trims
  the raw text and truncates it to 100 characters. A whitespace-only value is
  empty, and the API answers an empty query with the same payload as
  `GET /api/search/start`.
- **`SearchDirectoryQuery`** and **`SearchDirectoryQueryHandler`** — MediatR
  query and handler. The handler searches through `ISearchIndex`, falls back to
  `DatabaseNameSearch` when the index call fails, and records the query for a
  signed-in member. It returns a `SearchAnswer`: the `SearchResults`, or for an
  empty query the `SearchStartDto`.
- **`ISearchIndex`** — application service with one method, `SearchAsync`. It
  returns the hits and, when nothing matches, the `SearchSuggestion`.
- **`DatabaseSearchIndex`** — the implementation of `ISearchIndex` in
  `Jubilee.Infrastructure`. For each query it reads the public listings with
  their services and their products that are not deleted, and matches them with
  `SearchAnalyzer`. It keeps no documents, so an approval, an edit, a pause, a
  resume, a deletion, a moderation hold and a change to a service or a product
  each reach the next search (`L2-029` AC7), and only public listings are found
  (`L2-028`). It returns at most 20 hits of each kind; the counts are of all the
  matches.
- **`SearchAnalyzer`** — static application service that folds case and accents
  and strips a few common endings, so "plumber", "plumbing" and "Plumbers"
  return the same businesses, and "café" matches "cafe". It also computes the
  distance between two words, for the close term.
- **`DatabaseNameSearch`** — application service that matches the query
  against public listing names in `Jubilee database`. Its results set
  `HasMatchExplanations` to `false`.
- **`SearchResults`**, **`SearchHit`** and **`SearchSuggestion`** — result
  types. `SearchResults` carries the three counts and the hits; each `SearchHit`
  carries its kind (`SearchResultKind`: `business`, `service` or `product`) and
  an optional `MatchExplanation` of text and `HighlightRange` entries;
  `SearchSuggestion` carries the close term and the slug of the most relevant
  category.
- **`RecentSearch`** — entity for one entry of a member's search history. The
  handler records it; searching the same words again moves the entry to the
  top. A visitor has no stored history.
- **`SearchStartBuilder`** — application service that builds the empty search
  page: the member's 5 newest entries, newest first, and the popular
  categories. `GetSearchStartQueryHandler` serves it at `GET /api/search/start`.
- **`RemoveRecentSearchCommandHandler`** and
  **`ClearRecentSearchesCommandHandler`** — MediatR handlers that delete one
  entry or all entries of the calling member from `Jubilee database`. Another
  member's entry is not found (`L2-133`).
- **No indexing job.** `Jubilee.Worker` has no `SearchIndexingJob`, and no
  outbox message is written for search: there is nothing to keep current
  (ADR 0011). The scheduled work of `L2-182` does not include search.
- **Popular categories** — list shown on the empty search page: the 5
  categories with the most public listings, leaving out empty ones.

### Spaces

A live space matches on its title and line like any listing, and also on its
neighbourhood, the space and its key facts, with the match explanations "in
neighbourhood", "in the space" and "in key facts"; never on its exact address. A space hit keeps the kind `business`, so it is
counted and listed under "Businesses", and carries `SearchHit.Space`
(`SpaceCardDto`) so the page renders it as a space card. The rule is part of
the feature [Browse spaces](../browse-spaces/README.md) (ADR 0042).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-029` | `L1-004` | The page `/search?q=` shall search business names, taglines, descriptions, services and products, shall group the results, and shall show every change to a listing, a service or a product in the next search. |
| `L2-030` | `L1-004` | When a query matches nothing, the page shall say so, shall offer a close term and a search button for it when one exists, and shall link to the most relevant category or, with no close term, to all categories. |
| `L2-031` | `L1-004` | The page `/search` with no query shall help the member start, with up to 5 recent searches and popular categories. |
| `L2-032` | `L1-004` | The system shall truncate a query to 100 characters, shall treat a whitespace-only query as empty, shall render a query as text, and shall answer more than 60 searches a minute from one IP address with HTTP 429. |
| `L2-028` | `L1-003` | Browse, category, search, featured and related lists shall show only listings that are verified and not paused, deleted or under a moderation hold. |
| `L2-118` | `L1-016` | Every load-error state shall show a reference that the user can quote to support. |
| `L2-133` | `L1-019` | The server shall check the caller's role and ownership of the specific object on every API endpoint, and shall answer a request for another member's object with 404. |
| `L2-181` | `L1-025` | When the search index is unavailable, the application shall fall back to a database name search of the public listings and shall show results without match explanations. |
| `L2-182` | `L1-025` | Search shall have no indexing job, because it reads the listings themselves. |
| `L2-204` | `L1-028` | Search shall match live spaces by title, line, neighbourhood, the space and key facts, list them under "Businesses" as space cards, and never search or return the exact address. |

## Diagrams

### System context

Visitors and members search the directory. Members also manage their recent
searches. The feature involves no external system.

![C4 system context for searching the directory](diagrams/c4-context.png)

### Containers

`Jubilee API` searches the public listings in `Jubilee database`, counts
searches per IP address in its own rate limiter, and reads the fallback and
recent searches from the same database. No other container takes part:
`Jubilee Worker` has no search job.

![C4 container view for searching the directory](diagrams/c4-container.png)

### Components

`SearchRateLimit` guards the search endpoint. The handler normalises the
query with `SearchQueryText`, searches through `DatabaseSearchIndex` (the
`ISearchIndex`), and uses `DatabaseNameSearch` as the fallback.

![C4 component view for searching the directory](diagrams/c4-component.png)

### Class structure

`SearchAnswer` holds the `SearchResults` or the `SearchStartDto`.
`SearchResults` aggregates `SearchHit` entries and an optional
`SearchSuggestion`. A `MatchExplanation` holds text and highlight ranges, not
markup.

![Class diagram for searching the directory](diagrams/class-structure.png)

### Behaviour — search the directory

The rate limiter applies the `L2-032` limit, the handler normalises the
query and searches the index, which reads the listings as they are now, and
the page renders results, the no-results state or the error state. The index failure branch shows the `L2-181` fallback.

![Sequence diagram for searching the directory](diagrams/sequence-search.png)

### Behaviour — open the empty search page and remove a recent search

The empty search page loads recent searches for a signed-in member only.
Removing an entry deletes the row on the server, scoped to the owning member.

![Sequence diagram for the empty search page and recent searches](diagrams/sequence-recent-searches.png)
