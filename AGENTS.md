## Mission

> Jubilee helps Christian business owners in Toronto do well in business and use what they earn to
> support God's work. We do this because we love Jesus and stay close to Him.

This is Jubilee's mission and its single L0 requirement (`docs/specs/L0.md`). It is the motive of
everything: every requirement, design, mock, line of code and line of copy points back to it.
Quote it word for word, never paraphrased. Before adding or changing anything, ask how it serves
the mission; if it does not, do not build it, and if a request works against it, say so.

The mission is grounded in Scripture. `docs/scripture.md` holds the passages it rests on, what
each asks of Jubilee's content, and what Jubilee never says. Frame every line of copy (app,
marketing site, e-mail, pitch) from it, and quote Scripture word for word with its reference.

## Project overview

Jubilee is Toronto's Christian marketplace: a directory of Christian-owned businesses
where members find a business, message it, book a meeting, ask for a quote or request a product,
and the business confirms or declines. Jubilee takes no payment between members and businesses;
members pay the business directly. The one thing Jubilee sells is its own merchandise, the
Purpose Tee (L1-034, ADR 0073). The .NET backend owns accounts, listings, requests, messaging, notifications and
moderation; the Angular frontend provides the app, and Playwright covers behaviour (and, run by
hand, visual parity with the design reference).

The mission is in `docs/specs/L0.md`. Roles, requirements and the journeys to build are in
`docs/specs/L1.md` (each traces to L0-001), `docs/specs/L2.md` and `docs/journey.md`. Use the words those documents use in code, docs and UI; do not invent synonyms.

The first journey (discover businesses) is implemented and created the layout below; every later
feature follows it. `docs/estimates/` tracks how far each design is.

## Prefer best practice

Where there is more than one way to build something, choose the established best practice of the
platform (Angular, .NET, Playwright, WCAG) over the expedient one (ADR 0035). A departure needs
an ADR that gives its reason. If a rule in this file or in an ADR conflicts with best practice,
say so and propose the correction; do not work around it silently.

## Repository layout

- `backend/` — .NET solution
- `frontend/` — Angular workspace (`jubilee`, `marketing`, `admin`, `api`, `components`)
- `e2e/` — Playwright suite
- `docs/assets/` — the logo (`jubilee-icon.svg`) and other images the docs share
- `docs/mocks/` — static design reference (the source of truth for the UI)
- `docs/design-reference/magic-patterns/` — captures of the Magic Patterns design the mocks are
  drawn from; it trumps the mocks
- `docs/design-system/` — tokens, foundations, components and patterns extracted from the mocks
- `docs/specs/` — requirements (`L0.md` the mission, `L1.md` high level, `L2.md` detailed with
  acceptance criteria)
- `docs/detailed-designs/` — per-feature designs derived from the requirements
- `docs/adr/` — architecture decisions; read relevant ADRs before changing the areas they cover
- `docs/estimates/` — effort and percent complete per design
- `docs/audits/` — audits of the codebase against its rules, each with the fixes it calls for
- `docs/scripture.md` — the passages the mission and all of Jubilee's content are framed from
- `docs/elevator-pitch.md` — the first-contact pitch for Christian business people
- `docs/personas/` — invented people in Toronto who come across Jubilee, one folder each: who they
  are, their onboarding and profile journeys, and their feedback
- `docs/journey.md`, `docs/prompts/` — the user journeys and one implementation prompt per journey
- `eng/` — local engineering scripts (`Test-Backend.ps1`, `Start-E2eApi.ps1`, `Start-FreshStack.ps1`)
- `eng/azure/` — how Jubilee is hosted on Azure and the script that deploys it (see its `README.md`)
- `docs/videos/` — narrated videos, one folder each; `tools/` holds the scripts that build them
  (see `docs/videos/README.md`)

```
jubilee/
├── AGENTS.md
├── README.md                          setup and development commands
├── backend/
│   ├── Jubilee.sln
│   ├── Directory.Build.props
│   ├── Directory.Packages.props
│   ├── global.json
│   ├── src/
│   │   ├── Jubilee.Domain/
│   │   ├── Jubilee.Application/
│   │   ├── Jubilee.Infrastructure/
│   │   ├── Jubilee.Api/
│   │   ├── Jubilee.Worker/
│   │   └── Jubilee.Cli/
│   └── tests/
│       ├── Jubilee.Api.Tests/
│       ├── Jubilee.Application.Tests/
│       ├── Jubilee.Infrastructure.Tests/
│       ├── Jubilee.Worker.Tests/
│       └── Jubilee.Cli.Tests/
├── frontend/
│   ├── angular.json
│   ├── package.json
│   ├── eslint.config.js
│   ├── .prettierrc
│   └── projects/
│       ├── jubilee/src/app/           the app
│       │   ├── app.config.ts          composition root
│       │   ├── app.routes.ts
│       │   ├── pages/                 one folder per screen
│       │   ├── dialogs/               CDK dialogs
│       │   ├── guards/
│       │   └── toasts/
│       ├── api/src/lib/               service contracts, implementations, view models, helpers
│       │   ├── api/
│       │   └── models/
│       ├── components/src/lib/        every `jb-*` presentation component, one folder each, plus `styles/`
│       ├── marketing/src/app/         the marketing site: one page, one folder per section
│       └── admin/src/app/             the admin application: the Jubilee team's screens (ADR 0040, 0057)
├── e2e/
│   ├── playwright.config.ts
│   ├── fixtures/                      `jb-test.ts`, `routes.ts`, data fixtures
│   ├── pages/                         one page object per screen or dialog
│   └── tests/                         specs, with `visual/` for mock parity
├── eng/
├── docs/
└── .github/workflows/                 `ci.yml`, `deploy.yml`
```

See `README.md` for setup and development commands.

## Backend architecture

Layer dependency direction (strict):

- `Jubilee.Domain` — entities + enums, zero deps
- `Jubilee.Application` — MediatR handlers, validators, DTO contracts, `IAppDbContext`
- `Jubilee.Infrastructure` — `AppDbContext`, EF configurations and migrations, SQL Server / SQLite, auth services
- `Jubilee.Api` — controllers, `Program.cs`, DI composition, Swagger, middleware
- `Jubilee.Worker` — background jobs, outbox dispatch, e-mail sending, search indexing
- `Jubilee.Cli` — `jubilee migrate` / `seed` / `reset`

Non-obvious rules:

- Business rules live in handlers/domain services, not controllers.
- The API does **not** apply EF migrations on startup. Run `jubilee migrate` explicitly. SQLite
  (the e2e API) and InMemory (tests) have no migrations: the schema comes from the model.
- Seed data is idempotent and safe to re-run.
- Endpoints require authentication by default (fallback policy). Preserve intentional
  `[AllowAnonymous]` access and keep Swagger above `UseAuthentication` when changing API auth.
- Keep request logging outside the exception-handling middleware so handled response statuses
  are logged correctly.
- Owned data must stay scoped to its owner: a member sees and changes only their own data, an
  owner only their own listings, and only the Jubilee team reaches the admin endpoints.
- Errors are ProblemDetails with a `code` extension where a client needs to branch on them.

### Tests

**Mandatory (ADR 0009): backend tests SHALL NOT use a real database.** Every backend test runs on
the EF Core InMemory provider (`Database:Provider=InMemory`, one store per fixture). No test opens
SQLite, LocalDB, SQL Server or a database file. Inject database faults through `IAppDbContext`.
API tests run sequentially (`xunit.runner.json`). Follow the existing test-project patterns when
adding coverage; `pwsh eng/Test-Backend.ps1` runs the suite as CI does.

## Frontend architecture

Workspace has five projects under `frontend/projects/`: `jubilee` (the app), `marketing` (the
public marketing site: one page, no router or session; ADR 0013; while Jubilee is launching soon
it sends two forms to `/api/launch` and links nowhere outside itself, ADR 0044), `admin` (the admin
application at `admin.jubilee.to`: staff sign-in and the Jubilee team's screens, with a staff
session of its own; ADR 0040), `api` (service contracts, implementations, view models, pure
helpers) and `components` (`jb-*` UI atoms, the design system).

### Conventions enforced across the codebase

- Prettier (`frontend/.prettierrc`) owns formatting and angular-eslint (`frontend/eslint.config.js`)
  owns lint; CI fails on either. Run `npm run lint` and `npm run format:check` in `frontend/`. The
  husky pre-commit hook fixes staged frontend files.
- Component selectors use `jb-*`; TypeScript class, file, and folder names omit the `Jb` prefix.
- **Presentation lives in `components` only** (ADR 0035). Every presentation component is built
  in the `components` library and imported by `jubilee`, `marketing` and `admin`. An application project
  declares pages, dialogs and its root as containers that compose `jb-*` components; it declares
  no presentation component, no hand-written button, field, alert or dialog frame, no inline
  `style` and no stylesheet. The only classes an application template writes are the layout and
  text utilities (`stack`, `cluster`, `split`, `form-grid`, `container`, `visually-hidden`,
  `truncate`, `text-muted`, `text-caption`, `only-*`).
- **File per type, no single-file components** (ADR 0008, ADR 0035). A library component is
  `name.ts` + `name.html` + `name.scss` using `templateUrl`/`styleUrl`; never an inline `template`
  or `styles`, however short. A page or dialog in an application project is `name.ts` +
  `name.html` and has no stylesheet.
- **One encapsulated stylesheet per component, named with BEM** (ADR 0035). `name.scss` holds
  every rule of its component and nothing else, under Angular's default encapsulation (never
  `ViewEncapsulation.None`). The component is the block, named as in the design system; parts
  are `block__element`, variants are `block--modifier`; a state assistive technology must know is
  an attribute (`aria-current`, `aria-invalid`, `disabled`) and is styled through it. A
  stylesheet never styles another component's block. When a component lands, its rules leave
  the global `ui.css` or `marketing.css` in the same change.
- Components preserve the mock design's BEM classes and accessible state semantics; e2e locators
  depend on that parity.
- Global styles are foundations only: tokens, `@font-face`, the reset and the layout and text
  utilities.
- Read design tokens by role, never hex values; the token set lives in `components`.
  Component-scoped knobs keep the `--jb-` prefix.
- **Fonts are bundled, never left to the system.** Archivo, the display face, is one variable
  WOFF2 at `docs/design-system/assets/fonts/Archivo.woff2`, declared by the `@font-face` in
  `tokens.css` with its weight (400–900) and width (62–125%) ranges. Keep that rule and that file:
  without them Windows substitutes Segoe UI and headings and the wordmark render far heavier than
  the design reference. Do not replace the file with one that lacks the width axis (the copy in
  `docs/videos/assets/` is weight-only). The app self-hosts the same file.
- Inter, the text face, is bundled for the marketing site and the pitch film only
  (`docs/design-system/assets/fonts/Inter.woff2`, declared by `marketing.css` and `pitch.css`). The
  site's copy is `components/src/lib/assets/fonts/Inter.woff2`, declared by the marketing
  foundations, `components/src/lib/styles/marketing.css`: the `@font-face`, the page's custom
  properties and its reset, and no component rule. The app still falls back to the system face. Their photos are in `docs/assets/photos/`.
- **The wordmark is lowercase "jubilee" in Archivo bold (700) at 110% width with −0.03em
  tracking**, read from `--font-weight-bold`, `--font-stretch-wide` and `--letter-spacing-tighter`.
  It matches the Magic Patterns design reference; never set it at 800 or in a fallback face.
- **Declare each `ng-content` slot once.** A component that renders `<a>` or `<button>` by
  condition puts its slots in one `<ng-template>` and renders it with `ngTemplateOutlet` in both
  branches; slots repeated per `@if` branch project into one branch only. On the consumer side, a
  `@if` wrapping several `[slot=…]` nodes loses the slot (NG8011): one `@if` per node.
- API services have a contract and injection token; app pages depend on the token, not the
  concrete implementation. `app.config.ts` is the composition root.
- **No inline forms in pages.** Button-triggered editing always opens a CDK Dialog
  (`frontend/projects/jubilee/src/app/dialogs/`) or navigates to a screen.
- Use Angular CDK Dialog/Overlay for modal behaviour; don't hand-roll modals.
- Route data drives the shell: `shell` (`app` | `bare`) picks the chrome, `page` is stamped on
  `<body data-page>` and is the e2e anchor for every screen.
- Every interaction must work with touch on a phone and with the keyboard on a desktop; colour is
  never the only carrier of a state (text, icon or accessible name says it too).

## E2E architecture (Playwright)

- **Mandatory (ADR 0009): e2e tests SHALL NOT execute the real backend or a database.** Every
  `/api/**` request is answered with Playwright API mocking (`page.route`), installed for every
  page by `e2e/fixtures/jb-test.ts` from the recorded answers in `e2e/fixtures/api/responses.json`;
  a request without an answer fails the test. States the recording lacks are stubbed in
  `e2e/fixtures/stubs.ts`. When an endpoint's answer changes, refresh the recording with
  `npm run record-api` in `e2e/` (against `eng/Start-E2eApi.ps1`) in the same change; recording is
  maintenance, never part of a test run.
- Page Object Model: one page object per screen under `e2e/pages/`, owning the selectors and the
  interactions. Tests state intent; page objects know the DOM. Never put a selector in a test.
- Specs import `test` and `expect` from `e2e/fixtures/jb-test.ts`; routes are keyed in
  `e2e/fixtures/routes.ts` so one spec serves the mocks (`JB_BASELINE=1`) and the app.
- **Mandatory (ADR 0010): only behaviour Playwright tests run.** `npm test` and CI run the
  behaviour specs and nothing else. The sweeps, visual parity (`e2e/tests/visual/`), responsive
  fit (`responsive.spec.ts`) and automated accessibility (`accessibility.spec.ts`), are still
  written and kept current: give every new screen state its `routes.ts` entry and page-object
  regions, and add a sweep where a requirement calls for one. **Never run them**: no agent or CI
  job runs `npm run sweeps`, `npm run baseline` or anything that sets `JB_SWEEPS=1` or
  `JB_BASELINE=1`; only the repository owner runs them, by hand. Done means the behaviour specs
  pass, not the sweeps.
- **Component parity (ADR 0036).** Every component of the `components` library has a spec in
  `e2e/tests/parity/`, built with `e2e/fixtures/parity.ts`, that compares its region in the app
  with the mock (360 px and 1280 px, both themes, 1 %) and with the Magic Patterns reference in
  `docs/design-reference/magic-patterns/` (3 %). `npm run parity` runs these specs and nothing
  else; agents and CI run it. It is not a sweep: it never sets `JB_SWEEPS` or `JB_BASELINE`.
- Visual regression compares the app to `docs/mocks` region by region. Update baselines only for
  intentional design changes, after changing the mock first.
- Run frontend tests in Chromium only. Do not configure or run Firefox, WebKit, or any other
  browser for frontend testing.

## Incremental Implementation and ATDD - mandatory

Mocks and the design system are design artifacts. ATDD does not apply to their development. Do
not write tests for mocks or the design system.

Every new feature or change to production behavior MUST have a requirement, a detailed design,
and a mock before implementation begins. This includes behavioral changes to existing features,
such as changing how a page behaves. This requirement applies to production-code changes only;
documentation-only, design-system-only, mock-only, and test-only changes are out of scope unless
they are part of implementing a production behavior change.

Every production behavior implementation MUST invoke and follow the `implementing-incrementally`
skill (`.claude/skills/implementing-incrementally` and `.agents/skills/implementing-incrementally`)
before any code is written, combined with acceptance test-driven development (ATDD). Plan small,
reviewable slices, then complete one slice at a time: write Given-When-Then acceptance criteria,
write the acceptance test, and run it to prove it fails for the expected reason BEFORE writing
production code. Implement only what satisfies that slice, refactor with tests green, and run the
relevant regression checks. Do not move to the next slice until those checks pass. No bulk
implementation, no tests added afterward, and no weakening tests to manufacture a pass. Keep the
requirement, detailed design, mock, criteria, tests, and implementation aligned until the entire
feature or behavior change is complete.

Back end: integration tests against the API. Front end: Playwright, using the Page Object Model.

### Never write architecture tests

Never add a test that asserts the shape of the codebase rather than its behavior: no structure,
layout, or naming tests; no banned-API scans; no traceability tests that parse the specifications.
Those constraints belong to the compiler, the formatter, and review. A test suite exists to prove
behavior.
