# Feature: Finish journey 30, Work in the admin application

## Goal

Staff sign in to the admin application through single sign-on from an allowed network, work in its shell and sign out; old admin links in the app point there (`frontend/projects/admin/src/app/`, `frontend/projects/jubilee/src/app/pages/admin-moved`; ADR 0040).

Roles: Verification team, Administrator. Journey 30 in `docs/journey.md`, recorded at 92% complete on 12 November 2026. This prompt takes it to 100%.

What is left, from an audit of the code and its tests against the acceptance criteria:

- `L2-188` AC1 and `L2-195` AC3: hosting at `admin.jubilee.to` is an owner step (`eng/azure/README.md`, `eng/azure/create-admin.sh`).
- `L2-189`: the identity provider registration and its conditional access are owner steps; the real provider is not exercised by any test (`StaffIdentityClientTests` uses a stand-in).
- `L2-192` AC5: the host's access restrictions are an owner step; the API restriction is tested.
- `L2-188` AC6: the sweeps for the admin screens are written and not run (the owner's).
- `L2-098` AC4 and `L2-180`: a role change by `jubilee staff` writes no audit record.
- Check every criterion of `L2-188` to `L2-195` for a test and close what you find.

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

- `docs/detailed-designs/admin/run-admin-application/README.md`
- `docs/detailed-designs/accounts/sign-in-as-staff/README.md`
- `docs/detailed-designs/security/authorize-staff-requests/README.md`
- `docs/detailed-designs/security/restrict-staff-network/README.md`

Requirements in `docs/specs/L2.md` (those the designs cite, and those the gaps name): `L2-098`, `L2-133`, `L2-180`, `L2-188`, `L2-189`, `L2-190`, `L2-191`, `L2-192`, `L2-193`, `L2-194`, `L2-195`.

Mocks (every state file in each folder; the full list is in `docs/mocks/manifest.json`):

- `docs/mocks/pages/admin-shell/`
- `docs/mocks/pages/admin-sign-in/`
- `docs/mocks/pages/admin-moved/`

Decisions already recorded: `docs/adr/0040-separate-admin-application.md`.

Code and tests that exist today:

- `e2e/tests/admin-application.spec.ts`, `admin-moved.spec.ts`, `e2e/pages/admin-shell.page.ts`, `admin-sign-in.page.ts`
- `backend/tests/Jubilee.Api.Tests/StaffSignInTests.cs`, `StaffAccessTests.cs`, `NetworkRestrictionTests.cs`
- `backend/tests/Jubilee.Cli.Tests/StaffCommandTests.cs`
- `eng/azure/README.md`, `eng/azure/create-admin.sh`, `.github/workflows/deploy.yml`

Progress notes: `docs/estimates/admin.md`, `docs/estimates/accounts.md`, `docs/estimates/security.md`.

## Phase 1: Requirements (`engineering-requirements`)

- Read the sources above. The requirements for this journey exist; do not rewrite or renumber them.
- For each gap, find its acceptance criteria in `docs/specs/L2.md`. Where a criterion is silent, vague or contradicts what was decided since, correct it with the skill. A new requirement takes the next free number (`L2-219` at the time of writing; check first) and traces to its L1 requirement.
- Keep the traceability matrix in `docs/specs/L2.md` true.

## Phase 2: Detailed design and decisions (`writing-software-design-documents`)

- Bring each design listed above in line with the code as built and with what this prompt adds: classes, endpoints, events and jobs by the names the code uses. Several designs still describe names that were never built; correct them.
- Re-render changed diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs`.
- Record each decision this prompt forces in a new ADR in `docs/adr/` (after `0044`; check the folder and its `README.md` index), or amend the journey's own ADR where the decision reverses a deferral it made.

## Phase 3: Mocks and design system (`writing-html-mocks`, `extracting-design-systems`)

- No gap in this journey shows a new screen state. Confirm that by checking each gap against the mocks above; if one does have a visible result with no mock, add the mock state and its design-system entry before the code.
- A new or changed component is documented in `docs/design-system/` and registered there before it is built in `frontend/projects/components`. Run `npm run design:check` in `frontend/`.
- If the Magic Patterns reference in `docs/design-reference/magic-patterns/` shows the state, it trumps the mock.

## Phase 4: Incremental implementation (`implementing-incrementally`, test-first)

- Plan thin vertical slices. The list is a guide; where its wording and `docs/specs/L2.md` differ, the requirement wins. For example:
  1. The audit record for `jubilee staff grant` and `revoke`.
  2. Any admin criterion found without a test.
  3. `eng/azure/create-admin.sh` and the README give the owner one ordered checklist, each step with the command and how to check it worked.
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

- Rescore each design above in `docs/estimates/admin.md`, `docs/estimates/accounts.md`, `docs/estimates/security.md` from the code and its tests, rewrite the notes under the tables so they list only what is truly left, and recompute `docs/estimates/README.md`.
- Set the Complete figure of row 30 in `docs/journey.md` to the effort-weighted average of its designs, and recompute the total line.
- Keep the requirements, designs, mocks and design system aligned with what was built.

## Owner steps (outside an agent's reach)

These need the repository owner. Prepare everything in the repository that they depend on, write the steps where the owner will find them, and list them in your final summary. Do not score a criterion as done while its owner step is open.

- Create the admin application's host and bind `admin.jubilee.to` (`eng/azure/create-admin.sh`).
- Register the application with the identity provider and require a second factor.
- Set the allowed networks on the host.
- Sign in once against production and record the check in `eng/azure/README.md`.
- Run the sweeps by hand.

## Deferred (out of scope)

- The verification, moderation and policy screens themselves (journeys 12, 25 and 22).

## Done means

- Every staff criterion that code can meet has a passing test, role changes are audited, and the owner has one checklist for the hosting steps that remain.
- Every acceptance criterion of the requirements listed above has a passing test, or is listed as an owner step with the reason.
- All the new and existing tests pass: `pwsh eng/Test-Backend.ps1` at the root; `npm run lint`, `npm run format:check`, `npm run design:check` and `npm run build` in `frontend/`; `npm run typecheck`, `npm test` and `npm run parity` in `e2e/`. No sweep was run.
- `docs/estimates/` and row 30 of `docs/journey.md` show the true figures, and the requirements, designs, mocks and code agree.
- The work is on a branch with a PR to `main`, following `CONTRIBUTING.md` and the pull request template. Fetch and rebase onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and anything deferred.
