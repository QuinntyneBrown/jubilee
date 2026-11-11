# Jubilee design system

Extracted from [docs/mocks](../mocks/README.md) (67 screens, 271 mocks) on Tuesday 10 November 2026. Open [index.html](index.html) locally; no server or network is needed. Press `t` or use the sidebar toggle to switch themes.

The system is the product's visual and interaction language written down once: tokens, 12 foundation pages, one page per component (anatomy, variants, sizes, every state, responsive, theming, accessibility, content, do/don't, tokens, code, sources) and 8 pattern pages. Both themes pass WCAG 2.2 AA. The mocks now load this system's CSS directly.

## Foundations

| Page | Covers |
|---|---|
| [Color](foundations/color.html) | Ink, cream, gold and green ramps; semantic roles; status colours; both themes; every contrast pair live |
| [Typography](foundations/typography.html) | Archivo + Inter, 12 role shorthands, weights, measure, responsive type |
| [Spacing](foundations/spacing.html) | 4px scale, inside vs between rules, padding by control size |
| [Layout](foundations/layout.html) | Breakpoints, 4/8/12 columns, gutters, margins, live grid, page templates |
| [Elevation](foundations/elevation.html) | 4 shadow levels, surface ladder, dark-theme elevation, z-order |
| [Shape](foundations/shape.html) | Radii, border widths, avatar/badge/indicator sizes |
| [Motion](foundations/motion.html) | Durations, easings, replayable demos, choreography, reduced motion |
| [Iconography](foundations/iconography.html) | 24-unit 2px-stroke icon set, the 46 icons in the mocks, sizes, labelling |
| [Theming](foundations/theming.html) | Token tiers, data-theme, adding a theme, tokens.json |
| [Responsive](foundations/responsive.html) | Behaviour of every component per breakpoint, touch, test matrix |
| [Accessibility](foundations/accessibility.html) | WCAG 2.2 AA commitments, focus ring, testing, component contract |
| [Content](foundations/content.html) | Voice and tone, mechanics, error and empty-state formulas, microcopy library |

## Components

### Actions

| Component | Variants (state matrix rows) | States | Source mocks |
|---|---|---|---|
| [Button](components/button.html) | Primary, Secondary, Ghost, Link, Danger | Default, Hover, Focus, Active, Disabled, Loading | [pages/business/default](../mocks/pages/business/default.html), [pages/product/default](../mocks/pages/product/default.html), [dialogs/delete-product/default](../mocks/dialogs/delete-product/default.html) |
| [Button group](components/button-group.html) | Toggle set, Switch (sm), Action pair | Default, Hover, Focus, Active, Disabled, Pressed | [dialogs/service-editor/default](../mocks/dialogs/service-editor/default.html), [pages/my-business/default](../mocks/pages/my-business/default.html), [pages/edit-listing/default](../mocks/pages/edit-listing/default.html) |
| [Link](components/link.html) | Inline, Back link, Standalone, Muted | Default, Hover, Focus, Active, Disabled | [pages/sign-in/default](../mocks/pages/sign-in/default.html), [pages/sign-up/default](../mocks/pages/sign-up/default.html), [pages/business/default](../mocks/pages/business/default.html) |
| [Menu](components/menu.html) | Item, Danger item, Anchored (start, end), Item with icon | Default, Hover, Focus, Active, Disabled, Checked, Open, Closed | [dialogs/user-menu/default](../mocks/dialogs/user-menu/default.html), [pages/my-products/default](../mocks/pages/my-products/default.html), [pages/category/default](../mocks/pages/category/default.html), [pages/conversation/menu](../mocks/pages/conversation/menu.html), [pages/conversation/muted](../mocks/pages/conversation/muted.html) |

### Inputs

| Component | Variants (state matrix rows) | States | Source mocks |
|---|---|---|---|
| [Text field](components/text-field.html) | Text, Search, Prefix add-on, Date | Default, Hover, Focus, Active, Disabled, Read-only, Invalid | [pages/sign-up/invalid](../mocks/pages/sign-up/invalid.html), [pages/edit-listing/default](../mocks/pages/edit-listing/default.html), [pages/search/default](../mocks/pages/search/default.html) |
| [Textarea](components/textarea.html) | Textarea | Default, Hover, Focus, Active, Disabled, Read-only, Invalid | [pages/edit-listing/default](../mocks/pages/edit-listing/default.html), [dialogs/new-message/default](../mocks/dialogs/new-message/default.html), [dialogs/report-listing/default](../mocks/dialogs/report-listing/default.html) |
| [Select](components/select.html) | Select | Default, Hover, Focus, Active, Disabled, Invalid | [pages/edit-listing/default](../mocks/pages/edit-listing/default.html), [dialogs/book-meeting/default](../mocks/dialogs/book-meeting/default.html), [pages/category/default](../mocks/pages/category/default.html) |
| [Checkbox](components/checkbox.html) | Unchecked, Checked, Indeterminate | Default, Hover, Focus, Active, Disabled, Invalid | [pages/sign-in/default](../mocks/pages/sign-in/default.html), [pages/sign-up/invalid](../mocks/pages/sign-up/invalid.html), [dialogs/filters/default](../mocks/dialogs/filters/default.html) |
| [Radio group](components/radio-group.html) | Radio, Radio, selected, Choice card, Choice card, selected | Default, Hover, Focus, Active, Disabled, Invalid | [pages/list-business/default](../mocks/pages/list-business/default.html), [pages/list-business/invalid](../mocks/pages/list-business/invalid.html), [dialogs/order-request/default](../mocks/dialogs/order-request/default.html) |
| [Switch](components/switch.html) | Off, On | Default, Hover, Focus, Active, Disabled | [pages/preferences/default](../mocks/pages/preferences/default.html), [pages/preferences/submitting](../mocks/pages/preferences/submitting.html), [pages/preferences/success](../mocks/pages/preferences/success.html) |
| [Form field](components/form-field.html) | Field | Default, Hover, Focus, Active, Disabled, Invalid | [pages/sign-up/invalid](../mocks/pages/sign-up/invalid.html), [pages/edit-listing/invalid](../mocks/pages/edit-listing/invalid.html), [pages/list-business/services](../mocks/pages/list-business/services.html) |
| [Form layout](components/form-layout.html) | Form actions | Default, Submitting, Saved, Failed | [pages/edit-listing/invalid](../mocks/pages/edit-listing/invalid.html), [pages/edit-listing/submitting](../mocks/pages/edit-listing/submitting.html), [pages/list-business/services](../mocks/pages/list-business/services.html) |

### Navigation

| Component | Variants (state matrix rows) | States | Source mocks |
|---|---|---|---|
| [Top bar](components/top-bar.html) | Nav link, ink, Nav link, plain, Icon button, ink | Default, Hover, Focus, Active, Current, Disabled | [pages/browse/default](../mocks/pages/browse/default.html), [pages/browse/signed-out](../mocks/pages/browse/signed-out.html), [pages/admin-verifications/default](../mocks/pages/admin-verifications/default.html) |
| [Tab bar](components/tab-bar.html) | Tab bar item | Default, Hover, Focus, Active, Current, Disabled | [pages/browse/default](../mocks/pages/browse/default.html), [pages/messages/default](../mocks/pages/messages/default.html), [pages/account/default](../mocks/pages/account/default.html) |
| [Sidebar navigation](components/sidebar-navigation.html) | Sidebar link | Default, Hover, Focus, Active, Current, Disabled | [pages/my-business/default](../mocks/pages/my-business/default.html), [pages/account/default](../mocks/pages/account/default.html), [pages/admin-verifications/default](../mocks/pages/admin-verifications/default.html) |
| [Tabs](components/tabs.html) | In-page tab, Page tab | Default, Hover, Focus, Active, Selected / current, Disabled | [pages/requests/default](../mocks/pages/requests/default.html), [pages/search/default](../mocks/pages/search/default.html), [pages/admin-verifications/default](../mocks/pages/admin-verifications/default.html) |
| [Breadcrumb](components/breadcrumb.html) | Breadcrumb item | Default, Hover, Focus, Active, Current, Disabled | [pages/product/default](../mocks/pages/product/default.html), [pages/category/default](../mocks/pages/category/default.html), [pages/request-detail/default](../mocks/pages/request-detail/default.html) |
| [Pagination](components/pagination.html) | Page link | Default, Hover, Focus, Active, Current, Disabled | [pages/category/long](../mocks/pages/category/long.html), [pages/category/default](../mocks/pages/category/default.html), [pages/search/default](../mocks/pages/search/default.html) |
| [Stepper](components/stepper.html) | Stepper item | Upcoming, Current, Complete, Error | [pages/welcome/default](../mocks/pages/welcome/default.html), [pages/list-business/default](../mocks/pages/list-business/default.html), [pages/list-business/services](../mocks/pages/list-business/services.html) |
| [Footer](components/footer.html) | Footer link | Default, Hover, Focus, Active, Disabled | [pages/browse/default](../mocks/pages/browse/default.html), [pages/business/default](../mocks/pages/business/default.html), [pages/help/default](../mocks/pages/help/default.html) |
| [Skip link](components/skip-link.html) | Skip link | Default (hidden), Hover, Focus (shown), Active, Disabled | [pages/browse/default](../mocks/pages/browse/default.html), [pages/sign-in/default](../mocks/pages/sign-in/default.html), [pages/server-error/default](../mocks/pages/server-error/default.html) |

### Containers

| Component | Variants (state matrix rows) | States | Source mocks |
|---|---|---|---|
| [Card](components/card.html) | Static, Interactive, Selected | Default, Hover, Focus, Active, Disabled, Selected | [pages/request-detail/default](../mocks/pages/request-detail/default.html), [pages/account/default](../mocks/pages/account/default.html), [pages/my-business/default](../mocks/pages/my-business/default.html) |
| [Accordion](components/accordion.html) | Collapsed, Expanded | Default, Hover, Focus, Active, Disabled | [pages/help/default](../mocks/pages/help/default.html) |
| [Dialog](components/dialog.html) | Destructive, Form, Information | Default, Focus, Busy, Invalid, Failed, Success | [dialogs/delete-product/default](../mocks/dialogs/delete-product/default.html), [dialogs/delete-product/busy](../mocks/dialogs/delete-product/busy.html), [dialogs/book-meeting/invalid](../mocks/dialogs/book-meeting/invalid.html) |
| [Drawer](components/drawer.html) | Right | Open, Busy | [dialogs/filters/default](../mocks/dialogs/filters/default.html), [dialogs/user-menu/default](../mocks/dialogs/user-menu/default.html), [pages/category/default](../mocks/pages/category/default.html) |
| [Popover](components/popover.html) | Informational | Closed, Open, Trigger hover, Trigger focus, Action focus | [dialogs/user-menu/default](../mocks/dialogs/user-menu/default.html), [pages/business/default](../mocks/pages/business/default.html), [pages/help/default](../mocks/pages/help/default.html) |
| [Tooltip](components/tooltip.html) | Label | Default, Hover, Focus, Active, Disabled | [pages/my-products/default](../mocks/pages/my-products/default.html), [pages/business/default](../mocks/pages/business/default.html), [pages/browse/default](../mocks/pages/browse/default.html) |
| [Divider](components/divider.html) | — | — | [pages/sign-in/default](../mocks/pages/sign-in/default.html), [pages/sign-up/default](../mocks/pages/sign-up/default.html), [pages/sign-in/invalid](../mocks/pages/sign-in/invalid.html) |
| [Layout primitives](components/layout-primitives.html) | — | — | [pages/browse/default](../mocks/pages/browse/default.html), [pages/my-business/default](../mocks/pages/my-business/default.html), [pages/business/default](../mocks/pages/business/default.html) |

### Data display

| Component | Variants (state matrix rows) | States | Source mocks |
|---|---|---|---|
| [Table](components/table.html) | — | — | [pages/my-products/default](../mocks/pages/my-products/default.html), [pages/admin-verifications/default](../mocks/pages/admin-verifications/default.html), [pages/my-products/loading](../mocks/pages/my-products/loading.html) |
| [List](components/list.html) | Interactive item, Row action | Default, Hover, Focus, Active, Current | [pages/business/default](../mocks/pages/business/default.html), [pages/my-business/default](../mocks/pages/my-business/default.html), [pages/my-services/default](../mocks/pages/my-services/default.html) |
| [Description list](components/description-list.html) | — | — | [pages/business/default](../mocks/pages/business/default.html), [pages/request-detail/default](../mocks/pages/request-detail/default.html), [pages/product/default](../mocks/pages/product/default.html) |
| [Avatar](components/avatar.html) | Brand link, Default | Default, Hover, Focus, Active, Loading | [pages/messages/default](../mocks/pages/messages/default.html), [pages/my-business/default](../mocks/pages/my-business/default.html), [dialogs/user-menu/default](../mocks/dialogs/user-menu/default.html) |
| [Badge](components/badge.html) | Neutral, Info, Success, Warning, Danger, Solid, Count | On surface, In a row, In a selected tab | [pages/my-products/default](../mocks/pages/my-products/default.html), [pages/admin-verifications/default](../mocks/pages/admin-verifications/default.html), [pages/messages/default](../mocks/pages/messages/default.html) |
| [Chip](components/chip.html) | Filter, Selected filter, Link, Choice, Removable | Default, Hover, Focus, Active, Disabled, Selected | [pages/category/default](../mocks/pages/category/default.html), [pages/category/no-results](../mocks/pages/category/no-results.html), [pages/browse/default](../mocks/pages/browse/default.html) |
| [Stat](components/stat.html) | Stat | Loaded, Loading, No data yet, Error | [pages/my-business/default](../mocks/pages/my-business/default.html), [pages/my-business/loading](../mocks/pages/my-business/loading.html), [pages/my-business/pending](../mocks/pages/my-business/pending.html) |
| [Timeline](components/timeline.html) | Step | Done, Current, Next, Stopped | [pages/request-detail/default](../mocks/pages/request-detail/default.html), [pages/request-detail/confirmed](../mocks/pages/request-detail/confirmed.html), [pages/request-detail/declined](../mocks/pages/request-detail/declined.html) |
| [Business card](components/business-card.html) | Business card, Product card, Saved card (remove button) | Default, Hover, Focus, Active, Disabled, Loading | [pages/browse/default](../mocks/pages/browse/default.html), [pages/saved/default](../mocks/pages/saved/default.html), [pages/category/default](../mocks/pages/category/default.html) |
| [Directory row](components/directory-row.html) | Row, See all link | Default, Hover, Focus, Active, Disabled, Loading | [pages/browse/default](../mocks/pages/browse/default.html), [pages/browse/edge](../mocks/pages/browse/edge.html), [pages/category/default](../mocks/pages/category/default.html) |
| [Media tile](components/media-tile.html) | Neutral, Gold, Green, Blue, Ink | Placeholder, In a hovered card, Loading, Photo failed | [pages/browse/default](../mocks/pages/browse/default.html), [pages/business/default](../mocks/pages/business/default.html), [pages/product/default](../mocks/pages/product/default.html) |
| [Message thread](components/message-thread.html) | Read thread, Unread thread, Current thread, Bubble (theirs, mine), Photo in a bubble, Request card (booking, quote, order), Photo control (empty, with a photo) | Default, Hover, Focus, Active, Disabled, Loading, Sending, Failed, Photo unavailable, Awaiting reply, Confirmed, Declined, Cancelled, Completed | [pages/messages/default](../mocks/pages/messages/default.html), [pages/conversation/default](../mocks/pages/conversation/default.html), [pages/conversation/sending](../mocks/pages/conversation/sending.html), [pages/conversation/photo](../mocks/pages/conversation/photo.html), [pages/conversation/photo-attached](../mocks/pages/conversation/photo-attached.html), [pages/conversation/photo-sending](../mocks/pages/conversation/photo-sending.html), [pages/conversation/requests](../mocks/pages/conversation/requests.html), [pages/conversation/arrived](../mocks/pages/conversation/arrived.html) |
| [Notification item](components/notification-item.html) | Unread, Read | Default, Hover, Focus, Active, Disabled, Loading | [pages/notifications/default](../mocks/pages/notifications/default.html), [pages/notifications/read](../mocks/pages/notifications/read.html), [pages/notifications/loading](../mocks/pages/notifications/loading.html) |
| [Hero band](components/hero-band.html) | Category chip, Ghost button, Primary button | Default, Hover, Focus, Active, Disabled, Current | [pages/browse/default](../mocks/pages/browse/default.html), [pages/browse/signed-out](../mocks/pages/browse/signed-out.html), [pages/welcome/default](../mocks/pages/welcome/default.html) |

### Feedback

| Component | Variants (state matrix rows) | States | Source mocks |
|---|---|---|---|
| [Toast](components/toast.html) | Info, Success, Warning, Danger | Default, Dismiss hover, Action focus, Dismiss focus | [notifications/toast/stacked](../mocks/notifications/toast/stacked.html), [notifications/toast/with-action](../mocks/notifications/toast/with-action.html), [notifications/request-toast/with-action](../mocks/notifications/request-toast/with-action.html) |
| [Alert and banner](components/alert.html) | Info, Success, Warning, Danger | Default, With action, Action focus, Dismiss focus | [notifications/offline-banner/persistent](../mocks/notifications/offline-banner/persistent.html), [notifications/verification-banner/warning](../mocks/notifications/verification-banner/warning.html), [notifications/verify-email-banner/persistent](../mocks/notifications/verify-email-banner/persistent.html) |
| [Inline message](components/inline-message.html) | Help, No help | Default, Hover, Focus, Invalid, Disabled | [pages/sign-up/invalid](../mocks/pages/sign-up/invalid.html), [dialogs/order-request/invalid](../mocks/dialogs/order-request/invalid.html), [pages/preferences/success](../mocks/pages/preferences/success.html) |
| [Progress bar](components/progress-bar.html) | Upload | 0%, In progress, Complete, Failed, Unknown | [dialogs/product-editor/default](../mocks/dialogs/product-editor/default.html), [notifications/message-toast/warning](../mocks/notifications/message-toast/warning.html), [pages/list-business/default](../mocks/pages/list-business/default.html) |
| [Spinner](components/spinner.html) | Spinner | Spinning, In a busy button, In a busy danger button | [pages/verify-email/loading](../mocks/pages/verify-email/loading.html), [dialogs/sign-out/busy](../mocks/dialogs/sign-out/busy.html), [dialogs/book-meeting/busy](../mocks/dialogs/book-meeting/busy.html) |
| [Skeleton](components/skeleton.html) | Text block | Loading (shimmer), Reduced motion (static) | [pages/browse/loading](../mocks/pages/browse/loading.html), [pages/messages/loading](../mocks/pages/messages/loading.html), [pages/sign-in/loading](../mocks/pages/sign-in/loading.html) |
| [Empty state](components/empty-state.html) | First use, No results, Error | Default, Hover, Focus, Active, Loading | [pages/saved/empty](../mocks/pages/saved/empty.html), [pages/my-products/empty](../mocks/pages/my-products/empty.html), [pages/messages/no-results](../mocks/pages/messages/no-results.html) |
| [Error page](components/error-page.html) | Not found, Server error, Offline | Default, Hover, Focus, Active, Loading | [pages/not-found/default](../mocks/pages/not-found/default.html), [pages/forbidden/default](../mocks/pages/forbidden/default.html), [pages/server-error/default](../mocks/pages/server-error/default.html) |

## Patterns

| Pattern | Covers |
|---|---|
| [Forms](patterns/forms.html) | Every Jubilee form follows one recipe: a visible label for each control, help before the input, an error under it, a summary at the top that links to each error, and one primary action that names what happens next. |
| [Feedback and loading](patterns/feedback-and-loading.html) | Feedback answers two questions a member always has: is it working, and did it work? Jubilee answers both as close to the action as possible, at the smallest size that will be noticed. |
| [Empty and error states](patterns/empty-and-error-states.html) | An empty or broken screen is still a step in someone’s task. Jubilee always says why it is empty, reassures that nothing is lost, and offers the next action. |
| [Navigation and page structure](patterns/navigation.html) | Every Jubilee page answers where am I, what can I do here and how do I get back, with the same few parts in the same places. |
| [Dialogs and overlays](patterns/dialogs-and-overlays.html) | An overlay borrows the member’s attention. Jubilee uses one only to finish a small task in place or to confirm something that is hard to undo, and always gives the attention back where it was. |
| [Data tables and lists](patterns/tables-and-lists.html) | Jubilee shows a collection in the shape of the decision people make with it: browse by picture, act on a request, scan a queue. The shape decides the component; the states are shared. |
| [Notifications](patterns/notifications.html) | Jubilee’s messages run on a request lifecycle: a member asks, a business confirms or declines, Jubilee verifies listings. Each change reaches the right person once, in the channel that fits how urgent and how lasting it is. |
| [Content and tone](patterns/content-and-tone.html) | Jubilee speaks like a trusted member of the congregation who also runs a good business: warm, plain and direct. It never preaches and never sells. |

## Tokens

- [`tokens/tokens.css`](tokens/tokens.css) — the single source of truth: primitives, semantic tokens, light and dark themes, reduced-motion, high-contrast and forced-colours overrides.
- [`tokens/tokens.json`](tokens/tokens.json) — DTCG export generated from tokens.css (`tokens_to_json.py`); dark values under `$extensions`. Never edit by hand.
- [`tokens/contrast-pairs.json`](tokens/contrast-pairs.json) — every foreground/background pairing the components rely on, checked in both themes.
- [`assets/components.css`](assets/components.css) — the product stylesheet: every component class, token-only, with `data-state` hooks for static documentation.
- `assets/ds.css`, `assets/ds.js` — documentation chrome only (navigation, swatches, live token values and contrast ratios). Not product UI.

To use the system: link `tokens/tokens.css` then `assets/components.css`, use the classes from each component page's Code section, and set `data-theme` on `<html>` (or let the OS decide).

## Drift found in the mocks

Every inconsistency found while extracting, and how the system resolved it. *Open* items are recorded for the next pass over the mocks.

| Mock | Issue | Resolution |
|---|---|---|
| assets/tokens.css | Light semantic colours were declared on `:root` only, so a `[data-theme="light"]` region inside a dark page inherited dark values. | Light semantic block now targets `:root, [data-theme="light"]`; theme-dependent aliases (`--color-focus-ring-offset`, `--shadow-focus`, shadows) are declared in every theme block. |
| assets/tokens.css | Dark theme used five raw hex values (`#070a0f`, `#eceae4`, `#b9bcc4`, `#9a9fa9`, `#8b909b`). | Added primitives `--palette-ink-975` and `--palette-ink-350`; `#eceae4` collapsed into `--palette-ink-100`, `#b9bcc4` is `--palette-ink-300`, and `#9a9fa9`/`#8b909b` merged into `--palette-ink-350` (border-strong and fg-subtle both pass). |
| assets/tokens.css | Comments disagreed with values: `--radius-md` 10px (said 8px), `--radius-lg` 16px (said 12px), `--radius-xl` 20px (said 16px), `--control-height-md` 44px (said 40px), duplicate tab-bar comment. | Values kept as rendered in the mocks (they were reviewed); comments and docs corrected. |
| assets/tokens.css | Backdrop used legacy `rgba()`; no layout token for the 42rem form column. | `rgb(… / a)` syntax; added `--layout-container-narrow`, sizing tokens (`--icon-size-*`, `--avatar-size-*`, `--indicator-size`, `--badge-height`), `--border-width-accent`, `--duration-spin`, `--duration-loop`. |
| notifications/*-toast (dark) | Toast status icons used the surface icon tokens on the inverse (cream) toast: 1.7–1.9:1 in dark. | New `--color-{info,success,warning,danger}-icon-inverse` tokens (≥ 3:1 both themes, checked); toasts read them through `--toast-icon`. |
| notifications/*-toast | Toast body text had `opacity: 0.9`, an unchecked contrast. | Opacity removed; text uses `--color-fg-inverse` at full strength. |
| assets/ui.css | Primary-button edge in the starter pairs was plain gold (1.6:1 on cream). | Gold controls use `--color-accent-border` (gold-600) for their edge; the 3:1 pairs are checked on page, surface and raised. |
| pages/*, dialogs/* (58 files, 114 uses) | `.media--ink` was used for charcoal/ink products but never defined, so it rendered as the default tile. | Defined as a deeper neutral tile (`--color-bg-subtle-hover` with `--color-fg-muted` glyph), close to what was reviewed. A solid-ink tile was tried and rejected: it turned whole category grids black. |
| assets/ui.css | Brand overrides were layered after the kit (pill radius, gold edge, semibold primary, gold selected chip, gold count badge, ink selected tab, h1 size), so the kit and the brand disagreed (kit chip selected = gold tint, brand = solid gold). | Merged into the base rules; the brand look is the only look. |
| assets/ui.css | Raw durations (0.8s spinner, 1.4s shimmer and indeterminate bar, 1.6s pulse) and raw sizes (1.1em spinner, 22px badge, 6px badge dot, 2px tab radius, 5px tooltip arrow, `-1px` offsets, `1px` borders). | `--duration-spin` / `--duration-loop` (pulse normalised to 1.4s); badge 20px (`--badge-height`), dot 8px (`--indicator-size`), `--radius-xs`, `--space-1`, `--border-width-hairline`. |
| assets/ui.css | Reduced motion used a global `* { animation-iteration-count: 1 !important }`, which also stopped spinners. | Durations are zeroed in tokens; only looping decoration (shimmer, pulse, indeterminate) is switched off; spinners keep turning. |
| assets/ui.css | Progress fill was gold on a neutral track (≈1.3:1). | Fill uses `--color-fg-accent` (green in light, gold-300 in dark); pair checked at ≥ 3:1. |
| pages/* (55 files) | Choice chips (`<label class="chip">` around a hidden radio) had no checked or keyboard-focus style. | `.chip:has(input:checked)` and `.chip:has(input:focus-visible)` added; chips no longer wrap (`white-space: nowrap`). |
| assets/ui.css | `.list__item:last-child` removed every divider when the class sat on a link inside an `<li>`. | Rule also matches `.list > :last-child > .list__item`. |
| assets/ui.css | `.field__error::before` "⚠" was read aloud as "warning sign". | Alt-text-empty content (`content: "⚠" / ""`). |
| notifications/*-banner (15 files) | Inline `style="margin: 0"` on banner actions and `margin: 0; padding-left` on lists inside alerts (17×). | `.banner .alert__actions` and `.alert__list` classes added. *Open:* mocks still carry the inline styles. |
| pages/*/loading (40 uses) | Skeleton buttons and inputs sized inline (`style="width: 5rem"`, `height: var(--control-height-md)` 26×). | `.skeleton--btn-sm`, `.skeleton--input`, `.skeleton--btn-block`. *Open:* mocks still use the inline styles. |
| dialogs/*, pages/* (40 uses) | `style="max-width: 42rem"` repeated inline. | `.container--narrow` / `.measure-narrow` read `--layout-container-narrow`. *Open:* mocks still inline it. |
| pages/* (849 uses) | `style="display: block"` on truncated taglines, snippets and titles; inline flex tweaks in tables and timelines. | *Open:* left in the mocks; the documented markup uses block elements and the component classes. |
| notifications/*-toast (danger) | `role="alert"` toasts nested inside the polite `role="status"` region. | Docs use a separate assertive region for danger toasts. *Open* in the mocks. |
| notifications/*-toast | Mock notes promise 8 s timing that pauses on hover and focus; `.toast__progress` is a static 60% bar. | Documented as product behaviour (JS timer); the bar is presentation only. *Open:* countdown animation. |
| pages/server-error, offline, maintenance | "Try again" / "Check again" are links to other pages, not retry buttons. | Error-page docs specify a retry `<button>`. *Open* in the mocks. |
| pages/*/loading | Loading regions never set `aria-busy`. | Skeleton and feedback pages require `aria-busy="true"` on the loading container. *Open* in the mocks. |
| pages/account, edit-listing | Footer "Saving…" status had no live region. | Form docs require `role="status"`. *Open* in the mocks. |
| pages/sign-up/invalid | Password error renders before the help text while `aria-describedby` lists help first. | Form-field docs fix the order: help, then error, both in `aria-describedby`. |
| pages/preferences | Two `.dot` status spans lack `aria-hidden`. | Inline-message docs mark dots decorative. *Open* in the mocks. |
| pages/request-detail/* | Timeline steps had no text for their status (done / current / stopped). | Timeline docs add visually hidden "Done:", "Current step:", "Next:", "Stopped:" prefixes. *Open* in the mocks. |
| pages/my-business/* | Stat deltas put a bare "↑" in the text; "2 new since yesterday" uses the trend style for a count. | Stat docs wrap arrows in `aria-hidden` and reserve deltas for trends. *Open* in the mocks. |
| notifications/request-toast/* | Tab totals use a neutral `.badge` with a status dot; stray `class="badge "` spaces. | Badge docs: counts use `.badge--count` with an `aria-label` noun. *Open* in the mocks. |
| pages/*, dialogs/* | Icon paths written with trailing zeros (`5.400`, `2.500`). | Iconography page publishes normalised paths; harmless in the mocks. |
| dialogs/* (21 dialogs, 71 mocks) | Destructive confirmations use `role="dialog"`; busy dialogs disable only Cancel, so Close and Esc can orphan the request; title and description wrappers are inline styles (`flex: 1`, `margin-top`) 68×. | Docs use `role="alertdialog"` for destructive confirms and block Close/Esc while busy; `.dialog__heading` and `.dialog__desc` added. *Open* in the mocks. |
| dialogs/book-meeting/*, pages/product/* | Time and size chips are labels around hidden radios with `style="position: relative"`; no `min` on the meeting date. | `.chip:has(input)` handles position, checked and focus; text-field docs require `min` on future dates. *Open* in the mocks. |
| assets/ui.css | Menu items removed the outline on focus, leaving a < 3:1 tint as the only indicator; switches had no hover; over-limit counters stayed subtle. | Menu focus keeps an inset ring; switch hover edge; `.field__counter[data-state="invalid"]`. |
| assets/ui.css | Tooltip had `pointer-events: none` (fails 1.4.13 hoverable), `nowrap` (overflows at 320px) and a raw 300ms delay. | Hoverable, wraps at 16rem, delay `--duration-slow`. |
| assets/ui.css | Tab indicator was plain gold (1.6:1 on cream); stepper hidden labels escaped scroll containers on phones; `.table-wrap` let hidden captions escape and widen the page. | Indicator `--color-accent-border`; `.stepper li` and `.table-wrap` are positioned. |
| pages/* (top bar, tab bar, directory groups) | Unread and group counts put `aria-label` on a bare `<span>`, which assistive tech ignores; the account avatar is a link to a dialog page. | Docs pair the visible number with visually hidden text; the avatar is specified as a menu button. *Open* in the mocks. |
| pages/requests, incoming-requests, admin-verifications | In-page tablists have no `aria-controls` or `role="tabpanel"` (1 of 11 has one). | Tabs and navigation pattern require a panel. *Open* in the mocks. |
| pages/conversation/* | Chat log has no `role="log"`; the failed bubble puts `role="alert"` on an `<li>`; pending bubbles and meta dim text with opacity. | Message-thread docs add `role="log"`, move the alert to `.bubble__meta` and use token colours. *Open* in the mocks. |
| pages/browse (pagination), sign-up | Disabled Previous page link keeps its `href`; the sign-up agreement checkbox is pre-checked; `.optional` wraps "(required)" 93×. | Pagination docs drop the `href`; consent defaults unchecked; `.field__label .required` alias added. *Open* in the mocks. |
| pages/* | Inconsistent dates ("28 Oct" vs "Wed 28 Oct"), prices ("$528.00 + tax" vs "$64") and support codes (502 and 503 for the same areas). | Content foundation fixes the formats (`Wed 28 Oct`, `$64`, `$528 + tax`). *Open* in the mocks. |
| (kit only) | Sidebar navigation, drawer, popover, tooltip, removable chips, avatar photo/group, `.badge--solid`, `.row-actions`, `.progress` and `.stepper` are in the kit but unused by any mock. | Documented as core components with honest "not yet in the mocks" notes; their CSS is kept. |

## Changelog

- **1.0 — 10 Nov 2026.** First extraction from docs/mocks. Value changes against the mocks' draft tokens are listed in the drift log above.
- **1.1 — 11 Nov 2026.** Messaging finished (ADR 0037). [Menu](components/menu.html): the menu anchored to its trigger, `.menu--end` and items with a leading icon, from the conversation's "More" menu. [Message thread](components/message-thread.html): the photo in a bubble (`.bubble__photo`, `.bubble__photo--missing`), the composer's photo control (`.attach`) and the request card (`.request-card`), which replaces `.chat__card.card`. [Iconography](foundations/iconography.html): `bell-off` added and `more` drawn as the mocks draw it, three dots in a column. No token was added or changed. The report, block and away period dialogs use existing components only.

## Verification

Run on 10 November 2026, all from the repository root:

| Check | Command | Result |
|---|---|---|
| Contrast, both themes | `python .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css` | 161 pairs passed, 0 failed |
| Structure | `python .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system` | 72 pages (51 components, 8 patterns), 0 errors, 0 warnings |
| Token export | `python .claude/skills/extracting-design-systems/scripts/tokens_to_json.py docs/design-system/tokens/tokens.css` | 290 tokens written to tokens.json |
| Mocks on the system CSS | `python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks` | 67 screens, 271 mocks, 0 errors, 0 warnings |
| No horizontal scroll | every page at 360px in light and dark (Playwright) | 72 of 72 pages fit |
| Screenshots reviewed | index, color, button, dialog, top-bar, text-field at 360 and 1280 px, light and dark | no overflow or clipped specimens; focus rings visible; dark dialogs and menus read as raised |
| Mocks before vs after | all 271 mocks at 360 and 1280 px, both themes, old CSS vs system CSS | median change 0.1% of pixels: badge size, chip and tab colours, gold progress and focus details. `.media--ink` tiles are now a deeper neutral |

Each token in `tokens.css` appears in the token table of exactly one foundation page (checked by script).
