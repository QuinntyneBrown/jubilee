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
| [Iconography](foundations/iconography.html) | 24-unit 2px-stroke icon set, 47 icons (the 46 in the mocks and `eye-off`), sizes, labelling |
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
| [Marketing button](components/marketing-button.html) | Ink, Pill, Gold, Submit button | Default, Hover, Focus, Active, Busy | [pages/marketing-home/default](../mocks/pages/marketing-home/default.html), [pages/marketing-home/business-busy](../mocks/pages/marketing-home/business-busy.html), [pages/marketing-home/notify-busy](../mocks/pages/marketing-home/notify-busy.html) |
| [Link](components/link.html) | Inline, Back link, Standalone, Muted | Default, Hover, Focus, Active, Disabled | [pages/sign-in/default](../mocks/pages/sign-in/default.html), [pages/sign-up/default](../mocks/pages/sign-up/default.html), [pages/business/default](../mocks/pages/business/default.html) |
| [Menu](components/menu.html) | Item, Danger item, Anchored (start, end), Item with icon | Default, Hover, Focus, Active, Disabled, Checked, Open, Closed | [dialogs/user-menu/default](../mocks/dialogs/user-menu/default.html), [pages/my-products/default](../mocks/pages/my-products/default.html), [pages/category/default](../mocks/pages/category/default.html), [pages/conversation/menu](../mocks/pages/conversation/menu.html), [pages/conversation/muted](../mocks/pages/conversation/muted.html) |

### Inputs

| Component | Variants (state matrix rows) | States | Source mocks |
|---|---|---|---|
| [Text field](components/text-field.html) | Text, Search, Prefix add-on, Date, Password | Default, Hover, Focus, Active, Disabled, Read-only, Invalid | [pages/sign-up/invalid](../mocks/pages/sign-up/invalid.html), [pages/edit-listing/default](../mocks/pages/edit-listing/default.html), [pages/search/default](../mocks/pages/search/default.html) |
| [Textarea](components/textarea.html) | Textarea | Default, Hover, Focus, Active, Disabled, Read-only, Invalid | [pages/edit-listing/default](../mocks/pages/edit-listing/default.html), [dialogs/new-message/default](../mocks/dialogs/new-message/default.html), [dialogs/report-listing/default](../mocks/dialogs/report-listing/default.html) |
| [Select](components/select.html) | Select | Default, Hover, Focus, Active, Disabled, Invalid | [pages/edit-listing/default](../mocks/pages/edit-listing/default.html), [dialogs/book-meeting/default](../mocks/dialogs/book-meeting/default.html), [pages/category/default](../mocks/pages/category/default.html) |
| [Checkbox](components/checkbox.html) | Unchecked, Checked, Indeterminate | Default, Hover, Focus, Active, Disabled, Invalid | [pages/sign-in/default](../mocks/pages/sign-in/default.html), [pages/sign-up/invalid](../mocks/pages/sign-up/invalid.html), [dialogs/filters/default](../mocks/dialogs/filters/default.html) |
| [Radio group](components/radio-group.html) | Radio, Radio, selected, Choice card, Choice card, selected | Default, Hover, Focus, Active, Disabled, Invalid | [pages/list-business/default](../mocks/pages/list-business/default.html), [pages/list-business/invalid](../mocks/pages/list-business/invalid.html), [dialogs/order-request/default](../mocks/dialogs/order-request/default.html) |
| [Switch](components/switch.html) | Off, On | Default, Hover, Focus, Active, Disabled | [pages/preferences/default](../mocks/pages/preferences/default.html), [pages/preferences/submitting](../mocks/pages/preferences/submitting.html), [pages/preferences/success](../mocks/pages/preferences/success.html) |
| [Form field](components/form-field.html) | Field | Default, Hover, Focus, Active, Disabled, Invalid | [pages/sign-up/invalid](../mocks/pages/sign-up/invalid.html), [pages/edit-listing/invalid](../mocks/pages/edit-listing/invalid.html), [pages/list-business/services](../mocks/pages/list-business/services.html) |
| [Form layout](components/form-layout.html) | Form actions | Default, Submitting, Saved, Failed | [pages/edit-listing/invalid](../mocks/pages/edit-listing/invalid.html), [pages/edit-listing/submitting](../mocks/pages/edit-listing/submitting.html), [pages/list-business/services](../mocks/pages/list-business/services.html) |
| [Launch form](components/launch-form.html) | Surface, Paper | Default, Invalid, Busy, Still sending, Rate limited, Challenge failed | [pages/marketing-home/default](../mocks/pages/marketing-home/default.html), [pages/marketing-home/business-invalid](../mocks/pages/marketing-home/business-invalid.html), [pages/marketing-home/notify-busy](../mocks/pages/marketing-home/notify-busy.html), [pages/marketing-home/notify-retrying](../mocks/pages/marketing-home/notify-retrying.html), [pages/marketing-home/notify-rate-limited](../mocks/pages/marketing-home/notify-rate-limited.html), [pages/marketing-home/notify-challenge-failed](../mocks/pages/marketing-home/notify-challenge-failed.html) |
| [Star scale](components/star-scale.html) | Empty star, Filled star | Default, Hover, Focus, Disabled, Invalid | [dialogs/feedback/default](../mocks/dialogs/feedback/default.html), [dialogs/feedback/rate-chosen](../mocks/dialogs/feedback/rate-chosen.html), [pages/feedback/rate-invalid](../mocks/pages/feedback/rate-invalid.html) |
| [Score scale](components/score-scale.html) | Option, Chosen option | Default, Hover, Focus, Disabled | [pages/feedback/default](../mocks/pages/feedback/default.html), [pages/feedback/sending](../mocks/pages/feedback/sending.html), [pages/list-business/success](../mocks/pages/list-business/success.html) |
| [File list](components/file-list.html) | Add button, Remove | Default, Hover, Focus, Disabled, Refused file | [pages/feedback/bug](../mocks/pages/feedback/bug.html), [pages/feedback/bug-screenshots](../mocks/pages/feedback/bug-screenshots.html) |
| [Term chooser](components/term-chooser.html) | Short stay, Long term, Room, Roommate (choice cards) | Default, Hover, Focus, Checked, Disabled | [pages/list-business/space](../mocks/pages/list-business/space.html), [pages/list-business/space-short-stay](../mocks/pages/list-business/space-short-stay.html), [pages/edit-listing/space](../mocks/pages/edit-listing/space.html) |
| [Term filter](components/term-filter.html) | Any length, Short stays, Long term, Rooms, Roommates (chips) | Default, Hover, Focus, Pressed, Nothing for the term | [pages/browse/default](../mocks/pages/browse/default.html), [pages/browse/rooms-term](../mocks/pages/browse/rooms-term.html), [pages/category/rooms-rentals](../mocks/pages/category/rooms-rentals.html), [pages/category/rooms-rentals-empty](../mocks/pages/category/rooms-rentals-empty.html) |
| [Included chips](components/included-chips.html) | Eight fixed items (toggle chips) | Default, Hover, Focus, Pressed, Disabled | [pages/list-business/space](../mocks/pages/list-business/space.html), [pages/edit-listing/space](../mocks/pages/edit-listing/space.html) |

### Navigation

| Component | Variants (state matrix rows) | States | Source mocks |
|---|---|---|---|
| [Top bar](components/top-bar.html) | Nav link, ink, Nav link, plain, Icon button, ink | Default, Hover, Focus, Active, Current, Disabled | [pages/browse/default](../mocks/pages/browse/default.html), [pages/browse/signed-out](../mocks/pages/browse/signed-out.html), [pages/admin-verifications/default](../mocks/pages/admin-verifications/default.html) |
| [Tab bar](components/tab-bar.html) | Tab bar item | Default, Hover, Focus, Active, Current, Disabled | [pages/browse/default](../mocks/pages/browse/default.html), [pages/messages/default](../mocks/pages/messages/default.html), [pages/account/default](../mocks/pages/account/default.html) |
| [Feedback launcher](components/feedback-launcher.html) | Launcher | Default, Hover, Focus, Active | [pages/browse/feedback-launcher](../mocks/pages/browse/feedback-launcher.html), [dialogs/feedback/default](../mocks/dialogs/feedback/default.html), [pages/conversation/default](../mocks/pages/conversation/default.html) |
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
| [Auth layout](components/auth-layout.html) | Default, Split | Default, Loading, Error, Invalid, Submitting, Success, Google unavailable, Google cancelled, Google refused | [pages/sign-in/default](../mocks/pages/sign-in/default.html), [pages/sign-up/invalid](../mocks/pages/sign-up/invalid.html), [pages/forgot-password/default](../mocks/pages/forgot-password/default.html) |

### Data display

| Component | Variants (state matrix rows) | States | Source mocks |
|---|---|---|---|
| [Table](components/table.html) | — | — | [pages/my-products/default](../mocks/pages/my-products/default.html), [pages/admin-verifications/default](../mocks/pages/admin-verifications/default.html), [pages/my-products/loading](../mocks/pages/my-products/loading.html) |
| [List](components/list.html) | Interactive item, Row action | Default, Hover, Focus, Active, Current | [pages/business/default](../mocks/pages/business/default.html), [pages/my-business/default](../mocks/pages/my-business/default.html), [pages/my-services/default](../mocks/pages/my-services/default.html) |
| [Description list](components/description-list.html) | — | — | [pages/business/default](../mocks/pages/business/default.html), [pages/request-detail/default](../mocks/pages/request-detail/default.html), [pages/product/default](../mocks/pages/product/default.html) |
| [Avatar](components/avatar.html) | Brand link, Default | Default, Hover, Focus, Active, Loading | [pages/messages/default](../mocks/pages/messages/default.html), [pages/my-business/default](../mocks/pages/my-business/default.html), [dialogs/user-menu/default](../mocks/dialogs/user-menu/default.html) |
| [Badge](components/badge.html) | Neutral, Info, Success, Warning, Danger, Solid, Count | On surface, In a row, In a selected tab | [pages/my-products/default](../mocks/pages/my-products/default.html), [pages/admin-verifications/default](../mocks/pages/admin-verifications/default.html), [pages/messages/default](../mocks/pages/messages/default.html) |
| [Launch badge](components/launch-badge.html) | Badge | Default | [pages/marketing-home/default](../mocks/pages/marketing-home/default.html), [pages/marketing-home/playing](../mocks/pages/marketing-home/playing.html) |
| [Chip](components/chip.html) | Filter, Selected filter, Link, Choice, Removable | Default, Hover, Focus, Active, Disabled, Selected | [pages/category/default](../mocks/pages/category/default.html), [pages/category/no-results](../mocks/pages/category/no-results.html), [pages/browse/default](../mocks/pages/browse/default.html) |
| [Stat](components/stat.html) | Stat | Loaded, Loading, No data yet, Error | [pages/my-business/default](../mocks/pages/my-business/default.html), [pages/my-business/loading](../mocks/pages/my-business/loading.html), [pages/my-business/pending](../mocks/pages/my-business/pending.html) |
| [Timeline](components/timeline.html) | Step | Done, Current, Next, Stopped | [pages/request-detail/default](../mocks/pages/request-detail/default.html), [pages/request-detail/confirmed](../mocks/pages/request-detail/confirmed.html), [pages/request-detail/declined](../mocks/pages/request-detail/declined.html) |
| [Business card](components/business-card.html) | Business card, Product card, Saved card (remove button) | Default, Hover, Focus, Active, Disabled, Loading | [pages/browse/default](../mocks/pages/browse/default.html), [pages/saved/default](../mocks/pages/saved/default.html), [pages/category/default](../mocks/pages/category/default.html) |
| [Space card](components/space-card.html) | Link card, Form preview | Default, Hover, Focus, Loading | [pages/category/rooms-rentals](../mocks/pages/category/rooms-rentals.html), [pages/browse/default](../mocks/pages/browse/default.html), [pages/search/spaces](../mocks/pages/search/spaces.html) |
| [Saveable card](components/saveable.html) | Heart on a business, product or space card | Unsaved, Saved, Busy, Hover, Focus, Active | [pages/browse/saved-hearts](../mocks/pages/browse/saved-hearts.html), [pages/category/default](../mocks/pages/category/default.html), [pages/shop/default](../mocks/pages/shop/default.html) |
| [Booking card](components/booking-card.html) | Card, Requested, Signed out, Booking bar | Default, Hover, Focus, Active, Requested | [pages/space/short-stay](../mocks/pages/space/short-stay.html), [pages/space/requested](../mocks/pages/space/requested.html), [pages/space/signed-out](../mocks/pages/space/signed-out.html) |
| [Rental facts](components/rental-facts.html) | Key facts, Rental rows (`dl--rows`), What’s included, House rules | — | [pages/space/short-stay](../mocks/pages/space/short-stay.html), [pages/space/room](../mocks/pages/space/room.html) |
| [Household](components/household.html) | Room, Roommate | — | [pages/space/room](../mocks/pages/space/room.html), [pages/space/roommate](../mocks/pages/space/roommate.html) |
| [Host card](components/host-card.html) | With about text, Without | — | [pages/space/short-stay](../mocks/pages/space/short-stay.html) |
| [Directory row](components/directory-row.html) | Row, See all link | Default, Hover, Focus, Active, Disabled, Loading | [pages/browse/default](../mocks/pages/browse/default.html), [pages/browse/edge](../mocks/pages/browse/edge.html), [pages/category/default](../mocks/pages/category/default.html) |
| [Media tile](components/media-tile.html) | Neutral, Gold, Green, Blue, Ink | Placeholder, In a hovered card, Loading, Photo failed | [pages/browse/default](../mocks/pages/browse/default.html), [pages/business/default](../mocks/pages/business/default.html), [pages/product/default](../mocks/pages/product/default.html) |
| [Message thread](components/message-thread.html) | Read thread, Unread thread, Current thread, Bubble (theirs, mine), Photo in a bubble, Request card (booking, quote, order), Photo control (empty, with a photo) | Default, Hover, Focus, Active, Disabled, Loading, Sending, Failed, Photo unavailable, Awaiting reply, Confirmed, Declined, Cancelled, Completed | [pages/messages/default](../mocks/pages/messages/default.html), [pages/conversation/default](../mocks/pages/conversation/default.html), [pages/conversation/sending](../mocks/pages/conversation/sending.html), [pages/conversation/photo](../mocks/pages/conversation/photo.html), [pages/conversation/photo-attached](../mocks/pages/conversation/photo-attached.html), [pages/conversation/photo-sending](../mocks/pages/conversation/photo-sending.html), [pages/conversation/requests](../mocks/pages/conversation/requests.html), [pages/conversation/arrived](../mocks/pages/conversation/arrived.html) |
| [Notification item](components/notification-item.html) | Unread, Read | Default, Hover, Focus, Active, Disabled, Loading | [pages/notifications/default](../mocks/pages/notifications/default.html), [pages/notifications/read](../mocks/pages/notifications/read.html), [pages/notifications/loading](../mocks/pages/notifications/loading.html) |
| [Feedback history](components/feedback-history.html) | List | Default, Empty, Loading, Error | [pages/feedback/default](../mocks/pages/feedback/default.html), [pages/feedback/history-empty](../mocks/pages/feedback/history-empty.html), [pages/feedback/history-loading](../mocks/pages/feedback/history-loading.html), [pages/feedback/history-error](../mocks/pages/feedback/history-error.html) |
| [Hero band](components/hero-band.html) | Category chip, Ghost button, Primary button | Default, Hover, Focus, Active, Disabled, Current | [pages/browse/default](../mocks/pages/browse/default.html), [pages/browse/signed-out](../mocks/pages/browse/signed-out.html), [pages/welcome/default](../mocks/pages/welcome/default.html) |
| [Lockup](components/lockup.html) | Link on the page, Link on ink | Default, Focus | [pages/sign-in/default](../mocks/pages/sign-in/default.html), [pages/sign-up/default](../mocks/pages/sign-up/default.html), [pages/forgot-password/default](../mocks/pages/forgot-password/default.html) |

### Feedback

| Component | Variants (state matrix rows) | States | Source mocks |
|---|---|---|---|
| [Toast](components/toast.html) | Info, Success, Warning, Danger | Default, Dismiss hover, Action focus, Dismiss focus | [notifications/toast/stacked](../mocks/notifications/toast/stacked.html), [notifications/toast/with-action](../mocks/notifications/toast/with-action.html), [notifications/request-toast/with-action](../mocks/notifications/request-toast/with-action.html) |
| [Alert and banner](components/alert.html) | Info, Success, Warning, Danger | Default, With action, Action focus, Dismiss focus | [notifications/offline-banner/persistent](../mocks/notifications/offline-banner/persistent.html), [notifications/verification-banner/warning](../mocks/notifications/verification-banner/warning.html), [notifications/verify-email-banner/persistent](../mocks/notifications/verify-email-banner/persistent.html) |
| [Inline message](components/inline-message.html) | Help, No help | Default, Hover, Focus, Invalid, Disabled | [pages/sign-up/invalid](../mocks/pages/sign-up/invalid.html), [dialogs/order-request/invalid](../mocks/dialogs/order-request/invalid.html), [pages/preferences/success](../mocks/pages/preferences/success.html) |
| [Moment check](components/moment-check.html) | On a page, In a dialog | Unanswered, Low score, Thanks | [pages/list-business/success](../mocks/pages/list-business/success.html), [pages/list-business/success-check-in-low](../mocks/pages/list-business/success-check-in-low.html), [pages/list-business/success-check-in-thanks](../mocks/pages/list-business/success-check-in-thanks.html), [dialogs/book-meeting/success](../mocks/dialogs/book-meeting/success.html) |
| [Launch confirmation](components/launch-confirmation.html) | Surface, Paper | Shown (takes focus) | [pages/marketing-home/notify-success](../mocks/pages/marketing-home/notify-success.html), [pages/marketing-home/business-success](../mocks/pages/marketing-home/business-success.html) |
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
| [Member feedback](patterns/member-feedback.html) | How a member tells Jubilee how it is going: the launcher and its panel, one question after a moment that matters, and the feedback page with what became of what was sent. |
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
| pages/sign-up/invalid | Password error renders before the help text while `aria-describedby` lists help first. | Form-field docs fix the order: help, then error, both in `aria-describedby`. Superseded on 11 Nov 2026: the redrawn Sign up puts its hints under the control and an error between the control and the hint (ADR 0038); `aria-describedby` still lists help, then error. |
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
| pages/sign-in/*, pages/sign-up/* (redrawn 11 Nov 2026) | The lockup on the brand panel gets the default focus ring, which is ink on ink in the light theme (1.00:1). The kit sets `--color-focus-ring-on-brand` inside `.hero`, `.band` and `.topbar--ink` only. | Auth layout and Lockup docs state the on-brand ring. *Open* in `components.css`: a rule for `.auth-layout__panel`. |
| assets/components.css | `.auth-link`, `.lockup` and `.password-input__toggle` have no `data-state` hooks, and the show-password button has no disabled look. | Docs describe their hover instead of showing it. *Open*. |
| pages/sign-in/* | "Keep me logged in" is drawn ticked. | Kept in the mocks to show the state, as the design does; the docs show the product default, unticked (ADR 0038). |
| pages/sign-up/google-refused | The notice is a warning alert; on Log in the same notice is a danger alert. | *Open* in the mocks. |
| pages/* (bare pages), top bar | The mark and the wordmark are written three ways: `.lockup`, `.auth-brand` and `.topbar__brand`. | Lockup documents the block; the other two move to it with issue #59. *Open*. |

## Changelog

- **1.0 — 10 Nov 2026.** First extraction from docs/mocks. Value changes against the mocks' draft tokens are listed in the drift log above.
- **1.1 — 11 Nov 2026.** Log in and Sign up redrawn from the Magic Patterns design (ADR 0038). New pages: [Auth layout](components/auth-layout.html), with its split frame and the link under the form, and [Lockup](components/lockup.html). Documented on existing pages: the password control with its show-password button (Text field), the label action and the hint under the control (Form field), the Google button and its mark (Button), a label that is a sentence with links (Checkbox), `.form-grid--2-lg` and the two layouts (Form layout), `eye-off` (Iconography). Changed values in the kit: `.divider-text` goes from `--text-caption` with a `--space-3` gap to `--text-body-sm` with a `--space-4` gap and reads "or use email"; `.choice__text` is no longer a flex column and its `small` is a block. No token was added.
- **1.2 — 11 Nov 2026.** Rooms and rentals (L1-028, L2-197 to L2-209, ADR 0042). New pages: [Space card](components/space-card.html), [Booking card](components/booking-card.html) with the phone booking bar, [Rental facts](components/rental-facts.html), [Household](components/household.html), [Host card](components/host-card.html), and three pages for reused blocks: [Term chooser](components/term-chooser.html) (choice cards), [Term filter](components/term-filter.html) and [Included chips](components/included-chips.html) (chips). New blocks in the kit: `space-card`, `booking-card`, `booking-bar`, `space-facts`, `included-list`, `house-rules`, `household`, `host-card`. New modifiers: `dl--rows` (ruled key/value rows), `choice-cards--3` (three type cards in a row from 768px), `form-grid--3`. No token was added or changed.

- **1.2 — 11 Nov 2026.** The admin application (L2-188). New variant on [Top bar](components/top-bar.html): `.admin-bar` with `__tag`, `__nav`, `__staff`, `__name` and `__role`; its navigation becomes a sideways-scrolling row below 768px. The app's ink bar loses its Verifications link ([Navigation](patterns/navigation.html)). No token was added; the new pairings (`--color-fg-on-brand-muted` and `--color-fg-on-brand` on `--color-bg-brand`) were already checked.

- **1.3 — 11 Nov 2026.** Member feedback (L1-029, L2-210 to L2-213, ADR 0043). New pages: [Feedback launcher](components/feedback-launcher.html), [Star scale](components/star-scale.html), [Score scale](components/score-scale.html) with `.score-rows`, [Moment check](components/moment-check.html), [Feedback history](components/feedback-history.html), [File list](components/file-list.html) and the [Member feedback](patterns/member-feedback.html) pattern. Documented on existing pages: `.tabs--segmented` with `.tabs--lg` (Tabs), `.dialog--corner` with `.dialog__footer-start` (Dialog), and the icons `feedback`, `star`, `bug` and `users` (Iconography). No token was added; twelve pairings joined `tokens/contrast-pairs.json` and pass in both themes (165 pairs). Differences from the Magic Patterns frame: chosen scores are the accent, not ink; stars and scores are native radios in 44px targets; statuses are words in the text colour; the corner dialog keeps its scrim and has no grab handle; the file list promises no drag and drop.

- **1.4 — 12 Nov 2026.** The launching-soon marketing page (L1-030, L2-215 to L2-217, ADR 0044). New pages: [Launch badge](components/launch-badge.html) (`mkt-badge`), [Launch form](components/launch-form.html) (`mkt-form`, with the section blocks `mkt-launch`), [Launch confirmation](components/launch-confirmation.html) (`mkt-confirmation`) and [Marketing button](components/marketing-button.html) (`mkt-btn`, which had no page; it may now be a `<button>` and has a busy state, `aria-busy="true"` with `mkt-btn__spinner`). They are the first pages for blocks of `assets/marketing.css`; their examples stand in an element with `class="mkt"` and `data-theme="light"`, because the marketing site is light only. No token was added. The Magic Patterns design has no launching-soon frame: the mocks are the source. The top bar's pill is 40px tall, as it was for "Open Jubilee": above the 24px every target needs (L2-162), and it is not the page's primary control; the buttons of the opening and of the forms are.

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

Run again on 11 November 2026, after Log in and Sign up were redrawn (ADR 0038):

| Check | Command | Result |
|---|---|---|
| Contrast, both themes | `python .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css` | 161 pairs passed, 0 failed. No pair was added: every text pair of the split frame was already listed |
| Contrast of the pairs the change uses | the same script with `--pairs` on a list of 20 pairs, both themes | 40 passed. On ink: text 19.32:1, muted text 10.17:1. On the surface: title 19.32:1 light and 14.24:1 dark, muted text 8.10:1 and 9.35:1. Primary label 11.15:1. The gold underline of `.auth-link` is 1.73:1 on the surface and 1.55:1 on the canvas in light; it is not the sole carrier (the link is semibold and in the text colour) |
| Structure | `python .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system` | 74 pages (53 components, 8 patterns), no error in any page; 3 errors in `assets/marketing.css` (raw `rgb()`), which this change does not touch |
| No horizontal scroll | every page at 360px and 1280px in light and dark (Playwright) | 74 of 74 pages fit |
| Screenshots reviewed | auth-layout, lockup, divider, form-field, text-field, button, checkbox, form-layout, inline-message, iconography and the forms pattern at 360 and 1280 px, light and dark | no overflow or clipped specimens; the split frame keeps the proportions of the design reference |
| Live contrast badges | every `data-contrast` cell on every page, both themes | all pass except two older failures, on pages this change touched only for the navigation: `--color-fg-on-accent` on `--color-info-solid` (3.74:1, color page, light) and `--color-border-on-brand` on `--color-bg-brand` (1.57:1 against a 3:1 minimum, hero-band page) |

Run again on 11 November 2026, after rooms and rentals (ADR 0042):

| Check | Command | Result |
|---|---|---|
| Contrast, both themes | `python .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css` | 161 pairs passed, 0 failed. No pair was added: the new components use pairs already listed |
| Structure | `python .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system` | 82 pages (61 components, 8 patterns), no error in any page; the 3 errors in `assets/marketing.css` (raw `rgb()`) are unchanged |
| No horizontal scroll | the 8 new pages at 360px and 1280px in light and dark (Playwright) | 8 of 8 pages fit |
| Live contrast badges | every `data-contrast` cell on the 8 new pages, both themes | all pass |
| Tokens in the app | `npm run design:check` in `frontend/` | passed (exit 0): tokens.css and both fonts match the components library |

- **1.5 — 12 Nov 2026.** Hearts on cards (L2-041 AC7 to AC10, ADR 0054). New page: [Saveable card](components/saveable.html), the block `saveable` with `saveable__heart`, a toggle button beside the card's link over the top right of its picture: outlined and named "Save {name}" when unsaved, filled in the danger colour and named "Saved. Remove {name} from saved" when saved, faded with `aria-busy="true"` while its request is on its way. Every mock with a business, product or space card on Browse, a category, search, a shop or a listing or product page now draws the heart; the new state [pages/browse/saved-hearts](../mocks/pages/browse/saved-hearts.html) shows them all. No token was added.
