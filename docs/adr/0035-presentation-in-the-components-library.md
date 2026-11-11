# 0035. Presentation lives in the components library, one stylesheet per component, named with BEM

## Status

Accepted, 11 November 2026. Amends ADR 0002 (the single global component stylesheet), ADR 0008
(a component now always has a stylesheet), ADR 0013 (the marketing site's stylesheet), and ADR
0005 and ADR 0010 (a component parity spec runs with every component change; the sweeps stay
owner-run).

## Context

ADR 0002 styled the app with one global stylesheet, `ui.css`, a copy of the design system's
`components.css`, and had components "add no appearance of their own". Any template can then
draw a button by typing `class="btn"`. The audit in
`docs/audits/frontend-presentation-components.md` found that every template of the app and of the
marketing site does so: 333 hand-written buttons, 26 copies of the dialog frame, nine
presentation components declared in the marketing site, and no way for the build to notice.

The accepted practice for a component library is the opposite: a component owns its markup and
its styles, the styles are encapsulated, and only design tokens and layout utilities are global.

## Decision

- **Prefer the best practice.** Where there is more than one way to build something, the
  established practice of the platform (Angular, .NET, Playwright, WCAG) is chosen over the
  expedient one. A departure is recorded in an ADR with its reason. A rule in `AGENTS.md` or an
  ADR that is found to conflict with best practice is raised and corrected, not worked around.
- **Every presentation component is in `frontend/projects/components`.** The `jubilee` and
  `marketing` projects import them. An application project declares pages, dialogs and its root
  as containers, which hold state, call services, navigate and compose `jb-*` components. It
  declares no presentation component, no button and no stylesheet of its own.
- **One stylesheet per component.** A component is `name.ts` + `name.html` + `name.scss`, with
  `styleUrl` and Angular's default (emulated) encapsulation. The stylesheet holds every rule of
  that component and nothing else. `ViewEncapsulation.None` is not used.
- **BEM names.** The component is the block, named as in the design system (`btn`, `alert`,
  `dialog`). Its parts are `block__element`, its variants and states of appearance are
  `block--modifier`. A state that assistive technology must know is an attribute (`aria-current`,
  `aria-invalid`, `disabled`), styled through that attribute, with no modifier beside it. A
  stylesheet does not style another component's block and does not nest blocks; a component that
  needs another one composes it. The block class stays on the same element as in the mock, so
  the e2e locators keep working.
- **Global styles are foundations only**: `tokens.css` (tokens, `@font-face`), the reset, and the
  layout and text utilities (`stack`, `cluster`, `split`, `form-grid`, `container`,
  `visually-hidden`, `truncate`, `text-muted`, `text-caption`, `only-*`). These are the only
  classes an application template may write.
- **The design system stays the source.** A component's stylesheet carries the rules of its block
  from `docs/design-system/assets/components.css` (or `marketing.css`), reading tokens by role.
  When a component lands, the rules of its block are removed from the global `ui.css` (or
  `marketing.css`) in the same change, so a rule exists once. A change to the look is still made
  in the design system and its mock first.

- **The Magic Patterns design is the source of the design, above the mocks in every case.** It is
  at <https://www.magicpatterns.com/os/vjQEdxvHPvuznVPfxRXYfe/bY9EUiQ7kdsZbenSTHQtty>. Where a mock in `docs/mocks/` or a page of `docs/design-system/` is not aligned with
  it, the mock and the design system are updated to match, in the same change and before the
  component is built. The mocks stay the approved, testable copy of that design; they never
  overrule it.
- **Visual parity is proved per component, by a Playwright spec that passes.** A component is
  not done until its parity spec passes. The spec lives in `e2e/tests/parity/`, one file per
  component, and makes two comparisons of the component's region, found through a page object:
  - *Mock parity.* The component in the app against the same component in `docs/mocks`, on at
    least one screen state that shows each of its variants, at 360 px and 1280 px, in the light
    and the dark theme. The baseline is rendered from the mock on the same machine, as ADR 0005
    decides, and a region fails above 1 % of differing pixels.
  - *Magic Patterns parity.* The component in the app against the Magic Patterns design
    reference. The reference is a set of images exported from Magic Patterns by the repository
    owner and committed under `docs/design-reference/magic-patterns/`, each named for its frame
    and viewport. Because those images are rendered on another machine, a region fails above
    3 % of differing pixels. A component that the reference does not show (a state the mocks
    added) says so in its spec, names the nearest frame, and makes the mock comparison only;
    the mock of such a state still follows the Magic Patterns design in everything it shares.
- **The parity specs are run; the sweeps are still not.** `npm run parity` in `e2e/` renders the
  mock baselines for `tests/parity/` and runs those specs against the app. Whoever implements a
  component runs it, and CI runs it. This is the one exception to ADR 0010: the full sweeps
  (`npm run sweeps`, `npm run baseline`, `JB_SWEEPS=1`, `JB_BASELINE=1` over `tests/visual/`,
  `responsive.spec.ts` and `accessibility.spec.ts`) remain owner-run only.
- **A difference is fixed at its source.** If the mock differs from the Magic Patterns design,
  the Magic Patterns design wins: the design system and the mock are updated first, then the
  component. If the app then differs from the mock, the component is wrong. A threshold is never raised and a region is never
  masked to make a spec pass.

## Consequences

- A kit class typed in an application template has no effect once its component has landed, so
  the rule is held by the build and by what is on screen, with lint and review behind it.
- `ui.css` and `marketing.css` shrink with each component and stop being byte-for-byte copies of
  the design-system files. `npm run design:check` keeps comparing `tokens.css` and the fonts; for
  component rules, parity with the design system is checked by review and by the owner-run
  visual sweep. The first component to land changes `design:sync` and `design:check` accordingly.
- A component whose root is a native element with an attribute selector (`button[jb-button]`)
  styles that root through `:host`, with the block class on the host.
- The parity run adds a baseline render of the mocks it touches to each component change and to
  CI; it grows with the number of components, not with the number of screen states, so it stays
  far smaller than the sweeps.
- Magic Patterns parity cannot be checked until the reference images are in the repository.
  Exporting them, and adding `npm run parity`, is the first piece of work.
- Each component issue is larger by its stylesheet and its parity spec. The 46 issues opened from the audit (#39 to
  #85) require it.
- ADR 0008's note that no stylesheet exists is superseded: every component has one.
