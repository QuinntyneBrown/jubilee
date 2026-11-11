# Contributing to Jubilee

Thank you for your interest in Jubilee. This guide explains how to propose a change and what a
pull request needs before it can be merged.

By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).

## Contents

- [Ways to contribute](#ways-to-contribute)
- [Before you start](#before-you-start)
- [How a change is made](#how-a-change-is-made)
- [Development setup](#development-setup)
- [Coding conventions](#coding-conventions)
- [Testing](#testing)
- [Commits and pull requests](#commits-and-pull-requests)
- [Licensing of contributions](#licensing-of-contributions)

## Ways to contribute

- **Report a bug.** Open an issue with the bug report template. Include the steps, what you
  expected and what happened.
- **Suggest a feature.** Open an issue with the feature request template. Say which role it is
  for (member, owner, church reference or verification team) and which journey in
  [`docs/journey.md`](docs/journey.md) it belongs to, if any.
- **Improve the documentation.** Requirements, designs, mocks and the design system are all in
  `docs/` and welcome corrections.
- **Implement a journey.** Pick the next journey in [`docs/journey.md`](docs/journey.md); its
  ready-to-run prompt is in [`docs/prompts/`](docs/prompts/).

Security vulnerabilities are never reported in a public issue; see [`SECURITY.md`](SECURITY.md).

## Before you start

1. Read [`AGENTS.md`](AGENTS.md). It is the single source of the repository's rules, and it applies
   to people and coding agents alike.
2. Read the [architecture decision records](docs/adr/README.md) for the area you will change.
3. For anything larger than a small fix, open an issue first so the approach can be agreed before
   you write code.

Use the words the requirements use ([`docs/specs/L1.md`](docs/specs/L1.md),
[`docs/specs/L2.md`](docs/specs/L2.md) and [`docs/journey.md`](docs/journey.md)) in code, docs and
UI; do not invent synonyms.

## How a change is made

Jubilee is built requirement first and test first.

1. **Requirement.** Every change to production behaviour has a requirement with acceptance
   criteria in `docs/specs/`.
2. **Detailed design.** The feature has a design in `docs/detailed-designs/`.
3. **Mock.** Every screen and state the change touches has a mock in `docs/mocks/`. The mocks are
   the source of truth for the UI.
4. **Slices.** The work is planned as small, reviewable slices.
5. **Acceptance test first.** For each slice, write the Given-When-Then criteria and the
   acceptance test, and run it to prove it fails for the expected reason before writing production
   code.
6. **Implement, then refactor** with the tests green, and run the regression checks before the
   next slice.

Documentation-only, mock-only, design-system-only and test-only changes do not need steps 1 to 3
unless they are part of a production behaviour change. Do not write tests for mocks or the design
system, and never add architecture tests (tests that assert the shape of the code rather than its
behaviour).

## Development setup

Follow [Getting started](README.md#getting-started) in the README. In short:

```shell
npm ci --prefix frontend
npm ci --prefix e2e
pwsh eng/Start-E2eApi.ps1          # terminal 1: the API on http://localhost:5080
npm start --prefix frontend        # terminal 2: the app on http://localhost:4200
```

## Coding conventions

### Backend

- Keep the layer direction: `Domain` ← `Application` ← `Infrastructure` ← `Api` / `Worker` /
  `Cli`.
- Business rules live in handlers and domain services, not controllers.
- Endpoints require authentication by default; keep intentional `[AllowAnonymous]` access.
- Owned data stays scoped to its owner.
- Errors are ProblemDetails, with a `code` extension where a client needs to branch on them.
- The API never applies migrations on startup; `jubilee migrate` does.

### Frontend

- Prettier owns formatting and angular-eslint owns lint; CI fails on either.
- One type per file, and no single-file components: `name.ts` + `name.html` (+ `name.scss`)
  ([ADR 0008](docs/adr/0008-frontend-file-per-type.md)).
- Selectors use `jb-*`; class, file and folder names omit the `Jb` prefix.
- Read design tokens by role, never hex values.
- Button-triggered editing opens a CDK Dialog or navigates to a screen; no inline forms in pages.
- Every interaction works with touch and with the keyboard, and colour is never the only carrier
  of a state.

The husky pre-commit hook fixes staged frontend files. To check by hand, run `npm run lint` and
`npm run format:check` in `frontend/`.

## Testing

| What | Command | Where |
|---|---|---|
| Backend tests | `pwsh eng/Test-Backend.ps1` | repository root |
| Frontend lint and format | `npm run lint` and `npm run format:check` | `frontend/` |
| Design-system copy is current | `npm run design:check` | `frontend/` |
| End-to-end type check | `npm run typecheck` | `e2e/` |
| End-to-end behaviour tests | `npm test` | `e2e/` |

- **Backend tests never use a real database.** They run on the EF Core InMemory provider
  ([ADR 0009](docs/adr/0009-tests-without-a-backend-or-database.md)).
- **End-to-end tests never reach the real backend.** Every `/api` request is answered from
  `e2e/fixtures/api/responses.json`. When an endpoint's answer changes, refresh the recording with
  `npm run record-api` in `e2e/` in the same change.
- Use the Page Object Model: selectors live in `e2e/pages/`, never in a spec.
- Run frontend tests in Chromium only.
- Do not run the sweeps (`npm run sweeps`, `npm run baseline`, `JB_SWEEPS=1` or `JB_BASELINE=1`);
  the repository owner runs them by hand
  ([ADR 0010](docs/adr/0010-behaviour-tests-only-by-default.md)). Do keep them current: give
  every new screen state its `routes.ts` entry and page-object regions.

A change is done when the behaviour specs and the backend tests pass.

## Commits and pull requests

- Branch from `main`; never commit to `main` directly.
- Keep each pull request to one concern, and each commit to one slice.
- Write commit subjects in the imperative mood, as a sentence that says what the change does
  (for example, "Add the category filter to the browse page").
- Fill in the pull request template: what changed, why, the requirement it satisfies and how it
  was tested.
- Keep the requirement, detailed design, mock, tests and code in agreement within the same pull
  request.
- CI must be green before review.

## Licensing of contributions

Jubilee is licensed under the [MIT License](LICENSE). By submitting a contribution you agree that
it is licensed under the same terms, and you confirm that you have the right to submit it.
