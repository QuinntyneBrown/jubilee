# 0002. Frontend workspace

## Status

Accepted, 10 November 2026.

## Context

`AGENTS.md` asks for three Angular projects (`jubilee`, `api`, `components`), `jb-*` selectors,
the mocks' BEM classes in the app, and visual parity with `docs/mocks`. The mocks are styled by
two files of the design system: `tokens/tokens.css` and `assets/components.css`.

## Decision

- The workspace uses Angular 22 without zone.js, standalone components and signals.
- `api` and `components` are consumed from source through the `paths` of
  `frontend/tsconfig.json`. They are not packaged, so there is one build and no build order.
- `frontend/projects/components/src/lib/styles/` holds `tokens.css` and `ui.css`, copies of the
  two design-system files, loaded once as global styles. `npm run design:sync` refreshes the
  copies and `npm run design:check` (run in CI) fails when they differ from the design system.
- Components add no appearance of their own. They emit the kit's classes and state attributes.
- A component whose root is a native element in the mocks uses an attribute selector on that
  element, for example `a[jb-business-card]`, `header[jb-top-bar]` and `svg[jb-icon]`. The DOM
  of the app is then the DOM of the mock, and the kit's child selectors keep working.
- Web fonts are not loaded yet. The font tokens fall back to system fonts, as they do in the
  mocks; self-hosting Archivo and Inter belongs to the design-system journey.
- Frontend behaviour is tested with Playwright only. The workspace has no unit-test runner.

## Consequences

- A change to the look of a component is made in the design system and its mock first, then
  synced. A stylesheet in a page or component that restyles a kit class is a defect.
- The libraries cannot be published as they are. Packaging them is a later decision if a second
  application needs them.
- Until the fonts are self-hosted, text metrics depend on the device's system font.
