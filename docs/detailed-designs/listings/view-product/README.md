# View a product

## Overview

Jubilee is Toronto's Christian marketplace. A shop on Jubilee lists products,
and each product has its own page at `/b/:slug/p/:product`. This feature covers
that page: what it shows, how the option and quantity controls validate a
selection before a request starts, and what happens when a product is sold out.

Jubilee takes no payment. The primary action "Request this item" opens the
order request dialog, where the member asks the shop for the item; the page
states "No payment now. {shop} confirms stock and tells you how to pay." The
order request dialog and the request that it creates belong to a separate
feature. This feature ends when a valid selection is handed to that dialog.

The feature uses the following local terms.

- **product option** — selectable variant of a product, such as a size, with its own stock
- **tracked stock** — stock count that the owner maintains for a product or option; a product without one is untracked
- **minimum order quantity** — smallest quantity that the shop accepts for one request, shown as "min. 12"
- **sold out** — state of a product whose stock is 0 in every option
- **stock alert** — member's standing request to be told once when a sold-out product is available again

## Description

The feature is a vertical slice from the Angular page to the database, with a
background path for stock alerts.

- **`ProductPage`** — Angular page for `/b/:slug/p/:product`. It shows the
  breadcrumb, `ProductGallery`, the name, the price ("$34", or "$22 ea" for
  per-unit pricing), the delivery line (for example "· plus $9 shipping, or free
  pickup"), "Sold by {shop} · Verified", the "Details" list with the
  description and attributes such as Fit, Care, Ready in and Returns, and "More
  from {shop}" with up to three other products and "Visit shop". On failure it
  shows "We couldn't load this product" with the reference `JB-PRD-503` and
  "Back to {shop}".
- **`ProductRequestForm`** — component that holds the `OptionPicker` (sizes S,
  M, L, XL, 2XL in the mock), the "Quantity" input and the "Request this item"
  button. Pressing the button without a chosen size shows "Choose a size." on
  the size group and does not open the dialog. Quantity accepts whole numbers
  from 1 to the stock available for the chosen option, or to 99 when stock is
  not tracked. A quantity under the minimum order quantity shows "This item has
  a minimum of 12." with the product's own minimum.
- **`BackInStockButton`** — button "Tell me when it's back", shown in place of
  "Request this item" when the product is sold out. In that state the page shows
  a "Sold out" badge, "Sold out in every size" ("Sold out" for a product without
  options) and the owner's optional restock note, and disables the options and
  quantity. For a visitor the button opens the sign-in prompt
  (`dialogs/sign-in-required`). For a member it asks for the alert, and the
  status "We'll tell you when it's back" takes its place
  (`pages/product/alert-requested.html`).
- **`ProductsApi`** — typed Angular HTTP client for
  `GET /api/listings/{slug}/products/{productSlug}` and
  `PUT /api/products/{id}/stock-alert`. "Request this item" with a valid
  selection navigates to `/b/:slug/p/:product/request?option=…&quantity=…`, the
  route the order request feature (journey 9) opens its dialog on; until then it
  reaches the not-found page (ADR 0007).
- **`ProductsController`** — ASP.NET Core controller in `Jubilee.Api`. The
  `GET` endpoint is anonymous. The `PUT` endpoint requires a session. A load
  failure returns 503 `ProblemDetails` with `JB-PRD-503`.
- **`GetProductPageQuery`** and **`GetProductPageQueryHandler`** — MediatR
  query and handler. The handler loads the `Product` with its `ProductOption`,
  `ProductAttribute` and `ListingPhoto` rows, returns not found when the listing
  is not public for the viewer, and adds up to three other products of the same
  shop, newest first, the order of "From the shops" on the browse home.
- **`Product`** — domain entity that owns stock and quantity rules.
  `MaxQuantity` returns the stock of the chosen option, or 99 when stock is
  untracked. `SetStock` returns a `StockChange`: `BecameSoldOut` when stock
  reaches 0 in every option, `BackInStock` when stock rises from 0 to above 0.
  The same rules are applied again by the order request feature on the server.
- **`StockAlert`** — entity keyed by member and product, with `RequestedAt` and
  `NotifiedAt`. One open alert exists per member and product.
- **`RequestStockAlertCommand`** and **`RequestStockAlertCommandHandler`** —
  MediatR command and handler behind the `PUT` endpoint. The handler creates a
  `StockAlert` when the member has no open alert for the product and otherwise
  leaves the existing alert unchanged, so repeating the request has no further
  effect.
- **`ProductBackInStock`** — outbox message written in the same transaction as
  the stock change that returned `BackInStock`.
- **Deferred** — no endpoint changes stock until the owner's product
  management (journey 16), and no notification or e-mail is sent until
  notifications exist (journey 17). This feature builds `Product.SetStock`,
  `StockChange` and `StockAlert`; `ProductBackInStock`, `StockAlertNotifier` and
  the owner's toast below arrive with those journeys.
- **`StockAlertNotifier`** — application service run by `OutboxDispatcherJob`
  in `Jubilee.Worker`. For each `StockAlert` without `NotifiedAt` it sets
  `NotifiedAt`, creates the in-app `Notification` and sends one e-mail through
  `IEmailSender`. An alert with `NotifiedAt` set is not notified again; a
  member who wants a later notice asks again.
- **Sold-out toast for the owner** — when an owner's save returns
  `BecameSoldOut`, the product editor shows the warning toast "“{product}” is
  sold out. Members can still ask to be told when it's back." through
  `ToastService`. The product editor itself belongs to the owner's product
  management feature.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-035` | `L1-005` | The page `/b/:slug/p/:product` shall show one product with options, quantity and a request action. |
| `L2-036` | `L1-005` | A product with stock 0 in every option shall show as sold out with its request action disabled, and shall offer a back-in-stock alert. A member who asks for the alert shall be notified in-app and by e-mail once, the next time stock goes above 0. |
| `L2-028` | `L1-003` | Browse, category, search, featured and related lists shall show only listings that are verified and not paused, deleted or under a moderation hold. |
| `L2-118` | `L1-016` | Every load-error state shall show a reference that the user can quote to support. |

## Diagrams

### System context

Visitors and members view a product, an owner changes its stock, and the
`E-mail provider` delivers the back-in-stock e-mail.

![C4 system context for viewing a product](diagrams/c4-context.png)

### Containers

`Jubilee Web` calls `Jubilee API` for the product page and the stock alert.
`Jubilee Worker` dispatches the back-in-stock notice from the outbox in
`Jubilee database`.

![C4 container view for viewing a product](diagrams/c4-container.png)

### Components

The page delegates selection to `ProductRequestForm` and the alert to
`BackInStockButton`. In the backend, the `Product` entity writes the
`ProductBackInStock` message that `StockAlertNotifier` later consumes.

![C4 component view for viewing a product](diagrams/c4-component.png)

### Class structure

`Product` owns its options, attributes and photos, and `SetStock` returns a
`StockChange`. A `StockAlert` links one member to one product and records when
the member was notified.

![Class diagram for viewing a product](diagrams/class-structure.png)

### Behaviour — view a product and start a request

The page loads the product, and the form validates the option and quantity
before it hands the selection to the order request dialog.

![Sequence diagram for viewing a product and starting a request](diagrams/sequence-view-product.png)

### Behaviour — ask for a back-in-stock alert

A member presses "Tell me when it's back" on a sold-out product. The handler
keeps one open `StockAlert` per member and product.

![Sequence diagram for asking for a back-in-stock alert](diagrams/sequence-request-stock-alert.png)

### Behaviour — stock change and back-in-stock notice

A stock change to 0 produces the owner's warning toast. A change from 0 to
above 0 writes an outbox message, and `StockAlertNotifier` notifies each
waiting member once, in-app and by e-mail.

![Sequence diagram for a stock change and the back-in-stock notice](diagrams/sequence-stock-change.png)
