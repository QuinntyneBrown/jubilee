# 0001. Backend stack

## Status

Accepted, 10 November 2026.

## Context

The detailed designs name ASP.NET Core, MediatR, EF Core, SQL Server and Redis but fix no
versions, and `AGENTS.md` requires that no test needs a database server.

## Decision

- The backend targets .NET 10 (`backend/global.json`), with central package versions in
  `backend/Directory.Packages.props` and warnings treated as errors.
- Handlers use MediatR 12, the last line under the Apache 2.0 licence. Later versions need a
  licence key, which the project does not have.
- EF Core is the only data access. `Database:Provider` chooses SQL Server (the default, with
  migrations applied by `jubilee migrate`) or SQLite.
- SQLite has no migrations: the API creates the schema from the model on start-up. Tests use an
  in-memory SQLite database per fixture, and `eng/Start-E2eApi.ps1` starts the API on SQLite with
  the demo data seeded.
- The ten categories are a fixed catalogue in `Jubilee.Domain`, not a table, because `L2-023`
  fixes the list.

## Consequences

- A query must translate on both providers. Filters on offers and areas are bit tests on integer
  columns for that reason.
- Behaviour that only SQL Server has (for example full-text search) will need a test double or a
  second strategy when its journey arrives.
- Moving to a later MediatR is a licensing decision, not a technical one.
