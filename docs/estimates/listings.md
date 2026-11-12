# Estimates: listings

| Design | Effort | Complete |
|---|---|---|
| report-listing | 2 days | 90% |
| save-listing | 3 days | 90% |
| share-listing | 3 days | 70% |
| view-business-page | 3 days | 90% |
| view-product | 5 days | 80% |
| view-space | 4 days | 100% |

save-listing (ADR 0027): the saved list, save and unsave of businesses and products, the hearts on the business and product pages with Undo and the offline and limit messages, the return from sign-in, the saved page with its empty, error, loading and unavailable states, and the owner's count are done with tests. Deferred: hearts on list cards, a Saved link in the chrome (journey 20), clearing the store on sign-out (journey 5).

report-listing and share-listing (ADR 0029): the report dialog (reason, description with counter, retry with the same key, validation, 429 and offline messages, sign-in prompt for a visitor), the private report store with the 24-hour addition window, rate limit and idempotency, the share dialog (Copy, E-mail, WhatsApp, More) and the social preview endpoint are done with tests. Deferred: the `og-image.png` asset, crawler routing of `/b/{slug}` to the preview, and the team notification e-mail.

view-space (ADR 0042): the space page with its booking card and bar, facts, rows, inclusions, rules, household, host and related spaces, and the owner's editing of a space (L2-209) are done with tests. Excludes deferred work (see ADR 0042): hourly rent.

view-business-page and view-product: the business and shop pages, the product page with its options, quantity and sold-out state, the stock alert and the owner's view are done with tests (`business.spec.ts`, `shop.spec.ts`, `product.spec.ts`, `product-sold-out.spec.ts`, `ListingPageTests`, `ShopPageTests`, `ProductPageTests`, `StockAlertTests`). Left: the "Sold out" badge on shop product cards (L2-034 AC3), the listing status on the owner's preview (L2-028 AC3), the back-in-stock notice in the app and by e-mail (L2-036 AC2) and the owner's sold-out toast (L2-036 AC3).
