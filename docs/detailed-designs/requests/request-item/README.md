# Request an item

## Overview

Jubilee is Toronto's Christian marketplace. A member finds a business and asks it for something without
paying through the platform. A *request* is that ask. It has one of three types (booking, quote, order) and
follows one lifecycle shared by the member and the owner. This feature covers the order type.

An *order request* is a request in which a member asks a shop for a product, with a chosen option, quantity and
delivery method. It opens from "Request this item" on a product. The dialog "Request this item" states "No
payment now. {Shop} confirms and you pay them directly." Jubilee takes no payment; the shop confirms the request
and arranges payment with the member.

A *delivery method* is a way the shop hands over a product, either shipping (for example "Ship to me · Canada
Post, $9 flat · 3–6 business days") or pickup (for example "Pick up in Leslieville · Free"). An *estimated
total* is the item amount plus shipping, before tax, shown as "Estimated total {amount} + tax". A shop may set a
free-shipping threshold (for example $75); at or above it, shipping is free.

The dialog shows an estimate at once as options change. The server never trusts a price from the client: it
recomputes prices and totals from stored product data, and it refuses a quantity above the stock at send time.

## Description

The feature is a vertical slice from the order dialog in `Jubilee Web` to `Jubilee database`. The names below are
the names in the code.

- **`RequestItemDialog`** — Angular CDK dialog (`frontend/projects/jubilee/src/app/dialogs/request-item`) composed
  of `jb-*` components in a `jb-dialog` frame. It opens at `/b/{shop}/p/{product}/request?option=&quantity=`, the
  route of the product page, with the option and quantity chosen there. It summarises the product, option,
  quantity and price and offers the shop's delivery methods. A method of kind `ship` requires "Shipping
  address", prefilled from the last address used; an address without a Canadian postal code shows "Enter the
  address to ship to, with postal code." A method of kind `pickup` hides the address field and sends
  `shippingAddress: null`. After success it shows "Request sent to {shop}" with the shop's typical reply time and
  lead time, "Keep shopping" and "View request", and moves focus to "View request" because the button
  that held it is gone with the form. Its form carries the `jbDraft` directive (ADR 0046).
- **`estimate`** — computed signal of `RequestItemDialog`. It recomputes "Item", "Shipping" and "Estimated total
  {amount} + tax" at once when the delivery method changes, and applies free shipping at or above the shop's
  threshold. The estimate is display only.
- **`RequestsApi`** — service contract behind the `REQUESTS_API` injection token. `orderOptions(shopSlug,
  productSlug)` calls `GET /api/listings/{shop}/products/{product}/order` and returns `OrderOptions`: the shop,
  the owner's first name, the typical reply time, the lead time, the product with its options, the delivery
  methods, the free-shipping threshold and the last shipping address. `requestItem` calls `POST
  /api/requests/orders`; the body carries an `idempotencyKey` made once per dialog by `newKey()`.
- **`ListingBookingController`** — ASP.NET Core controller in `Jubilee.Api`. `OrderOptions` sends
  `GetOrderOptionsQuery` to `GetOrderOptionsQueryHandler`, which returns `OrderOptionsDto`. An option's
  `maxQuantity` is the most a member may ask for (the stock, capped at 99); the stock itself is never sent.
- **`RequestsController`** — ASP.NET Core controller in `Jubilee.Api`. `Order` authenticates the session cookie,
  applies `[RequiresConfirmedEmail]` (HTTP 403 with code `EMAIL_UNCONFIRMED`, `L2-005`) and sends
  `RequestItemCommand` through MediatR. It answers 201 with `BookedRequestDto` (`id`, `status`, `memberStatus`).
- **`RequestItemRequest`** — body of `POST /api/requests/orders`: `listingSlug`, `productSlug`, `option`,
  `quantity`, `deliveryMethodId`, `shippingAddress`, `note` and `idempotencyKey`. It has no price, shipping or
  total field and is marked `JsonUnmappedMemberHandling.Disallow`: a body with any other field (`priceCents`,
  `totalCents`, `status`) is refused with HTTP 400 and nothing is created (`L2-133` AC4).
- **`RequestItemCommandHandler`** — MediatR handler in `Jubilee.Application` (`Requests/Order.cs`). It first
  looks for a request of this member with the same idempotency key and returns it unchanged (`L2-132`). It then
  loads the public shop, the `Product` with its `ProductOption`s and the shop's `DeliveryMethod`, refuses an
  owner asking their own shop (HTTP 409, code `OWN_LISTING`), and checks the option, the delivery method, the
  quantity, the address of a shipped request and the note. A failure throws `ValidationFailedException`: HTTP 422
  with one code per field (`REQUIRED`, `INVALID`, `BELOW_MINIMUM`, `TOO_MANY`, `TOO_LONG`). A quantity above
  the stock is `ONLY_LEFT:{n}` on `quantity`, which the dialog shows as "Only {n} left. Lower the quantity to
  continue." It asks `OrderPricing` for the amounts, creates the `Request` with `Request.AskForOrder`, tells the
  owner with `NotificationRules.Tell`, queues the owner's e-mail with `EmailPolicy.Queue` and saves all of it in
  one `SaveChangesAsync`. Sending a request does not reduce stock; confirming it does (`L2-052`).
- **`OrderPricing`** — static domain service in `Jubilee.Domain`. `For(product, quantity, method,
  freeShippingOverCents)` returns `OrderAmounts` (`UnitCents`, `ItemCents`, `ShippingCents`, `TotalCents`) from
  stored data only, with shipping zero for a `Ship` method at or above the threshold. The dialog's `estimate`
  mirrors the same rule. Tax is never calculated: the estimate reads "{amount} + tax" and the shop adds tax when
  it confirms (ADR 0017).
- **`Request`** — domain entity in `Jubilee.Domain` that owns the request lifecycle (`L2-043`). `RequestKind`
  holds `Booking`, `Quote`, `Order` and `Space`; `RequestStatus` holds `New`, `Confirmed`, `Declined`,
  `Cancelled` and `Completed`. An order keeps its own facts on the request: `ServiceName` (the product's name),
  `OptionLabel`, `Quantity`, `UnitPriceCents`, `ItemCents`, `ShippingCents`, `TotalCents`, `DeliveryLabel`,
  `ShippingAddress` and `Note`. `Confirm`, `Decline`, `Cancel` and `Complete` make the allowed transitions and
  `UndoConfirm` and `UndoCancel` reverse one within 8 seconds; any other transition throws
  `InvalidTransitionException`, which the API maps to HTTP 409 with code `INVALID_TRANSITION`.
- **`RequestTransition`** — child entity of `Request` that records each transition with `From`, `To`, `Actor`,
  `At` and `UndoableUntil`. The progress timeline reads these records.
- **`DeliveryMethod`** — entity of a shop's `Listing`. It holds `Position`, `Kind` (`DeliveryKind`: `Ship`,
  `Pickup`), `Label`, `FeeCents` and `Estimate`. The free-shipping threshold is `Listing.FreeShippingOverCents`.
- **`Notification`** — the owner's in-app notification "New order request from {member}", with the product and
  quantity and a link to `/my-business/requests`. It is stored in the same save as the request. The member gets
  none until the owner answers.
- **`EventsController`** — `GET /api/events`, the server-sent event stream of a signed-in member (`L2-070`). It
  sends each new `Notification` of its own user as a `notification` event, so the owner's open page learns of
  the order without a reload.
- **Order card** — the conversation of the member and the shop shows the order as a card ("Order request", the
  product and quantity, the delivery method with the total, and the status). The card is not stored: the
  conversation query reads the member's requests to that business (`L2-057` AC8).
- **`OutboxDispatcherJob`** — hosted job in `Jubilee Worker`. It sends the `OutboxMessage` e-mail to the owner
  that the handler queued, through `IEmailSender`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1)
requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-046` | `L1-007` | From a product, a member shall be able to send an order request with a delivery choice. The system shall take no payment. |
| `L2-043` | `L1-007` | Each booking, quote and order request shall follow one lifecycle shared by the member's and the owner's views. |
| `L2-005` | `L1-001` | Until the e-mail is confirmed, a member may browse, search and save but shall not message, book, request or list a business. |
| `L2-132` | `L1-018` | Each create request shall carry a client-generated idempotency key, and the server shall return the original result for a repeated key within 24 hours without creating a duplicate. |
| `L2-133` | `L1-019` | The server shall reject with HTTP 400 an update or create body that includes a field the caller is not allowed to set, such as `price` on a request, and shall change nothing. |
| `L2-052` | `L1-008` | Confirming an order request shall tell the customer in the application and by e-mail and reduce the product's stock by the quantity. |
| `L2-057` | `L1-009` | A conversation shall show each request between the member and the business as a card. |
| `L2-070` | `L1-010` | A signed-in member's open page shall receive their own events over a persistent connection. |

## Diagrams

### System context

A member sends an order request to a shop through Jubilee. Jubilee tells the owner in the application and
through the external e-mail provider. No payment provider takes part.

![C4 system context for requesting an item](diagrams/c4-context.png)

### Containers

The order request travels from `Jubilee Web` to `Jubilee API`, which reads product data from and stores the
request, the owner's notification and the owner's e-mail in `Jubilee database`. `Jubilee Worker` sends the e-mail.
The owner's open page reads the notification from the event stream of `Jubilee API`.

![C4 container view for requesting an item](diagrams/c4-container.png)

### Components

`RequestItemDialog` shows its `estimate` and calls `ListingBookingController` and `RequestsController` through
`RequestsApi`. `RequestItemCommandHandler` uses `OrderPricing` and the `Product` to price and check the request
before it creates the `Request` and the owner's `Notification`.

![C4 component view for requesting an item](diagrams/c4-component.png)

### Class structure

`RequestItemCommandHandler` handles `RequestItemCommand`, which carries no price. `OrderPricing` returns the
`OrderAmounts` that `Request.AskForOrder` stores on the `Request`.

![Class diagram for requesting an item](diagrams/class-structure.png)

### Behaviour — open the dialog and estimate the total

The dialog loads the delivery methods and the last address, then recomputes the estimate in the browser when
the delivery method changes (`L2-046`).

![Sequence diagram for opening the order dialog](diagrams/sequence-open-order-dialog.png)

### Behaviour — send an order request

The API enforces `L2-005` and `L2-133`. The handler returns the first request for a repeated key (`L2-132`),
refuses a quantity above stock, recomputes prices from stored data (`L2-046`), creates the request with status
`New` (`L2-043`) and tells the owner in the application, on the event stream and by e-mail (`L2-046` AC8).

![Sequence diagram for sending an order request](diagrams/sequence-send-order-request.png)
