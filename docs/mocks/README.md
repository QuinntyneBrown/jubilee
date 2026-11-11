# Jubilee mocks

Static HTML mocks for every page, dialog and notification of Jubilee, Toronto's Christian
marketplace, in every state. They are the design reference for the Angular frontend: the app
keeps the mocks' BEM classes and accessible state semantics.

- **74 screens, 309 mocks:** 44 pages (194 states), 23 dialogs (80 states), 7 notifications (35 states).
- Every mock is responsive (360, 768 and 1280 px), themed light and dark through tokens, and
  keyboard-accessible.

## How to open

Open [index.html](index.html) from disk; no server or network is needed.

- The bar at the bottom of each mock links its sibling states and toggles the theme (or press `t`).
- `?theme=dark` or `?theme=light` forces a theme; `?chrome=0` hides the mock bar and notes so the
  page looks exactly like the product.

## Cast and catalog

Reuse these in every new mock so the story holds across screens. **Today is Tuesday 10 November 2026.**

| Who | Role in the mocks |
|---|---|
| Joanna Adeyemi (JA) | Member and buyer. East York, M4C. Home church: Grace Toronto Church. Shown on every buyer screen. |
| Naomi Laurent (NL) | Owner of Luzandre.com. Shown on every seller screen (My business, products, incoming requests, listing form). |
| Miriam Castillo (MC) | Jubilee verification team. Shown on the admin screens. |
| Pastor Daniel Okoro | Lead pastor, Grace Toronto Church. Naomi's church reference; answers the public reference form. |
| Samuel Park, Ruth Mensah, David Chen, Esther Baptiste | Customers who send Luzandre.com requests. |

- **Directory:** 47 verified businesses in 10 categories (Shops 3, Financial & insurance 3, Legal &
  immigration 6, Home & property 10, Real estate & living 4, Health & family 4, Business & tech 5,
  Learning 2, Media 7, Community 3). Business names, taglines and category counts come from the
  Magic Patterns design reference. People, prices, hours, addresses, messages and requests are
  invented for the mocks.
- **Joanna's requests:** a discovery meeting with Legacy Financial (Thu 12 Nov, 10:00 a.m., video,
  confirmed); a quote from WaterWorks Plumbing & Drains for a slow kitchen drain (awaiting reply);
  a Leather journaling Bible from Christian Bookstores ($64, pickup Fri 13 Nov, confirmed).
- **Luzandre.com:** 4 products (Faith heavyweight tee $34, Gold cross stoneware mug $24, Custom
  church team tee $22 ea, Morning mug set $42) and 2 services; 3 new incoming requests.
- **Messages:** 4 conversations, 2 unread. **Notifications:** 3 unread.

## Shared assets

| File | What it is |
|---|---|
| `assets/tokens.css` | Design tokens: ink and cream neutrals, gold accent (always with ink text), green for verified, links and success; Archivo for headings, Inter for text; light and dark themes. The only place colours, sizes and durations live. |
| `assets/ui.css` | The component kit shared by every mock. The Jubilee components (top bar, phone tab bar, hero band, media tiles, business and product cards, directory rows, inbox, timeline) are in the second half. Extend it; never fork per mock. |
| `assets/mock.css`, `assets/mock.js` | The mock bar, annotation notes and theme switch. Not product UI. |

Both themes pass the design-system contrast checker (WCAG AA). Gold on cream is 1.6:1, so gold
controls carry a darker edge (`--color-accent-border`) and gold is never used for text.

## Open questions and assumptions

No `docs/specs` exist yet, so the screen list was derived from the product description and the
Magic Patterns design reference. These assumptions shaped it; each one is a decision to confirm.

1. **No payment on Jubilee.** Buying is a request: a member books a service, asks for a quote or
   requests a product, and the business confirms or declines. The member pays the business
   directly. If Jubilee should take payment, a cart, checkout, orders and payouts need adding.
2. **Verification is by church reference.** The owner names a pastor or elder, who answers a
   private form by e-mail link; the Jubilee team then approves or asks for changes. The admin
   queue and review screens exist only to support that.
3. **Anyone can join and buy; only listing a business requires the statement of faith.** The
   statement-of-faith, terms and privacy wording is draft copy for the owner to replace.
4. **A listing can hold both products and services.** The form asks for the main one first.
5. **Ten categories from the design reference.** Photographers, speakers, consultants and
   furniture makers fit under Media, Learning, Business & tech and Shops; say if they should have
   their own categories.
6. **Photography is represented by tinted icon tiles** (`.media`) so the mocks open from disk
   with no network. Real photos replace them in the app.
7. **Archivo is bundled; Inter falls back to system fonts.** Headings and the wordmark load
   Archivo from `docs/design-system/assets/fonts/`, so they match the design reference from disk.
   Body text uses Inter only where it is installed, because mocks do not load web fonts.
8. **No reviews or ratings**, no map, and no e-mail templates in this set.
9. **Buyer screens show Joanna before she owns a listing** ("List your business" in the top bar);
   seller screens show Naomi ("My business").

## Checking and screenshots

```sh
python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write
python .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks
```

`--write` regenerates `index.html` and the coverage section below from `manifest.json`.
Screenshots go to `docs/mocks/.cache/`, which is not committed.

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | invalid | submitting | success | expired | offline | signed-out | edge | no-results | long | saved | owner | sold-out | sending | failed | confirmed | declined | cancelled | read | services | draft-saved | pending | changes-requested | approved | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Welcome (`welcome`) | [✅](pages/welcome/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Sign in (`sign-in`) | [✅](pages/sign-in/default.html) | [✅](pages/sign-in/loading.html) | ➖ | [✅](pages/sign-in/error.html) | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/submitting.html) | [✅](pages/sign-in/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Join (`sign-up`) | [✅](pages/sign-up/default.html) | [✅](pages/sign-up/loading.html) | ➖ | [✅](pages/sign-up/error.html) | [✅](pages/sign-up/invalid.html) | [✅](pages/sign-up/submitting.html) | [✅](pages/sign-up/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Forgot password (`forgot-password`) | [✅](pages/forgot-password/default.html) | [✅](pages/forgot-password/loading.html) | ➖ | [✅](pages/forgot-password/error.html) | [✅](pages/forgot-password/invalid.html) | [✅](pages/forgot-password/submitting.html) | [✅](pages/forgot-password/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reset password (`reset-password`) | [✅](pages/reset-password/default.html) | [✅](pages/reset-password/loading.html) | ➖ | [✅](pages/reset-password/error.html) | [✅](pages/reset-password/invalid.html) | [✅](pages/reset-password/submitting.html) | [✅](pages/reset-password/success.html) | [✅](pages/reset-password/expired.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Verify e-mail (`verify-email`) | [✅](pages/verify-email/default.html) | [✅](pages/verify-email/loading.html) | ➖ | [✅](pages/verify-email/error.html) |  |  | [✅](pages/verify-email/success.html) | [✅](pages/verify-email/expired.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Church reference (`church-reference`) | [✅](pages/church-reference/default.html) | [✅](pages/church-reference/loading.html) | ➖ | [✅](pages/church-reference/error.html) | [✅](pages/church-reference/invalid.html) | [✅](pages/church-reference/submitting.html) | [✅](pages/church-reference/success.html) | [✅](pages/church-reference/expired.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Statement of faith (`statement-of-faith`) | [✅](pages/statement-of-faith/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Terms of use (`terms`) | [✅](pages/terms/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Privacy (`privacy`) | [✅](pages/privacy/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Help (`help`) | [✅](pages/help/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| No access (`forbidden`) | [✅](pages/forbidden/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Something went wrong (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Offline (`offline`) | [✅](pages/offline/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Session expired (`session-expired`) | [✅](pages/session-expired/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Maintenance (`maintenance`) | [✅](pages/maintenance/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Browse (`browse`) | [✅](pages/browse/default.html) | [✅](pages/browse/loading.html) | [✅](pages/browse/empty.html) | [✅](pages/browse/error.html) |  |  |  |  | [✅](pages/browse/offline.html) | [✅](pages/browse/signed-out.html) | [✅](pages/browse/edge.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Category (`category`) | [✅](pages/category/default.html) | [✅](pages/category/loading.html) | [✅](pages/category/empty.html) | [✅](pages/category/error.html) |  |  |  |  |  |  |  | [✅](pages/category/no-results.html) | [✅](pages/category/long.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Search (`search`) | [✅](pages/search/default.html) | [✅](pages/search/loading.html) | [✅](pages/search/empty.html) | [✅](pages/search/error.html) |  |  |  |  |  |  |  | [✅](pages/search/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Business (`business`) | [✅](pages/business/default.html) | [✅](pages/business/loading.html) | [✅](pages/business/empty.html) | [✅](pages/business/error.html) |  |  |  |  |  |  | [✅](pages/business/edge.html) |  |  | [✅](pages/business/saved.html) | [✅](pages/business/owner.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Shop (`shop`) | [✅](pages/shop/default.html) | [✅](pages/shop/loading.html) | [✅](pages/shop/empty.html) | [✅](pages/shop/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Product (`product`) | [✅](pages/product/default.html) | [✅](pages/product/loading.html) | ➖ | [✅](pages/product/error.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/product/sold-out.html) |  |  |  |  |  |  |  |  |  |  |  |  |
| Saved (`saved`) | [✅](pages/saved/default.html) | [✅](pages/saved/loading.html) | [✅](pages/saved/empty.html) | [✅](pages/saved/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Messages (`messages`) | [✅](pages/messages/default.html) | [✅](pages/messages/loading.html) | [✅](pages/messages/empty.html) | [✅](pages/messages/error.html) |  |  |  |  |  |  |  | [✅](pages/messages/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Conversation (`conversation`) | [✅](pages/conversation/default.html) | [✅](pages/conversation/loading.html) | [✅](pages/conversation/empty.html) | [✅](pages/conversation/error.html) |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/conversation/sending.html) | [✅](pages/conversation/failed.html) |  |  |  |  |  |  |  |  |  |  |
| Your requests (`requests`) | [✅](pages/requests/default.html) | [✅](pages/requests/loading.html) | [✅](pages/requests/empty.html) | [✅](pages/requests/error.html) |  |  |  |  |  |  |  | [✅](pages/requests/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Request (`request-detail`) | [✅](pages/request-detail/default.html) | [✅](pages/request-detail/loading.html) | ➖ | [✅](pages/request-detail/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/request-detail/confirmed.html) | [✅](pages/request-detail/declined.html) | [✅](pages/request-detail/cancelled.html) |  |  |  |  |  |  |  |
| Notifications (`notifications`) | [✅](pages/notifications/default.html) | [✅](pages/notifications/loading.html) | [✅](pages/notifications/empty.html) | [✅](pages/notifications/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/notifications/read.html) |  |  |  |  |  |  |
| Account (`account`) | [✅](pages/account/default.html) | [✅](pages/account/loading.html) | ➖ | [✅](pages/account/error.html) | [✅](pages/account/invalid.html) | [✅](pages/account/submitting.html) | [✅](pages/account/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Notification settings (`preferences`) | [✅](pages/preferences/default.html) | [✅](pages/preferences/loading.html) | ➖ | [✅](pages/preferences/error.html) | ➖ | [✅](pages/preferences/submitting.html) | [✅](pages/preferences/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| List your business (`list-business`) | [✅](pages/list-business/default.html) | [✅](pages/list-business/loading.html) | ➖ | [✅](pages/list-business/error.html) | [✅](pages/list-business/invalid.html) | [✅](pages/list-business/submitting.html) | [✅](pages/list-business/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/list-business/services.html) | [✅](pages/list-business/draft-saved.html) |  |  |  |  |
| My business (`my-business`) | [✅](pages/my-business/default.html) | [✅](pages/my-business/loading.html) | [✅](pages/my-business/empty.html) | [✅](pages/my-business/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/my-business/pending.html) | [✅](pages/my-business/changes-requested.html) |  |  |
| Edit listing (`edit-listing`) | [✅](pages/edit-listing/default.html) | [✅](pages/edit-listing/loading.html) | ➖ | [✅](pages/edit-listing/error.html) | [✅](pages/edit-listing/invalid.html) | [✅](pages/edit-listing/submitting.html) | [✅](pages/edit-listing/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Products (`my-products`) | [✅](pages/my-products/default.html) | [✅](pages/my-products/loading.html) | [✅](pages/my-products/empty.html) | [✅](pages/my-products/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Services (`my-services`) | [✅](pages/my-services/default.html) | [✅](pages/my-services/loading.html) | [✅](pages/my-services/empty.html) | [✅](pages/my-services/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Incoming requests (`incoming-requests`) | [✅](pages/incoming-requests/default.html) | [✅](pages/incoming-requests/loading.html) | [✅](pages/incoming-requests/empty.html) | [✅](pages/incoming-requests/error.html) |  |  |  |  |  |  |  | [✅](pages/incoming-requests/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Verification queue (`admin-verifications`) | [✅](pages/admin-verifications/default.html) | [✅](pages/admin-verifications/loading.html) | [✅](pages/admin-verifications/empty.html) | [✅](pages/admin-verifications/error.html) |  |  |  |  |  |  |  | [✅](pages/admin-verifications/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Verify listing (`admin-verification`) | [✅](pages/admin-verification/default.html) | [✅](pages/admin-verification/loading.html) | ➖ | [✅](pages/admin-verification/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-verification/changes-requested.html) | [✅](pages/admin-verification/approved.html) |  |

### Dialogs

| Screen | default | busy | invalid | failed | success | edit | Requirements |
|---|---|---|---|---|---|---|---|
| Book a meeting (`book-meeting`) | [✅](dialogs/book-meeting/default.html) | [✅](dialogs/book-meeting/busy.html) | [✅](dialogs/book-meeting/invalid.html) | [✅](dialogs/book-meeting/failed.html) | [✅](dialogs/book-meeting/success.html) |  |  |
| Request a quote (`request-quote`) | [✅](dialogs/request-quote/default.html) | [✅](dialogs/request-quote/busy.html) | [✅](dialogs/request-quote/invalid.html) | [✅](dialogs/request-quote/failed.html) | [✅](dialogs/request-quote/success.html) |  |  |
| Request an item (`order-request`) | [✅](dialogs/order-request/default.html) | [✅](dialogs/order-request/busy.html) | [✅](dialogs/order-request/invalid.html) | [✅](dialogs/order-request/failed.html) | [✅](dialogs/order-request/success.html) |  |  |
| New message (`new-message`) | [✅](dialogs/new-message/default.html) | [✅](dialogs/new-message/busy.html) | [✅](dialogs/new-message/invalid.html) | [✅](dialogs/new-message/failed.html) |  |  |  |
| Share listing (`share-listing`) | [✅](dialogs/share-listing/default.html) | ➖ | ➖ |  |  |  |  |
| Report listing (`report-listing`) | [✅](dialogs/report-listing/default.html) | [✅](dialogs/report-listing/busy.html) | [✅](dialogs/report-listing/invalid.html) | [✅](dialogs/report-listing/failed.html) | [✅](dialogs/report-listing/success.html) |  |  |
| Sign in required (`sign-in-required`) | [✅](dialogs/sign-in-required/default.html) | ➖ | ➖ |  |  |  |  |
| Account menu (`user-menu`) | [✅](dialogs/user-menu/default.html) | ➖ | ➖ |  |  |  |  |
| Filters (`filters`) | [✅](dialogs/filters/default.html) | ➖ | ➖ |  |  |  |  |
| Cancel request (`cancel-request`) | [✅](dialogs/cancel-request/default.html) | [✅](dialogs/cancel-request/busy.html) | ➖ | [✅](dialogs/cancel-request/failed.html) |  |  |  |
| Confirm request (`confirm-request`) | [✅](dialogs/confirm-request/default.html) | [✅](dialogs/confirm-request/busy.html) | ➖ | [✅](dialogs/confirm-request/failed.html) |  |  |  |
| Decline request (`decline-request`) | [✅](dialogs/decline-request/default.html) | [✅](dialogs/decline-request/busy.html) | [✅](dialogs/decline-request/invalid.html) | [✅](dialogs/decline-request/failed.html) |  |  |  |
| Product editor (`product-editor`) | [✅](dialogs/product-editor/default.html) | [✅](dialogs/product-editor/busy.html) | [✅](dialogs/product-editor/invalid.html) | [✅](dialogs/product-editor/failed.html) |  | [✅](dialogs/product-editor/edit.html) |  |
| Service editor (`service-editor`) | [✅](dialogs/service-editor/default.html) | [✅](dialogs/service-editor/busy.html) | [✅](dialogs/service-editor/invalid.html) | [✅](dialogs/service-editor/failed.html) |  | [✅](dialogs/service-editor/edit.html) |  |
| Delete product (`delete-product`) | [✅](dialogs/delete-product/default.html) | [✅](dialogs/delete-product/busy.html) | ➖ | [✅](dialogs/delete-product/failed.html) |  |  |  |
| Delete service (`delete-service`) | [✅](dialogs/delete-service/default.html) | [✅](dialogs/delete-service/busy.html) | ➖ | [✅](dialogs/delete-service/failed.html) |  |  |  |
| Pause listing (`unpublish-listing`) | [✅](dialogs/unpublish-listing/default.html) | [✅](dialogs/unpublish-listing/busy.html) | ➖ | [✅](dialogs/unpublish-listing/failed.html) |  |  |  |
| Approve listing (`approve-listing`) | [✅](dialogs/approve-listing/default.html) | [✅](dialogs/approve-listing/busy.html) | ➖ | [✅](dialogs/approve-listing/failed.html) |  |  |  |
| Request changes (`request-changes`) | [✅](dialogs/request-changes/default.html) | [✅](dialogs/request-changes/busy.html) | [✅](dialogs/request-changes/invalid.html) | [✅](dialogs/request-changes/failed.html) |  |  |  |
| Sign out (`sign-out`) | [✅](dialogs/sign-out/default.html) | [✅](dialogs/sign-out/busy.html) | ➖ |  |  |  |  |
| Delete account (`delete-account`) | [✅](dialogs/delete-account/default.html) | [✅](dialogs/delete-account/busy.html) | [✅](dialogs/delete-account/invalid.html) | [✅](dialogs/delete-account/failed.html) |  |  |  |

### Notifications

| Screen | info | success | warning | danger | with-action | stacked | persistent | Requirements |
|---|---|---|---|---|---|---|---|---|
| Toast (`toast`) | [✅](notifications/toast/info.html) | [✅](notifications/toast/success.html) | [✅](notifications/toast/warning.html) | [✅](notifications/toast/danger.html) | [✅](notifications/toast/with-action.html) | [✅](notifications/toast/stacked.html) |  |  |
| Request toast (`request-toast`) | [✅](notifications/request-toast/info.html) | [✅](notifications/request-toast/success.html) | [✅](notifications/request-toast/warning.html) | [✅](notifications/request-toast/danger.html) | [✅](notifications/request-toast/with-action.html) |  |  |  |
| Listing toast (`listing-toast`) | [✅](notifications/listing-toast/info.html) | [✅](notifications/listing-toast/success.html) | [✅](notifications/listing-toast/warning.html) | [✅](notifications/listing-toast/danger.html) | [✅](notifications/listing-toast/with-action.html) |  |  |  |
| Message toast (`message-toast`) | [✅](notifications/message-toast/info.html) | [✅](notifications/message-toast/success.html) | [✅](notifications/message-toast/warning.html) | [✅](notifications/message-toast/danger.html) |  |  |  |  |
| Connection banner (`offline-banner`) | [✅](notifications/offline-banner/info.html) | [✅](notifications/offline-banner/success.html) | [✅](notifications/offline-banner/warning.html) | [✅](notifications/offline-banner/danger.html) |  |  | [✅](notifications/offline-banner/persistent.html) |  |
| Verification banner (`verification-banner`) | [✅](notifications/verification-banner/info.html) | [✅](notifications/verification-banner/success.html) | [✅](notifications/verification-banner/warning.html) | [✅](notifications/verification-banner/danger.html) |  |  | [✅](notifications/verification-banner/persistent.html) |  |
| E-mail banner (`verify-email-banner`) | [✅](notifications/verify-email-banner/info.html) | [✅](notifications/verify-email-banner/success.html) | [✅](notifications/verify-email-banner/warning.html) | [✅](notifications/verify-email-banner/danger.html) |  |  | [✅](notifications/verify-email-banner/persistent.html) |  |

<!-- coverage:end -->
