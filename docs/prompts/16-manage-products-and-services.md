# Feature: Manage products and services

## Goal

An owner keeps their catalogue current: they list their products and services, add or edit one in an editor dialog, reorder them, mark a product sold out, and delete one after confirming. Changes appear on the public listing.

Roles: Owner. Journey 16 of 26 in `docs/journey.md`.

Nothing outside this journey changes. Where the code for it does not exist yet, this prompt creates it.

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- You are authorised to take this feature all the way: artifact alignment, foundation, incremental implementation, progress tracking, green tests and a PR. Go through
  every phase and every slice in one continuous run. Do not pause between phases to report, ask for approval,
  or wait for "continue".
- Do not end your turn until the "Done means" list at the bottom is fully true. A partial result, a plan, or
  "the next steps would be..." is not done.
- Where the repo's instructions say "stop and ask", treat this prompt as the confirmation in advance for
  everything in scope here. Choose the simplest option that fits the existing architecture, record it (an ADR in
  `docs/adr/`, and the detailed design it affects, replacing the `<TO SUPPLY>` marker where there is one),
  and keep going.
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
  - The repository layout: `backend/` (.NET solution), `frontend/` (Angular workspace with the `jubilee`,
    `api` and `components` projects), `e2e/` (Playwright), `eng/` (scripts). Put new code where it says.
  - The strict backend layer direction, and business rules in handlers and domain services, not controllers.
  - Frontend conventions: `jb-*` selectors, API services behind a contract and injection token, no inline
    forms in pages (CDK Dialog or a screen), route data driving the shell.
  - Incremental implementation with ATDD is mandatory. Back end: integration tests against the API. Front
    end: Playwright with the Page Object Model, Chromium only. Tests never need a database server.
  - Never write architecture tests, and never write tests for mocks or the design system.
  - Requirements come before code. `docs/specs/L2.md` is the source of truth for behaviour; every acceptance
    criterion of the requirements listed below becomes an acceptance test.
  - Mocks come before frontend code. `docs/mocks/` is the design reference: the Angular app keeps the mocks'
    BEM classes, accessible state semantics and copy. Build every state the mocks show.
  - All colours, sizes and durations come from the tokens in `docs/design-system/tokens/`. Reuse the
    components in `docs/design-system/components/`; extend the system, never fork it per screen.
  - Follow the architecture baseline in `docs/detailed-designs/README.md` (Angular `Jubilee Web`, ASP.NET Core
    `Jubilee API`, `Jubilee Worker`, SQL Server, Redis) and the class and endpoint names the designs introduce.
  - The cross-cutting designs bind every screen and endpoint: `docs/detailed-designs/accessibility/`, `docs/detailed-designs/design-system/`, `docs/detailed-designs/interaction-states/`, `docs/detailed-designs/responsive-design/`, `docs/detailed-designs/security/`, `docs/detailed-designs/privacy/`, `docs/detailed-designs/performance/`, `docs/detailed-designs/operations/`.
  - Jubilee takes no payment. Do not add carts, checkout or payment.
- Work through the phases below **in order**, using the repo skill each phase names.
- Copy the house style of each folder. Read the existing neighbours before you write anything new.


## Sources for this journey

Detailed designs (read each `README.md` and its `diagrams/`):

- `docs/detailed-designs/owner-workspace/manage-products/README.md`
- `docs/detailed-designs/owner-workspace/manage-services/README.md`
- `docs/detailed-designs/interaction-states/confirm-in-dialogs/README.md`

Requirements in `docs/specs/L2.md`: `L2-089`, `L2-090`, `L2-091`, `L2-092`, `L2-093`, `L2-094`, `L2-095`, `L2-127`, `L2-128`, `L2-129`, `L2-130`, `L2-132`, `L2-133`.

Mocks (every state file in each folder; the full list is in `docs/mocks/manifest.json`):

- `docs/mocks/pages/my-products/`
- `docs/mocks/pages/my-services/`
- `docs/mocks/dialogs/product-editor/`
- `docs/mocks/dialogs/service-editor/`
- `docs/mocks/dialogs/delete-product/`
- `docs/mocks/dialogs/delete-service/`

Builds on: journey 10 (List a business, `docs/prompts/10-list-a-business.md`); journey 15 (Run a business listing, `docs/prompts/15-run-a-business-listing.md`). If one of these is not implemented yet, build only the smallest seam this journey needs (for example seeded data or the one entity) and note it as deferred. Do not stop.

## Phase 1: Align the artifacts (`engineering-requirements`, `writing-software-design-documents`)
- Read the sources above. The requirements, designs and mocks for this journey already exist; do not rewrite them.
- Where they disagree, or a design leaves a `<TO SUPPLY>` this journey cannot be built without, decide, then correct the artifact with the named skill: `docs/specs/L2.md` for behaviour, the design `README.md` and its PlantUML sources for structure. Re-render changed diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs`.
- Keep the traceability matrix in `docs/specs/L2.md` and the index in `docs/detailed-designs/README.md` true.

## Phase 2: Foundation, only if it is missing (`implementing-incrementally`)
- No application code exists in this repo at the time of writing. Check first. If the solution already exists, skip this phase and follow its conventions.
- Otherwise create the smallest skeleton of the layout in `AGENTS.md`: `backend/Jubilee.sln` with `Jubilee.Domain`, `Jubilee.Application`, `Jubilee.Infrastructure`, `Jubilee.Api`, `Jubilee.Worker` and `Jubilee.Cli` under `backend/src/` and their test projects under `backend/tests/`; the Angular workspace in `frontend/` with the `jubilee`, `api` and `components` projects; the Playwright suite in `e2e/` with `fixtures/jb-test.ts`, `fixtures/routes.ts`, `pages/` and `tests/`; and the scripts in `eng/` (`Test-Backend.ps1`, `Start-E2eApi.ps1`, `Start-FreshStack.ps1`). Choose current stable versions.
- Start `docs/adr/` with a `README.md` index and one ADR per decision the skeleton forces.
- Bring in the tokens from `docs/design-system/tokens/` and build only the `jb-*` components this journey needs in `frontend/projects/components/`, as `docs/detailed-designs/design-system/apply-design-tokens/README.md` and `docs/detailed-designs/design-system/build-components/README.md` describe.
- Replace the placeholder text in the "Getting started" and "Running the tests" sections of the root `README.md` with the real setup and development commands, update its status note, and add `.github/workflows/ci.yml` that runs the backend tests, the frontend lint and format checks, and the Playwright suite.
- Prove the skeleton with one Playwright test that loads the app with every API request answered by Playwright API mocking (ADR 0009; no API or database runs in a test), before starting the journey.

## Phase 3: Incremental implementation (`implementing-incrementally`, test-first)
- Plan thin vertical slices, each from the Angular screen to the database. The list is a guide; where its wording and `docs/specs/L2.md` differ, the requirement wins. For example:
  1. Products list: loading, empty and error states; table becomes cards on small screens.
  2. Product editor: add and edit with validation, photos and stock.
  3. Delete a product with confirmation and undo.
  4. Services list and service editor (action type, duration, price).
  5. Delete a service; rules when open requests refer to it.
  6. Reorder products and services by drag and by keyboard.
- For each slice:
  - Write the Given-When-Then criteria, taken from the acceptance criteria of the requirements above.
  - Write the acceptance test: an integration test against the API in `backend/tests/Jubilee.Api.Tests/` for rules, and a Playwright spec in `e2e/tests/` with its page object in `e2e/pages/` for what the user sees. Run responsive criteria at 360, 576, 768, 992 and 1280 px, in light and dark themes.
  - Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, and refactor while the tests are green.
  - Check the screen against its mock state by state with the visual specs in `e2e/tests/visual/`, by keyboard alone and with an automated accessibility check (WCAG 2.2 AA).
  - Run the regression checks, then commit.
- Enforce authorization, validation, rate limits and idempotency on the server for every endpoint, as the security and interaction-states designs require. The client checks are for feedback only.

## Phase 4: Progress tracking (`estimating-designs`)
- Refresh `docs/estimates/` with the `estimating-designs` skill so the percentage complete of each design this journey touched is true. Create the folder if it does not exist.
- Keep the designs and mocks aligned with what was built.

## Deferred (out of scope)
- Listing details and photos (journey 21).

## Done means
- An owner can create, change, reorder and remove products and services, and the public listing follows.
- Every acceptance criterion of the requirements listed above has a passing test, or is listed as deferred with the reason.
- All the new and existing tests pass: `pwsh eng/Test-Backend.ps1`, `npm run lint` and `npm run format:check` in `frontend/`, and the Playwright suite in `e2e/`.
- Docs and design artifacts agree with the code.
- The work is on a branch with a PR to `main`. Fetch and rebase onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and anything deferred.
