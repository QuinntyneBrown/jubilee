# 0035. Presentation lives in the components library, one stylesheet per component, named with BEM

## Status

Accepted, 11 November 2026. Amends ADR 0002 (the single global component stylesheet), ADR 0008
(a component now always has a stylesheet) and ADR 0013 (the marketing site's stylesheet).

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

## Consequences

- A kit class typed in an application template has no effect once its component has landed, so
  the rule is held by the build and by what is on screen, with lint and review behind it.
- `ui.css` and `marketing.css` shrink with each component and stop being byte-for-byte copies of
  the design-system files. `npm run design:check` keeps comparing `tokens.css` and the fonts; for
  component rules, parity with the design system is checked by review and by the owner-run
  visual sweep. The first component to land changes `design:sync` and `design:check` accordingly.
- A component whose root is a native element with an attribute selector (`button[jb-button]`)
  styles that root through `:host`, with the block class on the host.
- Each component issue is larger by its stylesheet. The 46 issues opened from the audit (#39 to
  #85) require it.
- ADR 0008's note that no stylesheet exists is superseded: every component has one.
