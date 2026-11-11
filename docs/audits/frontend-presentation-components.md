# Audit: presentation components outside the `components` library

Audited 11 November 2026, against `frontend/projects/` at commit `8fe2233`.

## The rule

> Every presentation component is implemented in the `components` Angular library project and
> imported by the application projects. The `jubilee` app and the `marketing` site define no
> buttons and no presentation components of their own.

For this audit, a presentation component is anything that decides how something looks: a
`@Component` whose job is markup rather than data or navigation, and equally a button, field,
alert, card or dialog frame written out by hand in a page template with the kit's classes. An
application project may hold pages, dialogs and the root shell as containers: they fetch, hold
state, navigate and compose `jb-*` components. They do not draw.

## Verdict

**The rule is not met in either project, and nothing enforces it.**

| | `jubilee` | `marketing` |
|---|--:|--:|
| Templates audited | 74 | 9 |
| Templates that draw presentation themselves | 74 | 9 |
| Presentation components declared in the project | 5 | 9 (all of them) |
| `<button>` elements written by hand | 227 | 2 |
| Elements styled as a button by class (`btn`, `mkt-btn`) | 333 | 4 |
| `<input>`, `<select>`, `<textarea>` written by hand | 105 | 0 |
| Hand-drawn `<svg>` (not `jb-icon` / `jb-brand-mark`) | 1 | 12 |
| Inline `style` attributes and bindings | 227 | 0 |
| Component stylesheets | 1 | 0 |
| Imports anything from `components` | yes | **no** |

The library has 24 exports (20 components, 2 pipes, the icon set, navigation types). The design
system documents 51 components. The app covers the difference by typing kit classes directly:
79 distinct component blocks of the kit appear in its templates, beside 16 layout utilities.

### Why it happens

1. **The kit is a global stylesheet.** `tokens.css` and `ui.css` are loaded globally by
   `angular.json`, so `class="btn btn--primary"` works in any template. ADR 0002 made this the
   design: "Components add no appearance of their own. They emit the kit's classes." A page can
   therefore produce any component without importing one, and it does.
2. **The library has no primitives.** There is no button, field, alert, dialog frame, card, tabs,
   badge, skeleton or avatar component. The library's own templates hand-write `btn` 14 times
   (`top-bar`, `pagination`, `verify-email-banner`, `connection-banner`).
3. **The library's slots invite it.** `jb-empty-state` takes its actions as projected content, so
   116 hand-written `class="btn"` elements in 39 templates pass through `slot="actions"`.
4. **Marketing has a parallel kit.** `marketing.css` (321 lines, 32 `mkt-*` blocks) lives in the
   marketing project and is used by raw markup. ADR 0013 says the site "imports only tokens, the
   font and atoms from `components`"; it imports no component at all.

## Findings

Severity: **A** a component or stylesheet declared in an application project; **B** a
presentation primitive hand-written in application templates; **C** a gap in the library that
causes A or B.

### A. Presentation components declared in application projects

| # | Component | Where | Why it is presentation | Fix |
|---|---|---|---|---|
| A1 | `WorkspaceHeader` (`jb-workspace-header`) | `jubilee/pages/my-business/workspace-header.*` | Six inputs, no injection; page header plus tabs. Used 13 times. | Move to `components` as a composition of `jb-page-header` and `jb-tabs` (F9, F10). |
| A2 | `TeamNav` (`nav[jb-team-nav]`) | `jubilee/pages/admin-team-nav/team-nav.*` | One input, no injection; a tab strip. Used in 4 pages. | Delete; pages use `jb-tabs` with their own items. |
| A3 | `ProductRequestForm` (`jb-product-request-form`) | `jubilee/pages/product/product-request-form.*` | Inputs and outputs only; chips, quantity field, alert, buttons. Carries a host `style`. | Move to `components`. It takes `ProductPage` from `api`; the library imports nothing from `api` today, so give it a view-model input of its own. |
| A4 | `ToastRegion` (`jb-toast-region`) | `jubilee/toasts/toast-region.*` | Draws the toast, its close button, action and progress bar. | Add `jb-toast` to `components`; the region stays in the app as a container that loops over `ToastService` and renders `jb-toast`. |
| A5 | `InboxList` (`jb-inbox-list`) | `jubilee/pages/messages/inbox-list.*` | A container (injects the store), but it draws the search field, thread rows, avatars and skeletons. | Keep the container; move the drawing to `jb-search-field`, `jb-thread-row`, `jb-avatar`, `jb-skeleton`. |
| A6 | `Lockup` (`[jb-lockup]`) | `marketing/lockup/*` | Pure. Repeats the path data of `BrandMark`. | Move to `components` as `jb-lockup`, built on `jb-brand-mark`; the app's 12 `auth-brand` links and the top bar use it too. |
| A7 | `MarketingBusinessCard` (`a[jb-marketing-business-card]`) | `marketing/business-card/*` | Pure; a second business card beside the library's `BusinessCard`. | Move to `components` as the photo variant of the business card. |
| A8 | `HeroVisual` | `marketing/hero-visual/*` | Pure; no injection. | Move to `components`. |
| A9 | `PitchVideo` | `marketing/pitch-video/*` | Pure; two hand-written `<button>`s (poster, chapter). | Move to `components` as `jb-video-player`; film, still and chapters become inputs. |
| A10 | `Benefits`, `HowItWorks` | `marketing/benefits/*`, `marketing/how-it-works/*` | Pure; static sections. | Sections stay in the site as composition only, built from library pieces (`jb-section-heading`, `jb-steps`, `jb-rule-list`). |
| A11 | `InsideTheApp`, `ForBusinesses` | `marketing/inside-the-app/*`, `marketing/for-businesses/*` | Inject `APP_URL` only; the rest is drawing. | As A10; the link button becomes `jb-button`. |
| A12 | Marketing root | `marketing/app.html` | Draws the nav bar, hero, footer, three `mkt-btn` links and four arrow icons. | Add `jb-marketing-nav` and `jb-marketing-footer` to `components`; the root composes. |
| A13 | `marketing.css` | `marketing/src/styles/marketing.css` | 321 lines of component styling owned by an application project. | Move beside the components that use it in `components`; `design:sync` and `design:check` follow. |
| A14 | `account-menu.dialog.scss` | `jubilee/dialogs/account-menu/` | The only component stylesheet in the app; it restyles `.dialog__panel`, which ADR 0002 calls a defect. | Becomes the `anchored` variant of `jb-dialog` (F5). |

### B. Presentation primitives hand-written in `jubilee` templates

Each row is a kit block typed into app templates with no library component behind it. Counts are
class occurrences and the number of templates.

| # | Kit blocks | Uses / templates | Missing library component |
|---|---|--:|---|
| B1 | `btn`, `close` | 632 / 72 | `jb-button` on `button` and `a` (variants primary, ghost, danger, link; sizes sm, lg; icon-only; block; busy), `jb-close-button` |
| B2 | `alert`, `form-summary` | 297 / 37 | `jb-alert` (tone, title, role), `jb-form-summary` |
| B3 | `field`, `input`, `textarea`, `select`, `optional`, `input-group` | 405 / 37 | `jb-field` (label, hint, error, optional) with `input[jb-input]`, `textarea[jb-textarea]`, `select[jb-select]` |
| B4 | `choice`, `choice-card(s)`, `switch` | 34 / 12 | `jb-checkbox`, `jb-radio-group`, `jb-choice-card`, `jb-switch` |
| B5 | `dialog` | 205 / 26 | `jb-dialog` frame: icon, title, description, close, body, footer. All 26 dialogs repeat the same header by hand, including `style="flex: 1"`. |
| B6 | `skeleton` | 267 / 27 | `jb-skeleton` and per-screen skeleton compositions (only `card-grid-skeleton` exists) |
| B7 | `card`, `well`, `danger-zone` | 68 / 27 | `jb-card` |
| B8 | `row`, `rows`, `list`, `item-list` | 127 / 19 | `jb-row`, `jb-rows` |
| B9 | `badge`, `tag`, `perk`, `dot`, `inline-status`, `chip`, `chip-row` | 72 / 22 | `jb-badge`, `jb-inline-status`, `jb-chip` |
| B10 | `page-header`, `subtitle`, `section`, `section-head`, `detail-head`, `breadcrumb`, `back-link` | 92 / 25 | `jb-page-header`, `jb-section`, `jb-breadcrumb` |
| B11 | `tabs`, `tab` | 29 / 9 | `jb-tabs` |
| B12 | `auth-brand`, `auth-card`, `auth-foot`, `divider-text` | 31 / 12 | `jb-auth-layout`, `jb-lockup` (the brand link is copied into 12 pages) |
| B13 | `status-page`, `hero`, `band`, `feature-grid`, `steps` | 12 / 4 | `jb-status-page`, `jb-hero-band`, `jb-steps` |
| B14 | `bubble`, `chat`, `composer`, `thread`, `inbox` | 53 / 4 | `jb-message-bubble`, `jb-composer`, `jb-thread-row` |
| B15 | `notif`, `toast`, `menu` | 25 / 3 | `jb-notification-item`, `jb-toast`, `jb-menu` |
| B16 | `stat`, `stat-grid`, `timeline`, `dl`, `table`, `table-wrap`, `accordion`, `spinner`, `avatar`, `price`, `num` | 75 / 20 | `jb-stat`, `jb-timeline`, `jb-description-list`, `jb-table`, `jb-accordion`, `jb-spinner`, `jb-avatar`; `price` uses the existing `jbPrice` pipe behind a `jb-price` |
| B17 | `biz-card`, `media`, `card-grid`, `saved-card`, `dir-group(s)`, `dir-more`, `scroller`, `search`, `verified`, `empty`, `banner` | 78 / 17 | Components exist (`business-card`, `media-tile`, `directory-row`, `verified-mark`, `empty-state`, `connection-banner`) but templates still write the blocks; add `jb-card-grid`, `jb-search-field` and use them |
| B18 | Inline `style` | 227 / 55 | None should remain. `flex: 1` ×31 and `margin-top: var(--space-1)` ×29 are the dialog header (B5); 69 more are margins between blocks, which belongs to the components or to `stack`. |
| B19 | One hand-drawn `<svg>` | `pages/request-detail` line 59 | Add the icon to the icon set; use `jb-icon`. |

Layout and text utilities (`stack`, `cluster`, `split`, `form-grid`, `form-actions`, `container`,
`text-muted`, `text-caption`, `visually-hidden`, `truncate`, `only-*`, `lead`, `prose`; 300 uses in
64 templates)
are not counted above. They arrange components rather than draw one. **Decision needed:** keep
them as the only classes an application template may use, or wrap them too (`jb-stack`,
`jb-cluster`). This audit assumes the first.

### C. Gaps in the library

| # | Gap | Fix |
|---|---|---|
| C1 | No primitives (button, field, alert, dialog frame, card, tabs, badge, skeleton, avatar). | Build them first; everything in B depends on them. |
| C2 | Library templates hand-write `btn` (14 uses), `avatar`, `search`, `nav-link`. | Library composites use the library's own primitives. |
| C3 | `jb-empty-state` takes raw elements in `slot="actions"` (116 in 39 templates). | Keep the slot; it receives `jb-button` only. |
| C4 | `span[jb-unread-badge]` and `span[jb-verified-mark]` are exported but no app template uses them; the app hand-writes `badge badge--count` (workspace header) and `verified` instead. | Use them, or fold into `jb-badge`. |
| C5 | The kit is global, so the rule cannot be checked by the compiler. | See Enforcement. |
| C6 | The 12 marketing icons (arrow ×6, verified check ×4, search, chat, play) bypass the icon set. | Add the missing names to `icons.ts`; marketing uses `jb-icon`. |

## Fixes, in order

Each fix is a refactor: the DOM, classes and accessible names the mocks define stay the same, so
the behaviour specs are the safety net and no requirement changes. Slice per component, run the
behaviour specs after each.

| # | Fix | Closes |
|---|---|---|
| F1 | Record the rule in an ADR that amends ADR 0002 ("components emit kit classes" becomes "only `components` may emit kit classes") and ADR 0013; add it to `AGENTS.md`. | C5 |
| F2 | `jb-button` (`button[jb-button]`, `a[jb-button]`) and `jb-close-button`; replace 333 uses in the app, 14 in the library, 4 in marketing. | B1, C2, C3 |
| F3 | `jb-alert`, `jb-form-summary`. | B2 |
| F4 | `jb-field` and the control directives; `jb-checkbox`, `jb-radio-group`, `jb-choice-card`, `jb-switch`, `jb-chip`. | B3, B4, part of B9 |
| F5 | `jb-dialog` frame with an `anchored` variant; convert the 26 dialogs; delete `account-menu.dialog.scss`. | B5, A14, half of B18 |
| F6 | `jb-skeleton`, `jb-spinner`, `jb-avatar`, `jb-badge`, `jb-inline-status`, `jb-card`, `jb-row(s)`. | B6–B9, C4 |
| F7 | `jb-lockup`, `jb-auth-layout`, `jb-status-page`; convert the 12 auth pages and the status pages. | B12, B13, A6 |
| F8 | `jb-toast`, `jb-menu`, `jb-notification-item`, `jb-message-bubble`, `jb-composer`, `jb-thread-row`, `jb-search-field`. | B14, B15, A4, A5 |
| F9 | `jb-page-header`, `jb-section`, `jb-breadcrumb`. | B10 |
| F10 | `jb-tabs`; move `WorkspaceHeader` into the library; delete `TeamNav`. | B11, A1, A2 |
| F11 | `jb-stat`, `jb-timeline`, `jb-description-list`, `jb-table`, `jb-accordion`, `jb-price`, `jb-card-grid`, `jb-hero-band`, `jb-steps`. | B13, B16, B17 |
| F12 | Move `ProductRequestForm` into the library behind its own view model. | A3 |
| F13 | Marketing: move `Lockup`, the photo business card, `HeroVisual` and the video player into the library; add the nav and footer; move `marketing.css` to the library; add the icons. Sections and the root become composition only. | A6–A13, C6 |
| F14 | Remove the remaining inline styles and the hand-drawn icon. | B18, B19 |
| F15 | Turn enforcement on (below), at error level, once F2–F14 are done. | C5 |

F2 to F5 remove about 70% of the hand-written presentation and should go first.

## Enforcement

`AGENTS.md` forbids tests that assert the shape of the codebase, so the rule must be held by
lint, the build and review.

1. **Lint (after each fix).** In `frontend/eslint.config.js`, for templates under
   `projects/jubilee` and `projects/marketing`: forbid `style` attributes and `[style.*]`
   bindings, and forbid a native `button`, `input`, `select` or `textarea` without its `jb-*`
   attribute. Turn each restriction on when its fix lands; CI already fails on lint.
2. **Build (the strong form).** Stop loading `ui.css` and `marketing.css` globally. Each library
   component carries its own part of the kit as its stylesheet, with only tokens, reset and the
   layout utilities left global. A kit class typed in an application template then has no effect,
   so the violation shows on screen and in the visual sweep. This reverses a decision of ADR 0002
   and changes how `design:sync` copies the kit, so it needs the ADR in F1.
3. **Review.** A `@Component` in an application project is a page, a dialog or the root, or it is
   rejected. `styleUrl` in an application project is rejected.

Note for the conversions: 63 of the 64 e2e page objects locate by kit class (`.empty`,
`.dialog__title`, `.field__error`). The library components keep emitting those classes on the
same elements, as the attribute-selector components do today, so the page objects do not change.

## Appendix: every application template

Kit blocks exclude the layout utilities listed under B. "`.btn` uses" counts elements styled as
a button, including `mkt-btn`.

| Template | `<button>` | `.btn` uses | Form controls | Hand-drawn `<svg>` | Inline styles | Kit blocks hand-written |
|---|--:|--:|--:|--:|--:|---|
| `jubilee/app.html` | 0 | 0 | 0 | 0 | 0 |  |
| `jubilee/dialogs/account-menu/account-menu.dialog.html` | 2 | 1 | 0 | 0 | 2 | `menu`×9, `dialog`×5, `btn`×3, `avatar`×2, `row`×2, `list`×1 |
| `jubilee/dialogs/approve-listing/approve-listing.dialog.html` | 3 | 3 | 1 | 0 | 2 | `alert`×8, `dialog`×7, `btn`×6, `field`×3, `optional`×1, `textarea`×1 |
| `jubilee/dialogs/book-meeting/book-meeting.dialog.html` | 6 | 7 | 5 | 0 | 6 | `dialog`×15, `btn`×14, `field`×10, `alert`×8, `select`×2, `optional`×2, `input`×1, `chip`×1, `textarea`×1 |
| `jubilee/dialogs/cancel-request/cancel-request.dialog.html` | 3 | 3 | 0 | 0 | 2 | `dialog`×7, `btn`×6, `alert`×4 |
| `jubilee/dialogs/change-email/change-email.dialog.html` | 5 | 5 | 2 | 0 | 4 | `btn`×11, `dialog`×8, `field`×7, `alert`×4, `input`×2 |
| `jubilee/dialogs/change-password/change-password.dialog.html` | 3 | 3 | 3 | 0 | 2 | `field`×10, `btn`×6, `dialog`×5, `alert`×4, `input`×3 |
| `jubilee/dialogs/confirm-request/confirm-request.dialog.html` | 3 | 3 | 0 | 0 | 2 | `alert`×8, `dialog`×7, `btn`×6, `dl`×1, `well`×1, `price`×1 |
| `jubilee/dialogs/decline-listing/decline-listing.dialog.html` | 3 | 3 | 1 | 0 | 2 | `dialog`×7, `btn`×6, `alert`×4, `field`×4, `optional`×1, `textarea`×1 |
| `jubilee/dialogs/decline-request/decline-request.dialog.html` | 3 | 3 | 2 | 0 | 2 | `dialog`×7, `btn`×6, `field`×6, `alert`×4, `select`×1, `optional`×1, `textarea`×1 |
| `jubilee/dialogs/delete-account/delete-account.dialog.html` | 3 | 3 | 1 | 0 | 3 | `alert`×8, `dialog`×7, `btn`×6, `field`×3, `optional`×1, `input`×1 |
| `jubilee/dialogs/delete-item/delete-item.dialog.html` | 3 | 3 | 0 | 0 | 2 | `dialog`×7, `btn`×6, `alert`×4 |
| `jubilee/dialogs/filters/filters.dialog.html` | 3 | 3 | 3 | 0 | 1 | `btn`×6, `dialog`×5, `choice`×4, `field`×2, `select`×1 |
| `jubilee/dialogs/leave-unsaved/leave-unsaved.dialog.html` | 3 | 3 | 0 | 0 | 2 | `dialog`×6, `btn`×6 |
| `jubilee/dialogs/listing-item/listing-item.dialog.html` | 3 | 3 | 4 | 0 | 2 | `field`×11, `dialog`×7, `btn`×6, `optional`×3, `input`×3, `select`×1 |
| `jubilee/dialogs/new-message/new-message.dialog.html` | 3 | 3 | 1 | 0 | 2 | `dialog`×7, `btn`×6, `field`×5, `alert`×4, `optional`×1, `textarea`×1 |
| `jubilee/dialogs/pause-listing/pause-listing.dialog.html` | 3 | 3 | 0 | 0 | 2 | `dialog`×7, `btn`×6, `alert`×4 |
| `jubilee/dialogs/product-editor/product-editor.dialog.html` | 5 | 5 | 4 | 0 | 3 | `field`×13, `btn`×9, `alert`×8, `dialog`×7, `optional`×3, `input`×3, `textarea`×1 |
| `jubilee/dialogs/report-action/report-action.dialog.html` | 3 | 3 | 2 | 0 | 2 | `dialog`×7, `btn`×7, `field`×7, `alert`×4, `optional`×2, `textarea`×2 |
| `jubilee/dialogs/report-listing/report-listing.dialog.html` | 5 | 5 | 2 | 0 | 4 | `dialog`×12, `btn`×11, `field`×5, `alert`×4, `optional`×2, `choice`×2, `textarea`×1 |
| `jubilee/dialogs/request-changes/request-changes.dialog.html` | 3 | 3 | 2 | 0 | 2 | `dialog`×7, `btn`×6, `field`×5, `alert`×4, `choice`×2, `optional`×1, `textarea`×1 |
| `jubilee/dialogs/request-item/request-item.dialog.html` | 5 | 7 | 3 | 0 | 4 | `dialog`×15, `btn`×14, `alert`×11, `field`×5, `price`×4, `item-list`×2, `choice`×2, `optional`×2, `textarea`×2, `media`×1, `row`×1, `dl`×1, `well`×1 |
| `jubilee/dialogs/request-quote/request-quote.dialog.html` | 6 | 7 | 4 | 0 | 4 | `dialog`×15, `btn`×14, `field`×12, `alert`×8, `optional`×4, `input`×3, `textarea`×1 |
| `jubilee/dialogs/service-editor/service-editor.dialog.html` | 5 | 5 | 9 | 0 | 3 | `field`×23, `btn`×9, `alert`×8, `dialog`×7, `input`×5, `optional`×3, `select`×2, `choice`×2 |
| `jubilee/dialogs/share-listing/share-listing.dialog.html` | 4 | 6 | 1 | 0 | 2 | `btn`×9, `dialog`×8, `field`×2, `input-group`×1, `input`×1 |
| `jubilee/dialogs/sign-in-required/sign-in-required.dialog.html` | 1 | 3 | 0 | 0 | 2 | `dialog`×7, `btn`×6 |
| `jubilee/dialogs/sign-out/sign-out.dialog.html` | 3 | 3 | 0 | 0 | 2 | `dialog`×6, `btn`×6, `field`×1 |
| `jubilee/pages/account/account.page.html` | 7 | 7 | 7 | 0 | 10 | `field`×22, `alert`×21, `btn`×13, `card`×8, `skeleton`×8, `input`×7, `tab`×4, `optional`×4, `row`×4, `page-header`×1, `subtitle`×1, `tabs`×1, `form-summary`×1, `inline-status`×1, `rows`×1, `danger-zone`×1 |
| `jubilee/pages/admin-featured/admin-featured.page.html` | 6 | 7 | 2 | 0 | 5 | `btn`×15, `row`×10, `skeleton`×6, `field`×6, `rows`×3, `alert`×3, `card`×2, `input`×2, `page-header`×1, `subtitle`×1, `badge`×1 |
| `jubilee/pages/admin-report/admin-report.page.html` | 7 | 10 | 0 | 0 | 9 | `btn`×15, `card`×8, `row`×6, `skeleton`×6, `badge`×5, `page-header`×3, `bubble`×3, `alert`×3, `subtitle`×2, `rows`×2, `chat`×2, `dl`×1 |
| `jubilee/pages/admin-reports/admin-reports.page.html` | 4 | 5 | 0 | 0 | 3 | `skeleton`×8, `btn`×5, `badge`×5, `row`×2, `page-header`×1, `subtitle`×1, `rows`×1, `tabs`×1, `tab`×1, `table-wrap`×1, `table`×1 |
| `jubilee/pages/admin-team-nav/team-nav.html` | 0 | 0 | 0 | 0 | 0 | `tab`×3 |
| `jubilee/pages/admin-verification/admin-verification.page.html` | 4 | 5 | 1 | 0 | 8 | `alert`×28, `btn`×8, `badge`×8, `skeleton`×6, `card`×6, `biz-card`×4, `dl`×2, `choice`×2, `breadcrumb`×1, `page-header`×1, `subtitle`×1, `field`×1, `verified`×1, `perk`×1 |
| `jubilee/pages/admin-verifications/admin-verifications.page.html` | 4 | 5 | 0 | 0 | 2 | `skeleton`×8, `btn`×5, `badge`×5, `row`×3, `page-header`×1, `subtitle`×1, `rows`×1, `tabs`×1, `tab`×1, `table-wrap`×1, `table`×1 |
| `jubilee/pages/browse/browse.page.html` | 1 | 6 | 1 | 0 | 3 | `skeleton`×12, `btn`×8, `section`×5, `hero`×3, `section-head`×3, `dir-group`×3, `chip`×2, `row`×2, `search`×1, `input`×1, `chip-row`×1, `rows`×1, `band`×1, `card-grid`×1, `feature-grid`×1, `scroller`×1, `dir-groups`×1, `list`×1, `dir-more`×1 |
| `jubilee/pages/business/business.page.html` | 2 | 14 | 0 | 0 | 14 | `skeleton`×33, `btn`×30, `section`×7, `card-grid`×4, `alert`×4, `section-head`×4, `rows`×3, `row`×2, `detail-head`×2, `card`×2, `back-link`×1, `biz-card`×1, `tag`×1, `perk`×1, `dl`×1 |
| `jubilee/pages/category/category.page.html` | 4 | 7 | 1 | 0 | 3 | `btn`×10, `field`×2, `breadcrumb`×1, `page-header`×1, `subtitle`×1, `chip`×1, `select`×1, `input`×1, `card-grid`×1 |
| `jubilee/pages/church-reference/church-reference.page.html` | 3 | 8 | 4 | 0 | 2 | `empty`×17, `skeleton`×14, `btn`×12, `field`×11, `alert`×8, `optional`×4, `choice`×2, `input`×2, `auth-brand`×1, `auth-card`×1, `card`×1, `form-summary`×1, `textarea`×1, `auth-foot`×1 |
| `jubilee/pages/confirm-email-change/confirm-email-change.page.html` | 1 | 5 | 0 | 0 | 0 | `btn`×9, `empty`×3, `spinner`×2, `auth-brand`×1, `auth-card`×1, `card`×1 |
| `jubilee/pages/conversation/conversation.page.html` | 8 | 6 | 1 | 0 | 10 | `bubble`×23, `btn`×14, `chat`×7, `skeleton`×6, `inbox`×3, `alert`×3, `avatar`×1, `chip`×1, `composer`×1, `textarea`×1 |
| `jubilee/pages/data-download/data-download.page.html` | 1 | 2 | 0 | 0 | 0 | `btn`×4, `alert`×4, `page-header`×1, `subtitle`×1, `card`×1 |
| `jubilee/pages/edit-listing/edit-listing.page.html` | 9 | 9 | 10 | 0 | 12 | `field`×26, `alert`×18, `btn`×17, `input`×7, `skeleton`×5, `optional`×4, `media`×3, `card`×2, `close`×1, `form-summary`×1, `textarea`×1, `select`×1, `inline-status`×1 |
| `jubilee/pages/forbidden/forbidden.page.html` | 1 | 2 | 0 | 0 | 0 | `btn`×3, `status-page`×1 |
| `jubilee/pages/forgot-password/forgot-password.page.html` | 2 | 4 | 1 | 0 | 0 | `btn`×9, `alert`×8, `field`×3, `auth-brand`×1, `auth-card`×1, `card`×1, `form-summary`×1, `input`×1, `auth-foot`×1 |
| `jubilee/pages/help/help.page.html` | 1 | 3 | 0 | 0 | 1 | `skeleton`×8, `btn`×5, `accordion`×2, `breadcrumb`×1, `page-header`×1, `subtitle`×1, `card`×1 |
| `jubilee/pages/incoming-requests/incoming-requests.page.html` | 6 | 8 | 0 | 0 | 2 | `btn`×12, `skeleton`×10, `row`×9, `rows`×2, `badge`×2, `tabs`×1, `tab`×1, `avatar`×1 |
| `jubilee/pages/join-agreement/join-agreement.page.html` | 1 | 1 | 1 | 0 | 0 | `alert`×8, `btn`×4, `choice`×2, `auth-brand`×1, `auth-card`×1, `card`×1, `form-summary`×1, `field`×1 |
| `jubilee/pages/join/join.page.html` | 3 | 6 | 6 | 0 | 0 | `field`×17, `btn`×13, `alert`×8, `optional`×5, `input`×5, `choice`×2, `auth-brand`×1, `auth-card`×1, `card`×1, `form-summary`×1, `divider-text`×1, `auth-foot`×1 |
| `jubilee/pages/list-business/list-business.page.html` | 5 | 9 | 9 | 0 | 9 | `field`×24, `btn`×17, `alert`×15, `empty`×11, `timeline`×9, `choice-card`×8, `skeleton`×7, `input`×5, `optional`×4, `biz-card`×4, `card`×2, `item-list`×2, `choice`×2, `subtitle`×1, `form-summary`×1, `choice-cards`×1, `select`×1, `media`×1, `price`×1, `perk`×1 |
| `jubilee/pages/maintenance/maintenance.page.html` | 1 | 1 | 0 | 0 | 0 | `btn`×2, `auth-brand`×1, `auth-card`×1, `card`×1 |
| `jubilee/pages/messages/inbox-list.html` | 2 | 2 | 1 | 0 | 1 | `thread`×10, `skeleton`×7, `btn`×3, `list`×2, `inbox`×1, `search`×1, `input`×1, `avatar`×1 |
| `jubilee/pages/messages/messages.page.html` | 1 | 3 | 0 | 0 | 0 | `btn`×5, `inbox`×3, `page-header`×1, `subtitle`×1 |
| `jubilee/pages/my-business/my-business.page.html` | 6 | 12 | 0 | 0 | 9 | `btn`×23, `alert`×23, `row`×19, `stat`×18, `skeleton`×17, `card`×9, `timeline`×4, `section`×3, `rows`×3, `stat-grid`×2, `banner`×2, `page-header`×1, `subtitle`×1, `close`×1, `section-head`×1, `avatar`×1 |
| `jubilee/pages/my-business/workspace-header.html` | 0 | 1 | 0 | 0 | 0 | `tab`×5, `badge`×2, `page-header`×1, `subtitle`×1, `btn`×1, `tabs`×1 |
| `jubilee/pages/my-products/my-products.page.html` | 7 | 8 | 0 | 0 | 6 | `btn`×23, `skeleton`×8, `num`×4, `badge`×4, `row`×2, `rows`×1, `table-wrap`×1, `table`×1, `media`×1 |
| `jubilee/pages/my-services/my-services.page.html` | 7 | 8 | 0 | 0 | 4 | `btn`×23, `row`×10, `skeleton`×6, `rows`×2 |
| `jubilee/pages/not-found/not-found.page.html` | 0 | 2 | 0 | 0 | 0 | `btn`×3, `status-page`×1 |
| `jubilee/pages/notification-settings/notification-settings.page.html` | 1 | 2 | 2 | 0 | 5 | `skeleton`×8, `tab`×4, `inline-status`×4, `row`×4, `btn`×3, `card`×3, `dot`×3, `field`×2, `page-header`×1, `subtitle`×1, `tabs`×1, `rows`×1, `switch`×1, `select`×1 |
| `jubilee/pages/notifications/notifications.page.html` | 2 | 5 | 0 | 0 | 2 | `btn`×8, `notif`×8, `skeleton`×8, `card`×4, `list`×2, `page-header`×1, `subtitle`×1 |
| `jubilee/pages/offline/offline.page.html` | 1 | 2 | 0 | 0 | 0 | `btn`×3, `auth-brand`×1, `auth-card`×1, `card`×1 |
| `jubilee/pages/policy/policy.page.html` | 1 | 2 | 0 | 0 | 3 | `skeleton`×8, `btn`×3, `breadcrumb`×1 |
| `jubilee/pages/product/product-request-form.html` | 2 | 3 | 2 | 0 | 5 | `btn`×9, `field`×4, `alert`×4, `inline-status`×2, `chip`×1, `input`×1, `detail-head`×1 |
| `jubilee/pages/product/product.page.html` | 2 | 4 | 0 | 0 | 11 | `skeleton`×15, `btn`×6, `detail-head`×2, `breadcrumb`×1, `price`×1, `dl`×1, `section`×1, `section-head`×1, `card-grid`×1 |
| `jubilee/pages/request-detail/request-detail.page.html` | 2 | 8 | 0 | 0 | 8 | `btn`×12, `skeleton`×11, `alert`×6, `card`×5, `badge`×4, `timeline`×4, `breadcrumb`×2, `page-header`×1, `subtitle`×1, `dl`×1 |
| `jubilee/pages/requests/requests.page.html` | 4 | 6 | 0 | 0 | 2 | `row`×10, `skeleton`×10, `btn`×7, `badge`×5, `rows`×2, `page-header`×1, `subtitle`×1, `tabs`×1, `tab`×1, `avatar`×1 |
| `jubilee/pages/reset-password/reset-password.page.html` | 2 | 6 | 2 | 0 | 2 | `skeleton`×14, `btn`×11, `field`×9, `alert`×5, `input`×2, `auth-brand`×1, `auth-card`×1, `card`×1, `form-summary`×1 |
| `jubilee/pages/saved/saved.page.html` | 2 | 4 | 0 | 0 | 0 | `skeleton`×10, `btn`×8, `biz-card`×4, `card-grid`×2, `page-header`×1, `subtitle`×1, `saved-card`×1 |
| `jubilee/pages/search/search.page.html` | 4 | 8 | 1 | 0 | 7 | `btn`×14, `skeleton`×8, `row`×6, `page-header`×5, `subtitle`×4, `chip-row`×4, `input`×2, `section`×2, `chip`×2, `rows`×2, `media`×2, `search`×1, `tabs`×1, `tab`×1, `badge`×1 |
| `jubilee/pages/server-error/server-error.page.html` | 1 | 2 | 0 | 0 | 0 | `btn`×3, `auth-brand`×1, `auth-card`×1, `card`×1 |
| `jubilee/pages/session-expired/session-expired.page.html` | 0 | 1 | 0 | 0 | 0 | `btn`×2, `auth-brand`×1, `auth-card`×1, `card`×1 |
| `jubilee/pages/sign-in/sign-in.page.html` | 2 | 4 | 3 | 0 | 0 | `btn`×10, `alert`×8, `field`×6, `input`×2, `choice`×2, `auth-brand`×1, `auth-card`×1, `card`×1, `form-summary`×1, `divider-text`×1, `auth-foot`×1 |
| `jubilee/pages/verify-email/verify-email.page.html` | 3 | 8 | 0 | 0 | 0 | `btn`×13, `empty`×3, `spinner`×2, `auth-brand`×1, `auth-card`×1, `card`×1, `auth-foot`×1 |
| `jubilee/pages/welcome/welcome.page.html` | 0 | 3 | 0 | 0 | 1 | `btn`×9, `hero`×3, `section`×3, `section-head`×2, `chip-row`×1, `chip`×1, `steps`×1, `card-grid`×1, `band`×1 |
| `jubilee/toasts/toast-region.html` | 2 | 0 | 0 | 0 | 2 | `toast`×8, `close`×1 |
| `marketing/app.html` | 0 | 3 | 0 | 4 | 0 | `mkt-hero`×6, `mkt-wrap`×5, `mkt-icon`×5, `mkt-btn`×4, `mkt-nav`×3, `mkt-accent`×3, `mkt-footer`×3, `mkt-film`×2, `mkt-closing`×2, `skip-link`×1, `mkt-lead`×1, `mkt-link`×1, `mkt-h2`×1 |
| `marketing/benefits/benefits.html` | 0 | 0 | 0 | 0 | 0 | `mkt-why`×3, `mkt-h3`×3, `mkt-body`×3, `mkt-wrap`×1, `mkt-h2`×1, `mkt-accent`×1, `mkt-lead`×1, `mkt-rules`×1 |
| `marketing/business-card/business-card.html` | 0 | 0 | 0 | 1 | 0 | `mkt-card`×9, `mkt-icon`×1 |
| `marketing/for-businesses/for-businesses.html` | 0 | 1 | 0 | 1 | 0 | `mkt-owners`×3, `mkt-btn`×2, `mkt-wrap`×1, `mkt-h2`×1, `mkt-accent`×1, `mkt-icon`×1, `mkt-points`×1 |
| `marketing/hero-visual/hero-visual.html` | 0 | 0 | 0 | 4 | 0 | `mkt-glimpse`×9, `mkt-note`×6, `mkt-icon`×4, `mkt-truncate`×3 |
| `marketing/how-it-works/how-it-works.html` | 0 | 0 | 0 | 0 | 0 | `mkt-step`×6, `mkt-how`×3, `mkt-h3`×3, `mkt-body`×3, `mkt-wrap`×1, `mkt-h2`×1, `mkt-accent`×1, `mkt-steps`×1 |
| `marketing/inside-the-app/inside-the-app.html` | 0 | 0 | 0 | 1 | 0 | `mkt-inside`×4, `mkt-cards`×2, `mkt-wrap`×1, `mkt-h2`×1, `mkt-accent`×1, `mkt-lead`×1, `mkt-link`×1, `mkt-icon`×1 |
| `marketing/lockup/lockup.html` | 0 | 0 | 0 | 1 | 0 | `mkt-lockup`×3 |
| `marketing/pitch-video/pitch-video.html` | 2 | 0 | 0 | 1 | 0 | `mkt-player`×8, `mkt-chapter`×3, `mkt-chapters`×1 |
