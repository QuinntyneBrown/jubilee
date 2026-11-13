# 0036. Component parity specs run with their own command, in CI

## Status

Accepted, 11 November 2026. Amends ADR 0010 (only behaviour tests run) for the component parity
specs, and applies ADR 0005 (baselines rendered from the mocks) to them. Amended by ADR 0060: a
spec whose reference is absent picks up a capture of its component by name.

## Context

ADR 0035 moves every presentation component into the `components` library with its own
stylesheet, one issue per component (#39 to #85). Each move must leave the appearance as it was,
and the only visual check, the sweep of ADR 0005, is run by the repository owner by hand
(ADR 0010): 741 tests, about five minutes. Issue #87 asks for a check small enough to run with
every component change, against the mocks and against the Magic Patterns design the mocks are
drawn from.

## Decision

- **One parity spec per library component**, `e2e/tests/parity/<component>.spec.ts`. It names the
  screen states that show the component's variants and takes the component's region from a page
  object; `e2e/fixtures/parity.ts` turns that into the tests.
- **Against the mock**: the region in the app is compared with the same region of the mock at
  360 px and 1280 px, in the light and the dark theme, and fails above 1 % of differing pixels.
  The baselines are rendered from `docs/mocks` on the same machine and are not committed
  (ADR 0005).
- **Against the Magic Patterns design**: the region is compared with a crop of a reference image
  in `docs/design-reference/magic-patterns/` and fails above 3 % of differing pixels. A component
  the reference does not show declares that in its spec, names the nearest frame and is compared
  with the mock only.
- **`npm run parity`** in `e2e/` renders the baselines of `tests/parity/` and then runs those
  specs against the app. It sets `JB_PARITY`, never `JB_BASELINE` or `JB_SWEEPS`, and runs nothing
  outside `tests/parity/`. `npm test` does not run the parity specs. CI runs `npm run parity`
  after the behaviour specs.
- A difference is fixed at its source: the component, or the design system and the mock first. A
  threshold is not raised and a region is not masked.
- Where the design system and the mocks themselves differ from the reference, correcting them
  changes how the product looks, which is the owner's decision and not part of moving a
  component. Such a crop carries `knownDifference` in its spec and a row in the "Known
  differences" table of `docs/design-reference/magic-patterns/README.md`; its comparison is
  reported as a known failure (`fixme`) until the design system and the mock are corrected.
- The sweeps are unchanged: `npm run sweeps` and `npm run baseline` stay owner-run.

## Consequences

- A component change is checked visually in seconds, by agents and by CI.
- A parity spec compares a component where the page around it shows the same content in the mock
  and in the app; a state whose copy differs between the two is a page difference, and is left to
  the sweep.
- The reference images are captures of the published design: four frames, light theme. Most
  components are compared with the mocks only until the owner adds frames.
