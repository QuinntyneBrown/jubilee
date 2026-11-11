# 0024. Manage products and services decisions

Status: accepted

## Context

An owner lists the products and services members ask for (L2-089 to L2-095, L2-127 to L2-130, L2-132, L2-133). The designs left open how the list is ordered, what a delete does to past requests, how a retry avoids a duplicate, which limits apply and which controls the first release carries.

## Decision

- **Endpoints, under `/api/my-business`, refused with 403 `FORBIDDEN` to a member who owns nothing.** `GET/POST products`, `PUT/DELETE products/{id}`, `PUT products/{id}/position`, and the same set for `services`. Every body is a closed record: an unknown field is a 400. A product or service of another owner answers 404. A failed list is 503 with `JB-PRD-503` or `JB-SVC-503`; a failed save is 503 with `JB-PRD-504` or `JB-SVC-504`.
- **Order.** Each product and service has a `Position`; the public listing and product page show products in that order, then newest first. A move sends the new position and the answer is the whole list. The first release reorders with "Move up" and "Move down" buttons, which serve a keyboard and a phone; drag is deferred.
- **Limits.** At most 100 products (409 `PRODUCT_LIMIT`, "You can list up to 100 products.") and 50 services (409 `SERVICE_LIMIT`). Field limits: product name 120, description 1,000, price from $0.01 to $100,000 as dollars with at most two decimals, stock 0 to 9,999 or empty; service name 80, detail 60, meeting length 15 to 480 minutes. Failures are 422 with a code per field (`REQUIRED`, `INVALID`, `TOO_LONG`); the words come from the browser.
- **Delete.** A product is soft deleted: it leaves the shop and every list now, and its past requests stay in the owner's records. A service is deleted for good and its positions renumbered; a request keeps the service name it was made with. Both ask first in a dialog whose safe button, "Keep product" or "Keep service", has focus.
- **Retry without duplicates (L2-132).** The editor makes one key when it opens and sends it with every try. A create with a key the owner already used in the last 24 hours returns the first result instead of a second row.
- **Sold out.** A stock of 0 shows "Sold out"; an empty stock means no count is kept. "Requests" on a product counts the orders asked for it.
- **Booking a service.** A service members book stores its length, whether it meets by video, in person or both, and the place. Booking uses the length for the slot. The mode choice inside the booking dialog is unchanged by this journey.
- **Editors and failures.** Each editor is a CDK dialog, disabled while saving, with `aria-busy` on the primary button. A save that takes more than 10 seconds fails. A failure keeps what was typed and says whether the connection dropped or the server refused. Closing a dirty editor by Escape, the backdrop, Close or Cancel asks "Discard what you typed?" first. Focus returns to the button that opened the dialog.

## Deferred

- Product photos, with the photo rules of ADR 0023: the mock's "Add photo" control is omitted until journey 21 gives the public listing something to show them with.
- The options and minimum order fields in the product editor: the mocks have none. The API and the database accept them (`minimumQuantity`, `optionName`, up to 10 `options`) and tests cover them; a product that already has options keeps them when saved from the editor.
- Drag to reorder.
- "Members who saved it see No longer available" (L2-092 AC5): saving a listing or product is journey 19.
