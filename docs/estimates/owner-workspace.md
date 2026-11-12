# Estimates: owner-workspace

| Design | Effort | Complete |
|---|---|---|
| edit-listing | 4 days | 100% |
| manage-products | 5 days | 90% |
| manage-services | 4 days | 90% |
| pause-listing | 4 days | 100% |
| view-business-overview | 3 days | 100% |

Journey 15 built the overview, the editor with photos, and pause and resume (ADR 0023), and then finished them (ADR 0051): the weekly change of "Saved by members", the switcher between an owner's businesses, the re-check e-mails to the verification team and the owner, drag to reorder photos with the move buttons as the keyboard equivalent, the photos on the public page with `srcset` (`L2-221`), and the proof that a pause reaches every public page within 60 seconds. Left to the admin application: a list of listings waiting for a re-check and a way to mark one done. Left to the CDN work of `L2-155` AC3: the photo on the business card.

Journey 16 built the Products and Services pages, the editors, the delete confirmation and reordering (ADR 0024). Left: product photos (journey 21), the options and minimum order fields in the product editor, drag to reorder, and the saved-by-members consequence of a delete (journey 19).
