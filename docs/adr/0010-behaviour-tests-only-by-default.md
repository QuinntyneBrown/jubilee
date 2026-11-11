# 0010. Only behaviour tests run; the sweeps run by hand

## Status

Accepted, 10 November 2026. Amends ADR 0005 (visual baselines from the mocks) and the e2e part of
ADR 0009: the sweeps are kept and maintained, but no default command and no CI job runs them.
Amended by ADR 0035: the per-component parity specs in `e2e/tests/parity/` are run by whoever
implements a component and by CI (`npm run parity`); the sweeps below are unchanged.

## Context

The Playwright suite had 839 tests. 98 were behaviour tests: a user does something and the app
answers. The other 741 were sweeps generated per screen state, width and theme: visual parity with
`docs/mocks` (`tests/visual/mock-parity.spec.ts`), responsive fit (`tests/responsive.spec.ts`) and
automated accessibility (`tests/accessibility.spec.ts`). The sweeps took about 90% of the run's
time, plus the baseline render from the mocks, and every new screen state added about 24 of them.
The repository owner decided that only behaviour tests run going forward.

## Decision

- `npm test` in `e2e/` and the CI e2e job run the behaviour specs only. The sweeps are excluded by
  `testIgnore` in `e2e/playwright.config.ts` unless `JB_SWEEPS=1` is set.
- The sweeps stay in the repository and are still written: a new screen state gets its entry in
  `e2e/fixtures/routes.ts` and its page object regions, so the sweeps cover it, and a new sweep is
  added where a requirement calls for one. Nothing runs them unless the repository owner does so by
  hand, with `npm run sweeps` (which renders the baselines first).
- Agents and CI never run `npm run sweeps`, `npm run baseline` or any other
  command that sets `JB_SWEEPS=1` or `JB_BASELINE=1`.

## Consequences

- The default e2e run is about 30 seconds instead of about 5 minutes, and CI no longer renders
  baselines.
- Visual, responsive and accessibility regressions are no longer caught automatically. They are
  caught when the owner runs the sweeps, or in review.
- Sweeps can go stale between manual runs: a sweep may fail on a change made weeks earlier, or
  meet an API request the recording lacks. `JB_SWEEPS=1 npm run record-api` refreshes the
  recording for them.
- Behaviour tests must carry any check a requirement makes mandatory and that a sweep covered only
  incidentally, such as an accessible name or a focus order the user depends on.
