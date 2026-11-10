# Feature: Moderate reports and feature businesses

## Goal

A verification team member reviews reports about listings and conversations, resolves each one with a resolution note (dismiss, message the reporter or owner, place the listing on hold, or remove it), and chooses up to five businesses to feature on the browse home. Each action is authorised, audited and takes effect on the public pages.

Roles: Verification team. Journey 25 of 26 in `docs/journey.md`.

Nothing outside this journey changes. Where the code for it does not exist yet, this prompt creates it.

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- You are authorised to take this feature all the way: mocks, design-system alignment, artifact alignment, foundation, incremental implementation, progress tracking, green tests and a PR. Go through
  every phase and every slice in one continuous run. Do not pause between phases to report, ask for approval,
  or wait for "continue".
- Do not end your turn until the "Done means" list at the bottom is fully true. A partial result, a plan, or
  "the next steps would be..." is not done.
- Where the repo's instructions say "stop and ask", treat this prompt as the confirmation in advance for
  everything in scope here. Choose the simplest option that fits the existing architecture, record it (in the
  detailed design it affects, replacing the `<TO SUPPLY>` marker where there is one), and keep going.
- If a shared library, component or design asset lacks something, that is not a reason to stop. Update it
  first, as the repo's rules require, then go on.
- When a test, build or command fails, find the root cause and fix it, then go on. Never weaken a test to make
  it pass, and never skip a step quietly.
- Only stop for a real blocker you cannot resolve yourself, such as missing credentials, or an action outside
  this repo that can't be undone, such as production deploys or data changes. If that happens, finish
  everything else first, then report the blocker clearly.
- Keep track of progress (a todo list), so that nothing gets left out after context is summarised.

## Rules (read first, binding)

- Follow the repo's agent instructions exactly, especially:
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

- `docs/detailed-designs/verification/handle-reports/README.md`
- `docs/detailed-designs/verification/feature-businesses/README.md`
- `docs/detailed-designs/operations/record-audit-log/README.md`

Requirements in `docs/specs/L2.md`: `L2-063`, `L2-098`, `L2-105`, `L2-106`, `L2-133`, `L2-150`, `L2-180`.

Mocks (every state file in each folder; the full list is in `docs/mocks/manifest.json`):

- `docs/mocks/pages/admin-verifications/`

Builds on: journey 12 (Verify a listing, `docs/prompts/12-verify-a-listing.md`); journey 21 (Share or report a listing, `docs/prompts/21-share-or-report-listing.md`). If one of these is not implemented yet, build only the smallest seam this journey needs (for example seeded data or the one entity) and note it as deferred. Do not stop.

## Phase 1: Mocks (`writing-html-mocks`)
- The designs for this journey state that no mocks exist for the admin reports pages or the featured-businesses page (`/admin/featured`).
- Add them under `docs/mocks/pages/` in every state (default, loading, empty, error, busy, success, forbidden), with any dialogs under `docs/mocks/dialogs/`. Use the cast in `docs/mocks/README.md` (Miriam Castillo for staff screens). Update `docs/mocks/manifest.json`, `docs/mocks/index.html` and the coverage counts in `docs/mocks/README.md`.
- Reuse `docs/mocks/pages/admin-verifications/` as the layout neighbour.

## Phase 2: Design system alignment (`extracting-design-systems`)
- If the new mocks introduce a component, variant or state that `docs/design-system/` lacks, add it there. If they do not, change nothing.

## Phase 3: Align the artifacts (`engineering-requirements`, `writing-software-design-documents`)
- Read the sources above. The requirements, designs and mocks for this journey already exist; do not rewrite them.
- Where they disagree, or a design leaves a `<TO SUPPLY>` this journey cannot be built without, decide, then correct the artifact with the named skill: `docs/specs/L2.md` for behaviour, the design `README.md` and its PlantUML sources for structure. Re-render changed diagrams with `python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs`.
- Keep the traceability matrix in `docs/specs/L2.md` and the index in `docs/detailed-designs/README.md` true.

## Phase 4: Foundation, only if it is missing (`implementing-incrementally`)
- No application code exists in this repo at the time of writing. Check first. If the solution already exists, skip this phase and follow its conventions.
- Otherwise create the smallest skeleton the architecture baseline describes: the Angular app (`Jubilee Web`), `Jubilee.Api`, `Jubilee.Application`, `Jubilee.Domain`, `Jubilee.Infrastructure`, `Jubilee.Worker`, the database migrations, and test projects for each side. Choose current stable versions and the stack's standard test tools, since the repo states none.
- Bring in the tokens from `docs/design-system/tokens/` and build only the components this journey needs, as `docs/detailed-designs/design-system/apply-design-tokens/README.md` and `docs/detailed-designs/design-system/build-components/README.md` describe.
- Write the build, test, lint and run commands into a root `README.md`, and add a CI workflow that runs them.
- Prove the skeleton with one end-to-end test (a health endpoint reached from the app) before starting the journey.

## Phase 5: Incremental implementation (`implementing-incrementally`, test-first)
- Plan thin vertical slices, each from the Angular screen to the database. The list is a guide; where its wording and `docs/specs/L2.md` differ, the requirement wins. For example:
  1. Reports queue and report detail for listing and conversation reports.
  2. Report actions: dismiss, message reporter or owner, hold, remove; resolution note required; overdue marking; the reporter is never shown to the owner.
  3. Featured businesses: choose, order, cap at five; browse home reflects it.
  4. Audit log entries for every action.
- For each slice:
  - Write the Given-When-Then criteria, taken from the acceptance criteria of the requirements above.
  - Write the acceptance test at the level the criterion needs: API or domain tests for rules, browser tests for what the user sees. Run responsive criteria at 360, 576, 768, 992 and 1280 px, in light and dark themes.
  - Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, and refactor while the tests are green.
  - Check the screen against its mock state by state, by keyboard alone and with an automated accessibility check (WCAG 2.2 AA).
  - Run the regression checks, then commit.
- Enforce authorization, validation, rate limits and idempotency on the server for every endpoint, as the security and interaction-states designs require. The client checks are for feedback only.

## Phase 6: Progress tracking (`estimating-designs`)
- Refresh `docs/estimates/` with the `estimating-designs` skill so the percentage complete of each design this journey touched is true. Create the folder if it does not exist.
- Keep the designs and mocks aligned with what was built.

## Deferred (out of scope)
- Any moderation tooling beyond the two designs.

## Done means
- The verification team can resolve reports and control which businesses are featured.
- Every acceptance criterion of the requirements listed above has a passing test, or is listed as deferred with the reason.
- All the new and existing tests pass, using the commands in the root `README.md`.
- Docs and design artifacts agree with the code.
- The work is on a branch with a PR to `main`. Fetch and rebase onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and anything deferred.
