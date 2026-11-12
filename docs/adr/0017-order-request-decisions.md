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
- Deferred: the shop's lead time as structured data (it is read from the product's "Ready in" detail).

## Amendment, 12 November 2026: the deferrals that have landed

The order card in the conversation and the in-app notification, deferred above, are built and are now part of the requirement (L2-046 AC8).

- The owner's notification "New order request from {member}" is stored in the same save as the request, and the owner's open page receives it from the event stream `GET /api/events` (L2-070). The member is told nothing until the owner answers.
- The order card is not stored. The conversation query reads the requests between the member and the business, so a card needs no write when a request is sent and cannot disagree with the request.
- Idempotency is kept by the handler: a request of the same member with the same key is returned unchanged, with no time limit, which satisfies the 24 hours L2-132 asks for. No middleware or cache takes part.
- The option and the quantity are chosen on the product page and are fixed in the dialog; the estimate there follows the delivery method.

## Consequences

Owner responses (journey 13) can confirm an order, reduce stock and add tax without changing the request shape.
