# 0009. Tests run without a real backend or database

## Status

Accepted, 10 November 2026. Supersedes the test parts of ADR 0001 (SQLite for tests and the e2e
API) and ADR 0006 (the Playwright suite against the e2e API).

## Context

The Playwright suite ran the Angular app in front of a real API (`eng/Start-E2eApi.ps1`) on a
seeded SQLite database, and the backend tests ran on in-memory SQLite. Each e2e run had to build
and start the API, every test paid for HTTP round trips through it, and a suite of several hundred
browser tests spent much of its time waiting for a backend whose behaviour the backend tests
already prove. The project wants the suites fast.

## Decision

- **E2E: Playwright API mocking only.** Every request the app makes to `/api/**` is answered by
  `page.route` in the `page` fixture of `e2e/fixtures/jb-test.ts`, from recorded responses in
  `e2e/fixtures/api/responses.json`. No test starts or reaches the API, and none reaches a
  database. A request with no recorded answer fails the test that made it, naming the request.
  States the recording cannot produce (loading, errors, sold out, the owner's view, …) patch or
  replace the recorded answer in `e2e/fixtures/stubs.ts`, as before.
- **Recording is a maintenance step, not a test.** When the API's answers change, `npm run
  record-api` in `e2e/` runs the suite once against the seeded e2e API (`eng/Start-E2eApi.ps1`)
  and rewrites `responses.json`. The recording is reviewed like code. CI never records.
- **Backend: EF Core InMemory only.** API, Infrastructure, Application and CLI tests use the EF
  Core InMemory provider (`Database:Provider=InMemory`, a store name per fixture, one
  `InMemoryDatabaseRoot` per process). No test opens SQLite, LocalDB, SQL Server or a database
  file. The provider exists for tests only and is never configured for a running service.
- **Database faults in tests** are injected where the application reaches the database
  (`IAppDbContext`), because InMemory issues no SQL commands to intercept.

## Consequences

- The Playwright suite needs only the Angular dev server; the API, the .NET SDK and a seeded
  database are no longer part of an e2e run.
- The e2e suite proves the app against the API's contract as recorded. A change to an endpoint's
  answer reaches the e2e suite only when the recording is refreshed, so a change to an API
  contract refreshes the recording in the same change.
- InMemory is not relational. Unique and filtered indexes, foreign keys, SQL translation,
  transactions and migrations are not exercised by tests. Rules the application relies on are
  enforced in handlers and the domain (for example one open stock alert per member and product),
  and ordered collections carry an explicit position rather than relying on storage order.
- `eng/Start-E2eApi.ps1` stays for recording and for running the app locally.
