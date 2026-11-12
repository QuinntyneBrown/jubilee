# Feature: Finish journey 20, Manage profile and settings

## Goal

A member edits their profile, changes e-mail or password, and chooses which e-mails arrive (`frontend/projects/jubilee/src/app/pages/account`, `notification-settings`, `dialogs/change-email`, `dialogs/change-password`).

Roles: Member. Journey 20 in `docs/journey.md`, recorded at 83% complete on 12 November 2026. This prompt takes it to 100%.

What is left, from an audit of the code and its tests against the acceptance criteria:

- `L2-143` AC3: the list of the member's sessions is not built.
- `L2-143` AC1: no test that a password or e-mail change is written to the security log.
- `L2-013` AC8: pronouns are saved, with no test that copy uses them.
- `L2-196` AC7: no test that other readers never see the home church address.
- `L2-133` AC2: logging of a refused attempt is untested.
- `L2-016` AC6 and `L2-182`: the daily summary frequency is stored but nothing reads it.
- `L2-149` AC1: no promotional e-mail is sent, so the consent has nothing to govern.
- The home church API tests are named `L2_188_*`; the requirement is now `L2-196`. Rename them.
- The designs `edit-profile`, `change-credentials` and `choose-notification-settings` still say "Nothing is built yet".

The audit read test titles and spot-checked assertions. Verify each gap against the code before you plan, and treat any other acceptance criterion of the requirements below that has no implementation or no acceptance test as part of this work.

Everything already built and tested in this journey stays as it is. Nothing outside this journey changes, except the shared seam a slice needs.

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- You are authorised to take this feature all the way: requirements, detailed design, mocks and design
  system, incremental implementation, progress tracking, green tests and a PR. Go through
  every phase and every slice in one continuous run. Do not pause between phases to report, ask for approval,
  or wait for "continue".
- Do not end your turn until the "Done means" list at the bottom is fully true. A partial result, a plan, or
  "the next steps would be..." is not done.
- Where the repo's instructions say "stop and ask", treat this prompt as the confirmation in advance for
  everything in scope here. Choose the simplest option that fits the existing architecture, record it (an ADR
  in `docs/adr/`, numbered after the last one, and the detailed design it affects, replacing the
  `<TO SUPPLY>` marker where there is one), and keep going.
- If a shared library, component or design asset lacks something, that is not a reason to stop. Update it
  first, as the repo's rules require, then go on.
- When a test, build or command fails, find the root cause and fix it, then go on. Never weaken a test to make
  it pass, and never skip a step quietly.
- Only stop for a real blocker you cannot resolve yourself, such as missing credentials, or an action outside
  this repo that can't be undone, such as production deploys or data changes. If that happens, finish
  everything else first, then report the blocker clearly.
- Keep track of progress (a todo list), so that nothing gets left out after context is summarised.

## Rules (read first, binding)

- Follow `AGENTS.md` at the repository root exactly, especially:
  - The mission in `docs/specs/L0.md` is the motive of every change. Quote it word for word. Frame every line
    of copy from `docs/scripture.md`.
  - Every change to production behaviour has a requirement (`docs/specs/L2.md`), a detailed design
    (`docs/detailed-designs/`) and a mock (`docs/mocks/`) before any code. Use the words those documents use.
  - Incremental implementation with ATDD is mandatory: invoke the `implementing-incrementally` skill before
    any code, and see each acceptance test fail for the expected reason before writing production code.
  - Backend: the strict layer direction, business rules in handlers and domain services, errors as
    ProblemDetails with a `code`, owned data scoped to its owner, endpoints authenticated by default.
  - Backend tests never use a real database (ADR 0009): the EF Core InMemory provider only. Add API
    integration tests in `backend/tests/Jubilee.Api.Tests/`, following the existing fixtures.
  - E2e tests never run the real backend (ADR 0009): every `/api/**` request is answered from
    `e2e/fixtures/api/responses.json` or a stub in `e2e/fixtures/stubs.ts`. When an endpoint's answer changes,
    refresh the recording with `npm run record-api` in `e2e/` against `pwsh eng/Start-E2eApi.ps1`.
  - Page Object Model: selectors live in `e2e/pages/`, never in a spec. Specs import `test` and `expect` from
    `e2e/fixtures/jb-test.ts`. Chromium only.
  - Never run the sweeps (ADR 0010): nothing that sets `JB_SWEEPS=1` or `JB_BASELINE=1`, no `npm run sweeps`,
    no `npm run baseline`. Still give every new screen state its `e2e/fixtures/routes.ts` entry and page-object
    regions. `npm run parity` is not a sweep; run it.
  - Presentation lives in `frontend/projects/components` only (ADR 0035): pages and dialogs compose `jb-*`
    components and have no stylesheet. A component is `name.ts` + `name.html` + `name.scss`, BEM, tokens by
    role. Every new component gets a parity spec in `e2e/tests/parity/` (ADR 0036).
  - No inline forms in pages: editing opens a CDK Dialog or navigates to a screen. Pages depend on the API
    contract's injection token, not the implementation.
  - Every interaction works by touch on a phone and by keyboard on a desktop; colour is never the only carrier
    of a state.
  - Never write architecture tests, and never write tests for mocks or the design system.
  - Jubilee takes no payment. Do not add carts, checkout or payment.
  - Prefer the platform's best practice (ADR 0035). A departure needs an ADR that gives its reason.
- Work through the phases below **in order**, using the repo skill each phase names.
- Copy the house style of each folder. Read the existing neighbours before you write anything new.
- Read `CONTRIBUTING.md` for commits and pull requests, and fill in `.github/PULL_REQUEST_TEMPLATE.md`.

## Sources for this journey

Detailed designs (read each `README.md` and its `diagrams/`):

- `docs/detailed-designs/accounts/edit-profile/README.md`
- `docs/detailed-designs/accounts/change-credentials/README.md`
- `docs/detailed-designs/accounts/choose-notification-settings/README.md`

Requirements in `docs/specs/L2.md` (those the designs cite, and those the gaps name): `L2-013`, `L2-014`, `L2-015`, `L2-016`, `L2-019`, `L2-068`, `L2-118`, `L2-126`, `L2-133`, `L2-134`, `L2-140`, `L2-143`, `L2-145`, `L2-149`, `L2-182`, `L2-196`.

Mocks (every state file in each folder; the full list is in `docs/mocks/manifest.json`):

- `docs/mocks/pages/account/`
- `docs/mocks/pages/preferences/`
- `docs/mocks/pages/confirm-email-change/`
- `docs/mocks/dialogs/change-email/`
- `docs/mocks/dialogs/change-password/`

Decisions already recorded: `docs/adr/0028-manage-profile-and-settings-decisions.md`, `docs/adr/0041-remove-church-reference-and-add-home-church-address.md`.

Code and tests that exist today:

- `e2e/tests/account.spec.ts`, `e2e/pages/account.page.ts`, `notification-settings.page.ts`
- `backend/tests/Jubilee.Api.Tests/AccountSettingsTests.cs`, `AccountSettingsTests.Credentials.cs`, `AccountSettingsTests.Preferences.cs`

Progress notes: `docs/estimates/accounts.md`.

Builds on: journey 17 (Stay notified) for the daily summary job and the promotional e-mails; journey 5 (Sign in and out) for "Sign out of other devices". If the seam this journey needs from another journey is missing, build only that seam and note it. Do not stop.

## Phase 1: Requirements (`engineering-requirements`)

- Read the sources above. The requirements for this journey exist; do not rewrite or renumber them.
- For each gap, find its acceptance criteria in `docs/specs/L2.md`. Where a criterion is silent, vague or contradicts what was decided since, correct it with the skill. A new requirement takes the next free number (`L2-219` at the time of writing; check first) and traces to its L1 requirement.
- Keep the traceability matrix in `docs/specs/L2.md` true.

## Phase 2: Detailed design and decisions (`writing-software-design-documents`)

- Bring each design listed above in line with the code as built and with what this prompt adds: classes, endpoints, events and jobs by the names the code uses. Several designs still describe names that were never built; correct them.
- Re-render changed diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs`.
- Record each decision this prompt forces in a new ADR in `docs/adr/` (after `0044`; check the folder and its `README.md` index), or amend the journey's own ADR where the decision reverses a deferral it made.

## Phase 3: Mocks and design system (`writing-html-mocks`, `extracting-design-systems`)

- Mock the session list on the account page: this device marked, the others with when they were last used, its empty, loading and error states, and ending one session.
- A new or changed component is documented in `docs/design-system/` and registered there before it is built in `frontend/projects/components`. Run `npm run design:check` in `frontend/`.
- If the Magic Patterns reference in `docs/design-reference/magic-patterns/` shows the state, it trumps the mock.

## Phase 4: Incremental implementation (`implementing-incrementally`, test-first)

- Plan thin vertical slices. The list is a guide; where its wording and `docs/specs/L2.md` differ, the requirement wins. For example:
  1. The session list, and ending one session.
  2. Security-log tests for the password and e-mail changes and for a refused attempt.
  3. Pronouns used in the copy that names the member; the home church address never served to another reader.
  4. The daily summary honoured (with journey 17).
  5. Rename the `L2_188_*` home church tests to `L2_196_*`.
- For each slice:
  - Write the Given-When-Then criteria, taken from the acceptance criteria of the requirements above.
  - Write the acceptance test: an integration test against the API in `backend/tests/Jubilee.Api.Tests/`
    (or `backend/tests/Jubilee.Worker.Tests/` for a job) for rules, and a Playwright spec in `e2e/tests/`
    with its page object in `e2e/pages/` for what the user sees.
  - Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, and refactor while the tests are green.
  - Run the regression checks, then commit.
- Enforce authorization, validation, rate limits and idempotency on the server for every endpoint. The
  client checks are for feedback only.
- A slice that only adds a missing test to behaviour that already works still starts red: prove the test
  can fail (for example against a stubbed wrong answer) before you rely on it.

## Phase 5: Progress tracking (`estimating-designs`)

- Rescore each design above in `docs/estimates/accounts.md` from the code and its tests, rewrite the notes under the tables so they list only what is truly left, and recompute `docs/estimates/README.md`.
- Set the Complete figure of row 20 in `docs/journey.md` to the effort-weighted average of its designs, and recompute the total line.
- Keep the requirements, designs, mocks and design system aligned with what was built.

## Deferred (out of scope)

- Download data and delete account (journey 26).

## Done means

- A member sees where they are signed in and can end any session, and every profile and settings criterion has a passing test.
- Every acceptance criterion of the requirements listed above has a passing test, or is listed as an owner step with the reason.
- All the new and existing tests pass: `pwsh eng/Test-Backend.ps1` at the root; `npm run lint`, `npm run format:check`, `npm run design:check` and `npm run build` in `frontend/`; `npm run typecheck`, `npm test` and `npm run parity` in `e2e/`. No sweep was run.
- `docs/estimates/` and row 20 of `docs/journey.md` show the true figures, and the requirements, designs, mocks and code agree.
- The work is on a branch with a PR to `main`, following `CONTRIBUTING.md` and the pull request template. Fetch and rebase onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and anything deferred.
