# 0018. Listing onboarding decisions

Status: accepted

## Context

"List your business" (L2-071 to L2-079) has four designs (describe-listing, name-church-reference, save-draft, submit-for-verification) with several open values. This record fixes them.

## Decision

- The form saves into a `ListingDraft` (with `DraftItem` rows) created by the first save, not by opening the page. `/list` loads the draft the member touched last; `/list?draft=new` starts a blank one; `/list?draft={id}` opens a specific one. A save is never validated, so a half-written form is kept as typed.
- A member holds at most 5 listings plus drafts. The sixth is refused with 409 `LISTING_LIMIT` and the text "You can list up to 5 businesses. Write to help@jubilee.example for more."
- Submit validates name, tagline (90 characters at most), category, church, pastor e-mail and agreement. A refused submit still saves the typed values to the draft. The pastor e-mail is refused as `OWN_EMAIL` when it equals the member's own e-mail (compared by `EmailAddress.Key`: trimmed, lower-cased); linking two accounts to one owner is deferred.
- A successful submit creates the `Listing` at stage `PendingReference` with its products or services, records a `ListingSubmission` (church, pastor e-mail and key, reference token, statement version `2026-11-02`, agreement time, idempotency key), queues the pastor's e-mail and deletes the draft. A repeat with the same idempotency key returns the first result. The pastor's e-mail links to `{base}/reference/{token}` and carries no listing details.
- A name or tagline containing a URL, an e-mail address, a phone number or a discount code is accepted and flagged `CONTACT_IN_TEXT` for the review screen; a bare domain is flagged in the tagline only, so a name such as "Luzandre.com" is not flagged. The same pastor named by five or more other owners in 30 days flags the submission `REFERENCE_REUSED`.
- Drafts idle for 180 days get a notice and are deleted 14 days later unless touched; `ListingDraftExpiryJob` runs every 24 hours. Autosave runs in the page after 10 idle seconds.
- Items are added through `ListingItemDialog` (a product: name and price; a service: name, short detail, pricing, price). The full product and service editors are journey 16.
- The statement of faith has a page at `/statement-of-faith`, version `2026-11-02`.
- Deferred: asking existing owners to agree again to a new statement version (L2-075 AC3), the reference answer page (journey 11), the "Members can" action of a service (services start as "Ask"), the My business switcher (journey 15), and the highlight field's UI.

## Consequences

Journey 11 reads the `ListingSubmission` token; journey 12 reads the flags; journey 16 replaces the item dialog with the full editors.
