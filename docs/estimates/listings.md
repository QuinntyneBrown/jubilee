# Estimates: listings

| Design | Effort | Complete |
|---|---|---|
| give-listing-an-address | 3 days | 100% |
| open-listing-by-address | 3 days | 95% |
| report-listing | 2 days | 100% |
| save-listing | 3 days | 100% |
| share-listing | 3 days | 100% |
| share-listing-address | 2 days | 100% |
| view-business-page | 3 days | 100% |
| view-product | 5 days | 100% |
| view-space | 4 days | 100% |

save-listing (ADR 0027, ADR 0054): the saved list, save and unsave of businesses, products and spaces, the hearts on the business and product pages and on the business, product and space cards of Browse, a category, search, a shop and the listing and product pages (`jb-saveable`, busy while the server answers), Undo and the offline and limit messages, the return from sign-in for a page and for a card, clearing the store when no member is signed in, the saved page with its empty, error, loading and unavailable states, the Saved link of the account menu and the owner's count are done with tests (`saved.spec.ts`, `card-hearts.spec.ts`, `SavedTests`, the parity spec `saveable.spec.ts`). Nothing is left.

report-listing and share-listing (ADR 0029, ADR 0055): the report dialog (reason, description stopped at 2,000 characters with its counter, the in-flight state that does not close on Escape, the 10-second timeout, retry with the same key, validation, 429, lost-connection and offline messages, sign-in prompt for a visitor), the private report store with the 24-hour addition window, rate limit and idempotency, the team's e-mail of a report through the outbox (`ReportSubmitted`, `JubileeTeam`), the share dialog (Copy with its polite announcement, E-mail, WhatsApp, More… and the return of focus), the social preview endpoint, the app host's routing of link-preview fetchers of `/b/{slug}` to it and `og-image.png` are done with tests (`share-report.spec.ts`, `ReportListingTests`, `ReportNoticeTests`, `eng/azure/server.test.js`). Nothing is left.

view-space (ADR 0042): the space page with its booking card and bar, facts, rows, inclusions, rules, household, host and related spaces, and the owner's editing of a space (L2-209) are done with tests. Excludes deferred work (see ADR 0042): hourly rent.

view-business-page and view-product (ADR 0007, ADR 0045): the business and shop pages, the "Sold out" badge on product cards, the product page with its options, quantity and sold-out state, the stock alert, the back-in-stock notice in the app and by e-mail, the owner's sold-out toast, the owner's view and the preview of a listing that is not public with its status (L2-219) are done with tests (`business.spec.ts`, `business-owner.spec.ts`, `business-preview.spec.ts`, `shop.spec.ts`, `product.spec.ts`, `product-sold-out.spec.ts`, `notifications.spec.ts`, `catalogue.spec.ts`, `ListingPageTests`, `ShopPageTests`, `ProductPageTests`, `StockAlertTests`, `BackInStockTests`, `OwnerViewTests`, `CatalogueTests`). Nothing is left. Outside these designs: product and cover photos (journey 16 and the listing form) and a sold-out toast when a confirmed order takes the last item (ADR 0045).

ADR 0057 is done in view-business-page, view-product and view-space: the line above the name gives the category (a space, the neighbourhood) with no verified label, "Sold by {Business}" carries no mark, and the owner's banner and the preview statuses of a listing that is not public use the new copy.

give-listing-an-address, open-listing-by-address and share-listing-address (L1-032, ADR 0067): the slug rules of one DNS label with reserved words as a setting, both of two simultaneous publishes succeeding, `jubilee migrate` realigning older slugs, `address` on the listing page, a publish, My business and the listing editor, `GET /api/addresses/{label}`, the app host answering `{slug}.jubilee.to` with a 301 or the static not-found page, the canonical link of the listing page, the share dialog sharing the address, and "Your address" on the publish success state, My business and the listing editor with the note after a rename are done with tests (`ListingAddressRulesTests`, `ListingAddressTests`, `AddressResolutionTests`, `RealignSlugsTests`, `eng/azure/server.test.js`, `share-report.spec.ts`, `list-business.spec.ts`, `my-business.spec.ts`, `business.spec.ts`). Left in open-listing-by-address: the owner's steps of `eng/azure/README.md`, "Listing addresses" (wildcard DNS record and certificate, then `ADDRESS_DOMAIN`), until which the app shares `/b/{slug}`; the 200 ms bound of L2-243 AC8 is not measured. The product page has no share action, so a product's address is opened but not yet given out.
