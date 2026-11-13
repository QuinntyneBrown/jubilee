# Estimates: owner-workspace

| Design | Effort | Complete |
|---|---|---|
| edit-listing | 4 days | 100% |
| manage-products | 5 days | 100% |
| manage-services | 4 days | 100% |
| pause-listing | 4 days | 100% |
| view-business-overview | 3 days | 100% |

Journey 15 built the overview, the editor with photos, and pause and resume (ADR 0023), and then finished them (ADR 0052): the weekly change of "Saved by members", the switcher between an owner's businesses, drag to reorder photos with the move buttons as the keyboard equivalent, the photos on the public page with `srcset` (`L2-221`), and the proof that a pause reaches every public page within 60 seconds. ADR 0057 is done in three designs: in edit-listing a change of name or category is live when saved, sends nothing and is audited as `listing.renamed` (the re-check e-mails and `RecheckRequestedAt` are gone); view-business-overview has no pending, changes-requested or approved state and no verification banner, and the API words the header "Live since {Month yyyy}", "Paused · not public" or "Draft · not published yet" (`MyBusinessDto.Subtitle`, `ListingEditorDto.Subtitle`); pause-listing resumes however long a listing was paused (`PauseResultDto` has no `NeedsReview`) and its dialog no longer says "You keep your verified status." Left to the CDN work of `L2-155` AC3: the photo on the business card.

Journey 16 built the Products and Services pages, the editors, the delete confirmation and reordering (ADR 0024), and then finished them (ADR 0062): a product photo is uploaded from the product editor, checked and scanned before the product is saved and shown in the owner's table and on the product page (`ProductPhoto`, `POST /api/my-business/products/photos`, at most `CatalogueRules.PhotosPerHour` an hour, L2-138 AC6); the editor has the options and the minimum order (L2-091 AC8, AC10); products and services are dragged by a handle with the move buttons kept as the keyboard way (L2-090 AC2); a product deleted after a member saved it reads "No longer available" in their list (L2-092 AC2); the empty states say what L2-089 and L2-093 say; and tests cover the 50-services limit (L2-093 AC3) and the catalogue of a listing that is not live (L2-097 AC3). Left to the CDN work of `L2-155` AC3: the product photo on the product cards of the business page and search.
