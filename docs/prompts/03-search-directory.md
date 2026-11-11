# Feature: Search the directory (journey 3), finished

## Goal

Journey 3 in `docs/journey.md` lets a visitor or a member search businesses, services and products by
keyword and see grouped results. `docs/estimates/directory.md` puts `search-directory` at 85%. This run
takes it to 100%.

What works today:

- Backend: `SearchController`, `SearchDirectoryQuery`, `SearchQueryText`, `SearchAnalyzer`,
  `DatabaseSearchIndex`, `DatabaseNameSearch`, `RecentSearch` (migration `AddRecentSearches`) and the
  `searches` rate-limit policy, covered by `backend/tests/Jubilee.Api.Tests/SearchTests.cs`.
- Frontend: `frontend/projects/jubilee/src/app/pages/search/search.page.{ts,html}`, the top-bar search
  box in `frontend/projects/components/src/lib/top-bar/`, the browse hero search box in
  `frontend/projects/jubilee/src/app/pages/browse/browse.page.html`, and `jb-match-explanation` in
  `frontend/projects/components/src/lib/match-explanation/`.
- E2E: `e2e/tests/search.spec.ts`, `e2e/pages/search.page.ts`, and the `search`, `search.loading`,
  `search.empty`, `search.error` and `search.no-results` entries in `e2e/fixtures/routes.ts`.

What is missing, and is the scope of this run:

1. **The search page still draws its own presentation**, against ADR 0035 and `AGENTS.md`. The audit
   `docs/audits/frontend-presentation-components.md` lists it (row for `search.page.html`; fixes B11,
   B17, F8, F10). In `search.page.html` today:
   - a hand-written tab strip (`div.tabs` with `button.tab`, arrow-key handling in `moveTab`). It needs
     a `jb-tabs` library component (design page: `docs/design-system/components/tabs.html`);
   - a hand-written search form (`form.search` with `jb-icon` and `jb-input`). The browse hero and the
     top bar draw the same thing. It needs a `jb-search-field` library component;
   - `div.media.media--ink` (use `jb-media-tile`), and inline `style` attributes on the form, both chip
     rows, the tab-panel caption, `jb-rows` and the leading link. (Sections already use `jb-section`,
     added in ed90cdc.)
   When this is done, the search page template uses only `jb-*` components and the layout and text
   utilities that `AGENTS.md` allows. It has no `style` attribute.
2. **`jb-match-explanation` has no parity spec** in `e2e/tests/parity/` (ADR 0036 requires one for every
   library component). Add one, and add one for each new component (`jb-tabs`, `jb-search-field`).
3. **Progress tracking.** Bring `docs/estimates/directory.md`, `docs/estimates/README.md` and the
   journey 3 row of `docs/journey.md` to their true state.

What stays unchanged: every behaviour in L2-029 to L2-032, L2-028, L2-118, L2-133 and L2-181, the API
contract, the copy, and the mock-parity BEM classes and accessible semantics that the e2e locators depend
on. This is a presentation refactor plus parity coverage. It is not a behaviour change, so it needs no new
requirement. The existing behaviour specs are its acceptance tests and must stay green throughout.

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- You are authorised to take this feature all the way: design-system and mock alignment, an ADR note if a
  decision is needed, the library components, the page refactor, parity specs, estimates, green tests and a
  PR. Go through every phase and every slice in one continuous run. Do not pause between phases to report,
  ask for approval, or wait for "continue".
- Do not end your turn until the "Done means" list at the bottom is fully true. A partial result, a plan, or
  "the next steps would be..." is not done.
- Where the repo's instructions say "stop and ask", treat this prompt as the confirmation in advance for
  everything in scope here. Choose the simplest option that fits the existing architecture, record it (an ADR
  in `docs/adr/` or the design's open-questions section), and keep going.
- If a shared library, component or design asset lacks something, that is not a reason to stop. Update it
  first, as the repo's rules require, then go on.
- When a test, build or command fails, find the root cause and fix it, then go on. Never weaken a test to make
  it pass, and never skip a step quietly.
- Only stop for a real blocker you cannot resolve yourself, such as missing credentials, or an action outside
  this repo that can't be undone, such as production deploys or data changes. If that happens, finish
  everything else first, then report the blocker clearly.
- Keep track of progress (a todo list), so that nothing gets left out after context is summarised.

## Rules (read first, binding)

- Follow `AGENTS.md` exactly, especially:
  - **Presentation lives in `components` only (ADR 0035).** Pages compose `jb-*` components. No
    hand-written button, field, tab strip or frame, no inline `style`, no page stylesheet. The only classes
    a page writes are `stack`, `cluster`, `split`, `form-grid`, `container`, `visually-hidden`,
    `truncate`, `text-muted`, `text-caption`, `only-*`.
  - **File per type (ADR 0008).** A library component is `name.ts` + `name.html` + `name.scss` with
    `templateUrl`/`styleUrl`. Never an inline template or styles.
  - **One encapsulated BEM stylesheet per component.** Default encapsulation, never
    `ViewEncapsulation.None`. Accessible state goes through attributes (`aria-selected`, `aria-current`).
    When a component lands, its rules leave the global `ui.css` in the same change. Read tokens by role,
    never hex values.
  - Keep the mock's BEM classes and accessible semantics (`role="tablist"`, `role="tab"`,
    `aria-selected`, roving `tabindex`, arrow keys, `role="search"`, the visually hidden label). E2E
    locators depend on them.
  - **Declare each `ng-content` slot once.** Use one `@if` per `[slot=…]` node on the consumer side
    (NG8011).
  - Selectors use `jb-*`. Class, file and folder names omit the `Jb` prefix.
  - **ADR 0009:** backend tests use the EF Core InMemory provider only. E2E tests never reach the real
    backend: every `/api/**` call is answered from `e2e/fixtures/api/responses.json` or
    `e2e/fixtures/stubs.ts`.
  - **ADR 0010:** run the behaviour specs (`npm test` in `e2e/`) and `npm run parity`. Never run
    `npm run sweeps` or `npm run baseline`, and never set `JB_SWEEPS` or `JB_BASELINE`.
  - **ADR 0036:** every library component has a parity spec in `e2e/tests/parity/`, built with
    `e2e/fixtures/parity.ts`.
  - Page Object Model: selectors live in `e2e/pages/`, never in a test.
  - Chromium only.
  - Never write architecture tests. No test that scans templates for `style=` or class names.
  - Use the words of `docs/specs/L2.md` (query, match explanation, close term, recent search, empty search
    page).
- Work through the phases below **in order**, using the repo skill each phase names.
- Copy the house style of each folder. Read the existing neighbours first: for example
  `frontend/projects/components/src/lib/page-header/`, `rows/`, `chip/`, `tab-bar/`,
  `section/`, `e2e/tests/parity/page-header.spec.ts`, `rows.spec.ts` and `section.spec.ts`, and recent
  commits a23b183, 4531404 and ed90cdc, which did the same kind of refactor for page headers, rows and
  sections.

## Phase 1: Read the context

- `AGENTS.md`, ADR 0011, ADR 0035, ADR 0036, ADR 0008, ADR 0009 and ADR 0010.
- `docs/detailed-designs/directory/search-directory/README.md` and its diagrams.
- `docs/specs/L2.md`: L2-028, L2-029 to L2-032, L2-118, L2-133 and L2-181.
- `docs/mocks/pages/search/` (`default`, `empty`, `error`, `loading`, `no-results`) and the design
  reference in `docs/design-reference/magic-patterns/`. The design reference trumps the mocks.
- `docs/design-system/components/tabs.html` and `media-tile.html`. Note whether a search-field page exists.
- `docs/audits/frontend-presentation-components.md`, fixes B11, B17, C2, F8 and F10.

## Phase 2: Design system and mocks (`extracting-design-systems`, `writing-html-mocks`)

- Make sure `docs/design-system/components/` documents `tabs` and a `search-field` page (anatomy,
  variants such as the `lg` size on the search page and hero and the compact size in the top bar, states,
  keyboard, tokens). Add the search-field page if it is missing. Do not write tests for the design system
  or mocks.
- Only touch `docs/mocks/pages/search/` if a mock writes something the new components cannot express. Change
  the mock first, never the baseline.
- Run `npm run design:check` in `frontend/` if a design-system copy changes.

## Phase 3: Detailed design and ADR (`writing-software-design-documents`)

- Update `docs/detailed-designs/directory/search-directory/README.md` so `SearchBox` is the library
  component `jb-search-field` (used by the top bar, the browse hero and the search page). Name `jb-tabs` for
  the result tabs. Keep the house style.
- Add an ADR only if you make a real decision, for example the `jb-tabs` API: whether the component owns the
  roving-tabindex and arrow-key behaviour, and whether it renders tabs (`role="tab"`) or links
  (`aria-current`) for the workspace and account navigation that the audit also lists.

## Phase 4: Incremental implementation (`implementing-incrementally`, test-first)

Plan thin vertical slices. A suggestion:

1. **`jb-match-explanation` parity.** Add `e2e/tests/parity/match-explanation.spec.ts`. Run `npm run
   parity` and show it fails or passes for a stated reason. Fix the component only if parity fails.
2. **`jb-tabs` in `components`.** Write the parity spec first and show it fails (component absent). Build
   `frontend/projects/components/src/lib/tabs/` (`tabs.ts`, `tabs.html`, `tabs.scss`) with `role="tablist"`,
   `role="tab"`, `aria-selected`, `aria-controls`, roving `tabindex`, Left/Right/Home/End keys and a count
   badge per tab. Export it from the library's public API. Move the `.tabs`/`.tab` rules out of `ui.css`
   only once no template still writes them, or keep them until the last user moves (state which in the
   commit).
3. **Search page uses `jb-tabs`.** The acceptance test is the existing `search.spec.ts` "AC2: choosing a tab
   shows that group; the arrow keys move between tabs". Keep it green. Remove `moveTab` from the page.
4. **`jb-search-field` in `components`.** Parity spec first. Build it with the visually hidden label, the
   search icon, `jb-input`, `maxlength="100"`, the "Plumber, lawyer, Bibles…" placeholder, `role="search"`,
   and an output that emits the submitted query. The acceptance tests are L2-029 AC5 and L2-032 AC1 and AC2
   in `search.spec.ts`.
5. **Use `jb-search-field` everywhere.** The search page's empty search page, the browse hero
   (`browse.page.html`) and the top bar (`top-bar.html`). Keep `browse` and top-bar behaviour specs green.
   Move the `.search` rules out of `ui.css`.
6. **Remove the rest of the hand-written presentation from `search.page.html`.** Replace
   `div.media.media--ink` with `jb-media-tile`. Replace every inline `style` with
   library inputs or allowed utilities. Add a library input where a component lacks one (for example spacing
   on `jb-chip-row` or a borderless `jb-rows`), with its parity spec updated. Keep every search behaviour
   spec green.

For each slice:

- Write the Given-When-Then criteria (for a refactor, name the existing behaviour specs that guard it).
- Write the acceptance or parity test following the repo's test approach and locations. Put selectors in
  `e2e/pages/search.page.ts` or the parity fixtures.
- Run it and show that it fails for the expected reason (for the refactor slices, show the guard specs pass
  before and after).
- Implement the minimum that makes it pass, and refactor while the tests are green.
- Run the regression checks, then commit:
  - in `frontend/`: `npm run lint`, `npm run format:check`, `npm run build`;
  - in `e2e/`: `npm run typecheck`, `npm test` (behaviour specs) and `npm run parity`;
  - backend only if it changed: `pwsh eng/Test-Backend.ps1` from the repository root.
- Keep `e2e/fixtures/routes.ts` entries and page-object regions current for every search state. Do not run
  the sweeps.

When all slices are green, update `docs/estimates/directory.md` (`search-directory` to its true percent,
100% if nothing in scope is left), the totals in `docs/estimates/README.md` (use the `estimating-designs`
skill), the journey 3 row and the total in `docs/journey.md`, and the audit's rows for the search page,
B11, F8 and F10 if they are now resolved. Keep the design, the mocks and the design system aligned with
what was built.

## Deferred (out of scope, record it, do not build it)

- A real search engine and `SearchIndexingJob` in `Jubilee.Worker` (ADR 0011 defers them).
- The shared `Cache` counter for the search rate limit (ADR 0011).
- L2-156 performance at 10,000 listings and 100,000 products.
- Moving the other pages that write `.tabs` (admin reports, admin verifications, incoming requests,
  requests, account, notification settings, the workspace header) onto `jb-tabs`. Do it only if `ui.css`
  cannot lose the `.tabs` rules otherwise. If you leave them, name them as the follow-up.

## Done means

- The search page, the browse hero and the top bar render their search box with `jb-search-field`. The
  results use `jb-tabs`, `jb-rows` and `jb-media-tile`. `search.page.html` has no inline `style` and no
  class outside the allowed utilities.
- `jb-tabs`, `jb-search-field` and `jb-match-explanation` each have a parity spec in `e2e/tests/parity/`
  that passes.
- Every search behaviour (L2-028 to L2-032, L2-118, L2-133, L2-181) is unchanged. `search.spec.ts`,
  `SearchTests.cs` and every other behaviour spec pass.
- `npm run lint`, `npm run format:check` and `npm run build` in `frontend/` pass. `npm run typecheck`,
  `npm test` and `npm run parity` in `e2e/` pass. `pwsh eng/Test-Backend.ps1` passes if the backend was
  touched.
- The detailed design, the design system, the estimates, `docs/journey.md` and the audit agree with the
  code.
- The work is on branch `claude/zealous-mayer-jvs7ay` with a PR to `main`. Fetch and rebase onto `main`
  first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.
