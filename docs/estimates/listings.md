# Estimates: listings

| Design | Effort | Complete |
|---|---|---|
| report-listing | 2 days | 90% |
| save-listing | 3 days | 100% |
| share-listing | 3 days | 70% |
| view-business-page | 3 days | 100% |
| view-product | 5 days | 100% |
| view-space | 4 days | 100% |

save-listing (ADR 0027, ADR 0054): the saved list, save and unsave of businesses, products and spaces, the hearts on the business and product pages and on the business, product and space cards of Browse, a category, search, a shop and the listing and product pages (`jb-saveable`, busy while the server answers), Undo and the offline and limit messages, the return from sign-in for a page and for a card, clearing the store when no member is signed in, the saved page with its empty, error, loading and unavailable states, the Saved link of the account menu and the owner's count are done with tests (`saved.spec.ts`, `card-hearts.spec.ts`, `SavedTests`, the parity spec `saveable.spec.ts`). Nothing is left.

report-listing and share-listing (ADR 0029): the report dialog (reason, description with counter, retry with the same key, validation, 429 and offline messages, sign-in prompt for a visitor), the private report store with the 24-hour addition window, rate limit and idempotency, the share dialog (Copy, E-mail, WhatsApp, More) and the social preview endpoint are done with tests. Deferred: the `og-image.png` asset, crawler routing of `/b/{slug}` to the preview, and the team notification e-mail.

view-space (ADR 0042): the space page with its booking card and bar, facts, rows, inclusions, rules, household, host and related spaces, and the owner's editing of a space (L2-209) are done with tests. Excludes deferred work (see ADR 0042): hourly rent.

view-business-page and view-product (ADR 0007, ADR 0045): the business and shop pages, the "Sold out" badge on product cards, the product page with its options, quantity and sold-out state, the stock alert, the back-in-stock notice in the app and by e-mail, the owner's sold-out toast, the owner's view and the preview of a listing that is not public with its status (L2-219) are done with tests (`business.spec.ts`, `business-owner.spec.ts`, `business-preview.spec.ts`, `shop.spec.ts`, `product.spec.ts`, `product-sold-out.spec.ts`, `notifications.spec.ts`, `catalogue.spec.ts`, `ListingPageTests`, `ShopPageTests`, `ProductPageTests`, `StockAlertTests`, `BackInStockTests`, `OwnerViewTests`, `CatalogueTests`). Nothing is left. Outside these designs: product and cover photos (journey 16 and the listing form) and a sold-out toast when a confirmed order takes the last item (ADR 0045).
