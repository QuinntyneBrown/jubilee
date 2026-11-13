# 0062. Finish manage products and services

## Status

Accepted, 12 November 2026. Amends ADR 0024, whose deferrals of product photos, of the options
and minimum order fields in the product editor, of drag to reorder and of the saved-list
consequence of a delete it ends. Applies ADR 0052 (drag to reorder listing photos, with the move
buttons as the keyboard equivalent), ADR 0051 (scan before store) and ADR 0057 (no
verification: nothing here names it).

## Context

Journey 16 lets an owner add, edit, reorder and delete products and services. ADR 0024 left four
things out: the product editor had no "Add photo" because the public pages had nothing to show a
product photo with; the options and minimum order were in the API only; the lists reordered with
buttons but not by drag; and what a member who saved a deleted product sees was journey 19's.
Since then journey 15 stored listing photos as renditions served under `/media` and drew them in
`jb-media-tile` (ADR 0023, ADR 0052), journey 6 scanned message photos before storing them
(ADR 0051), and journey 19 built the saved list, which already shows a deleted product as "No
longer available" (ADR 0054). `L2-138` asks for every upload to be scanned, and the secure-uploads
design named the product photo as open.

## Decision

### One photo per product, uploaded before the product is saved (L2-091 AC9, AC10)

- The mock gives a product one photo, beside "Add photo". The editor uploads the file as soon as
  it is chosen to `POST /api/my-business/products/photos` and keeps the answer
  (`ProductPhotoDto`: id, key, width and height); "Add product" or "Save changes" sends its id as
  `photoId`. Uploading first lets a new product take a photo before it has an id, and lets a
  refused photo be told beside the control while everything typed stays.
- The upload is checked as a listing photo is (`IImageProcessor`: magic bytes, 5 MB, 8,000 px,
  re-encoded renditions without metadata), then scanned (`IMalwareScanner`, as ADR 0051 does for a
  message photo: 422 `FAILED_SCAN`, 503 `SCAN_UNAVAILABLE`), and only then stored under a random
  key of 128 bits. It is recorded as a `ProductPhoto` of the owner's listing, so a product can only
  take a photo its own owner uploaded (`photo` `INVALID` otherwise). An owner uploads at most 30
  product photos an hour (429 `rate_limited`), which bounds the photos an abandoned editor leaves
  behind.
- `photoId` is the whole truth of the editor: a save without it leaves the product with no
  photo. A photo that a save replaces or removes is deleted from the media store. A photo that
  no product ever took stays, like an unsent message photo; removing it is retention work
  (`L2-148`).
- The photo shows where the product's tile was in the owner's list and on the product page,
  with the product's name as its text alternative. Product cards on other pages keep their tile:
  the photos of cards wait for the CDN work of `L2-155` AC3, as business cards do (ADR 0052).
- The editor opened on `/list` before a listing exists has no "Add photo" (`L2-073` AC1 lists its
  fields): there is no listing to own the photo yet.

### Options and minimum order in the editor (L2-091 AC8)

- "Minimum order" (1 to 999, empty is 1) and "Options" with "Add option" (up to 10, each a name of
  40 characters at most and its own stock) are in the product editor. With options, "What the
  options choose" names them (for example "Size") and the product's own "In stock" gives way to
  each option's stock, as the domain already keeps it. The editor sends `minimumQuantity`,
  `optionName` and `options` with every save, so removing the last option leaves a product
  without options. A blank or repeated name is refused in the dialog with "Give each option its
  own name." and on the server with `options` `INVALID`.
- The product page and the order request already show the options and the minimum (journeys 2
  and 9); nothing changes there.

### Drag to reorder, with the move buttons kept (L2-090 AC2)

- Products and services are dragged by a handle (`⋮⋮`, "Drag to reorder") with the Angular CDK
  drag and drop, as listing photos are. The list shows the new order at once and sends the one
  move to the existing `PUT …/position`; a drop in the same place sends nothing, and a refused
  move puts the item back and says so with the toast the buttons already use.
- The handle is a pointer and touch affordance only (`aria-hidden`, out of the tab order); "Move
  {name} up" and "Move {name} down" stay as its keyboard equivalent. No new component: the handle
  is a `jb-button`, as on the listing editor.

### A deleted product on a member's saved list (L2-092 AC2)

- Nothing new is built: the saved list reads a deleted product as unavailable (ADR 0054). This
  journey adds the API and Playwright tests that prove a product deleted after it was saved reads
  "No longer available", has no link and can be removed.

### The empty states say what the requirements say (L2-089 AC3, L2-093 AC2)

- The Products and Services pages had empty-state words of their own. They now read as the
  requirements and the mocks do: "Add what you sell with a photo and a price. Members can request
  an item and you confirm it." and "Offer custom work, consultations or lessons? Add them here so
  members can book or ask for a quote."

## Consequences

- A product photo is reached publicly under `/media/{key}/{width}.{jpg|webp}`, like a listing
  photo; it is scanned, which listing photos still are not (secure-uploads design).
- `ProductRowDto` and `ProductPageDto` carry `photo`; the recorded answer of the product page is
  refreshed.
- The editor's request may now wait on an upload: "Add product" is disabled while a photo is
  being added, so a product is never saved with a photo that is still on its way.
- An abandoned upload leaves a stored photo with no product until retention work removes it.
