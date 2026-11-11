# 0017. Order request decisions

Status: accepted

## Context

An order request is the third kind of request. It needs delivery methods, amounts the client cannot influence, a stock rule and a decision about tax.

## Decision

- A shop's delivery methods are rows (`DeliveryMethod`: ship or pickup, label, fee, estimate) with a free-shipping threshold on the listing. Shipping is free for a ship method when the item amount is at or above the threshold.
- The order body has no price, shipping or total field and refuses unknown fields with 400 (L2-133 AC4). The server computes the unit price, item amount, shipping and total from stored data (`OrderPricing`) and stores them on the request.
- Tax is never calculated. The estimate reads "{amount} + tax" and the shop adds tax when it confirms; Jubilee takes no payment.
- Stock is checked when the request is sent and is not reserved or reduced; confirming a request reduces it (L2-052). A quantity above the stock is refused with `ONLY_LEFT:{n}` on `quantity`; an untracked product above 99 is `TOO_MANY`. The code carries the count so the client can say "Only {n} left."
- A shipped request needs an address with a Canadian postal code; a pickup request drops the address. The last shipped address of the member is offered again.
- The dialog opens at `/b/{shop}/p/{product}/request?option=&quantity=`, the same route as the product page, so opening it does not reload the product.
- The order options endpoint is `GET /api/listings/{shop}/products/{product}/order`, by slugs like the other listing endpoints, instead of the design's `orders/defaults?productId=`.
- Deferred: the order card in the conversation, the in-app notification, and the shop's lead time as structured data (it is read from the product's "Ready in" detail).

## Consequences

Owner responses (journey 13) can confirm an order, reduce stock and add tax without changing the request shape.
