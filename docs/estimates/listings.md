# Estimates: listings

| Design | Effort | Complete |
|---|---|---|
| report-listing | 2 days | 85% |
| save-listing | 3 days | 90% |
| share-listing | 3 days | 70% |
| view-business-page | 3 days | 0% |
| view-product | 5 days | 0% |

save-listing (ADR 0027): the saved list, save and unsave of businesses and products, the hearts on the business and product pages with Undo and the offline and limit messages, the return from sign-in, the saved page with its empty, error, loading and unavailable states, and the owner's count are done with tests. Deferred: hearts on list cards, a Saved link in the chrome (journey 20), clearing the store on sign-out (journey 5).

report-listing and share-listing (ADR 0029): the report dialog (reason, description with counter, retry with the same key, validation, 429 and offline messages, sign-in prompt for a visitor), the private report store with the 24-hour addition window, rate limit and idempotency, the share dialog (Copy, E-mail, WhatsApp, More) and the social preview endpoint are done with tests. Deferred: the `og-image.png` asset, crawler routing of `/b/{slug}` to the preview, the team notification e-mail, and the moderation queue (journey 25).
