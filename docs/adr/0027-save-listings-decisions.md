# 0027. Save listings decisions

Status: accepted

## Context

A member saves a business or a product with a heart and finds the saved items on `/saved` (L2-005 AC3, L2-012, L2-041, L2-042, L2-118, L2-133). The design left open how an item is addressed, what the unavailable state keeps, and how a visitor's press survives sign-in.

## Decision

- **Addresses are slugs.** `PUT` and `DELETE /api/saved/businesses/{slug}` and `/api/saved/products/{shopSlug}/{productSlug}`, because the pages know slugs and not identifiers. `GET /api/saved` returns the whole list (at most 500) with `businessCount` and `productCount` of the items that can be opened. `DELETE /api/saved/items/{id}` removes by the item's own id; it serves "Remove" on an unavailable item, whose listing can no longer be found by address, and it only ever finds the caller's own row.
- **The member comes from the session.** No route names a member, so another member's list cannot be addressed: such a route is a 404 (L2-042 AC4). Every endpoint needs a session (a visitor gets 401) and admits an unconfirmed member (L2-005 AC3).
- **Saving is idempotent and bounded.** Saving what is already saved succeeds and leaves one row; a unique index on member, kind and target backs it up. The 501st item is refused with 409 `SAVED_LIMIT_REACHED`. Only what the public can see can be saved: a paused, removed, unfinished or held listing, or a product that is deleted or of such a shop, is 404. Removing what is not saved, or of a paused listing, succeeds.
- **Unavailable items stay in the list.** A listing that is paused or removed after it was saved is listed as "No longer available" with its name, no card and no link, and "Remove"; the counts do not include it.
- **The heart is optimistic.** `SavedStore` flips the heart first and flips it back when the call fails. A save toasts "Saved {name}. Find it any time under Saved." with Undo for 8 seconds; an offline failure toasts the offline message with "Try again" and stays until dismissed; the limit toasts its own message. The store reads `GET /api/saved` once per session when a member opens a page with a heart.
- **A visitor's press survives sign-in by a query parameter.** The "Join to save {name}" dialog sends the visitor back to the page with `?save=1`; the page saves the item when it loads for a member and removes the parameter (L2-012). A page of an owner shows no heart (the owner's page has "Edit listing" instead).
- **"Saved by members"** on My business counts the distinct members who saved the business or any of its products. It is a number only (L2-041 AC6).
- **Error references:** `JB-SAV-503` for a failed list (L2-118), `JB-SAV-504` for a failed save or removal.

## Deferred

- Hearts on cards in lists (browse, category, search, shop): the mocks show the heart on the business page only. The product page's heart is a new element, and the mock of the product page was updated with it. Closed by ADR 0054.
- A "Saved" link in the chrome: the mocks have none; the account menu that leads to it arrives with journey 20. The page is at `/saved`, and the toast names it.
- Clearing the store on sign-out: closed by ADR 0054, the application root resets `SavedStore` whenever no member is signed in.
- Back-in-stock alerts (journey 8, done in journey 2's alert) are not changed.
