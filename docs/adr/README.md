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

## Format

Each record has the sections Status, Context, Decision and Consequences, in that order, and is
named `NNNN-short-title.md`.
