# Architecture decisions

One record per decision that shapes the code. Read the records for an area before changing it,
and add a record when a decision is made or replaced. A record is never rewritten to say
something else: a new record supersedes it and both say so.

| No. | Decision | Status |
|---|---|---|
| [0001](0001-backend-stack.md) | Backend stack: .NET 10, MediatR, EF Core, SQL Server, with SQLite for tests and the e2e API | Accepted |
| [0002](0002-frontend-workspace.md) | Frontend workspace: three Angular projects built from source, one global component stylesheet, `jb-*` attribute selectors | Accepted |
| [0003](0003-directory-read-cache.md) | Directory read cache: 60 seconds, removed when a listing changes, and a rate limit on public reads | Accepted |
| [0004](0004-directory-ordering-rules.md) | Directory ordering rules: the Recommended score, category groups, "From the shops" and the category fact | Accepted |
| [0005](0005-visual-baselines-from-mocks.md) | Visual regression: baselines are rendered from the mocks on each run | Accepted |
| [0006](0006-session-and-navigation-before-sign-in.md) | Session and navigation endpoints before sign-in exists | Accepted |
| [0007](0007-listing-pages-before-accounts-and-requests.md) | Listing pages before accounts, requests and messaging exist: owner subject, links to later journeys | Accepted |
| [0009](0009-tests-without-a-backend-or-database.md) | Tests run without a real backend or database: Playwright API mocking for e2e, EF Core InMemory for the backend | Accepted |
| [0010](0010-behaviour-tests-only-by-default.md) | Only behaviour tests run; the visual, responsive and accessibility sweeps run by hand | Accepted |
| [0011](0011-search-index-over-the-database.md) | Search index: query-time analysis over the database behind `ISearchIndex`, until a search engine is chosen | Accepted |
| [0012](0012-account-join-decisions.md) | Joining: Argon2id, outbox e-mail, confirmation links, the bounce webhook secret and Google linking | Accepted |
| [0014](0014-messaging-decisions.md) | Messaging: one conversation per business, read marks, photos, limits, report and block | Accepted |
| [0015](0015-booking-decisions.md) | Booking: weekday-bitmask hours, fixed slots, one request lifecycle, idempotent bookings | Accepted |
| [0016](0016-quote-request-decisions.md) | Quote requests: one request row, ten-digit phone, field codes, no pronouns | Accepted |
| [0008](0008-frontend-file-per-type.md) | Frontend: one file per type, no single-file components (`templateUrl`, never `template`) | Accepted |

## Format

Each record has the sections Status, Context, Decision and Consequences, in that order, and is
named `NNNN-short-title.md`.
