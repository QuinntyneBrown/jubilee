# Manage products

## Overview

Jubilee is Toronto's Christian marketplace: a directory of
Christian-owned businesses. A *shop* is a listing that sells physical items. A
*product* is one item of a shop, with a name, a price in Canadian dollars, an
optional photo and an optional stock count. Members do not pay through Jubilee;
they send an *order request* for a product and the owner confirms or declines it.

This feature covers the "Products" tab of the owner workspace at
`/my-business/products`. The owner sees every product in a table, adds and edits
products in a dialog, gives a product one photo, options and a minimum order,
deletes a product after a confirmation, and sets the order that the public shop
shows by dragging a row by its handle or with the move buttons.

Changes show on the public listing as soon as the owner saves. A product with a
stock of 0 shows as *sold out*; an empty stock field means the stock is not
tracked. A product with *options* (for example sizes) keeps a stock on each
option instead. A shop holds at most 100 products.

Deleting a product removes it from public pages at once but does not rewrite
history. Past requests keep a *snapshot* — copy of the product's name and price
taken when the request was sent — open order requests stay open, and members who
saved the product see "No longer available".

## Description

The feature is a vertical slice from the products page in `Jubilee Web` to the
`Jubilee database` and the media store.

- **`MyProductsPage`** — Angular page at `/my-business/products`. It shows the
  workspace header, the summary (for example "4 products · 1 sold out"), "Add
  product" and a table with Product (the photo or tile, and the name with
  "(min. {n})"), Price, Status ("Listed" or "Sold out"), Requests (all-time
  count) and the row actions. Row actions are always visible. The empty state
  reads "No products yet. Add what you sell with a photo and a price. Members can
  request an item and you confirm it." The load-error state carries `JB-PRD-503`
  and a `403` sends the owner to `/forbidden`. At 100 products "Add product" is
  refused with "You can list up to 100 products."
- **Reordering** — the table body is a CDK `cdkDropList`; each row is a
  `cdkDrag` whose handle is a `jb-button` reading `⋮⋮` with the title "Drag to
  reorder", `aria-hidden` and `tabindex="-1"`. `MyProductsPage.drop` shows the
  new order at once and sends the one move; a drop in the same place sends
  nothing, and a refused move puts the row back and shows "Couldn’t move the
  product" with "The order is unchanged. Try again." "Move {name} up" and "Move
  {name} down" are the keyboard equivalent (`MyProductsPage.move`), and the moved
  position is announced. A line under the table reads "Drag a product by its
  handle, or use the arrows, to change the order."
- **`ProductEditorDialog`** — CDK dialog titled "Add a product" or "Edit
  product", saying "Changes show on your public listing as soon as you save."
  It holds the photo control, "Product name" (required), "Price (CAD)"
  (required), "In stock" (hint "0 shows as sold out."; hidden while the product
  has options), "Description" (optional), "Minimum order" (optional, hint "The
  fewest a member can ask for. Empty is 1.") and "Options" (hint "Sizes or
  colours, each with its own stock.") with "What the options choose", rows of
  "Option {n}", "Stock of option {n}" and "Remove option {n}", and "Add option"
  up to 10. It checks every field before sending ("Enter a name for the
  product.", "Enter a price in dollars, like 24.00.", "Enter a whole number from
  1 to 999.", "Give each option its own name.") and maps a server `422` to the
  same words. The primary button reads "Add product" or "Save changes", carries
  `aria-busy` while saving, and a save over 10 seconds fails. A failed save
  shows "We couldn't save the product. Nothing was changed and what you typed is
  still here. Try again." Closing with typed text asks "Discard what you typed?"
  first. One idempotency key is made when the dialog opens and sent with every
  try. Opened from `/list` before a listing exists (`L2-073`) it has no photo,
  options or minimum order and calls no API.
- **Photo control** — a thumb `jb-media-tile`, a hidden file input and "Add
  photo" ("JPG or PNG, 5 MB at most"). Choosing a file over 5 MB is refused
  before it is sent with "Photos can be 5 MB at most."; otherwise
  `CatalogueApi.uploadProductPhoto` sends it at once, the button reads "Adding
  photo…" and is busy, and the primary button waits. The answer fills the tile,
  and the buttons become "Change photo" and "Remove photo". A refusal is told
  under the control (`NOT_AN_IMAGE` "Add a JPG or PNG photo.",
  `TOO_BIG_IN_PIXELS` "Photos can be 8,000 by 8,000 pixels at most.",
  `FAILED_SCAN` "This photo didn’t pass our safety check.", anything else "We
  couldn’t add the photo. Try again.") and leaves the tile as it was.
- **`DeleteItemDialog`** — confirmation for a product or a service, titled
  "Delete “{name}”?" with "It disappears from your shop now. The {n} past
  requests for it stay in your records. This can't be undone.", "Keep product"
  (focused by default) and "Delete product". A failed delete shows "We couldn't
  delete it. The product is still listed. Try again."
- **`CatalogueApi`** (`CATALOGUE_API`, implemented by `HttpCatalogueApi`) —
  service contract of the `api` library: `products()`, `saveProduct(id, input)`,
  `deleteProduct(id)`, `moveProduct(id, position)` and
  `uploadProductPhoto(file)`. `ProductInput` carries `name`, `price` (text),
  `stock`, `description`, `minimumQuantity`, `optionName`, `options`, `photoId`
  and `idempotencyKey`; `OwnerProduct` carries `photo` (`id`, `key`, `width`,
  `height`) or `null`.
- **`CatalogueController`** — ASP.NET Core controller under `/api/my-business`:
  `GET products`, `POST products`, `PUT products/{id}`, `DELETE products/{id}`,
  `PUT products/{id}/position` and `POST products/photos`
  (`UploadProductPhoto`, `[RequestSizeLimit]` of 6 MB). Every body is a closed
  record (`SaveProductBody`, `MoveItemBody`): an unknown field is a `400`. A
  failed list is `503` with `JB-PRD-503`, a failed save `503` with `JB-PRD-504`.
- **`Workspace.Owned`** — finds the caller's current listing; a member who owns
  none receives `403` with `FORBIDDEN`. A product of another owner is `404`.
- **`ListProductsQueryHandler`** — the owner's products in their order
  (`CatalogueRules.Ordered`: `Position`, then newest first) with each row's
  request count, as `ProductsDto` of `ProductRowDto`.
- **`SaveProductCommandHandler`** — adds a product, or with an id changes one.
  It refuses with `422` and a code per field (`name` `REQUIRED` or `TOO_LONG`,
  `price` `REQUIRED` or `INVALID`, `stock`, `description`, `minimumQuantity`,
  `options` and `photo` `INVALID`), with `409` `PRODUCT_LIMIT` at 100 products,
  and returns the first product for a key used in the last 24 hours. It calls
  `Product.Revise`, `SetMinimumQuantity`, `SetOptions`, `SetStock` and
  `ShowPhoto`; a `photoId` that is not a `ProductPhoto` of the caller's listing
  is `photo` `INVALID`, and a photo the save replaces or removes is deleted from
  the media store. When a save brings a sold-out product back, the members who
  asked are told (`L2-036`).
- **`UploadProductPhotoCommandHandler`** — checks the upload with
  `IImageProcessor` (magic bytes, 5 MB, 8,000 pixels, renditions re-encoded
  without metadata), gives it to `IMalwareScanner` (`422` `FAILED_SCAN`, `503`
  `SCAN_UNAVAILABLE`), and only then saves the renditions to `IMediaStore`
  under a random key of 128 bits and records a `ProductPhoto` of the listing.
  An owner uploads at most `CatalogueRules.PhotosPerHour` (30) photos an hour;
  more is `429` `rate_limited`. It answers `ProductPhotoDto(Id, Key, Width,
  Height)`, with `201`.
- **`DeleteProductCommandHandler`** — calls `Product.Delete`, which sets
  `IsDeleted` and `DeletedAt`, and answers `DeletedItemDto` with the past
  request count. Public queries filter deleted products; request rows keep their
  snapshot and are not touched; `SavedItem` rows that point to the product read
  as unavailable ("No longer available").
- **`MoveProductCommandHandler`** — places one product at the given position,
  renumbers every `Position` from 1 and answers the whole list.
- **`Product`** — domain entity: `PriceCents`, nullable `Stock`, `Position`,
  `MinimumQuantity`, `OptionName` and its `ProductOption` list (each with its
  own stock), `IdempotencyKey`, `PhotoId` with the navigation `Photo`, and
  `IsDeleted`. `IsSoldOut` is true when the stock is 0, or 0 in every option.
- **`ProductPhoto`** — domain entity recording an uploaded photo: `Id`,
  `ListingId`, `Key`, `Width`, `Height`, `UploadedAt`
  (`ProductPhoto.Upload`).
- **Public pages** — `GetProductPageQueryHandler` gives `ProductPageDto.Photo`
  (a `ListingPagePhotoDto` whose alt is the product's name), which the product
  page draws in its `jb-media-tile` in place of the icon. Product cards keep
  their tile until card photos are served from the CDN (`L2-155` AC3).
  `DirectoryCacheInvalidationInterceptor` drops the cached public reads when a
  product changes, and search reads products at query time, so a change is
  public at once.

Products are manageable while the listing is not live (`L2-097`); they become
public with the listing. Photos are served under
`/media/{key}/{width}.{jpg|webp}` by `MediaController` (see `secure-uploads`).

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-089` | `L1-013` | The system shall show the owner's products with a count summary, "Add product" and a table of Product, Price, Status, Requests and Actions, and an empty state when there are none. The system shall refuse a product beyond the maximum of 100 with "You can list up to 100 products." |
| `L2-090` | `L1-013` | When the owner moves a product or service up or down by drag or keyboard buttons, the public listing shall show items in the new order after save. A drag shall be made by a handle hidden from assistive technology, and a refused move shall put the item back. |
| `L2-091` | `L1-013` | The system shall let the owner add and edit a product in a dialog with a photo, name, price, stock, description, up to 10 options and a minimum order quantity of 1 to 999. A price shall be between 0.01 and 100,000.00 with at most two decimals and stored as integer cents; stock shall be a whole number from 0 to 9,999 or empty for not tracked; a photo shall be uploaded when chosen and shown in the owner's list and on the product page; a saved product shall be live at once. |
| `L2-092` | `L1-013` | After the owner confirms a delete, the product shall be removed from public pages immediately, past requests shall keep a snapshot of its name and price, members who saved it shall see "No longer available", and its open order requests shall stay open. |
| `L2-097` | `L1-013` | The owner shall manage products while the listing is not live, and the header shall show its stage. |
| `L2-128` | `L1-018` | When a dialog submission fails, an error alert at the top of the dialog shall say what did not happen, and everything typed shall be kept. |
| `L2-129` | `L1-018` | A delete shall be confirmed in a dialog that states the consequence with real counts and names, says "This can't be undone." and focuses the safe choice by default. |
| `L2-132` | `L1-018` | A create request shall carry a client-generated idempotency key, and the server shall return the original result for a repeated key within 24 hours without creating a duplicate. |
| `L2-133` | `L1-019` | The server shall check ownership before doing anything, shall refuse an owner API call by a member who owns no listing with 403, and shall refuse fields the caller may not set. |
| `L2-138` | `L1-019` | A product photo shall be checked by its magic bytes, accepted only as JPEG or PNG up to 5 MB and 8,000 × 8,000 pixels, re-encoded without metadata, scanned for malware before it is stored, and stored under a random name. |

## Diagrams

### System context

The owner manages products through Jubilee. Members appear because the shop they
browse reflects each change at once.

![C4 system context for managing products](diagrams/c4-context.png)

### Containers

`Jubilee Web` calls the `Jubilee API`, which writes the `Jubilee database`,
keeps photo renditions in the media store and asks the malware scanner before
storing a photo.

![C4 container view for managing products](diagrams/c4-container.png)

### Components

The page opens the two dialogs and shares `CatalogueApi` with them. In the API,
one controller sends the commands of the owner's catalogue through MediatR.

![C4 component view for managing products](diagrams/c4-component.png)

### Class structure

A listing has up to 100 `Product` entities; each has up to 10 `ProductOption`
values and at most one `ProductPhoto`.

![Class diagram for managing products](diagrams/class-structure.png)

### Behaviour — add a product

The photo is uploaded, checked and scanned when it is chosen; the product is
saved once per idempotency key with the photo's id and is live at once.

![Sequence diagram for adding a product](diagrams/sequence-add-product.png)

### Behaviour — delete a product

The confirmation states the consequence. The handler soft-deletes the product
and leaves requests untouched, so snapshots and open order requests remain.

![Sequence diagram for deleting a product](diagrams/sequence-delete-product.png)

### Behaviour — reorder products

A drag or a move button sends one move; the server renumbers the positions and
answers the whole list, which the public shop reads in the same order.

![Sequence diagram for reordering products](diagrams/sequence-reorder-products.png)
